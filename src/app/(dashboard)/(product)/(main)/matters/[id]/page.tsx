/**
 * MATTER DETAIL PAGE
 *
 * Shows full detail for a single matter:
 * - Client profile card (avatar, name, company, email, engagement date, attorney)
 * - Flow Health Bar (node-based segmented timeline)
 * - Stage cards (collapsible, with step rows and date controls)
 * - Previous / Next navigation
 *
 * SaaS NOTES:
 * - The "Close Matter" button sets status to "completed" with a timestamp.
 *   In production, add an audit log entry and optionally trigger a notification.
 * - The MatterFlow dropdown recreates stage progress when switched.
 *   In production, consider a dedicated API endpoint instead of delete+recreate.
 * - Previous/Next navigation uses the dashboard matter list order.
 *   In production, this should respect the user's current sort/filter context.
 */
"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { PageLoader } from "@/components/ui/Spinner";
import { StatusBadge } from "@/components/ui/StatusBadge";
import Link from "next/link";
import {
  ArrowLeft, Check, Clock, AlertTriangle, Calendar, ChevronDown,
  ChevronLeft, ChevronRight, Trash2, X, CheckCircle2, FileText,
  Shield, Briefcase, Building2, Archive, Pencil,
} from "lucide-react";
import { clsx } from "clsx";
import { ClientAutocomplete } from "@/components/ui/ClientAutocomplete";
import type {
  Matter, FlowHealthResult, MatterStageProgress, MatterStepProgress,
  MatterWithHealth, MatterFlow, User,
} from "@/types";
import { computeFlowHealth } from "@/lib/flow-engine";
import { FLOW_STATUS_LABELS } from "@/types";
import { differenceInCalendarDays, parseISO, format, isValid } from "date-fns";
import { toast } from "sonner";

