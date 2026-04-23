/**
 * HOME PAGE — Unified dashboard + matter list
 *
 * This is the main screen of MatterGuardian. It combines:
 * 1. Summary metric pills (filterable by click)
 * 2. Search + associate filter + sort controls
 * 3. Matter rows with status, attorney, client, next step, and stage progress
 *
 * SaaS NOTES:
 * - Associate filter: For owners/admins, shows all associates. For associates,
 *   this dropdown should be hidden and the list pre-filtered to their own matters.
 *   Wire this to the auth session role check.
 * - Summary counts: These come from the dashboard API which computes health for
 *   all active matters using the shared flow engine. In SaaS, this is already
 *   tenant-scoped via getCurrentFirmId().
 * - Create dialog: References MatterFlows and Users, both tenant-scoped.
 */
"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { PageLoader } from "@/components/ui/Spinner";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { ClientAutocomplete } from "@/components/ui/ClientAutocomplete";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Plus,
  CheckCircle2,
  AlertTriangle,
  XOctagon,
  Flame,
  FolderKanban,
  User as UserIcon,
  Clock,
  ChevronRight,
  Building2,
  Briefcase,
  Users,
  Search,
  X,
  Activity,
  Upload,
  Download,
  AlertCircle,
  ArrowUp,
  ArrowDown,
  CheckCircle2 as CheckIcon,
} from "lucide-react";
import { clsx } from "clsx";
import type {
  DashboardSummary,
  FlowHealthStatus,
  MatterWithHealth,
  MatterFlow,
  User as UserType,
  MatterStepProgress,
} from "@/types";
import { FLOW_STATUS_LABELS } from "@/types";
import { differenceInCalendarDays, parseISO, isValid } from "date-fns";

// ============================================================
// Filter / sort types
// ============================================================
type FilterStatus = FlowHealthStatus | "all";
type SortField = "status" | "engagement" | "client" | "progress" | "value";
type SortDir = "desc" | "asc";

/** Status severity order for sorting (most severe first) */
const STATUS_ORDER: FlowHealthStatus[] = [
  "flow_breakdown",
  "out_of_flow",
  "at_flow_risk",
  "in_flow",
];

