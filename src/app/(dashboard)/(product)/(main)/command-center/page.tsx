import { getCurrentOrg } from "@/lib/tenant";
/**
 * COMMAND CENTER — Owner's Dashboard
 *
 * Shows firm-wide analytics: avg days to close, flow rate, bottleneck,
 * stage performance, associate comparison, aging matters.
 *
 * SaaS NOTES:
 * - In production, this page should check user role:
 *   const { userRole } = await getCurrentOrg();
 *   if (userRole !== "OWNER") redirect("/dashboard");
 * - Associates should never see this page or its sidebar link.
 * - All data is computed from real matter records via the API.
 */
"use client";

import { useEffect, useState } from "react";
import { PageLoader } from "@/components/ui/Spinner";
import { BarChart3, TrendingDown, Zap, CheckCircle2, AlertTriangle, Clock, Users } from "lucide-react";
import { clsx } from "clsx";

interface CommandCenterData {
  avgDaysToClose: number;
  flowRate: number;
  bottleneck: { name: string; avgDaysOver: number };
  closedThisMonth: number;
  totalActive: number;
  stagePerformance: { name: string; avgDays: number; maxExpected: number }[];
  associates: { id: string; name: string; initials: string; active: number; avgDays: number; flowRate: number; closed: number }[];
  agingMatters: { id: string; name: string; clientName: string; assignedUserName: string; totalDays: number; daysSinceActivity: number; status: string }[];
  flows: { id: string; name: string }[];
}

const PERIODS = [
  { label: "30 days", value: 30 },
  { label: "90 days", value: 90 },
  { label: "All time", value: 9999 },
];

// Associate avatar gradient colors — cycle through these
const AVATAR_COLORS = [
  "linear-gradient(135deg, #6366F1, #A855F7)",
  "linear-gradient(135deg, #06B6D4, #22D3EE)",
  "linear-gradient(135deg, #F59E0B, #FBBF24)",
  "linear-gradient(135deg, #22C55E, #4ADE80)",
  "linear-gradient(135deg, #EF4444, #F87171)",
];

