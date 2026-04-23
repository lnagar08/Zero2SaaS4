"use client";

import { useEffect, useState, useCallback } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { PageLoader } from "@/components/ui/Spinner";
import { Save, Check, Info, Palette, SlidersHorizontal, Upload, Users2, DollarSign } from "lucide-react";
import { clsx } from "clsx";
import type { FlowControls } from "@/types";
import { toast } from "sonner";
import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { BillingTab } from "@/components/BillingTab";
import TeamTab from "@/components/TeamTab";

// ── Flow Controls config — simple threshold fields ──
const CONTROL_FIELDS: {
  key: keyof FlowControls; label: string; description: string; unit: string; min: number; max: number;
}[] = [
  { key: "dueSoonWindowDays", label: "At Flow Risk Window", description: "Days before a step's due date to flag the matter as 'At Flow Risk'", unit: "days", min: 1, max: 14 },
  { key: "stageRiskThresholdDays", label: "Stage Stall Threshold", description: "Days in a single stage before flagging 'At Flow Risk' even without overdue steps", unit: "days", min: 7, max: 90 },
  { key: "graceWindowDays", label: "Grace Window", description: "Days after a stage starts before tracking begins (new stages get a brief grace period)", unit: "days", min: 0, max: 14 },
];

const TABS = [
  { id: "branding", label: "Branding", icon: Palette },
  { id: "flow-controls", label: "Flow Controls", icon: SlidersHorizontal },
  { id: "team", label: "Team", icon: Users2 },
  { id: "billing", label: "Billing", icon: DollarSign },
];