// ============================================================
// MAIN COMPONENT
// ============================================================
export default function HomePage() {
  const router = useRouter();
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [users, setUsers] = useState<UserType[]>([]);
  const [flows, setFlows] = useState<MatterFlow[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & sort — persist sort in localStorage
  const [filter, setFilter] = useState<FilterStatus>("all");
  const [search, setSearch] = useState("");
  const [assigneeFilter, setAssigneeFilter] = useState("");
  const [sortField, setSortFieldState] = useState<SortField>("status");
  const [sortDir, setSortDirState] = useState<SortDir>("desc");

  // Load persisted sort on mount
  useEffect(() => {
    try {
      const savedField = localStorage.getItem("mg_sort_field") as SortField | null;
      const savedDir = localStorage.getItem("mg_sort_dir") as SortDir | null;
      if (savedField && ["status", "engagement", "client", "progress"].includes(savedField)) setSortFieldState(savedField);
      if (savedDir && ["asc", "desc"].includes(savedDir)) setSortDirState(savedDir);
    } catch {}
  }, []);

  const setSortField = (f: SortField) => { setSortFieldState(f); try { localStorage.setItem("mg_sort_field", f); } catch {} };
  const setSortDir = (d: SortDir) => { setSortDirState(d); try { localStorage.setItem("mg_sort_dir", d); } catch {} };

  const [showCreate, setShowCreate] = useState(false);
  const [showImport, setShowImport] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [dashRes, usersRes, flowsRes] = await Promise.all([
        fetch("/api/dashboard"),
        fetch("/api/users"),
        fetch("/api/matterflows"),
      ]);
      setData(await dashRes.json());
      setUsers(await usersRes.json());
      setFlows(await flowsRes.json());
    } catch (err) {
      console.error("Failed to load:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  /** Filtered + sorted matter list */
  const matters = useMemo(() => {
    if (!data) return [];
    let list = Array.isArray(data.matters) ? data.matters : [];
    if (filter !== "all") list = list.filter((m) => m.health.status === filter);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((m) =>
        m.name.toLowerCase().includes(q) ||
        m.clientName.toLowerCase().includes(q) ||
        (m.clientCompany && m.clientCompany.toLowerCase().includes(q))
      );
    }
    if (assigneeFilter) list = list.filter((m) => m.assignedUserId === assigneeFilter);
    return [...(Array.isArray(list) ? list : [])].sort((a, b) => {
      // Compute cmp so that POSITIVE means "a should come AFTER b in desc order"
      // Then: desc returns -cmp (a before b when cmp is negative = a is "bigger/more critical")
      // Simpler: just compute descending order directly, then flip for asc
      let cmp = 0;
      switch (sortField) {
        case "engagement": cmp = b.startDate.localeCompare(a.startDate); break; // desc = newest first
        case "client": cmp = a.clientName.localeCompare(b.clientName); break; // desc = A-Z (natural)
        case "status": {
          // desc = most critical first: breakdown < out_of_flow < at_flow_risk < in_flow
          cmp = STATUS_ORDER.indexOf(a.health.status) - STATUS_ORDER.indexOf(b.health.status);
          // Tiebreaker: highest value at risk first
          if (cmp === 0) {
            const aRemaining = (a.amountPaid || 0) * (1 - a.health.progressPercent / 100);
            const bRemaining = (b.amountPaid || 0) * (1 - b.health.progressPercent / 100);
            cmp = bRemaining - aRemaining;
          }
          break;
        }
        case "progress": {
          // desc = nearest to completion (highest %) first
          const aStage = a.stageProgress.find((sp) => sp.stageId === a.currentStageId);
          const bStage = b.stageProgress.find((sp) => sp.stageId === b.currentStageId);
          const aSteps = aStage?.steps || [];
          const bSteps = bStage?.steps || [];
          const aPct = aSteps.length > 0 ? aSteps.filter((s) => s.isCompleted).length / aSteps.length : 0;
          const bPct = bSteps.length > 0 ? bSteps.filter((s) => s.isCompleted).length / bSteps.length : 0;
          cmp = bPct - aPct;
          break;
        }
        case "value": {
          // desc = highest value at risk first
          const aVal = (a.amountPaid || 0) * (1 - (a.health.progressPercent / 100));
          const bVal = (b.amountPaid || 0) * (1 - (b.health.progressPercent / 100));
          cmp = bVal - aVal;
          break;
        }
      }
      // desc = use cmp as-is (already computed for desc order), asc = reverse
      return sortDir === "desc" ? cmp : -cmp;
    });
  }, [data, filter, search, assigneeFilter, sortField, sortDir]);

  if (loading) return <PageLoader />;
  if (!data) return <EmptyState title="Unable to load dashboard" />;

  const needAttention = data.atFlowRisk + data.outOfFlow + data.flowBreakdown;

  return (
    <div>
      {/* ── Header ── */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-[34px] font-bold tracking-[-0.8px] text-[var(--color-text-primary)]">Overview</h1>
          <p className="mt-1 text-[16px] font-medium text-[#777]">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })} · {needAttention} need attention
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowImport(true)}
            className="btn-secondary flex items-center gap-2 text-[14px] py-[10px] px-[18px]"
          >
            <Upload className="w-[16px] h-[16px]" /> Import
          </button>
          <button
            onClick={() => setShowCreate(true)}
            className="btn-primary flex items-center gap-2 text-[14px] py-[10px] px-[18px]"
          >
            <Plus className="w-[14px] h-[14px]" /> New matter
          </button>
        </div>
      </div>

      {/* ── Search + Sort + Filter ── */}
      <div className="flex gap-[10px] mb-6 items-center">
        {/* Search — capped width */}
        <div className="relative w-[320px] shrink-0">
          <Search className="absolute left-[14px] top-1/2 -translate-y-1/2 w-[16px] h-[16px] text-[var(--color-text-muted)]" />
          <input
            type="text" placeholder="Search matters..."
            value={search} onChange={(e) => setSearch(e.target.value)}
            className="input-field py-[10px] text-[14px]"
            style={{ paddingLeft: "38px" }}
          />
        </div>

        {/* Sort controls */}
        <div className="flex items-center gap-[6px] ml-2">
          <span className="text-[11px] font-semibold text-[#999] tracking-[0.5px]">SORT</span>
          <select
            value={sortField} onChange={(e) => setSortField(e.target.value as SortField)}
            className="input-field py-[10px] text-[14px] font-medium w-[200px] cursor-pointer"
          >
            <option value="status">Most critical first</option>
            <option value="value">Highest value at risk</option>
            <option value="engagement">Newest engaged</option>
            <option value="client">Client A–Z</option>
            <option value="progress">Nearest to completion</option>
          </select>
          <button
            onClick={() => setSortDir(sortDir === "desc" ? "asc" : "desc")}
            className="flex items-center justify-center w-[40px] h-[40px] rounded-[8px] border border-[var(--color-border)] bg-white cursor-pointer hover:bg-[var(--color-surface-hover)] transition-colors shrink-0"
            title={sortDir === "desc" ? "Highest / most critical first" : "Lowest / least critical first"}
          >
            {sortDir === "desc"
              ? <ArrowUp className="w-[16px] h-[16px] text-[var(--color-text-secondary)]" />
              : <ArrowDown className="w-[16px] h-[16px] text-[var(--color-text-secondary)]" />
            }
          </button>
        </div>

        {/* Associate filter — pushed right */}
        {/* SaaS NOTE: In production, disable this dropdown for non-OWNER users.
            Associates should only see their own matters. */}
        <select
          value={assigneeFilter} onChange={(e) => setAssigneeFilter(e.target.value)}
          className="input-field py-[10px] text-[14px] font-medium w-[200px] cursor-pointer shrink-0 ml-auto"
        >
          <option value="">All associates</option>
          {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
        </select>
      </div>

      {/* ── Metric Cards — enriched with icon, description, square aspect ── */}
      <div className="grid grid-cols-5 gap-3 mb-6">
        <MetricCard
          label="Active" count={data.totalActive}
          description={`${needAttention} need attention`}
          descColor="#8B8F97"
          icon="briefcase" iconBg="#F1F5F9" iconColor="#64748B"
          gradient="linear-gradient(90deg, #94A3B8, #CBD5E1)"
          glowColor="rgba(148,163,184,0.2)" borderColor="#94A3B8"
          isActive={filter === "all"} onClick={() => setFilter("all")}
        />
        <MetricCard
          label="In Flow" count={data.inFlow}
          description="On track"
          descColor="#22C55E"
          icon="check" iconBg="#ECFDF5" iconColor="#22C55E"
          gradient="linear-gradient(90deg, #22C55E, #4ADE80)"
          glowColor="rgba(34,197,94,0.15)" borderColor="#22C55E"
          isActive={filter === "in_flow"} onClick={() => setFilter(filter === "in_flow" ? "all" : "in_flow")}
        />
        <MetricCard
          label="At Flow Risk" count={data.atFlowRisk}
          description="Due within 48h"
          descColor="#F59E0B"
          icon="warning" iconBg="#FFFBEB" iconColor="#F59E0B"
          gradient="linear-gradient(90deg, #F59E0B, #FBBF24)"
          glowColor="rgba(245,158,11,0.15)" borderColor="#F59E0B"
          isActive={filter === "at_flow_risk"} onClick={() => setFilter(filter === "at_flow_risk" ? "all" : "at_flow_risk")}
        />
        <MetricCard
          label="Out of Flow" count={data.outOfFlow}
          description="Overdue steps"
          descColor="#EF4444"
          icon="alert" iconBg="#FEF2F2" iconColor="#EF4444"
          gradient="linear-gradient(90deg, #EF4444, #F87171)"
          glowColor="rgba(239,68,68,0.15)" borderColor="#EF4444"
          isActive={filter === "out_of_flow"} onClick={() => setFilter(filter === "out_of_flow" ? "all" : "out_of_flow")}
        />
        <MetricCard
          label="Breakdown" count={data.flowBreakdown}
          description="Stalled matters"
          descColor="#8B5CF6"
          icon="breakdown" iconBg="#F3E8FF" iconColor="#8B5CF6"
          gradient="linear-gradient(90deg, #8B5CF6, #A78BFA)"
          glowColor="rgba(139,92,246,0.15)" borderColor="#8B5CF6"
          isActive={filter === "flow_breakdown"} onClick={() => setFilter(filter === "flow_breakdown" ? "all" : "flow_breakdown")}
        />
      </div>

      {/* ── Active filter indicator ── */}
      {filter !== "all" && (() => {
        const filterColors: Record<string, { bg: string; border: string; text: string; dot: string }> = {
          in_flow: { bg: "#ECFDF5", border: "#BBF7D0", text: "#065F46", dot: "#22C55E" },
          at_flow_risk: { bg: "#FFFBEB", border: "#FDE68A", text: "#92400E", dot: "#F59E0B" },
          out_of_flow: { bg: "#FEF2F2", border: "#FECACA", text: "#991B1B", dot: "#EF4444" },
          flow_breakdown: { bg: "#F3E8FF", border: "#DDD6FE", text: "#5B21B6", dot: "#8B5CF6" },
        };
        const fc = filterColors[filter] || filterColors.in_flow;
        const filterMatters = matters;
        const totalValue = filterMatters.reduce((sum, m) => sum + ((m.amountPaid || 0) * (1 - m.health.progressPercent / 100)), 0);
        return (
          <div className="flex items-center gap-3 px-4 py-2.5 rounded-[10px] mb-4" style={{ background: fc.bg, border: `1px solid ${fc.border}` }}>
            <div className="w-[8px] h-[8px] rounded-full shrink-0" style={{ background: fc.dot }} />
            <span className="text-[13px] font-semibold" style={{ color: fc.text }}>Showing: {FLOW_STATUS_LABELS[filter as keyof typeof FLOW_STATUS_LABELS]}</span>
            <span className="text-[13px]" style={{ color: fc.text }}>·</span>
            <span className="text-[13px]" style={{ color: fc.text }}>{filterMatters.length} matter{filterMatters.length !== 1 ? "s" : ""}</span>
            {totalValue > 0 && (
              <>
                <span className="text-[13px]" style={{ color: fc.text }}>·</span>
                <span className="text-[13px] font-semibold" style={{ color: fc.text }}>${Math.round(totalValue).toLocaleString()} at risk</span>
              </>
            )}
            <button onClick={() => setFilter("all")} className="ml-auto flex items-center gap-1 text-[12px] font-medium px-2.5 py-1 rounded-[6px] cursor-pointer border transition-colors"
              style={{ background: "white", borderColor: fc.border, color: fc.text }}>
              ✕ Show all
            </button>
          </div>
        );
      })()}

      {/* ── Matter Rows ── */}
      {matters.length === 0 ? (
        <EmptyState
          icon={<FolderKanban className="w-10 h-10" />}
          title={search || assigneeFilter || filter !== "all" ? "No matching matters" : "No matters yet"}
          description={search || assigneeFilter || filter !== "all" ? "Try adjusting your filters" : "Create your first matter to get started"}
          action={!search && !assigneeFilter && filter === "all" ? <button onClick={() => setShowCreate(true)} className="btn-primary">Create Matter</button> : undefined}
        />
      ) : (
        <div className="space-y-3">
          {matters.map((matter) => <MatterRow key={matter.id} matter={matter} />)}
        </div>
      )}

      {/* ── Create Matter Dialog ── */}
      {showCreate && (
        <CreateMatterDialog flows={flows} users={users} onClose={() => setShowCreate(false)} onCreated={(matterId) => { setShowCreate(false); if (matterId) router.push(`/matters/${matterId}`); else fetchData(); }} />
      )}

      {/* ── Import CSV Dialog ── */}
      {showImport && (
        <ImportCSVDialog flows={flows} users={users} onClose={() => setShowImport(false)} onImported={() => { setShowImport(false); fetchData(); }} />
      )}
    </div>
  );
}