export default function CommandCenterPage() {
  const [data, setData] = useState<CommandCenterData | null>(null);
  const [loading, setLoading] = useState(true);
  const [flowFilter, setFlowFilter] = useState("");
  const [period, setPeriod] = useState(90);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/command-center?flowId=${flowFilter}&period=${period}`)
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [flowFilter, period]);

  if (loading || !data) return <PageLoader />;

  const maxStageDays = Math.max(...data.stagePerformance.map((s) => s.avgDays), 1);

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-7">
        <div>
          <h1 className="text-[30px] font-semibold tracking-[-0.5px] text-[var(--color-text-primary)]">Command Center</h1>
          <p className="mt-1 text-[15px] text-[var(--color-text-muted)]">
            Firm performance · {data.totalActive} active matters
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* MatterFlow type filter */}
          <select
            value={flowFilter}
            onChange={(e) => setFlowFilter(e.target.value)}
            className="input-field py-[10px] text-[14px] font-medium w-[220px] cursor-pointer"
          >
            <option value="">All workflows</option>
            {data.flows.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
          {/* Time period selector */}
          <div className="flex gap-[4px]">
            {PERIODS.map((p) => (
              <button
                key={p.value}
                onClick={() => setPeriod(p.value)}
                className={clsx(
                  "px-3.5 py-[8px] rounded-[6px] text-[12px] font-medium cursor-pointer transition-all border-none",
                  period === p.value
                    ? "bg-[#111318] text-white"
                    : "bg-white text-[var(--color-text-secondary)] border border-[var(--color-border)] hover:bg-[var(--color-surface-hover)]"
                )}
                style={period !== p.value ? { border: "0.5px solid var(--color-border)" } : {}}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Pulse Metrics ── */}
      <div className="grid grid-cols-4 gap-3 mb-7">
        <PulseCard
          label="AVG DAYS TO CLOSE"
          gradient="linear-gradient(90deg, #6366F1, #818CF8)"
          value={String(data.avgDaysToClose || "—")}
          subtitle={data.avgDaysToClose > 0 ? "days average" : "no closed matters yet"}
          subtitleColor="#8B8F97"
        />
        <PulseCard
          label="FIRM FLOW RATE"
          gradient="linear-gradient(90deg, #22C55E, #4ADE80)"
          value={`${data.flowRate}%`}
          subtitle={data.flowRate >= 70 ? "healthy" : data.flowRate >= 50 ? "needs improvement" : "critical"}
          subtitleColor={data.flowRate >= 70 ? "#22C55E" : data.flowRate >= 50 ? "#F59E0B" : "#EF4444"}
        />
        <PulseCard
          label="TOP BOTTLENECK"
          gradient="linear-gradient(90deg, #EF4444, #F87171)"
          value={data.bottleneck.name || "None"}
          valueLarge={false}
          subtitle={data.bottleneck.avgDaysOver > 0 ? `avg ${data.bottleneck.avgDaysOver} days in stage` : ""}
          subtitleColor="#EF4444"
        />
        <PulseCard
          label="CLOSED THIS MONTH"
          gradient="linear-gradient(90deg, #06B6D4, #22D3EE)"
          value={String(data.closedThisMonth)}
          subtitle={`of ${data.totalActive} active`}
          subtitleColor="#8B8F97"
        />
      </div>

      {/* ── Revenue Metrics ── */}
      <div className="grid grid-cols-4 gap-3 mb-7">
        <div className="bg-white rounded-[16px] p-5" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
          <p className="text-[11px] font-semibold text-[#999] m-0 mb-1 uppercase tracking-wide">Total active value</p>
          <p className="text-[28px] font-bold text-[var(--color-text-primary)] m-0 tracking-[-1px]">${(data.totalActiveValue || 0).toLocaleString()}</p>
          <p className="text-[11px] text-[#888] m-0 mt-1">{data.totalActive} active matters</p>
        </div>
        <div className="bg-white rounded-[16px] p-5" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.05)", borderLeft: "4px solid #EF4444" }}>
          <p className="text-[11px] font-semibold text-[#999] m-0 mb-1 uppercase tracking-wide">Value at risk</p>
          <p className="text-[28px] font-bold text-[#DC2626] m-0 tracking-[-1px]">${(data.valueAtRisk || 0).toLocaleString()}</p>
          <p className="text-[11px] text-[#DC2626] m-0 mt-1">Out of Flow + Breakdown</p>
        </div>
        <div className="bg-white rounded-[16px] p-5" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.05)", borderLeft: "4px solid #22C55E" }}>
          <p className="text-[11px] font-semibold text-[#999] m-0 mb-1 uppercase tracking-wide">Value delivered (30d)</p>
          <p className="text-[28px] font-bold text-[#059669] m-0 tracking-[-1px]">${(data.valueDelivered30d || 0).toLocaleString()}</p>
          <p className="text-[11px] text-[#059669] m-0 mt-1">Closed this month</p>
        </div>
        <div className="bg-white rounded-[16px] p-5" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
          <p className="text-[11px] font-semibold text-[#999] m-0 mb-1 uppercase tracking-wide">Avg matter value</p>
          <p className="text-[28px] font-bold text-[var(--color-text-primary)] m-0 tracking-[-1px]">${(data.avgMatterValue || 0).toLocaleString()}</p>
          <p className="text-[11px] text-[#888] m-0 mt-1">Across all active</p>
        </div>
      </div>

      {/* ── Stage Performance + Associate Comparison ── */}
      <div className="grid grid-cols-2 gap-4 mb-7">
        {/* Stage Performance */}
        <div className="bg-white rounded-[16px] p-6" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
          <h2 className="text-[16px] font-semibold text-[var(--color-text-primary)] m-0 mb-5">Stage performance</h2>
          <div className="flex flex-col gap-3.5">
            {data.stagePerformance.length === 0 && (
              <p className="text-[14px] text-[var(--color-text-muted)] text-center py-4">No stage data yet</p>
            )}
            {data.stagePerformance.map((stage) => {
              const pct = Math.min(100, Math.round((stage.avgDays / Math.max(maxStageDays, 1)) * 100));
              const color = stage.avgDays <= stage.maxExpected ? "#22C55E" : stage.avgDays <= stage.maxExpected * 1.5 ? "#F59E0B" : "#EF4444";
              return (
                <div key={stage.name}>
                  <div className="flex justify-between mb-1">
                    <span className="text-[13px] font-medium text-[var(--color-text-primary)]">{stage.name}</span>
                    <span className="text-[13px] font-medium" style={{ color }}>avg {stage.avgDays} days</span>
                  </div>
                  <div className="h-[8px] rounded-[4px] overflow-hidden" style={{ background: "#EBEBED" }}>
                    <div className="h-full rounded-[4px]" style={{ width: `${pct}%`, background: color }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Associate Comparison */}
        <div className="bg-white rounded-[16px] p-6" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
          <h2 className="text-[16px] font-semibold text-[var(--color-text-primary)] m-0 mb-5">Associate comparison</h2>
          {data.associates.length === 0 ? (
            <p className="text-[14px] text-[var(--color-text-muted)] text-center py-4">No associates found</p>
          ) : (
            <table className="w-full" style={{ borderCollapse: "collapse", fontSize: "13px" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #EBEBED" }}>
                  <th className="text-left py-2 font-medium text-[var(--color-text-muted)]">Attorney</th>
                  <th className="text-center py-2 font-medium text-[var(--color-text-muted)]">Active</th>
                  <th className="text-center py-2 font-medium text-[var(--color-text-muted)]">Avg days</th>
                  <th className="text-center py-2 font-medium text-[var(--color-text-muted)]">Flow rate</th>
                  <th className="text-center py-2 font-medium text-[var(--color-text-muted)]">Closed</th>
                </tr>
              </thead>
              <tbody>
                {data.associates.map((a, i) => (
                  <tr key={a.id} style={{ borderBottom: i < data.associates.length - 1 ? "1px solid #F5F5F7" : "none" }}>
                    <td className="py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-[28px] h-[28px] rounded-full flex items-center justify-center text-white text-[10px] font-semibold"
                          style={{ background: AVATAR_COLORS[i % AVATAR_COLORS.length] }}>
                          {a.initials}
                        </div>
                        <span className="font-medium text-[var(--color-text-primary)]">{a.name}</span>
                      </div>
                    </td>
                    <td className="text-center font-medium text-[var(--color-text-secondary)]">{a.active}</td>
                    <td className="text-center font-medium text-[var(--color-text-secondary)]">{a.avgDays || "—"}</td>
                    <td className="text-center">
                      <span className={clsx(
                        "inline-block px-2.5 py-[2px] rounded-[4px] text-[12px] font-semibold",
                        a.flowRate >= 70 ? "bg-[#ECFDF5] text-[#059669]"
                          : a.flowRate >= 40 ? "bg-[#FFFBEB] text-[#B45309]"
                          : "bg-[#FEF2F2] text-[#DC2626]"
                      )}>
                        {a.flowRate}%
                      </span>
                    </td>
                    <td className="text-center font-medium text-[var(--color-text-secondary)]">{a.closed}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ── Aging Matters ── */}
      <div className="bg-white rounded-[16px] p-6 mb-7" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[16px] font-semibold text-[var(--color-text-primary)] m-0">Aging matters</h2>
          {data.agingMatters.length > 0 && (
            <span className="text-[12px] font-semibold text-[#EF4444]">{data.agingMatters.length} need attention</span>
          )}
        </div>
        {data.agingMatters.length === 0 ? (
          <p className="text-[14px] text-[var(--color-text-muted)] text-center py-4">All matters have recent activity</p>
        ) : (
          <div className="flex flex-col gap-2">
            {data.agingMatters.map((m) => {
              const isRed = m.daysSinceActivity > 14;
              return (
                <div key={m.id}
                  className="flex items-center gap-3 px-4 py-3 rounded-[8px]"
                  style={{ background: isRed ? "#FEF2F2" : "#FFFBEB" }}
                >
                  <div className="w-[10px] h-[10px] rounded-full shrink-0"
                    style={{
                      background: isRed ? "#EF4444" : "#F59E0B",
                      boxShadow: `0 0 0 3px ${isRed ? "rgba(239,68,68,0.15)" : "rgba(245,158,11,0.15)"}`,
                    }}
                  />
                  <span className="text-[14px] font-medium text-[var(--color-text-primary)] flex-1">{m.name}</span>
                  <span className="text-[13px] text-[var(--color-text-muted)]">{m.assignedUserName}</span>
                  <span className="text-[13px] font-semibold" style={{ color: isRed ? "#DC2626" : "#B45309" }}>
                    {m.totalDays}d total · No activity {m.daysSinceActivity}d
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Revenue by Associate ── */}
      {data.revenueByAssociate && data.revenueByAssociate.length > 0 && (
        <div className="bg-white rounded-[16px] p-6 mb-7" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
          <h2 className="text-[16px] font-semibold text-[var(--color-text-primary)] m-0 mb-5">Revenue by associate</h2>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1.5px solid #EBEBED" }}>
                <th style={{ textAlign: "left", padding: "8px 0", fontSize: 12, color: "#999", fontWeight: 500 }}>Associate</th>
                <th style={{ textAlign: "right", padding: "8px 0", fontSize: 12, color: "#999", fontWeight: 500 }}>Active</th>
                <th style={{ textAlign: "right", padding: "8px 0", fontSize: 12, color: "#999", fontWeight: 500 }}>Total value</th>
                <th style={{ textAlign: "right", padding: "8px 0", fontSize: 12, color: "#999", fontWeight: 500 }}>Delivered</th>
                <th style={{ textAlign: "right", padding: "8px 0", fontSize: 12, color: "#999", fontWeight: 500 }}>Remaining</th>
                <th style={{ textAlign: "right", padding: "8px 0", fontSize: 12, color: "#999", fontWeight: 500 }}>At risk</th>
              </tr>
            </thead>
            <tbody>
              {data.revenueByAssociate.map((a: any) => (
                <tr key={a.id} style={{ borderBottom: "1px solid #F5F5F7" }}>
                  <td style={{ padding: "12px 0" }}>
                    <div className="flex items-center gap-2.5">
                      <div className="w-[30px] h-[30px] rounded-full flex items-center justify-center text-white text-[11px] font-semibold shrink-0"
                        style={{ background: "linear-gradient(135deg, #6366F1, #A855F7)" }}>
                        {a.name.split(" ").map((w: string) => w[0]).join("").slice(0, 2)}
                      </div>
                      <span style={{ fontSize: 14, fontWeight: 600 }}>{a.name}</span>
                    </div>
                  </td>
                  <td style={{ textAlign: "right", padding: "12px 0", fontSize: 14 }}>{a.activeCount}</td>
                  <td style={{ textAlign: "right", padding: "12px 0", fontSize: 14, fontWeight: 700 }}>${a.totalValue.toLocaleString()}</td>
                  <td style={{ textAlign: "right", padding: "12px 0", fontSize: 14, fontWeight: 600, color: "#059669" }}>${a.valueDelivered.toLocaleString()}</td>
                  <td style={{ textAlign: "right", padding: "12px 0", fontSize: 14 }}>${a.valueRemaining.toLocaleString()}</td>
                  <td style={{ textAlign: "right", padding: "12px 0", fontSize: 14, fontWeight: 600, color: a.atRisk > 0 ? "#DC2626" : "#888" }}>${a.atRisk.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Profitability Teaser ── */}
      <div className="bg-white rounded-[16px] p-6 mb-7" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.05)", border: "2px dashed #D4D8FF" }}>
        <div className="flex items-center gap-4">
          <div className="w-[48px] h-[48px] rounded-[16px] flex items-center justify-center shrink-0"
            style={{ background: "#F0EFFE" }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#6366F1" strokeWidth="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
          </div>
          <div className="flex-1">
            <h3 className="text-[15px] font-semibold text-[var(--color-text-primary)] m-0">Profitability analysis — coming soon</h3>
            <p className="text-[13px] text-[var(--color-text-muted)] m-0 mt-1">
              Cost per matter, margin by workflow type, revenue per associate hour, and profitability trends over time. Available for firms with 3+ months of data.
            </p>
          </div>
          <span className="text-[12px] font-semibold px-3 py-1.5 rounded-[6px]"
            style={{ background: "#F0EFFE", color: "#6366F1" }}>
            Coming soon
          </span>
        </div>
      </div>

      {/* ── Heatmap Coming Soon Teaser ── */}
      <div className="bg-white rounded-[16px] p-6" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
        <div className="flex items-center gap-4">
          <div className="w-[48px] h-[48px] rounded-[16px] flex items-center justify-center shrink-0"
            style={{ background: "linear-gradient(135deg, rgba(99,102,241,0.1), rgba(168,85,247,0.1))" }}>
            <BarChart3 className="w-[24px] h-[24px]" style={{ color: "#6366F1" }} />
          </div>
          <div className="flex-1">
            <h3 className="text-[15px] font-semibold text-[var(--color-text-primary)] m-0">Associate workload heatmap</h3>
            <p className="text-[13px] text-[var(--color-text-muted)] m-0 mt-1">
              See which attorneys are overloaded at which stages. Available for firms with 8+ attorneys.
            </p>
          </div>
          <span className="text-[12px] font-semibold px-3 py-1.5 rounded-[6px]"
            style={{ background: "linear-gradient(135deg, rgba(99,102,241,0.1), rgba(168,85,247,0.1))", color: "#6366F1" }}>
            Coming soon
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Pulse Metric Card ──
function PulseCard({ label, gradient, value, valueLarge = true, subtitle, subtitleColor }: {
  label: string; gradient: string; value: string; valueLarge?: boolean;
  subtitle: string; subtitleColor: string;
}) {
  return (
    <div className="relative overflow-hidden bg-white rounded-[16px] px-5 pt-5 pb-6"
      style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
      <div className="absolute top-0 left-0 right-0 h-[4px]" style={{ background: gradient }} />
      <p className="text-[12px] font-semibold text-[var(--color-text-muted)] m-0 mt-1 tracking-[0.5px]">{label}</p>
      <p className={clsx(
        "font-semibold text-[var(--color-text-primary)] m-0 mt-2 leading-none",
        valueLarge ? "text-[40px] tracking-[-1.5px]" : "text-[22px]"
      )}>
        {value}
      </p>
      {subtitle && (
        <p className="text-[13px] font-medium m-0 mt-1" style={{ color: subtitleColor }}>{subtitle}</p>
      )}
    </div>
  );
}