export default function SettingsPage() {
  const { data: session, status } = useSession();

  const userRole = session?.user?.role;
  const isInternal = session?.user?.isInternal;

  const filteredTabs = TABS.filter(tab => {
    if (tab.id === "billing" && isInternal) return false;
    return ["branding", "billing", "team"].includes(tab.id) ? userRole === "OWNER" : true;
  });

  const [activeTab, setActiveTab] = useState("branding");
  const [loading, setLoading] = useState(true);
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab");

  // Branding state
  const [branding, setBranding] = useState({ firmName: "", brandColor: "#1e3a5f", brandTagline: "", brandLogoText: "", brandLogoUrl: "" });
  const [brandingSaving, setBrandingSaving] = useState(false);
  const [brandingSaved, setBrandingSaved] = useState(false);

  // Flow controls state
  const [controls, setControls] = useState<FlowControls | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [ctrlRes, brandRes] = await Promise.all([
        fetch("/api/flow-controls"),
        fetch("/api/branding"),
      ]);
      setControls(await ctrlRes.json());
      setBranding(await brandRes.json());
    } catch (err) { console.error("Failed to load:", err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => { 
    fetchData(); 
    if(userRole !== 'OWNER'){
      setActiveTab('flow-controls');
    }
  }, [fetchData]);

  useEffect(() => {
    if (tab === "billing") {
      setActiveTab('billing');
    }
  }, [tab]);

  // ── Branding save ──
  const handleSaveBranding = async () => {
    setBrandingSaving(true);
    try {
      const res = await fetch("/api/branding", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(branding),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(`Failed to save: ${data.error || res.statusText}`);
        return;
      }
      setBranding(await res.json());
      setBrandingSaved(true);
      window.dispatchEvent(new Event("branding-updated"));
      setTimeout(() => setBrandingSaved(false), 2000);
    } catch (err) { 
        toast.error(err instanceof Error ? err.message : "Save failed");
      console.error("Save failed:", err); 
    }
    finally { setBrandingSaving(false); }
  };

  // ── Logo upload handler ──
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 500000) { alert("Logo must be under 500KB"); return; }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      setBranding({ ...branding, brandLogoUrl: dataUrl });
    };
    reader.readAsDataURL(file);
  };

  // ── Flow controls save ──
  const handleSaveControls = async () => {
    if (!controls) return;
    setSaving(true);
    try {
      const res = await fetch("/api/flow-controls", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          healthEvaluation: controls.healthEvaluation,
          dueSoonWindowDays: controls.dueSoonWindowDays,
          stageRiskThresholdDays: controls.stageRiskThresholdDays,
          graceWindowDays: controls.graceWindowDays,
          breakdownOnPastDue: controls.breakdownOnPastDue,
          breakdownOnInactivity: controls.breakdownOnInactivity,
          breakdownInactivityDays: controls.breakdownInactivityDays,
          breakdownOnStepOverdue: controls.breakdownOnStepOverdue,
          breakdownStepOverdueDays: controls.breakdownStepOverdueDays,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(`Failed to save: ${data.error || res.statusText}`);
        return; 
      }
      setControls(data);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) { 
      toast.error(err instanceof Error ? err.message : "Save failed");
    }
    finally { setSaving(false); }
  };

  if (loading) return <PageLoader />;

  return (
    <div>
      <PageHeader title="Settings" subtitle="Customize your firm's MatterGuardian experience" />

      <div className="flex gap-6">
        {/* ── Tab Navigation ── */}
        <div className="w-[200px] shrink-0">
          <div className="flex flex-col gap-1">
            {filteredTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={clsx(
                  "flex items-center gap-2.5 px-4 py-3 rounded-[12px] text-[14px] font-medium cursor-pointer transition-all border-none text-left w-full",
                  activeTab === tab.id
                    ? "bg-white text-[var(--color-text-primary)]"
                    : "bg-transparent text-[var(--color-text-muted)] hover:bg-white/60"
                )}
                style={activeTab === tab.id ? { boxShadow: "0 1px 3px rgba(0,0,0,0.05)" } : {}}
              >
                <tab.icon className="w-[16px] h-[16px]" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Tab Content ── */}
        <div className="flex-1 min-w-0">

          {/* ═══ BRANDING TAB ═══ */}
          {activeTab === "branding" && (
            <div className="space-y-6">
              {/* Live preview */}
              <div className="bg-white rounded-[16px] p-6" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-[17px] font-semibold text-[var(--color-text-primary)] m-0">Firm branding</h2>
                  <button
                    onClick={handleSaveBranding} disabled={brandingSaving}
                    className={clsx("btn-primary flex items-center gap-1.5", brandingSaving && "opacity-50 cursor-not-allowed")}
                  >
                    {brandingSaved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                    {brandingSaving ? "Saving..." : brandingSaved ? "Saved!" : "Save branding"}
                  </button>
                </div>

                {/* Banner preview */}
                {(() => {
                  const bc = branding.brandColor || "#1e3a5f";
                  const c = bc.replace("#", "");
                  const lum = 0.2126 * (parseInt(c.substring(0, 2), 16) / 255) + 0.7152 * (parseInt(c.substring(2, 4), 16) / 255) + 0.0722 * (parseInt(c.substring(4, 6), 16) / 255);
                  const dk = lum < 0.5;
                  const tx = dk ? "#ffffff" : "#111318";
                  const sub = dk ? "rgba(255,255,255,0.55)" : "rgba(0,0,0,0.45)";
                  const mu = dk ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.2)";
                  const lb = dk ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.08)";
                  return (
                    <div className="flex items-center gap-4 px-6 py-[14px] rounded-[12px] mb-6"
                      style={{ background: bc }}>
                      {branding.brandLogoUrl ? (
                        <img src={branding.brandLogoUrl} className="h-[36px] max-w-[140px] rounded-[8px] object-contain shrink-0"
                          style={{ background: lb, padding: "3px 6px" }} alt="Logo" />
                      ) : (
                        <div className="w-[36px] h-[36px] rounded-[8px] flex items-center justify-center"
                          style={{ background: lb }}>
                          <span className="text-[14px] font-bold tracking-tight" style={{ color: tx }}>
                            {branding.brandLogoText || branding.firmName?.charAt(0) || "M"}
                          </span>
                        </div>
                      )}
                      <div>
                        <p className="text-[16px] font-semibold m-0" style={{ color: tx }}>{branding.firmName || "Your Firm"}</p>
                        {branding.brandTagline && <p className="text-[12px] m-0 mt-[2px]" style={{ color: sub }}>{branding.brandTagline}</p>}
                      </div>
                      <span className="text-[11px] ml-auto" style={{ color: mu }}>Powered by MatterGuardian</span>
                    </div>
                  );
                })()}

                {/* Logo upload */}
                <div className="mb-5">
                  <label className="text-[13px] font-medium text-[var(--color-text-secondary)] block mb-2">Firm logo</label>
                  <div className="flex items-center gap-4">
                    <label className="cursor-pointer">
                      {branding.brandLogoUrl ? (
                        <div className="w-[120px] h-[64px] rounded-[12px] overflow-hidden border border-[var(--color-border)] flex items-center justify-center bg-white p-2">
                          <img src={branding.brandLogoUrl} className="max-w-full max-h-full object-contain" alt="Logo" />
                        </div>
                      ) : (
                        <div className="w-[120px] h-[64px] rounded-[12px] border-[1.5px] border-dashed border-[var(--color-border)] flex items-center justify-center hover:border-[var(--color-mf-400)] transition-colors bg-[var(--color-surface-dim)]">
                          <Upload className="w-[20px] h-[20px] text-[var(--color-text-muted)]" />
                        </div>
                      )}
                      <input type="file" accept="image/png,image/svg+xml,image/jpeg" className="hidden" onChange={handleLogoUpload} />
                    </label>
                    <div>
                      <p className="text-[13px] font-medium text-[var(--color-text-primary)] m-0">
                        {branding.brandLogoUrl ? "Click to change" : "Upload logo"}
                      </p>
                      <p className="text-[12px] text-[var(--color-text-muted)] m-0 mt-1">PNG, SVG, or JPG. Max 500KB.</p>
                      {branding.brandLogoUrl && (
                        <button
                          onClick={() => setBranding({ ...branding, brandLogoUrl: "" })}
                          className="text-[12px] text-[#EF4444] mt-1 cursor-pointer bg-transparent border-none p-0 hover:underline"
                        >Remove logo</button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Form fields */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[13px] font-medium text-[var(--color-text-secondary)] block mb-1.5">Firm name</label>
                    <input type="text" className="input-field" value={branding.firmName || ""} 
                      onChange={(e) => setBranding({ ...branding, firmName: e.target.value })} placeholder="PPM Lawyers" />
                  </div>
                  <div>
                    <label className="text-[13px] font-medium text-[var(--color-text-secondary)] block mb-1.5">Tagline</label>
                    <input type="text" className="input-field" value={branding.brandTagline || ""}
                      onChange={(e) => setBranding({ ...branding, brandTagline: e.target.value })} placeholder="Securities Law · White Plains, NY" />
                  </div>
                  <div>
                    <label className="text-[13px] font-medium text-[var(--color-text-secondary)] block mb-1.5">Brand color</label>
                    <div className="flex items-center gap-2">
                      <input type="color" value={branding.brandColor}
                        onChange={(e) => setBranding({ ...branding, brandColor: e.target.value })}
                        className="w-[40px] h-[40px] rounded-[8px] border border-[var(--color-border)] cursor-pointer p-0.5" />
                      <input type="text" className="input-field flex-1" value={branding.brandColor || ""}
                        onChange={(e) => setBranding({ ...branding, brandColor: e.target.value })} placeholder="#1e3a5f" />
                    </div>
                  </div>
                  <div>
                    <label className="text-[13px] font-medium text-[var(--color-text-secondary)] block mb-1.5">Logo text (fallback)</label>
                    <input type="text" className="input-field" value={branding.brandLogoText || ""} maxLength={4}
                      onChange={(e) => setBranding({ ...branding, brandLogoText: e.target.value.substring(0, 4) })} placeholder="PPM" />
                    <p className="text-[11px] text-[var(--color-text-muted)] mt-1">1-4 characters. Used when no logo image is uploaded.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ═══ FLOW CONTROLS TAB ═══ */}
          {activeTab === "flow-controls" && controls && (
            <div className="space-y-4">
              <div className="bg-white rounded-[16px] p-6" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-[17px] font-semibold text-[var(--color-text-primary)] m-0">Flow controls</h2>
                  <button
                    onClick={handleSaveControls} disabled={saving}
                    className={clsx("btn-primary flex items-center gap-1.5", saving && "opacity-50 cursor-not-allowed")}
                  >
                    {saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                    {saving ? "Saving..." : saved ? "Saved!" : "Save controls"}
                  </button>
                </div>

                {/* Info callout */}
                <div className="p-4 mb-5 rounded-[12px]" style={{ background: "var(--color-mf-50)", border: "1px solid var(--color-mf-200)" }}>
                  <div className="flex items-start gap-3">
                    <Info className="w-4 h-4 mt-0.5 shrink-0" style={{ color: "var(--color-mf-600)" }} />
                    <p className="text-[12.5px] leading-relaxed m-0" style={{ color: "var(--color-mf-700)" }}>
                      <strong>In Flow</strong> = all steps on track.{" "}
                      <strong>At Flow Risk</strong> = a step is due soon or stage is stalling.{" "}
                      <strong>Out of Flow</strong> = any step is past its due date.{" "}
                      <strong>Flow Breakdown</strong> = configurable conditions below.
                    </p>
                  </div>
                </div>

                {/* Threshold controls */}
                <div className="space-y-4">
                  {/* Health evaluation mode toggle */}
                  <div className="p-5 rounded-[12px] bg-[var(--color-surface-dim)]">
                    <label className="text-[14px] font-semibold text-[var(--color-text-primary)] block mb-1">Flow health evaluation</label>
                    <p className="text-[12.5px] text-[var(--color-text-muted)] m-0 mb-3">Choose how MatterGuardian determines a matter&apos;s health status.</p>
                    <div className="flex gap-3">
                      <button
                        onClick={() => setControls({ ...controls, healthEvaluation: "step" })}
                        className="flex-1 text-left p-3 rounded-[10px] cursor-pointer transition-all"
                        style={{
                          background: controls.healthEvaluation === "step" ? "var(--color-mf-50)" : "white",
                          border: controls.healthEvaluation === "step" ? "2px solid var(--color-mf-500)" : "1px solid var(--color-border-light)",
                        }}
                      >
                        <span className="text-[13px] font-semibold block" style={{ color: "var(--color-text-primary)" }}>Step deadlines</span>
                        <span className="text-[12px] block mt-0.5" style={{ color: "var(--color-text-muted)" }}>Any overdue step changes the matter&apos;s status. Strictest tracking.</span>
                      </button>
                      <button
                        onClick={() => setControls({ ...controls, healthEvaluation: "stage" })}
                        className="flex-1 text-left p-3 rounded-[10px] cursor-pointer transition-all"
                        style={{
                          background: controls.healthEvaluation === "stage" ? "var(--color-mf-50)" : "white",
                          border: controls.healthEvaluation === "stage" ? "2px solid var(--color-mf-500)" : "1px solid var(--color-border-light)",
                        }}
                      >
                        <span className="text-[13px] font-semibold block" style={{ color: "var(--color-text-primary)" }}>Stage deadlines</span>
                        <span className="text-[12px] block mt-0.5" style={{ color: "var(--color-text-muted)" }}>Overdue steps show as warnings. Status only changes when the stage itself is late.</span>
                      </button>
                    </div>
                    <p className="text-[11px] mt-2 m-0" style={{ color: "var(--color-text-muted)" }}>Overdue steps always show red in the progress bar regardless of this setting.</p>
                  </div>
                  {CONTROL_FIELDS.map((field) => {
                    const value = controls[field.key] as number;
                    return (
                      <div key={field.key} className="p-5 rounded-[12px] bg-[var(--color-surface-dim)]">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 mr-8">
                            <label className="text-[14px] font-semibold text-[var(--color-text-primary)] block mb-1">{field.label}</label>
                            <p className="text-[12.5px] text-[var(--color-text-muted)] m-0">{field.description}</p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <input
                              type="number" min={field.min} max={field.max} value={value}
                              onChange={(e) => setControls({ ...controls, [field.key]: parseInt(e.target.value) || field.min })}
                              className="input-field w-20 text-center text-[15px] font-semibold"
                            />
                            <span className="text-[13px] text-[var(--color-text-muted)]">{field.unit}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Flow Breakdown conditions */}
                <div className="mt-6 p-5 rounded-[12px] bg-[var(--color-surface-dim)]">
                  <h3 className="text-[14px] font-semibold text-[var(--color-text-primary)] mb-1">Flow Breakdown conditions</h3>
                  <p className="text-[12.5px] text-[var(--color-text-muted)] mb-4 m-0">
                    A matter is flagged as Flow Breakdown when <strong>any</strong> of the enabled conditions is met. At least one must be enabled.
                  </p>
                  <div className="space-y-3">

                    {/* Condition 1: Past overall due date */}
                    <label className="flex items-center gap-3 p-4 rounded-[10px] bg-white cursor-pointer" style={{ border: "1px solid var(--color-border-light)" }}>
                      <input
                        type="checkbox" checked={controls.breakdownOnPastDue}
                        onChange={(e) => setControls({ ...controls, breakdownOnPastDue: e.target.checked })}
                        className="w-[18px] h-[18px] rounded cursor-pointer accent-violet-600 shrink-0"
                      />
                      <div className="flex-1">
                        <span className="text-[14px] font-semibold text-[var(--color-text-primary)]">Matter exceeded overall due date</span>
                        <p className="text-[12px] text-[var(--color-text-muted)] m-0 mt-0.5">The matter has gone past its target end date.</p>
                      </div>
                    </label>

                    {/* Condition 2: Inactivity */}
                    <div className="p-4 rounded-[10px] bg-white" style={{ border: "1px solid var(--color-border-light)" }}>
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox" checked={controls.breakdownOnInactivity}
                          onChange={(e) => setControls({ ...controls, breakdownOnInactivity: e.target.checked })}
                          className="w-[18px] h-[18px] rounded cursor-pointer accent-violet-600 shrink-0"
                        />
                        <div className="flex-1">
                          <span className="text-[14px] font-semibold text-[var(--color-text-primary)]">No activity for</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <input
                            type="number" min={3} max={90} value={controls.breakdownInactivityDays}
                            disabled={!controls.breakdownOnInactivity}
                            onChange={(e) => setControls({ ...controls, breakdownInactivityDays: parseInt(e.target.value) || 14 })}
                            className="input-field w-20 text-center text-[15px] font-semibold disabled:opacity-40"
                          />
                          <span className="text-[13px] text-[var(--color-text-muted)]">days</span>
                        </div>
                      </div>
                      <p className="text-[12px] text-[var(--color-text-muted)] m-0 mt-1 ml-[30px]">No step has been completed in this many days.</p>
                    </div>

                    {/* Condition 3: Step severely overdue */}
                    <div className="p-4 rounded-[10px] bg-white" style={{ border: "1px solid var(--color-border-light)" }}>
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox" checked={controls.breakdownOnStepOverdue}
                          onChange={(e) => setControls({ ...controls, breakdownOnStepOverdue: e.target.checked })}
                          className="w-[18px] h-[18px] rounded cursor-pointer accent-violet-600 shrink-0"
                        />
                        <div className="flex-1">
                          <span className="text-[14px] font-semibold text-[var(--color-text-primary)]">Any step overdue by</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <input
                            type="number" min={3} max={120} value={controls.breakdownStepOverdueDays}
                            disabled={!controls.breakdownOnStepOverdue}
                            onChange={(e) => setControls({ ...controls, breakdownStepOverdueDays: parseInt(e.target.value) || 21 })}
                            className="input-field w-20 text-center text-[15px] font-semibold disabled:opacity-40"
                          />
                          <span className="text-[13px] text-[var(--color-text-muted)]">days</span>
                        </div>
                      </div>
                      <p className="text-[12px] text-[var(--color-text-muted)] m-0 mt-1 ml-[30px]">A single step has been overdue by more than this many days.</p>
                    </div>

                  </div>
                </div>

                {/* Status precedence */}
                <div className="p-5 mt-5 rounded-[12px] bg-[var(--color-surface-dim)]">
                  <h3 className="text-[14px] font-semibold text-[var(--color-text-primary)] mb-3">Status precedence</h3>
                  <p className="text-[12.5px] text-[var(--color-text-muted)] mb-3 m-0">Highest-severity status wins:</p>
                  <div className="flex items-center gap-2">
                    {[
                      { label: "Flow Breakdown", color: "bg-violet-500" },
                      { label: "Out of Flow", color: "bg-red-500" },
                      { label: "At Flow Risk", color: "bg-amber-500" },
                      { label: "In Flow", color: "bg-emerald-500" },
                    ].map((item, i) => (
                      <div key={item.label} className="flex items-center gap-2">
                        {i > 0 && <span className="text-[var(--color-text-muted)] text-[12px]">›</span>}
                        <span className="flex items-center gap-1.5 text-[12.5px] font-medium text-[var(--color-text-secondary)]">
                          <span className={clsx("w-2 h-2 rounded-full", item.color)} />
                          {item.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
          {/* ═══ BILLING TAB ═══ */}
          {activeTab === "billing" && userRole === "OWNER" && (
           
           <BillingTab />
            
          )}
          {/* ═══ TEAM TAB ═══ */}
          {activeTab === "team" && userRole === "OWNER" && (
           <div className="max-w-[1000px] mx-auto space-y-6">
              <TeamTab />
           </div>
           
            
          )}
        </div>
      </div>
    </div>
  );
}