// ============================================================
// METRIC CARD — Option C command center style
// White card with gradient accent bar on top edge.
// When selected, ring highlight appears.
// ============================================================
function MetricCard({ label, count, description, descColor, icon, iconBg, iconColor, gradient, glowColor, borderColor, isActive, onClick }: {
  label: string; count: number; description: string; descColor: string;
  icon: string; iconBg: string; iconColor: string;
  gradient: string; glowColor: string; borderColor: string;
  isActive: boolean; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        "relative overflow-hidden rounded-[16px] bg-white text-left cursor-pointer transition-all duration-150",
        "hover:-translate-y-[1px]",
        "flex flex-col h-[180px]"
      )}
      style={{
        padding: "20px 22px",
        boxShadow: isActive
          ? `0 0 0 2px ${borderColor}, 0 0 0 5px ${glowColor}, 0 1px 3px rgba(0,0,0,0.05)`
          : "0 1px 3px rgba(0,0,0,0.05)",
        border: isActive ? `2px solid ${borderColor}` : "2px solid transparent",
      }}
    >
      <div className="absolute top-0 left-0 right-0 h-[4px] rounded-t-[16px]" style={{ background: gradient }} />
      {/* Icon */}
      <div className="w-[40px] h-[40px] rounded-[10px] flex items-center justify-center mt-1 shrink-0"
        style={{ background: iconBg }}>
        <MetricIcon name={icon} color={iconColor} size={22} />
      </div>
      {/* Spacer */}
      <div className="flex-1" />
      {/* Label + description + number */}
      <div>
        <p className="text-[16px] font-bold text-[var(--color-text-primary)] m-0">{label}</p>
        <p className="text-[13px] font-medium m-0 mt-[3px]" style={{ color: descColor }}>{description}</p>
        <p className="text-[44px] font-bold text-[var(--color-text-primary)] m-0 mt-2 leading-none tracking-[-2px]">
          {count}
        </p>
      </div>
    </button>
  );
}

function MetricIcon({ name, color, size = 18 }: { name: string; color: string; size?: number }) {
  const props = { width: size, height: size, fill: "none", stroke: color, strokeWidth: 2 };
  switch (name) {
    case "briefcase":
      return <svg {...props} viewBox="0 0 24 24"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a4 4 0 0 0-8 0v2"/></svg>;
    case "check":
      return <svg {...props} viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>;
    case "warning":
      return <svg {...props} viewBox="0 0 24 24"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>;
    case "alert":
      return <svg {...props} viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>;
    case "breakdown":
      return <svg {...props} viewBox="0 0 24 24"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>;
    default:
      return null;
  }
}

