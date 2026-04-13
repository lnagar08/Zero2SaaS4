"use client";

import { useState, useEffect, useCallback } from "react";
import { parseISO, isValid, differenceInCalendarDays, format, addDays } from "date-fns";

/**
 * CLIENT PORTAL SIMULATION
 * ────────────────────────
 * This page simulates what a client would see when logging into
 * their portal. It pulls real matter data from the running
 * MatterGuardian instance.
 *
 * Access: /portal (no auth — this is a simulation)
 *
 * SaaS NOTE: In production:
 * 1. Create a ClientPortalInvite model (orgId, matterId, clientEmail, token, expiresAt)
 * 2. Firm owner clicks "Invite client" on matter detail → sends magic link email
 * 3. Client clicks link → validates token → sees ONLY their matter(s)
 * 4. Portal routes use a separate auth flow (not NextAuth — no password needed)
 * 5. API endpoints filter by clientEmail from the portal session
 * 6. Client can view but NEVER edit — read-only access to progress, steps, dates
 * 7. No access to: other matters, firm analytics, associate info, fee amounts, internal notes
 * 8. The "with client" steps show as "Action needed from you" in the portal
 * Estimated developer effort: 3-5 days for the full portal auth + invite flow
 */

interface PortalMatter {
  id: string;
  name: string;
  clientName: string;
  clientCompany?: string;
  clientEmail?: string;
  matterFlowName: string;
  startDate: string;
  targetEndDate?: string;
  assignedUserName?: string;
  stageProgress: {
    id: string;
    stageId: string;
    stageName: string;
    order: number;
    startedAt?: string;
    completedAt?: string;
    steps: {
      id: string;
      stepName: string;
      order: number;
      isCompleted: boolean;
      completedAt?: string;
      dueDate?: string;
      manualDueDate?: string;
      withClient: boolean;
      withClientSince?: string;
    }[];
  }[];
  currentStageId?: string;
}