export default function MatterDetailPage() {
  const params = useParams();
  const router = useRouter();
  const matterId = params.id as string;

  const [matter, setMatter] = useState<Matter | null>(null);
  const [health, setHealth] = useState<FlowHealthResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [advancing, setAdvancing] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [matterFlows, setMatterFlows] = useState<MatterFlow[]>([]);
  const [allMatterIds, setAllMatterIds] = useState<string[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  const fetchMatter = useCallback(async () => {
    try {
      const res = await fetch(`/api/matters/${matterId}`);
      if (!res.ok) { router.push("/dashboard"); return; }
      const m: Matter = await res.json();
      setMatter(m);
      setHealth(computeFlowHealth({
        stageProgress: m.stageProgress, currentStageId: m.currentStageId,
        startDate: m.startDate, status: m.status,
      }));
    } catch (err) { console.error("Failed to load matter:", err); }
    finally { setLoading(false); }
  }, [matterId, router]);

  useEffect(() => {
    fetch("/api/matterflows").then((r) => r.json()).then(setMatterFlows);
    fetch("/api/users").then((r) => r.json()).then(setUsers);
    fetch("/api/dashboard").then((r) => r.json()).then((data) => {
      if (data.matters) setAllMatterIds(data.matters.map((m: MatterWithHealth) => m.id));
    });
  }, []);

  useEffect(() => { fetchMatter(); }, [fetchMatter]);

  // ── Actions ──

  const toggleStep = async (stepProgressId: string) => {
    try {
      const res = await fetch(`/api/matters/${matterId}/steps`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stepProgressId }),
      });
      if (!res.ok) {
        const errorData = await res.json();
        toast.error(errorData.error || "Save failed");
        return;
      }
      fetchMatter();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
      console.error("Failed:", err);
    }
    
  };

  const toggleWithClient = async (stepProgressId: string) => {
    try {
      const res = await fetch(`/api/matters/${matterId}/steps/with-client`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stepProgressId }),
      });
      if (!res.ok) {
        const errorData = await res.json();
        toast.error(errorData.error || "Save failed");
        return;
      }
      fetchMatter();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
      console.error("Failed:", err);
    }
  };

  const handleAdvanceStage = async () => {
    if (!confirm("Advance to the next Flow Stage? The current stage will be marked complete.")) return;
    setAdvancing(true);
    try { 
      const res = await fetch(`/api/matters/${matterId}/advance`, { method: "POST" }); fetchMatter(); 
      if (!res.ok) {
        const errorData = await res.json();
        toast.error(errorData.error || "Save failed");
        return;
      }
    }catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
      console.error("Failed:", err);
    }
    finally { setAdvancing(false); }
  };

  /** Close/archive the matter — sets status to "completed" */
  const handleCloseMatter = async () => {
    if (!confirm("Close this matter? It will be marked as completed and removed from the active list.")) return;
    try {
      const res = await fetch(`/api/matters/${matterId}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "completed" }),
      });
      if (!res.ok) {
        const errorData = await res.json();
        toast.error(errorData.error || "Save failed");
        return;
      }
      router.push("/dashboard");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
      console.error("Failed:", err);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Delete this matter permanently? This cannot be undone.")) return;
    try {
      const res = await fetch(`/api/matters/${matterId}`, { method: "DELETE" });
      if (!res.ok) {
        const errorData = await res.json();
        toast.error(errorData.error || "Save failed");
        return;
      }
      router.push("/dashboard");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
      console.error("Failed:", err);
    }
  };

  /** Switch to a different MatterFlow template (destructive — resets progress) */
  const handleChangeMatterFlow = async (newFlowId: string) => {
    if (!matter || newFlowId === matter.matterFlowId) return;
    const flow = matterFlows.find((f) => f.id === newFlowId);
    if (!flow || !confirm(`Switch to "${flow.name}"? This resets all stage and step progress.`)) return;
    try {
      const resD = await fetch(`/api/matters/${matterId}`, { method: "DELETE" });
      if (!resD.ok) {
        const errorData = await resD.json();
        toast.error(errorData.error || "Save failed");
        return;
      }
      const res = await fetch("/api/matters", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: matter.name, clientName: matter.clientName,
          clientCompany: matter.clientCompany || "", clientEmail: matter.clientEmail || "",
          description: matter.description || "", matterFlowId: newFlowId,
          assignedUserId: matter.assignedUserId || "", referenceNumber: matter.referenceNumber || "",
          startDate: matter.startDate,
        }),
      });
      const newMatter = await res.json();
      router.push(`/matters/${newMatter.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
      console.error("Failed:", err);
    }
  };

  if (loading) return <PageLoader />;
  if (!matter || !health) return null;

  const currentStageIdx = matter.stageProgress.findIndex((sp) => sp.stageId === matter.currentStageId);
  const canAdvance = currentStageIdx >= 0 && currentStageIdx < matter.stageProgress.length - 1;
  const assignedUser = users.find((u) => u.id === matter.assignedUserId);

  // Prev / Next
  const ci = allMatterIds.indexOf(matterId);
  const prevId = ci > 0 ? allMatterIds[ci - 1] : null;
  const nextId = ci >= 0 && ci < allMatterIds.length - 1 ? allMatterIds[ci + 1] : null;

  // Current stage stats
  const currentStage = currentStageIdx >= 0 ? matter.stageProgress[currentStageIdx] : null;
  const csSteps = currentStage?.steps || [];
  const csCompleted = csSteps.filter((s) => s.isCompleted).length;
  const csTotal = csSteps.length;

  // Client initials for avatar
  const initials = matter.clientName.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);

  // Status-aware summary colors
  const isHealthy = health.status === "in_flow";
  const sBg = isHealthy ? "bg-emerald-50" : health.status === "at_flow_risk" ? "bg-amber-50" : health.status === "out_of_flow" ? "bg-red-50" : "bg-violet-50";
  const sBorder = isHealthy ? "border-emerald-200" : health.status === "at_flow_risk" ? "border-amber-200" : health.status === "out_of_flow" ? "border-red-200" : "border-violet-200";
  const sText1 = isHealthy ? "text-emerald-800" : health.status === "at_flow_risk" ? "text-amber-800" : health.status === "out_of_flow" ? "text-red-800" : "text-violet-800";
  const sText2 = isHealthy ? "text-emerald-600" : health.status === "at_flow_risk" ? "text-amber-600" : health.status === "out_of_flow" ? "text-red-600" : "text-violet-600";

  return (
    <div className="max-w-[1100px] mx-auto">
      {/* ── Top Bar ── */}
      <div className="flex items-center justify-between mb-5">
        <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-[14px] text-[var(--color-text-secondary)] hover:text-[var(--color-mf-600)] no-underline">
          <ArrowLeft className="w-4 h-4" /> Back to Home
        </Link>
        <div className="flex items-center gap-2">
          <select className="input-field text-[13px] py-1.5 pr-8 w-auto cursor-pointer" value={matter.matterFlowId} onChange={(e) => handleChangeMatterFlow(e.target.value)}>
            {matterFlows.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
          {canAdvance && (
            <button onClick={handleAdvanceStage} disabled={advancing} className="btn-primary text-[13px] py-1.5 px-4">
              {advancing ? "Advancing..." : "Advance Stage"}
            </button>
          )}
          <button onClick={() => setShowEdit(true)} className="flex items-center gap-1.5 text-[13px] font-medium py-1.5 px-4 rounded-[8px] bg-[var(--color-mf-50)] text-[var(--color-mf-700)] border border-[var(--color-mf-200)] hover:bg-[var(--color-mf-100)] transition-colors cursor-pointer">
            <Pencil className="w-3.5 h-3.5" /> Edit
          </button>
          <button onClick={handleCloseMatter} className="flex items-center gap-1.5 text-[13px] font-medium py-1.5 px-4 rounded-[8px] bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors cursor-pointer" title="Close matter and archive">
            <Archive className="w-3.5 h-3.5" /> Close Matter
          </button>
          <button onClick={() => router.push("/dashboard")} className="w-[34px] h-[34px] flex items-center justify-center rounded-full  border border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)] transition-colors cursor-pointer" title="Close">
            <X className="w-4 h-4" />
          </button>
          <button onClick={handleDelete} className="w-[34px] h-[34px] flex items-center justify-center rounded-full  border border-red-200 text-red-400 hover:text-white hover:bg-red-500 transition-colors cursor-pointer" title="Delete">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── Matter Title ── */}
      <h1 className="text-[34px] font-bold tracking-[-0.8px] text-[var(--color-text-primary)] mb-5">{matter.name}</h1>

      {/* ── Client Profile Card ── */}
      <div className="rounded-[16px] p-6 mb-4 bg-[var(--color-surface-card)] shadow-[var(--shadow-card)]">
        <div className="flex items-start gap-5">
          <div className="w-[68px] h-[68px] rounded-[16px] bg-gradient-to-br from-[var(--color-mf-400)] to-[var(--color-mf-700)] flex items-center justify-center text-white text-[22px] font-semibold shrink-0 shadow-sm">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2.5 mb-1">
              <span className="text-[20px] font-semibold text-[var(--color-text-primary)]">{matter.clientName}</span>
              <StatusBadge status={health.status} size="md" />
            </div>
            {matter.clientCompany && <p className="text-[15px] text-[var(--color-text-secondary)] mb-2">{matter.clientCompany}</p>}
            {!matter.clientCompany && matter.clientEmail && <p className="text-[15px] text-[var(--color-text-secondary)] mb-2">{matter.clientEmail}</p>}
            <div className="flex items-center gap-4 text-[14.5px]">
              <span className="flex items-center gap-1.5 text-[var(--color-text-secondary)]">
                <Calendar className="w-[14px] h-[14px] text-[var(--color-text-muted)]" />
                <span className="text-[var(--color-text-muted)]">Engagement:</span>
                <span className="font-medium text-[var(--color-text-primary)]">{format(parseISO(matter.startDate), "MMM d, yyyy")}</span>
              </span>
              {matter.referenceNumber && (
                <><span className="text-[var(--color-border)]">|</span>
                <span className="flex items-center gap-1.5"><FileText className="w-[14px] h-[14px] text-[var(--color-text-muted)]" /><span className="font-mono text-[12px] font-medium text-[var(--color-text-primary)]">{matter.referenceNumber}</span></span></>
              )}
              {assignedUser && (
                <><span className="text-[var(--color-border)]">|</span>
                <span className="flex items-center gap-1.5 text-[var(--color-mf-500)] font-medium"><Briefcase className="w-[14px] h-[14px]" /> {assignedUser.name}</span></>
              )}
            </div>
            {matter.clientCompany && matter.clientEmail && <p className="text-[13px] text-[var(--color-text-muted)] mt-2">{matter.clientEmail}</p>}
          </div>
        </div>
      </div>

      {/* ── Value & Date Info Cards ── */}
      <div className="grid grid-cols-4 gap-3 mb-4">
        <div className="rounded-[10px] p-4 bg-[#F9FAFB]">
          <p className="text-[11px] font-medium text-[#999] m-0 mb-1 uppercase tracking-wide">Engagement date</p>
          <p className="text-[15px] font-semibold text-[var(--color-text-primary)] m-0">{format(parseISO(matter.startDate), "MMM d, yyyy")}</p>
        </div>
        <div className="rounded-[10px] p-4" style={{ background: matter.targetEndDate ? "#F9FAFB" : "#F9FAFB" }}>
          <p className="text-[11px] font-medium text-[#999] m-0 mb-1 uppercase tracking-wide">Due date</p>
          <p className="text-[15px] font-semibold m-0" style={{ color: matter.targetEndDate ? "var(--color-text-primary)" : "#CCC" }}>
            {matter.targetEndDate ? format(parseISO(matter.targetEndDate), "MMM d, yyyy") : "Not set"}
          </p>
        </div>
        <div className="rounded-[10px] p-4 bg-[#F9FAFB]">
          <p className="text-[11px] font-medium text-[#999] m-0 mb-1 uppercase tracking-wide">Matter value</p>
          <p className="text-[15px] font-semibold text-[var(--color-text-primary)] m-0">
            {(matter.amountPaid ?? 0) > 0 ? `$${(matter.amountPaid ?? 0).toLocaleString()}` : <span style={{ color: "#CCC" }}>Not set</span>}
          </p>
        </div>
        {(matter.amountPaid ?? 0) > 0 && (() => {
          const valueRemaining = Math.round((matter.amountPaid ?? 0) * (1 - health.progressPercent / 100));
          const isAtRisk = health.status === "out_of_flow" || health.status === "flow_breakdown";
          return (
            <div className="rounded-[10px] p-4" style={{ background: isAtRisk ? "#FEF2F2" : "#F9FAFB" }}>
              <p className="text-[11px] font-medium m-0 mb-1 uppercase tracking-wide" style={{ color: isAtRisk ? "#DC2626" : "#999" }}>Value at risk</p>
              <p className="text-[15px] font-semibold m-0" style={{ color: isAtRisk ? "#DC2626" : "var(--color-text-primary)" }}>
                ${valueRemaining.toLocaleString()}
              </p>
            </div>
          );
        })()}
        {!((matter.amountPaid ?? 0) > 0) && (
          <div className="rounded-[10px] p-4 bg-[#F9FAFB]">
            <p className="text-[11px] font-medium text-[#999] m-0 mb-1 uppercase tracking-wide">Value at risk</p>
            <p className="text-[15px] font-semibold m-0" style={{ color: "#CCC" }}>—</p>
          </div>
        )}
      </div>

      {/* ── Flow Health Bar ── */}
      <div className="rounded-[16px] p-6 mb-4 bg-[var(--color-surface-card)] shadow-[var(--shadow-card)]">
        <div className="flex items-center gap-2.5 mb-6">
          <span className="text-[16px] font-medium text-[var(--color-text-primary)]">Flow Health Bar</span>
          {currentStage && <span className="text-[12px] font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-[5px]">{currentStage.stageName}</span>}
          <StatusBadge status={health.status} size="sm" />
        </div>

        <FlowTimeline stages={matter.stageProgress} currentStageIdx={currentStageIdx} healthStatus={health.status} />

        <div className="grid grid-cols-2 gap-3 mt-6">
          <div className="rounded-[16px] border px-5 py-4 bg-emerald-50 border-emerald-200">
            <span className="text-[16px] font-semibold text-emerald-800">Step Progress {csCompleted} / {csTotal} steps</span>
            <p className="text-[14px] text-emerald-600 mt-1">{health.daysInCurrentStage} day{health.daysInCurrentStage !== 1 ? "s" : ""} in stage</p>
          </div>
          <div className={clsx("rounded-[16px] border px-5 py-4", sBg, sBorder)}>
            <div className="flex items-center gap-2">
              <span className={clsx("text-[16px] font-semibold", sText1)}>{FLOW_STATUS_LABELS[health.status].toUpperCase()}</span>
              {health.status === "in_flow" && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
              {health.status === "at_flow_risk" && <AlertTriangle className="w-4 h-4 text-amber-500" />}
              {health.status === "out_of_flow" && <AlertTriangle className="w-4 h-4 text-red-500" />}
              {health.status === "flow_breakdown" && <Shield className="w-4 h-4 text-violet-500" />}
              <span className={clsx("text-[14px]", sText2)}>{health.reasons[0] || "On track"}</span>
            </div>
            <p className={clsx("text-[14px] mt-1", sText2)}>Day {health.daysElapsed} · {health.completedSteps}/{health.totalSteps} total steps</p>
          </div>
        </div>
      </div>

      {/* ── Stage Cards ── */}
      <div className="space-y-3">
        {matter.stageProgress.map((stage, idx) => (
          <StageCard key={stage.id} stage={stage} index={idx}
            isCurrent={stage.stageId === matter.currentStageId}
            isCompleted={!!stage.completedAt} isFuture={idx > currentStageIdx}
            onToggleStep={toggleStep} onToggleWithClient={toggleWithClient} matterId={matterId} onRefresh={fetchMatter} />
        ))}
      </div>

      {/* ── Previous / Next ── */}
      <div className="flex items-center justify-between mt-8 pt-5 border-t border-[var(--color-border)]">
        {prevId ? <Link href={`/matters/${prevId}`} className="btn-secondary flex items-center gap-2 no-underline"><ChevronLeft className="w-4 h-4" /> Previous</Link> : <div />}
        {nextId ? <Link href={`/matters/${nextId}`} className="btn-primary flex items-center gap-2 no-underline"><span>Next</span> <ChevronRight className="w-4 h-4" /></Link> : <div />}
      </div>

      {/* ── Edit Matter Dialog ── */}
      {showEdit && (
        <EditMatterDialog
          matter={matter}
          users={users}
          onClose={() => setShowEdit(false)}
          onSaved={() => { setShowEdit(false); fetchMatter(); }}
        />
      )}
    </div>
  );
}

// ============================================================
// EDIT MATTER DIALOG
// ============================================================
function EditMatterDialog({ matter, users, onClose, onSaved }: {
  matter: Matter; users: User[];
  onClose: () => void; onSaved: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: matter.name,
    clientName: matter.clientName,
    clientCompany: matter.clientCompany || "",
    clientEmail: matter.clientEmail || "",
    referenceNumber: matter.referenceNumber || "",
    description: matter.description || "",
    assignedUserId: matter.assignedUserId || "",
    startDate: matter.startDate || "",
    targetEndDate: matter.targetEndDate || "",
    amountPaid: String(matter.amountPaid || ""),
  });

  const handleSave = async () => {
    if (!form.name || !form.clientName) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/matters/${matter.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          amountPaid: form.amountPaid ? parseFloat(form.amountPaid) : 0,
        }),
      });
      if (!res.ok) {
        const errorData = await res.json();
        toast.error(errorData.error || "Save failed");
        return;
      }
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
      console.error("Failed:", err);
    }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-[16px] shadow-xl w-full max-w-xl p-7 mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-[20px] font-bold">Edit Matter</h2>
          <button onClick={onClose} className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] cursor-pointer"><X className="w-5 h-5" /></button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-[13px] font-medium text-[var(--color-text-secondary)] mb-1.5">Matter Name *</label>
            <input className="input-field py-2.5" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
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
            <div><label className="block text-[13px] font-medium text-[var(--color-text-secondary)] mb-1.5">Client Company</label><input className="input-field py-2.5" value={form.clientCompany} onChange={(e) => setForm({ ...form, clientCompany: e.target.value })} /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-[13px] font-medium text-[var(--color-text-secondary)] mb-1.5">Client Email</label><input className="input-field py-2.5" type="email" value={form.clientEmail} onChange={(e) => setForm({ ...form, clientEmail: e.target.value })} /></div>
            <div><label className="block text-[13px] font-medium text-[var(--color-text-secondary)] mb-1.5">Reference #</label><input className="input-field py-2.5" value={form.referenceNumber} onChange={(e) => setForm({ ...form, referenceNumber: e.target.value })} /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[13px] font-medium text-[var(--color-text-secondary)] mb-1.5">Assigned To</label>
              <select className="input-field py-2.5" value={form.assignedUserId} onChange={(e) => setForm({ ...form, assignedUserId: e.target.value })}>
                <option value="">Unassigned</option>
                {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[13px] font-medium text-[var(--color-text-secondary)] mb-1.5">Amount Paid ($)</label>
              <input className="input-field py-2.5" type="number" min="0" step="100" value={form.amountPaid} onChange={(e) => setForm({ ...form, amountPaid: e.target.value })} placeholder="0.00" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[13px] font-medium text-[var(--color-text-secondary)] mb-1.5">Engagement Date</label>
              <input 
  className="input-field py-2.5" 
  type="date" 
  value={form.startDate ? form.startDate.split('T')[0] : ""} 
  onChange={(e) => setForm({ ...form, startDate: e.target.value })} 
/>
              <p className="text-[11px] text-[var(--color-text-muted)] mt-1">Changing this may affect step due dates</p>
            </div>
            <div>
              <label className="block text-[13px] font-medium text-[var(--color-text-secondary)] mb-1.5">Overall Due Date</label>
              <input 
  className="input-field py-2.5" 
  type="date" 
  value={form.targetEndDate ? form.targetEndDate.split('T')[0] : ""} 
  onChange={(e) => setForm({ ...form, targetEndDate: e.target.value })} 
/>
            </div>
          </div>
          <div><label className="block text-[13px] font-medium text-[var(--color-text-secondary)] mb-1.5">Description</label><textarea className="input-field py-2.5 resize-none h-20" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
        </div>
        <div className="flex items-center justify-end gap-3 mt-7 pt-5 border-t border-[var(--color-border)]">
          <button onClick={onClose} className="btn-secondary py-2.5 px-5">Cancel</button>
          <button onClick={handleSave} disabled={!form.name || !form.clientName || saving} className={clsx("btn-primary py-2.5 px-5", (!form.name || !form.clientName || saving) && "opacity-50 cursor-not-allowed")}>
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// FLOW TIMELINE — Segmented colored line with node circles
// ============================================================
function FlowTimeline({ stages, currentStageIdx, healthStatus }: {
  stages: MatterStageProgress[]; currentStageIdx: number; healthStatus: string;
}) {
  const statusColor = healthStatus === "in_flow" ? "#10b981" : healthStatus === "at_flow_risk" ? "#f59e0b" : healthStatus === "out_of_flow" ? "#ef4444" : "#7c3aed";

  return (
    <div className="relative px-2">
      {/* Line segments between nodes */}
      <div className="absolute top-[22px] left-0 right-0 flex items-center z-0 px-2">
        {stages.map((_, idx) => {
          if (idx === stages.length - 1) return null;
          const segWidth = `${100 / (stages.length - 1)}%`;
          let color = "#e5e7eb";
          if (idx < currentStageIdx) color = "#10b981";
          else if (idx === currentStageIdx) color = statusColor;
          return (
            <div key={`seg-${idx}`} style={{ width: segWidth, height: "4px", position: "relative" }}>
              <div style={{
                position: "absolute", top: 0, left: idx === 0 ? "50%" : "0",
                right: idx === stages.length - 2 ? "50%" : "0", height: "4px", borderRadius: "2px",
                background: idx === currentStageIdx ? `linear-gradient(90deg, ${statusColor}, #e5e7eb)` : color,
                transition: "all 0.5s ease",
              }} />
            </div>
          );
        })}
      </div>

      {/* Nodes */}
      <div className="relative z-[2] flex justify-between">
        {stages.map((stage, idx) => {
          const done = !!stage.completedAt; const curr = idx === currentStageIdx; const future = idx > currentStageIdx;
          return (
            <div key={stage.id} className="flex flex-col items-center" style={{ width: `${100 / stages.length}%` }}>
              <div className={clsx(
                "w-[44px] h-[44px] rounded-full flex items-center justify-center border-[3px] transition-all duration-300 bg-white",
                done && "!bg-emerald-500 border-emerald-500 text-white shadow-md",
                curr && healthStatus === "in_flow" && "border-emerald-500 text-emerald-600 shadow-md",
                curr && healthStatus === "at_flow_risk" && "border-amber-500 text-amber-600 shadow-md",
                curr && healthStatus === "out_of_flow" && "border-red-500 text-red-600 shadow-md",
                curr && healthStatus === "flow_breakdown" && "border-violet-500 text-violet-600 shadow-md",
                future && "border-gray-200 text-gray-400"
              )}>
                {done ? <Check className="w-5 h-5" strokeWidth={3} /> : curr ? (healthStatus === "in_flow" ? <CheckCircle2 className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />) : <FileText className="w-4 h-4" />}
              </div>
              <span className={clsx("text-[13px] font-medium mt-2.5 text-center leading-tight max-w-[130px]",
                done && "text-emerald-700 font-semibold", curr && "text-[var(--color-text-primary)] font-semibold", future && "text-[var(--color-text-muted)]"
              )}>{stage.stageName}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================
// STAGE CARD — Collapsible with rounded design
// ============================================================
function StageCard({ stage, index, isCurrent, isCompleted, isFuture, onToggleStep, onToggleWithClient, matterId, onRefresh }: {
  stage: MatterStageProgress; index: number; isCurrent: boolean; isCompleted: boolean; isFuture: boolean; onToggleStep: (id: string) => void; onToggleWithClient: (id: string) => void; matterId: string; onRefresh: () => void;
}) {
  const [expanded, setExpanded] = useState(isCurrent);
  const cc = stage.steps.filter((s) => s.isCompleted).length;
  const tc = stage.steps.length;

  return (
    <div className={clsx(
      "rounded-[16px] overflow-hidden transition-all duration-200 bg-[var(--color-surface-card)]",
      isCurrent ? "shadow-[0_2px_8px_rgba(0,0,0,0.06),0_0_0_1px_rgba(59,130,246,0.15)]" : "shadow-[var(--shadow-card)]"
    )}>
      <button onClick={() => setExpanded(!expanded)} className="w-full flex items-center gap-3 px-6 py-5 text-left cursor-pointer hover:bg-[var(--color-surface-hover)] transition-colors">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2.5 mb-1">
            <span className={clsx("text-[16px] font-medium", isCompleted ? "text-emerald-700" : isFuture ? "text-[var(--color-text-muted)]" : "text-[var(--color-text-primary)]")}>{stage.stageName}</span>
            {stage.startedAt && !stage.completedAt && <span className="text-[12px] font-medium text-[var(--color-mf-600)] bg-[var(--color-mf-50)] border border-[var(--color-mf-200)] px-2 py-0.5 rounded-[5px]">Flow Stage: Day {differenceInCalendarDays(new Date(), parseISO(stage.startedAt))}</span>}
            {isCompleted && <span className="text-[12px] font-medium text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-[5px] flex items-center gap-1"><Check className="w-3 h-3" /> Completed</span>}
            {isFuture && <span className="text-[12px] font-medium text-gray-400 bg-gray-50 border border-gray-200 px-2 py-0.5 rounded-[5px]">Upcoming</span>}
          </div>
          <span className="text-[13.5px] text-[var(--color-text-muted)]">
            {cc}/{tc} steps complete
            {stage.startedAt && <> · Started {format(parseISO(stage.startedAt), "MMM d, yyyy")}</>}
            {stage.completedAt && <> · Completed {format(parseISO(stage.completedAt), "MMM d, yyyy")}</>}
          </span>
        </div>
        <ChevronDown className={clsx("w-5 h-5 text-[var(--color-text-muted)] transition-transform duration-200 shrink-0", !expanded && "-rotate-90")} />
      </button>
      {expanded && (
        <div className="px-6 pb-5 pt-1 border-t border-[var(--color-border-light)]">
          <div className="space-y-2 mt-3">
            {stage.steps.map((step) => <StepRow key={step.id} step={step} isFutureStage={isFuture} onToggle={() => onToggleStep(step.id)} onToggleWithClient={() => onToggleWithClient(step.id)} matterId={matterId} onRefresh={onRefresh} />)}
            {stage.steps.length === 0 && <p className="text-[14px] text-[var(--color-text-muted)] text-center py-4 italic">No steps in this stage</p>}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// STEP ROW — Checkbox + name + due/completed buttons
// ============================================================
function StepRow({ step, isFutureStage, onToggle, onToggleWithClient, matterId, onRefresh }: {
  step: MatterStepProgress; isFutureStage: boolean; onToggle: () => void; onToggleWithClient: () => void; matterId: string; onRefresh: () => void;
}) {
  const [editingDue, setEditingDue] = useState(false);
  const [editingCompleted, setEditingCompleted] = useState(false);
  const updateDate = async (field: "manualDueDate" | "completedAt", value: string) => {
    try {
      const res = await fetch(`/api/matters/${matterId}/steps/dates`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stepProgressId: step.id, [field]: value || null }),
      });
      if (!res.ok) {
        const errorData = await res.json();
        toast.error(errorData.error || "Save failed");
        return;
      }
      setEditingDue(false); setEditingCompleted(false); onRefresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
      console.error("Failed", err);
    }
  };
  const dueDate = step.manualDueDate || step.dueDate;
  let dueStatus: "ok" | "soon" | "overdue" | "none" = "none";
  if (dueDate && !step.isCompleted && !isFutureStage) {
    const due = parseISO(dueDate);
    if (isValid(due)) {
      const d = differenceInCalendarDays(due, new Date());
      if (d < 0) dueStatus = "overdue"; else if (d <= 3) dueStatus = "soon"; else dueStatus = "ok";
    }
  }

  return (
    <div className={clsx(
      "flex items-center gap-3 px-4 py-3.5 rounded-[16px] border transition-all",
      step.withClient ? "bg-amber-50/50 border-amber-200"
      : step.isCompleted ? "bg-blue-50/50 border-blue-200"
      : dueStatus === "overdue" ? "bg-red-50/50 border-red-200"
      : dueStatus === "soon" ? "bg-amber-50/30 border-amber-200"
      : "bg-[var(--color-surface-dim)] border-[var(--color-border-light)]",
      !step.isCompleted && !isFutureStage && "hover:border-[var(--color-mf-300)] hover:shadow-sm"
    )}>
      <button onClick={onToggle} disabled={isFutureStage} className={clsx(
        "w-[22px] h-[22px] rounded-md flex items-center justify-center shrink-0 transition-all cursor-pointer border-2",
        step.isCompleted ? "bg-[var(--color-mf-500)] border-[var(--color-mf-500)] text-white"
        : isFutureStage ? "border-gray-200 bg-gray-50 cursor-not-allowed"
        : "border-gray-300 hover:border-[var(--color-mf-400)] bg-white"
      )}>
        {step.isCompleted && <Check className="w-[13px] h-[13px]" strokeWidth={3.5} />}
      </button>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={clsx("text-[15px] font-medium", isFutureStage ? "text-[var(--color-text-muted)]" : "text-[var(--color-text-primary)]")}>{step.stepName}</span>
          {!step.isRequired && <span className="text-[11px] text-[var(--color-text-muted)] italic">optional</span>}
          {step.withClient && (() => {
            let clientDays = 0;
            if (step.withClientSince) {
              const since = parseISO(step.withClientSince);
              if (isValid(since)) clientDays = Math.max(0, differenceInCalendarDays(new Date(), since));
            }
            return (
              <span className="text-[11px] font-semibold text-[#B45309] bg-[#FFFBEB] px-2 py-[1px] rounded-[4px]">
                ↑ With client{clientDays > 0 ? ` · ${clientDays}d` : ""}
              </span>
            );
          })()}
        </div>
        <div className="flex items-center gap-3 mt-1 flex-wrap">
          {/* Due date — clickable to edit */}
          {dueDate && !editingDue && (
            <button onClick={() => !isFutureStage && setEditingDue(true)} className={clsx("text-[13px] bg-transparent border-none cursor-pointer p-0 font-inherit", dueStatus === "overdue" ? "text-red-600 font-medium" : dueStatus === "soon" ? "text-amber-600" : "text-[var(--color-text-muted)]")} style={{ borderBottom: !isFutureStage ? "1px dashed currentColor" : "none" }}>
              Due: {format(parseISO(dueDate), "MMM d, yyyy")}{dueStatus === "overdue" && " — overdue"}{!isFutureStage && " ✎"}
            </button>
          )}
          {!dueDate && !editingDue && !isFutureStage && (
            <button onClick={() => setEditingDue(true)} className="text-[13px] text-[var(--color-mf-500)] bg-transparent border-none cursor-pointer p-0 font-inherit" style={{ borderBottom: "1px dashed currentColor" }}>+ Set due date</button>
          )}
          {editingDue && (
            <span className="flex items-center gap-2">
              <span className="text-[13px] text-[var(--color-text-muted)]">Due:</span>
              <input type="date" defaultValue={dueDate ? format(parseISO(dueDate), "yyyy-MM-dd") : ""} className="input-field text-[13px] py-1 px-2 w-[140px]"
                onChange={(e) => { if (e.target.value) updateDate("manualDueDate", e.target.value); }}
                onKeyDown={(e) => { if (e.key === "Enter") updateDate("manualDueDate", (e.target as HTMLInputElement).value); if (e.key === "Escape") setEditingDue(false); }} autoFocus />
              <button onClick={() => setEditingDue(false)} className="text-[12px] text-[var(--color-text-muted)] bg-transparent border-none cursor-pointer p-0">✕</button>
            </span>
          )}
          {/* Completed date — clickable to edit */}
          {step.completedAt && !editingCompleted && (
            <>
              {dueDate && <span className="text-[var(--color-text-muted)]">|</span>}
              <button onClick={() => setEditingCompleted(true)} className="text-[13px] text-[var(--color-text-muted)] bg-transparent border-none cursor-pointer p-0 font-inherit" style={{ borderBottom: "1px dashed currentColor" }}>
                Completed: {format(parseISO(step.completedAt), "MMM d, yyyy")} ✎
              </button>
            </>
          )}
          {editingCompleted && (
            <>
              {dueDate && <span className="text-[var(--color-text-muted)]">|</span>}
              <span className="flex items-center gap-2">
                <span className="text-[13px] text-[var(--color-text-muted)]">Completed:</span>
                <input type="date" defaultValue={step.completedAt ? format(parseISO(step.completedAt), "yyyy-MM-dd") : ""} className="input-field text-[13px] py-1 px-2 w-[140px]"
                  onChange={(e) => { if (e.target.value) updateDate("completedAt", e.target.value); }}
                  onKeyDown={(e) => { if (e.key === "Enter") updateDate("completedAt", (e.target as HTMLInputElement).value); if (e.key === "Escape") setEditingCompleted(false); }} autoFocus />
                <button onClick={() => setEditingCompleted(false)} className="text-[12px] text-[var(--color-text-muted)] bg-transparent border-none cursor-pointer p-0">✕</button>
              </span>
            </>
          )}
          {step.withClient && step.withClientSince && (
            <>
              {dueDate && <span className="text-[var(--color-text-muted)]">|</span>}
              <span className="text-[13px] text-[#B45309] font-medium">Sent to client: {format(parseISO(step.withClientSince), "MMM d, yyyy")}</span>
            </>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {/* With Client toggle — only show for incomplete, non-future steps */}
        {!step.isCompleted && !isFutureStage && (
          <button onClick={onToggleWithClient} className={clsx(
            "text-[12px] font-medium px-3 py-1.5 rounded-[8px] border transition-colors cursor-pointer",
            step.withClient
              ? "bg-[#F59E0B] border-[#F59E0B] text-white"
              : "bg-white border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[#F59E0B] hover:text-[#B45309]"
          )}>
            {step.withClient ? (() => {
              let d = 0;
              if (step.withClientSince) { const s = parseISO(step.withClientSince); if (isValid(s)) d = Math.max(0, differenceInCalendarDays(new Date(), s)); }
              return `↑ With client${d > 0 ? ` · ${d}d` : ""}`;
            })() : "With client"}
          </button>
        )}
        <button onClick={onToggle} disabled={isFutureStage} className={clsx("text-[12px] font-medium px-3 py-1.5 rounded-[8px] border transition-colors cursor-pointer",
          step.isCompleted ? "bg-[var(--color-mf-500)] border-[var(--color-mf-500)] text-white"
          : isFutureStage ? "bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed"
          : "bg-white border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-mf-400)] hover:text-[var(--color-mf-600)]"
        )}>{step.isCompleted ? "✓ Complete" : "Mark complete"}</button>
      </div>
    </div>
  );
}