// ============================================================
// MATTER ROW — 3-line layout with fixed-column line 3
//
// Line 1: Matter name + MatterFlow type pill
// Line 2: Client (person icon) + Company (building icon) + Days (clock icon)
// Line 3: [Next step — 340px fixed] | [Stage name — 170px fixed] [%] [progress bar — flex]
//
// The fixed widths on line 3 create vertical alignment across all rows:
// stage names line up, progress bars start at the same horizontal position.
// Bar length varies naturally based on step count per stage.
//
// SaaS NOTE: In production, the "Next step" text could be a quick-action link
// to jump directly to that step in the matter detail view.
// ============================================================
function MatterRow({ matter }: { matter: MatterWithHealth }) {
  const h = matter.health;
  const [viewStageOffset, setViewStageOffset] = useState(0);

  // Current stage index
  const currentStageIdx = matter.stageProgress.findIndex((sp) => sp.stageId === matter.currentStageId);

  // Viewed stage (current + offset)
  const viewIdx = Math.max(0, Math.min(matter.stageProgress.length - 1, currentStageIdx + viewStageOffset));
  const viewStage = matter.stageProgress[viewIdx];
  const viewSteps = viewStage?.steps || [];
  const viewCompleted = viewSteps.filter((s) => s.isCompleted).length;
  const viewTotal = viewSteps.length;
  const viewPercent = viewTotal > 0 ? Math.round((viewCompleted / viewTotal) * 100) : 0;
  const isBrowsing = viewStageOffset !== 0;

  // Can navigate?
  const canGoBack = viewIdx > 0;
  const canGoForward = viewIdx < matter.stageProgress.length - 1;

  // Next incomplete step in current stage (always from actual current, not browsed)
  const currentStage = matter.stageProgress.find((sp) => sp.stageId === matter.currentStageId);
  const currentSteps = currentStage?.steps || [];
  const nextStep = currentSteps.find((s) => !s.isCompleted);

  // Time in stage
  let daysInStage = 0;
  if (currentStage?.startedAt) {
    const started = parseISO(currentStage.startedAt);
    if (isValid(started)) daysInStage = Math.max(0, differenceInCalendarDays(new Date(), started));
  }

  // Urgency context for line 3
  let urgencyText = "";
  let urgencyColor = "#666";
  const overdueSteps = currentSteps.filter((s) => {
    if (s.isCompleted) return false;
    const due = s.manualDueDate || s.dueDate;
    if (!due) return false;
    const d = parseISO(due);
    return isValid(d) && differenceInCalendarDays(d, new Date()) < 0;
  });

  if (h.status === "in_flow") {
    // Show days in stage + expected days left
    const expectedDays = currentStage?.expectedDurationDays || 0;
    const daysLeft = Math.max(0, expectedDays - daysInStage);
    urgencyText = expectedDays > 0 ? `${daysInStage}d in stage · ${daysLeft}d left` : `${daysInStage}d in stage`;
    urgencyColor = "#666";
  } else if (h.status === "at_flow_risk") {
    if (nextStep) {
      const due = nextStep.manualDueDate || nextStep.dueDate;
      if (due) {
        const daysUntil = differenceInCalendarDays(parseISO(due), new Date());
        urgencyText = daysUntil <= 0 ? "Due today" : daysUntil === 1 ? "Due tomorrow" : `Due in ${daysUntil}d`;
      } else {
        urgencyText = `${daysInStage}d in stage`;
      }
    }
    urgencyColor = "#B45309";
  } else if (h.status === "out_of_flow") {
    urgencyText = overdueSteps.length > 0 ? `${overdueSteps.length} step${overdueSteps.length !== 1 ? "s" : ""} overdue` : `${daysInStage}d in stage`;
    urgencyColor = "#DC2626";
  } else if (h.status === "flow_breakdown") {
    urgencyText = `No activity ${daysInStage}d`;
    urgencyColor = "#7C3AED";
  }

  return (
    <Link
      href={`/matters/${matter.id}`}
      className={clsx(
        "flex items-center gap-4 px-6 py-5 rounded-[var(--radius-card)] no-underline",
        "bg-[var(--color-surface-card)]",
        "shadow-[var(--shadow-card)]",
        "hover:shadow-[var(--shadow-card-hover)] hover:-translate-y-px",
        "transition-all duration-150 cursor-pointer"
      )}
    >
      {/* Status dot with glow ring — amber/red outer ring for step warnings */}
      <div className="w-[14px] h-[14px] rounded-full shrink-0"
        style={{
          background: STATUS_DOT_COLORS[h.status] || "#94A3B8",
          boxShadow: h.stepWarnings > 0
            ? `0 0 0 3px ${STATUS_GLOW_COLORS[h.status] || "rgba(148,163,184,0.15)"}, 0 0 0 6px ${h.stepWarningLevel === "overdue" ? "rgba(239,68,68,0.3)" : "rgba(245,158,11,0.3)"}`
            : `0 0 0 4px ${STATUS_GLOW_COLORS[h.status] || "rgba(148,163,184,0.15)"}`,
        }}
      />

      {/* Matter info — 3 lines */}
      <div className="w-[380px] shrink-0 min-w-0">
        {/* Line 1: Name + type badge + value */}
        <div className="flex items-center gap-2.5 mb-1">
          <span className="text-[17px] font-bold text-[var(--color-text-primary)] truncate">{matter.name}</span>
          <span className="text-[13px] font-semibold text-[#777] bg-[#F0F1F3] px-2.5 py-[3px] rounded-[5px] whitespace-nowrap shrink-0">
            {matter.matterFlowName || "Custom"}
          </span>
          {matter.amountPaid > 0 && (
            <span className="text-[13px] font-semibold text-[#555] whitespace-nowrap shrink-0">
              ${matter.amountPaid.toLocaleString()}
            </span>
          )}
        </div>
        {/* Line 2: Client · Company */}
        <p className="text-[14px] font-medium text-[#888] m-0 mb-1.5 truncate">
          {matter.clientName}
          {matter.clientCompany ? ` · ${matter.clientCompany}` : ""}
        </p>
        {/* Line 3: Status badge + Next step + Urgency */}
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-[12px] font-semibold px-2 py-[2px] rounded-[4px]"
            style={{ background: STATUS_BADGE_BG[h.status] || "#F5F5F7", color: STATUS_BADGE_TEXT[h.status] || "#666" }}>
            {FLOW_STATUS_LABELS[h.status]}
          </span>
          {h.stepWarnings > 0 && (
            <span className="text-[12px] font-semibold px-2 py-[2px] rounded-[4px]"
              style={{ background: h.stepWarningLevel === "overdue" ? "#FEF2F2" : "#FFFBEB", color: h.stepWarningLevel === "overdue" ? "#991B1B" : "#92400E" }}>
              {h.stepWarnings} step watch
            </span>
          )}
          {nextStep ? (
            <span className="text-[12px] font-medium text-[#666]">
              Next: <strong className="text-[#333] font-semibold">{nextStep.stepName}</strong>
            </span>
          ) : (
            <span className="text-[12px] font-semibold text-[#059669]">All steps complete</span>
          )}
          {urgencyText && (
            <>
              <span className="text-[12px] text-[#CCC]">·</span>
              <span className="text-[12px] font-semibold" style={{ color: urgencyColor }}>{urgencyText}</span>
            </>
          )}
        </div>
      </div>

      {/* Right side: Stage name + segmented bar + % */}
      <div className="flex-1 flex items-center gap-3 min-w-0">
        <div className="w-[190px] shrink-0 relative group/stage">
          <span className="text-[11px] text-[var(--color-text-tertiary)] block" style={{ marginBottom: "1px" }}>
            Stage {viewIdx + 1} of {matter.stageProgress.length}
          </span>
          <span className="text-[14px] font-medium text-[#888] truncate text-left block">
            {viewStage?.stageName || h.currentStageName || "—"}
          </span>
          {(viewStage?.stageName || h.currentStageName) && (
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1.5 rounded-[6px] text-[11px] font-medium text-white whitespace-nowrap pointer-events-none opacity-0 group-hover/stage:opacity-100 transition-opacity duration-100 z-10"
              style={{ background: "#1E2028" }}>
              {viewStage?.stageName || h.currentStageName}
              <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0" style={{ borderLeft: "5px solid transparent", borderRight: "5px solid transparent", borderTop: "5px solid #1E2028" }} />
            </div>
          )}
        </div>
        {/* Segmented progress bar with stage navigation */}
        <div className="flex-1 min-w-[80px]">
          <div className="flex gap-[3px] items-center" style={{ height: "22px" }}>
            {/* Back chevrons */}
            {canGoBack && (
              <span onClick={(e) => { e.preventDefault(); e.stopPropagation(); setViewStageOffset(viewStageOffset - 1); }}
                className="shrink-0 cursor-pointer hover:opacity-70 select-none" style={{ fontSize: "18px", fontWeight: 700, color: "#A0A3AB", lineHeight: 1 }}
                title={`Previous: ${matter.stageProgress[viewIdx - 1]?.stageName}`}>‹‹‹</span>
            )}
            <div className="flex-1 flex gap-[3px] items-end" style={{ height: "22px" }}>
            {viewSteps.map((step) => {
              const isWithClient = step.withClient && !step.isCompleted;
              const dueDate = step.manualDueDate || step.dueDate;
              const tooltip = step.isCompleted
                ? `${step.stepName} ✓`
                : isWithClient
                  ? `${step.stepName} — With client`
                  : dueDate
                    ? `${step.stepName} — Due ${dueDate}`
                    : step.stepName;
              return (
                <div key={step.id} className="flex-1 flex flex-col group/tip relative" style={{ height: "100%", justifyContent: isWithClient ? "flex-start" : "flex-end" }}>
                  <div className="rounded-[4px]"
                    style={{
                      height: "7px",
                      background: step.isCompleted
                        ? "#22C55E"
                        : isWithClient
                          ? "#22C55E"
                          : (() => {
                              if (!dueDate) return "#E0E2E6";
                              const due = parseISO(dueDate);
                              if (!isValid(due)) return "#E0E2E6";
                              const daysUntilDue = differenceInCalendarDays(due, new Date());
                              if (daysUntilDue < 0) return "#EF4444";
                              if (daysUntilDue <= 3) return "#F59E0B";
                              return "#E0E2E6";
                            })(),
                      opacity: isWithClient ? 0.75 : 1,
                    }}
                  />
                  <div className="absolute inset-0 cursor-default" />
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1.5 rounded-[6px] text-[11px] font-medium text-white whitespace-nowrap pointer-events-none opacity-0 group-hover/tip:opacity-100 transition-opacity duration-100 z-10"
                    style={{ background: "#1E2028" }}>
                    {tooltip}
                    <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0" style={{ borderLeft: "5px solid transparent", borderRight: "5px solid transparent", borderTop: "5px solid #1E2028" }} />
                  </div>
                </div>
              );
            })}
            {viewSteps.length === 0 && <div className="h-[7px] flex-1 rounded-[4px]" style={{ background: "#E0E2E6" }} />}
            </div>
            {/* Forward chevrons */}
            {canGoForward && (
              <span onClick={(e) => { e.preventDefault(); e.stopPropagation(); setViewStageOffset(viewStageOffset + 1); }}
                className="shrink-0 cursor-pointer hover:opacity-70 select-none" style={{ fontSize: "18px", fontWeight: 700, color: "#A0A3AB", lineHeight: 1 }}
                title={`Next: ${matter.stageProgress[viewIdx + 1]?.stageName}`}>›››</span>
            )}
          </div>
          {/* Labels for with-client segments */}
          {viewSteps.some((s) => s.withClient && !s.isCompleted) && (
            <div className="flex gap-[3px]" style={{ marginTop: "2px" }}>
              {viewSteps.map((step) => {
                if (step.withClient && !step.isCompleted) {
                  let d = 0;
                  if (step.withClientSince) {
                    const since = parseISO(step.withClientSince);
                    if (isValid(since)) d = Math.max(0, differenceInCalendarDays(new Date(), since));
                  }
                  return <span key={step.id} className="flex-1 text-[9px] font-semibold text-[#B45309] text-center truncate">↑ Client{d > 0 ? ` ${d}d` : ""}</span>;
                }
                return <span key={step.id} className="flex-1" />;
              })}
            </div>
          )}
        </div>
        <div className="shrink-0 text-right" style={{ minWidth: "70px" }}>
          <span className="text-[15px] font-bold text-[var(--color-text-primary)]">
            {viewPercent}%
          </span>
          {matter.amountPaid > 0 && (() => {
            const valueRemaining = Math.round(matter.amountPaid * (1 - h.progressPercent / 100));
            const isAtRisk = h.status === "out_of_flow" || h.status === "flow_breakdown";
            return (
              <p className="text-[11px] font-semibold m-0" style={{ color: isAtRisk ? (STATUS_BADGE_TEXT[h.status] || "#888") : "#888" }}>
                ${valueRemaining.toLocaleString()} at risk
              </p>
            );
          })()}
        </div>
      </div>
    </Link>
  );
}