export default function PortalPage() {
  const [matters, setMatters] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [matter, setMatter] = useState<PortalMatter | null>(null);
  const [branding, setBranding] = useState<any>(null);
  const [expandedStages, setExpandedStages] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetch("/api/dashboard").then(r => r.json()).then(d => {
      setMatters(d.matters || []);
      if (d.matters?.length > 0) setSelectedId(d.matters[0].id);
    });
    fetch("/api/branding").then(r => r.json()).then(setBranding);
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    fetch(`/api/matters/${selectedId}`).then(r => r.json()).then(setMatter);
  }, [selectedId]);

  const toggleStage = (stageId: string) => {
    setExpandedStages(prev => ({ ...prev, [stageId]: !prev[stageId] }));
  };

  if (!matter || !branding) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#F5F5F7" }}>
        <p style={{ color: "#888", fontSize: 15 }}>Loading portal simulation...</p>
      </div>
    );
  }

  // Compute contrast for branding
  const brandColor = branding.brandColor || "#1e3a5f";
  const c = brandColor.replace("#", "");
  const lum = 0.2126 * (parseInt(c.substring(0, 2), 16) / 255) + 0.7152 * (parseInt(c.substring(2, 4), 16) / 255) + 0.0722 * (parseInt(c.substring(4, 6), 16) / 255);
  const isDark = lum < 0.5;
  const textColor = isDark ? "#ffffff" : "#111318";
  const subtextColor = isDark ? "rgba(255,255,255,0.55)" : "rgba(0,0,0,0.45)";
  const logoBg = isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.08)";

  // Find current stage
  const currentStageIdx = matter.stageProgress.findIndex(sp => sp.stageId === matter.currentStageId);
  const currentStage = matter.stageProgress[currentStageIdx];
  const currentSteps = currentStage?.steps || [];

  // Completion stats
  const allSteps = matter.stageProgress.flatMap(sp => sp.steps);
  const totalSteps = allSteps.length;
  const completedSteps = allSteps.filter(s => s.isCompleted).length;
  const percent = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;

  // Estimate future stage dates
  function estimateStageDates(stageIdx: number): { start: string; end: string } {
    // Try to calculate from prior stage completions or just estimate
    let baseDate = new Date();
    if (currentStage?.startedAt) {
      const remaining = currentSteps.filter(s => !s.isCompleted).length;
      baseDate = addDays(new Date(), remaining * 2); // rough estimate: 2 days per remaining step
    }
    let dayOffset = 0;
    if (matter?.stageProgress) {
      for (let i = currentStageIdx + 1; i < stageIdx; i++) {
        dayOffset += matter.stageProgress[i].steps.length * 2;
      }
    }
    
    const stageSteps = matter?.stageProgress[stageIdx]?.steps.length || 3;
    const start = addDays(baseDate, dayOffset);
    const end = addDays(start, stageSteps * 2);
    return { start: format(start, "MMM d"), end: format(end, "MMM d") };
  }

  function estimateStepDate(stageIdx: number, stepIdx: number): string {
    const step = matter?.stageProgress[stageIdx]?.steps[stepIdx];
    const due = step?.manualDueDate || step?.dueDate;
    if (due) {
      const d = parseISO(due);
      if (isValid(d)) return format(d, "MMM d");
    }
    // Estimate
    const dates = estimateStageDates(stageIdx);
    const stageSteps = matter?.stageProgress[stageIdx]?.steps.length || 1;
    const startDate = parseISO(dates.start + ", 2026") || new Date();
    return format(addDays(new Date(), stepIdx * 2 + (stageIdx - currentStageIdx) * 5), "MMM d");
  }

  return (
    <div style={{ minHeight: "100vh", background: "#F5F5F7", fontFamily: "'DM Sans', sans-serif" }}>
      {/* Simulation selector bar */}
      <div style={{ background: "#1E2028", padding: "10px 24px", display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.4)", letterSpacing: "0.5px", textTransform: "uppercase" }}>
          Portal simulation
        </span>
        <select
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
          style={{ padding: "6px 12px", borderRadius: 6, border: "1px solid rgba(255,255,255,0.15)", background: "rgba(255,255,255,0.08)", color: "white", fontSize: 13, fontFamily: "inherit" }}
        >
          {matters.map((m: any) => (
            <option key={m.id} value={m.id} style={{ background: "#1E2028" }}>
              {m.name} — {m.clientName}
            </option>
          ))}
        </select>
        <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginLeft: "auto" }}>
          This bar is for demo only — clients would go directly to their matter
        </span>
      </div>

      <div style={{ margin: "0 auto", padding: "24px 20px 60px" }}>

        {/* MatterGuardian subtle branding */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
          <div style={{ width: 28, height: 28, borderRadius: 7, background: "linear-gradient(135deg, #6366F1, #A855F7)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="15" height="15" viewBox="0 0 42 42" fill="none">
              <path d="M8 10 L28 10" stroke="white" strokeWidth="3" strokeLinecap="round"/>
              <path d="M12 21 L32 21" stroke="rgba(255,255,255,0.7)" strokeWidth="3" strokeLinecap="round"/>
              <path d="M8 32 L28 32" stroke="rgba(255,255,255,0.35)" strokeWidth="3" strokeLinecap="round"/>
              <path d="M29 6 L35 10 L29 14" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <span style={{ fontSize: 13, color: "#999" }}>Client portal</span>
          <span style={{ marginLeft: "auto", fontSize: 12, color: "#BBB" }}>
            {matter.clientEmail || `${matter.clientName.toLowerCase().replace(/ /g, ".")}@email.com`}
          </span>
        </div>

        {/* Firm branding banner */}
        <div style={{ background: brandColor, borderRadius: 12, padding: "14px 24px", display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
          {branding.brandLogoUrl ? (
            <img src={branding.brandLogoUrl} style={{ height: 34, maxWidth: 130, borderRadius: 6, objectFit: "contain", background: logoBg, padding: "3px 6px" }} alt="Logo" />
          ) : (
            <div style={{ width: 36, height: 36, borderRadius: 8, background: logoBg, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: textColor }}>{branding.brandLogoText || branding.firmName?.charAt(0) || "F"}</span>
            </div>
          )}
          <div>
            <p style={{ fontSize: 16, fontWeight: 600, color: textColor, margin: 0 }}>{branding.firmName}</p>
            {branding.brandTagline && <p style={{ fontSize: 12, color: subtextColor, margin: "2px 0 0" }}>{branding.brandTagline}</p>}
          </div>
        </div>

        {/* Matter header with progress */}
        <div style={{ background: "white", borderRadius: 16, padding: 24, marginBottom: 12, boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <div>
              <p style={{ fontSize: 22, fontWeight: 700, margin: 0, letterSpacing: "-0.5px" }}>{matter.name}</p>
              <p style={{ fontSize: 14, color: "#888", margin: "4px 0 0" }}>
                {matter.matterFlowName}
                {matter.startDate && <> · Engaged {format(parseISO(matter.startDate), "MMM d, yyyy")}</>}
              </p>
            </div>
            <div style={{ textAlign: "right" }}>
              <p style={{ fontSize: 32, fontWeight: 700, color: "#059669", margin: 0, letterSpacing: "-1px" }}>{percent}%</p>
              <p style={{ fontSize: 12, color: "#888", margin: 0 }}>complete</p>
            </div>
          </div>

          {/* Progress bar with up/down */}
          <div style={{ display: "flex", gap: 3, alignItems: "flex-end", height: 22, marginBottom: 4 }}>
            {currentSteps.map((step) => {
              const isWithClient = step.withClient && !step.isCompleted;
              return (
                <div key={step.id} style={{ flex: 1, display: "flex", flexDirection: "column", height: "100%", justifyContent: isWithClient ? "flex-start" : "flex-end" }}>
                  <div style={{
                    height: 7, borderRadius: 4,
                    background: step.isCompleted ? "#22C55E" : isWithClient ? "#22C55E" : "#E0E2E6",
                    opacity: isWithClient ? 0.75 : 1,
                  }} />
                </div>
              );
            })}
          </div>
          {currentSteps.some(s => s.withClient && !s.isCompleted) && (
            <div style={{ display: "flex", gap: 3, marginBottom: 8 }}>
              {currentSteps.map((step) => {
                if (step.withClient && !step.isCompleted) {
                  let d = 0;
                  if (step.withClientSince) {
                    const since = parseISO(step.withClientSince);
                    if (isValid(since)) d = Math.max(0, differenceInCalendarDays(new Date(), since));
                  }
                  return <span key={step.id} style={{ flex: 1, textAlign: "center", fontSize: 9, fontWeight: 600, color: "#B45309" }}>↑ You{d > 0 ? ` · ${d}d` : ""}</span>;
                }
                return <span key={step.id} style={{ flex: 1 }} />;
              })}
            </div>
          )}
        </div>

        {/* Current stage — always expanded */}
        <div style={{ background: "white", borderRadius: 16, padding: 24, marginBottom: 12, boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: "#999", textTransform: "uppercase", letterSpacing: "0.5px", margin: "0 0 4px" }}>Current stage</p>
          <p style={{ fontSize: 17, fontWeight: 600, margin: "0 0 16px" }}>
            {currentStage?.stageName}
            {currentStage?.startedAt && (
              <span style={{ fontSize: 13, fontWeight: 400, color: "#BBB", marginLeft: 8 }}>
                · Started {format(parseISO(currentStage.startedAt), "MMM d")}
              </span>
            )}
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {currentSteps.map((step) => {
              const isAction = step.withClient && !step.isCompleted;
              let clientDays = 0;
              if (step.withClientSince) {
                const since = parseISO(step.withClientSince);
                if (isValid(since)) clientDays = Math.max(0, differenceInCalendarDays(new Date(), since));
              }
              const dueDate = step.manualDueDate || step.dueDate;
              return (
                <div key={step.id} style={{
                  display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 8,
                  background: isAction ? "#FFFBEB" : "white",
                  border: isAction ? "1.5px solid #F59E0B" : "0.5px solid #EBEBED",
                }}>
                  {step.isCompleted ? (
                    <div style={{ width: 20, height: 20, borderRadius: 6, background: "#ECFDF5", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                    </div>
                  ) : isAction ? (
                    <div style={{ width: 20, height: 20, borderRadius: 6, background: "#FEF3C7", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#B45309" strokeWidth="2.5"><circle cx="12" cy="12" r="4"/></svg>
                    </div>
                  ) : (
                    <div style={{ width: 20, height: 20, borderRadius: 6, background: "#F5F5F7", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <div style={{ width: 10, height: 10, borderRadius: 3, border: "1.5px solid #CCC" }} />
                    </div>
                  )}
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: 14, fontWeight: isAction ? 600 : 400, color: isAction ? "#92400e" : step.isCompleted ? "#111" : "#888" }}>{step.stepName}</span>
                      {isAction && (
                        <span style={{ fontSize: 10, fontWeight: 600, background: "#F59E0B", color: "white", padding: "1px 6px", borderRadius: 4 }}>
                          Action needed from you
                        </span>
                      )}
                    </div>
                    {isAction && step.withClientSince && (
                      <p style={{ fontSize: 12, color: "#B45309", margin: "2px 0 0" }}>
                        Sent to you {format(parseISO(step.withClientSince), "MMM d")}
                        {dueDate && <> · Due {format(parseISO(dueDate), "MMM d")}</>}
                      </p>
                    )}
                  </div>
                  <span style={{ fontSize: 12, color: step.isCompleted ? "#059669" : "#BBB", fontWeight: step.isCompleted ? 500 : 400 }}>
                    {step.isCompleted && step.completedAt
                      ? `Completed ${format(parseISO(step.completedAt), "MMM d")}`
                      : !isAction && dueDate
                        ? `Due ${format(parseISO(dueDate), "MMM d")}`
                        : !isAction ? "Upcoming" : ""}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Future stages — collapsible */}
        {matter.stageProgress.filter((_, i) => i > currentStageIdx).length > 0 && (
          <div style={{ background: "white", borderRadius: 16, padding: 24, marginBottom: 12, boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: "#999", textTransform: "uppercase", letterSpacing: "0.5px", margin: "0 0 4px" }}>What comes next</p>
            <p style={{ fontSize: 12, color: "#BBB", margin: "0 0 16px" }}>Estimated dates based on current pace</p>

            {matter.stageProgress.filter((_, i) => i > currentStageIdx).map((stage, relIdx) => {
              const absIdx = currentStageIdx + 1 + relIdx;
              const dates = estimateStageDates(absIdx);
              const isOpen = !!expandedStages[stage.id];
              return (
                <div key={stage.id} style={{ marginBottom: relIdx < matter.stageProgress.length - currentStageIdx - 2 ? 8 : 0 }}>
                  <button
                    onClick={() => toggleStage(stage.id)}
                    style={{
                      width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "10px 0",
                      background: "none", border: "none", cursor: "pointer", fontFamily: "inherit",
                      borderBottom: isOpen ? "0.5px solid #EBEBED" : "none",
                    }}
                  >
                    <div style={{ width: 24, height: 24, borderRadius: 6, background: "#F5F5F7", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 600, color: "#999", flexShrink: 0 }}>
                      {absIdx + 1}
                    </div>
                    <span style={{ fontSize: 15, fontWeight: 600, color: "#333", textAlign: "left" }}>{stage.stageName}</span>
                    <span style={{ fontSize: 12, color: "#BBB", marginLeft: "auto", marginRight: 8 }}>
                      Est. {dates.start} – {dates.end} · {stage.steps.length} steps
                    </span>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2"
                      style={{ transform: isOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.15s" }}>
                      <path d="M6 9l6 6 6-6"/>
                    </svg>
                  </button>
                  {isOpen && (
                    <div style={{ marginLeft: 34, paddingTop: 8, paddingBottom: 4 }}>
                      {stage.steps.map((step, stepIdx) => {
                        const estDate = estimateStepDate(absIdx, stepIdx);
                        return (
                          <div key={step.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0" }}>
                            <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#CCC", flexShrink: 0 }} />
                            <span style={{ fontSize: 13, color: "#666", flex: 1 }}>{step.stepName}</span>
                            <span style={{ fontSize: 12, color: "#BBB" }}>Est. {estDate}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Your attorney */}
        <div style={{ background: "white", borderRadius: 16, padding: 20, boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: "#999", textTransform: "uppercase", letterSpacing: "0.5px", margin: "0 0 12px" }}>Your attorney</p>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 44, height: 44, borderRadius: "50%", background: "linear-gradient(135deg, #6366F1, #A855F7)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 600, color: "white", flexShrink: 0 }}>
              {(matter.assignedUserName || "A").split(" ").map(n => n[0]).join("").slice(0, 2)}
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 15, fontWeight: 600, margin: 0 }}>{matter.assignedUserName || "Your Attorney"}</p>
              <p style={{ fontSize: 13, color: "#888", margin: "2px 0 0" }}>
                {branding.firmName} · <a href={`mailto:contact@${(branding.firmName || "firm").toLowerCase().replace(/[^a-z]/g, "")}.com`} style={{ color: "#6366F1", textDecoration: "none" }}>Send email</a>
              </p>
            </div>
          </div>
        </div>

        {/* Powered by */}
        <p style={{ textAlign: "center", fontSize: 11, color: "#CCC", marginTop: 32 }}>
          Powered by MatterGuardian
        </p>

      </div>
    </div>
  );
}