const STATUS_BADGE_BG: Record<string, string> = {
  in_flow: "#ECFDF5",
  at_flow_risk: "#FFFBEB",
  out_of_flow: "#FEF2F2",
  flow_breakdown: "#F3E8FF",
};

const STATUS_BADGE_TEXT: Record<string, string> = {
  in_flow: "#059669",
  at_flow_risk: "#B45309",
  out_of_flow: "#DC2626",
  flow_breakdown: "#7C3AED",
};

const STATUS_DOT_COLORS: Record<string, string> = {
  in_flow: "#22C55E",
  at_flow_risk: "#F59E0B",
  out_of_flow: "#EF4444",
  flow_breakdown: "#EF4444",
};

const STATUS_GLOW_COLORS: Record<string, string> = {
  in_flow: "rgba(34,197,94,0.15)",
  at_flow_risk: "rgba(245,158,11,0.15)",
  out_of_flow: "rgba(239,68,68,0.15)",
  flow_breakdown: "rgba(239,68,68,0.15)",
};

const STATUS_GRADIENT: Record<string, string> = {
  in_flow: "linear-gradient(90deg, #22C55E, #4ADE80)",
  at_flow_risk: "linear-gradient(90deg, #F59E0B, #FBBF24)",
  out_of_flow: "linear-gradient(90deg, #EF4444, #F87171)",
  flow_breakdown: "linear-gradient(90deg, #8B5CF6, #A78BFA)",
};

/**
 * Determine color for each step segment in the progress bar.
 * Green = completed, status color = overdue, gray = not yet due
 */
function getStepBarColor(step: MatterStepProgress, matterStatus: FlowHealthStatus): string {
  if (step.isCompleted) return "#10b981";
  const dueDate = step.manualDueDate || step.dueDate;
  if (dueDate) {
    const due = parseISO(dueDate);
    if (isValid(due)) {
      const daysUntil = differenceInCalendarDays(due, new Date());
      if (daysUntil < 0) {
        if (matterStatus === "flow_breakdown") return "#7c3aed";
        if (matterStatus === "out_of_flow") return "#ef4444";
        if (matterStatus === "at_flow_risk") return "#f59e0b";
        return "#ef4444";
      }
      if (daysUntil <= 3 && matterStatus === "at_flow_risk") return "#f59e0b";
    }
  }
  return "#d1d5db";
}

// ============================================================
// CREATE MATTER DIALOG
// SaaS NOTE: In production, matterFlowId and assignedUserId
// dropdowns are populated from tenant-scoped API calls (already the case).
// Add client-side validation and server-side auth checks.
// ============================================================
function CreateMatterDialog({
  flows, users, onClose, onCreated,
}: {
  flows: MatterFlow[]; users: UserType[];
  onClose: () => void; onCreated: (matterId?: string) => void;
}) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "", clientName: "", clientCompany: "", clientEmail: "",
    description: "", matterFlowId: "", assignedUserId: "", referenceNumber: "",
    startDate: new Date().toISOString().split("T")[0],
    targetEndDate: "",
    amountPaid: "",
  });

  // Compute due date warning
  const selectedFlow = flows.find((f) => f.id === form.matterFlowId);
  const totalFlowDays = selectedFlow
    ? selectedFlow.stages.reduce((sum, s) => sum + (s.expectedDurationDays || 0), 0)
    : 0;

  let dueDateWarning = "";
  if (form.startDate && form.targetEndDate && totalFlowDays > 0) {
    const start = new Date(form.startDate);
    const due = new Date(form.targetEndDate);
    const availableDays = Math.round((due.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    if (availableDays < totalFlowDays) {
      const deficit = totalFlowDays - availableDays;
      dueDateWarning = `This due date is ${deficit} day${deficit !== 1 ? "s" : ""} before the workflow would normally complete (${totalFlowDays} days). Steps may need to be completed faster than their default durations.`;
    }
  }

  const handleSubmit = async () => {
    if (!form.name || !form.clientName || !form.matterFlowId) return;
    setSaving(true);
    try {
      const res = await fetch("/api/matters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          amountPaid: form.amountPaid ? parseFloat(form.amountPaid) : 0,
        }),
      });
      const created = await res.json();
      onCreated(created?.id);
    } catch (err) { console.error("Failed to create matter:", err); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-[16px] shadow-xl w-full max-w-xl p-7 mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-[20px] font-bold">New Matter</h2>
          <button onClick={onClose} className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] cursor-pointer"><X className="w-5 h-5" /></button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-[13px] font-medium text-[var(--color-text-secondary)] mb-1.5">Matter Name *</label>
            <input className="input-field py-2.5" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g., Acme Fund 506(b) Offering" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[13px] font-medium text-[var(--color-text-secondary)] mb-1.5">Client Name *</label>
              <ClientAutocomplete
                value={form.clientName}
                onChange={(name) => setForm({ ...form, clientName: name })}
                onSelect={(c) => setForm({ ...form, clientName: c.clientName, clientCompany: c.clientCompany, clientEmail: c.clientEmail })}
                placeholder="Start typing to search..."
              />
            </div>
            <div><label className="block text-[13px] font-medium text-[var(--color-text-secondary)] mb-1.5">Client Company</label><input className="input-field py-2.5" value={form.clientCompany} onChange={(e) => setForm({ ...form, clientCompany: e.target.value })} placeholder="Optional" /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-[13px] font-medium text-[var(--color-text-secondary)] mb-1.5">Client Email</label><input className="input-field py-2.5" type="email" value={form.clientEmail} onChange={(e) => setForm({ ...form, clientEmail: e.target.value })} placeholder="client@email.com" /></div>
            <div><label className="block text-[13px] font-medium text-[var(--color-text-secondary)] mb-1.5">Reference #</label><input className="input-field py-2.5" value={form.referenceNumber} onChange={(e) => setForm({ ...form, referenceNumber: e.target.value })} placeholder="PPM-2026-007" /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-[13px] font-medium text-[var(--color-text-secondary)] mb-1.5">Workflow *</label><select className="input-field py-2.5" value={form.matterFlowId} onChange={(e) => setForm({ ...form, matterFlowId: e.target.value })}><option value="">Select workflow...</option>{flows.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}</select></div>
            <div><label className="block text-[13px] font-medium text-[var(--color-text-secondary)] mb-1.5">Assigned To</label><select className="input-field py-2.5" value={form.assignedUserId} onChange={(e) => setForm({ ...form, assignedUserId: e.target.value })}><option value="">Unassigned</option>{users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</select></div>
          </div>
          {/* ── Engagement Date, Due Date, Amount Paid ── */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-[13px] font-medium text-[var(--color-text-secondary)] mb-1.5">Engagement Date</label>
              <input className="input-field py-2.5" type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
            </div>
            <div>
              <label className="block text-[13px] font-medium text-[var(--color-text-secondary)] mb-1.5">Overall Due Date</label>
              <input className="input-field py-2.5" type="date" value={form.targetEndDate} onChange={(e) => setForm({ ...form, targetEndDate: e.target.value })} />
            </div>
            <div>
              <label className="block text-[13px] font-medium text-[var(--color-text-secondary)] mb-1.5">Amount Paid ($)</label>
              <input className="input-field py-2.5" type="number" min="0" step="100" value={form.amountPaid} onChange={(e) => setForm({ ...form, amountPaid: e.target.value })} placeholder="0.00" />
            </div>
          </div>
          {/* Due date warning */}
          {dueDateWarning && (
            <div className="flex items-start gap-2.5 px-4 py-3 rounded-[10px]" style={{ background: "#FFFBEB", border: "1px solid #FDE68A" }}>
              <AlertTriangle className="w-[16px] h-[16px] text-[#F59E0B] mt-0.5 shrink-0" />
              <p className="text-[12.5px] text-[#92400E] m-0 leading-relaxed">{dueDateWarning}</p>
            </div>
          )}
          <div><label className="block text-[13px] font-medium text-[var(--color-text-secondary)] mb-1.5">Description</label><textarea className="input-field py-2.5 resize-none h-20" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Brief description..." /></div>
        </div>
        <div className="flex items-center justify-end gap-3 mt-7 pt-5 border-t border-[var(--color-border)]">
          <button onClick={onClose} className="btn-secondary py-2.5 px-5">Cancel</button>
          <button onClick={handleSubmit} disabled={!form.name || !form.clientName || !form.matterFlowId || saving} className={clsx("btn-primary py-2.5 px-5", (!form.name || !form.clientName || !form.matterFlowId || saving) && "opacity-50 cursor-not-allowed")}>
            {saving ? "Creating..." : "Create Matter"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// IMPORT CSV DIALOG
//
// 4-step wizard:
// 1. Upload — pick a CSV file (+ download template link)
// 2. Map columns — match CSV headers to MatterFlow fields
// 3. Preview & validate — show parsed data, flag issues
// 4. Import — create matters from valid rows
//
// SaaS NOTES:
// - CSV import is critical for onboarding. New firms migrating from
//   spreadsheets, Clio, PracticePanther, etc. need this on day one.
// - In production, add: file size limits, rate limiting, background
//   processing for large imports (100+ rows), import history/audit log.
// - Column mapping preferences could be saved per-firm so repeat
//   imports from the same source auto-map correctly.
// ============================================================

const MAPPABLE_FIELDS = [
  { key: "name", label: "Matter Name", required: true },
  { key: "clientName", label: "Client Name", required: true },
  { key: "clientCompany", label: "Client Company", required: false },
  { key: "clientEmail", label: "Client Email", required: false },
  { key: "referenceNumber", label: "Reference Number", required: false },
  { key: "matterFlowName", label: "Workflow", required: true },
  { key: "assignedUserName", label: "Assigned Attorney", required: false },
  { key: "description", label: "Description", required: false },
  { key: "startDate", label: "Start / Engagement Date", required: false },
] as const;

type MappableFieldKey = typeof MAPPABLE_FIELDS[number]["key"];

const AUTO_MAP_KEYWORDS: Record<MappableFieldKey, string[]> = {
  name: ["matter", "deal", "offering", "fund name", "matter name", "deal name"],
  clientName: ["client", "contact", "client name", "contact name"],
  clientCompany: ["company", "entity", "firm", "organization", "client company"],
  clientEmail: ["email", "e-mail", "client email"],
  referenceNumber: ["reference", "ref", "number", "ppm", "id", "matter id", "ref number"],
  matterFlowName: ["template", "workflow", "matterflow", "flow", "type", "matter type"],
  assignedUserName: ["attorney", "assigned", "lawyer", "associate", "assigned to", "owner"],
  description: ["description", "notes", "details", "memo"],
  startDate: ["date", "start", "engagement", "start date", "engagement date", "created"],
};

type ImportStep = "upload" | "map" | "preview" | "importing" | "done";

interface ParsedRow {
  raw: Record<string, string>;
  mapped: Partial<Record<MappableFieldKey, string>>;
  errors: string[];
  matchedFlowId: string | null;
  matchedUserId: string | null;
}

function ImportCSVDialog({ flows, users, onClose, onImported }: {
  flows: MatterFlow[]; users: UserType[];
  onClose: () => void; onImported: () => void;
}) {
  const [step, setStep] = useState<ImportStep>("upload");
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvRows, setCsvRows] = useState<Record<string, string>[]>([]);
  const [columnMap, setColumnMap] = useState<Record<string, MappableFieldKey | "">>({});
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [importedCount, setImportedCount] = useState(0);
  const [importErrors, setImportErrors] = useState(0);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split(/\r?\n/).filter((l) => l.trim());
      if (lines.length < 2) return;
      const headers = parseCSVLine(lines[0]);
      setCsvHeaders(headers);
      const rows = lines.slice(1).map((line) => {
        const values = parseCSVLine(line);
        const row: Record<string, string> = {};
        headers.forEach((h, i) => { row[h] = values[i]?.trim() || ""; });
        return row;
      }).filter((row) => Object.values(row).some((v) => v));
      setCsvRows(rows);
      const autoMap: Record<string, MappableFieldKey | ""> = {};
      headers.forEach((header) => {
        const h = header.toLowerCase().trim();
        let matched: MappableFieldKey | "" = "";
        for (const field of MAPPABLE_FIELDS) {
          const keywords = AUTO_MAP_KEYWORDS[field.key];
          if (keywords.some((kw) => h === kw || h.includes(kw) || kw.includes(h))) { matched = field.key; break; }
        }
        autoMap[header] = matched;
      });
      setColumnMap(autoMap);
      setStep("map");
    };
    reader.readAsText(file);
  };

  const handleProceedToPreview = () => {
    const rows: ParsedRow[] = csvRows.map((raw) => {
      const mapped: Partial<Record<MappableFieldKey, string>> = {};
      const errors: string[] = [];
      for (const [csvHeader, fieldKey] of Object.entries(columnMap)) {
        if (fieldKey && raw[csvHeader]) mapped[fieldKey] = raw[csvHeader];
      }
      if (!mapped.name) errors.push("Missing matter name");
      if (!mapped.clientName) errors.push("Missing client name");
      if (!mapped.matterFlowName) errors.push("Missing workflow template");
      let matchedFlowId: string | null = null;
      if (mapped.matterFlowName) {
        const needle = mapped.matterFlowName.toLowerCase().trim();
        const match = flows.find((f) => f.name.toLowerCase() === needle || f.name.toLowerCase().includes(needle) || needle.includes(f.name.toLowerCase()));
        if (match) matchedFlowId = match.id;
        else errors.push(`MatterFlow "${mapped.matterFlowName}" not found`);
      }
      let matchedUserId: string | null = null;
      if (mapped.assignedUserName) {
        const needle = mapped.assignedUserName.toLowerCase().trim();
        const match = users.find((u) => u.name.toLowerCase() === needle || u.name.toLowerCase().includes(needle) || needle.includes(u.name.toLowerCase()));
        if (match) matchedUserId = match.id;
      }
      return { raw, mapped, errors, matchedFlowId, matchedUserId };
    });
    setParsedRows(rows);
    setStep("preview");
  };

  const handleImport = async () => {
    setStep("importing");
    let imported = 0;
    let errs = 0;
    for (const row of parsedRows) {
      if (row.errors.length > 0 || !row.matchedFlowId) { errs++; continue; }
      try {
        await fetch("/api/matters", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: row.mapped.name, clientName: row.mapped.clientName,
            clientCompany: row.mapped.clientCompany || "", clientEmail: row.mapped.clientEmail || "",
            description: row.mapped.description || "", matterFlowId: row.matchedFlowId,
            assignedUserId: row.matchedUserId || "", referenceNumber: row.mapped.referenceNumber || "",
            startDate: row.mapped.startDate || undefined,
          }),
        });
        imported++;
      } catch { errs++; }
    }
    setImportedCount(imported);
    setImportErrors(errs);
    setStep("done");
  };

  const fixRowFlow = (rowIdx: number, flowId: string) => {
    setParsedRows((prev) => prev.map((r, i) => {
      if (i !== rowIdx) return r;
      const newErrors = r.errors.filter((e) => !e.includes("not found"));
      return { ...r, matchedFlowId: flowId || null, errors: !flowId ? [...newErrors, "Missing workflow template"] : newErrors };
    }));
  };

  const validCount = parsedRows.filter((r) => r.errors.length === 0 && r.matchedFlowId).length;
  const invalidCount = parsedRows.length - validCount;

  const downloadTemplate = () => {
    const headers = MAPPABLE_FIELDS.map((f) => f.label).join(",");
    const example = "Acme Fund 506(b),John Smith,Acme Corp,john@acme.com,PPM-2026-010,Reg D Private Placement,Erik Weingold,New offering for Acme,2026-04-01";
    const blob = new Blob([headers + "\n" + example + "\n"], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "matterflow_import_template.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-[16px] shadow-xl w-full max-w-3xl max-h-[85vh] flex flex-col mx-4">
        <div className="flex items-center justify-between p-7 pb-0">
          <div>
            <h2 className="text-[20px] font-bold text-[var(--color-text-primary)]">Import Matters from CSV</h2>
            <p className="text-[14px] text-[var(--color-text-muted)] mt-1">
              {step === "upload" && "Upload a CSV file with your matters"}
              {step === "map" && `Map your CSV columns to matter fields — ${csvRows.length} rows found`}
              {step === "preview" && `Review ${parsedRows.length} matters before importing`}
              {step === "importing" && "Importing matters..."}
              {step === "done" && "Import complete"}
            </p>
          </div>
          <button onClick={step === "done" ? onImported : onClose} className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] cursor-pointer shrink-0"><X className="w-5 h-5" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-7">

          {step === "upload" && (
            <div>
              <label className="block border-2 border-dashed border-[var(--color-border)] rounded-[10px] p-12 text-center hover:border-[var(--color-mf-400)] transition-colors cursor-pointer">
                <Upload className="w-10 h-10 text-[var(--color-text-muted)] mx-auto mb-4" />
                <p className="text-[16px] font-medium text-[var(--color-text-primary)] mb-2">Drop your CSV here or click to browse</p>
                <p className="text-[14px] text-[var(--color-text-muted)]">Supports .csv files with headers in the first row</p>
                <input type="file" accept=".csv,text/csv" onChange={handleFileUpload} className="hidden" />
              </label>
              <button onClick={downloadTemplate} className="flex items-center gap-2 text-[14px] text-[var(--color-mf-600)] hover:text-[var(--color-mf-700)] mt-4 cursor-pointer font-medium bg-transparent border-none">
                <Download className="w-4 h-4" /> Download template CSV
              </button>
            </div>
          )}

          {step === "map" && (
            <div>
              <div className="space-y-3">
                {csvHeaders.map((header) => (
                  <div key={header} className="flex items-center gap-4 px-4 py-3 rounded-[10px] bg-[var(--color-surface-dim)] border border-[var(--color-border-light)]">
                    <div className="w-[200px] shrink-0">
                      <span className="text-[14px] font-medium text-[var(--color-text-primary)]">{header}</span>
                      <p className="text-[12px] text-[var(--color-text-muted)] mt-0.5 truncate">e.g., {csvRows[0]?.[header] || "—"}</p>
                    </div>
                    <span className="text-[14px] text-[var(--color-text-muted)] shrink-0">→</span>
                    <select className="input-field py-2 text-[14px] flex-1" value={columnMap[header] || ""} onChange={(e) => setColumnMap({ ...columnMap, [header]: e.target.value as MappableFieldKey | "" })}>
                      <option value="">(skip this column)</option>
                      {MAPPABLE_FIELDS.map((f) => <option key={f.key} value={f.key}>{f.label}{f.required ? " *" : ""}</option>)}
                    </select>
                  </div>
                ))}
              </div>
              <div className="mt-4 px-4 py-3 rounded-[10px] bg-[var(--color-mf-50)] border border-[var(--color-mf-200)]">
                <p className="text-[13px] text-[var(--color-mf-800)] m-0"><strong className="font-medium">Required fields:</strong> Matter Name, Client Name, and Workflow template must each be mapped to a column.</p>
              </div>
              <div className="flex justify-end mt-6">
                <button onClick={() => setStep("upload")} className="btn-secondary py-2.5 px-5 mr-3">Back</button>
                <button onClick={handleProceedToPreview} disabled={!Object.values(columnMap).includes("name") || !Object.values(columnMap).includes("clientName") || !Object.values(columnMap).includes("matterFlowName")} className={clsx("btn-primary py-2.5 px-5", (!Object.values(columnMap).includes("name") || !Object.values(columnMap).includes("clientName") || !Object.values(columnMap).includes("matterFlowName")) && "opacity-50 cursor-not-allowed")}>
                  Preview Import
                </button>
              </div>
            </div>
          )}

          {step === "preview" && (
            <div>
              <div className="flex gap-4 mb-5">
                <div className="flex-1 px-4 py-3 rounded-[10px] bg-emerald-50 border border-emerald-200">
                  <span className="text-[22px] font-semibold text-emerald-800">{validCount}</span>
                  <span className="text-[14px] text-emerald-600 ml-2">ready to import</span>
                </div>
                {invalidCount > 0 && (
                  <div className="flex-1 px-4 py-3 rounded-[10px] bg-red-50 border border-red-200">
                    <span className="text-[22px] font-semibold text-red-800">{invalidCount}</span>
                    <span className="text-[14px] text-red-600 ml-2">with issues</span>
                  </div>
                )}
              </div>
              <div className="space-y-2">
                {parsedRows.map((row, idx) => {
                  const hasErrors = row.errors.length > 0 || !row.matchedFlowId;
                  return (
                    <div key={idx} className={clsx("px-4 py-3 rounded-[10px] border", hasErrors ? "bg-red-50/50 border-red-200" : "bg-[var(--color-surface-dim)] border-[var(--color-border-light)]")}>
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 shrink-0">{hasErrors ? <AlertCircle className="w-4 h-4 text-red-500" /> : <CheckIcon className="w-4 h-4 text-emerald-500" />}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-1">
                            <span className="text-[15px] font-medium text-[var(--color-text-primary)]">{row.mapped.name || "(no name)"}</span>
                            <span className="text-[13px] text-[var(--color-text-muted)]">{row.mapped.clientName || "(no client)"}</span>
                            {row.mapped.clientCompany && <span className="text-[13px] text-[var(--color-text-muted)]">· {row.mapped.clientCompany}</span>}
                          </div>
                          {row.errors.length > 0 && <div className="flex flex-wrap gap-2 mt-1">{row.errors.map((err, ei) => <span key={ei} className="text-[12px] text-red-600 bg-red-100 px-2 py-0.5 rounded-full">{err}</span>)}</div>}
                          {!row.matchedFlowId && row.mapped.matterFlowName && (
                            <div className="flex items-center gap-2 mt-2">
                              <span className="text-[12px] text-[var(--color-text-muted)]">Assign template:</span>
                              <select className="input-field py-1 text-[12px] w-auto" value="" onChange={(e) => fixRowFlow(idx, e.target.value)}>
                                <option value="">Select...</option>
                                {flows.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
                              </select>
                            </div>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          {row.matchedFlowId ? (
                            <span className="text-[12px] font-medium px-2.5 py-0.5 rounded-full border border-[var(--color-border)] text-[var(--color-text-muted)]">{flows.find((f) => f.id === row.matchedFlowId)?.name || "—"}</span>
                          ) : (
                            <span className="text-[12px] font-medium px-2.5 py-0.5 rounded-full bg-red-100 text-red-600">No template</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-end mt-6">
                <button onClick={() => setStep("map")} className="btn-secondary py-2.5 px-5 mr-3">Back</button>
                <button onClick={handleImport} disabled={validCount === 0} className={clsx("btn-primary py-2.5 px-5", validCount === 0 && "opacity-50 cursor-not-allowed")}>
                  Import {validCount} Matter{validCount !== 1 ? "s" : ""}
                </button>
              </div>
            </div>
          )}

          {step === "importing" && (
            <div className="text-center py-12">
              <div className="w-10 h-10 border-4 border-[var(--color-mf-200)] border-t-[var(--color-mf-600)] rounded-full animate-spin mx-auto mb-4" />
              <p className="text-[16px] font-medium text-[var(--color-text-primary)]">Importing matters...</p>
            </div>
          )}

          {step === "done" && (
            <div className="text-center py-12">
              <CheckIcon className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
              <p className="text-[20px] font-semibold text-[var(--color-text-primary)] mb-2">Import Complete</p>
              <p className="text-[16px] text-[var(--color-text-secondary)]">
                Successfully imported <strong>{importedCount}</strong> matter{importedCount !== 1 ? "s" : ""}
                {importErrors > 0 && <> · <span className="text-red-600">{importErrors} skipped</span></>}
              </p>
              <button onClick={onImported} className="btn-primary py-2.5 px-6 mt-6">Done</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) { result.push(current.trim()); current = ""; }
    else current += char;
  }
  result.push(current.trim());
  return result;
}
