/**
 * MATTERFLOW EDITOR PAGE
 *
 * SAVE BEHAVIOR:
 * When saving an existing template, a choice dialog appears:
 * 1. "Update template only" — saves changes, existing matters unaffected
 * 2. "Update and apply to X matters" — saves + merges changes into active matters
 * 3. "Save as new Workflow" — creates a copy with changes, original unchanged
 *
 * For NEW templates (not yet saved), Save works directly — no dialog needed.
 *
 * SaaS NOTES:
 * - The "apply to existing matters" count comes from a dedicated API endpoint.
 * - In production, the merge operation should be queued for large firms.
 * - Add optimistic locking to prevent concurrent edits.
 */
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { PageLoader } from "@/components/ui/Spinner";
import Link from "next/link";
import {
  ArrowLeft, Plus, Trash2, ChevronUp, ChevronDown as ChevronDownIcon,
  Save, Check, Info, FileUp, FilePlus, AlertTriangle,
} from "lucide-react";
import { clsx } from "clsx";
import type { MatterFlow, FlowStage, FlowStep } from "@/types";
import { v4 as uuid } from "uuid";
import { toast } from "sonner";

function newStage(order: number): FlowStage {
  return { id: uuid(), matterFlowId: "", name: "New Stage", order, defaultDurationDays: 7, steps: [], createdAt: "" };
}

function newStep(stageId: string, order: number): FlowStep {
  return { id: uuid(), stageId, name: "New Step", order, dueDaysOffset: order + 1, isRequired: true, createdAt: "" };
}

export default function MatterFlowEditorPage() {
  const params = useParams();
  const router = useRouter();
  const flowId = params.id as string;
  const isNew = flowId === "new";

  const [flow, setFlow] = useState<MatterFlow | null>(null);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [selectedStageIdx, setSelectedStageIdx] = useState(0);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [affectedMattersCount, setAffectedMattersCount] = useState(0);
  const [publishing, setPublishing] = useState(false);

  useEffect(() => {
    if (isNew) {
      setFlow({ id: "", firmId: "", name: "New Workflow", description: "", isDefault: false, isPublic: false, stages: [newStage(0)], createdAt: "", updatedAt: "" });
      return;
    }
    fetch(`/api/matterflows/${flowId}`)
      .then((r) => { if (!r.ok) { router.push("/matterflows"); return null; } return r.json(); })
      .then((data) => { if (data) setFlow(data); })
      .finally(() => setLoading(false));
  }, [flowId, isNew, router]);

  // ── Save actions ──

  /** For new templates, save directly. For existing, show choice dialog. */
  const handleSaveClick = async () => {
    if (!flow || !flow.name.trim()) return;
    if (isNew) {
      await doSave();
    } else {
      // Fetch affected matters count before showing dialog
      try {
        const res = await fetch(`/api/matterflows/${flowId}/apply`);

        if (!res.ok) {
          const errorData = await res.json();
          toast.error(errorData.error || "Save failed");
          return;
        }

        const data = await res.json();
        setAffectedMattersCount(data.count || 0);
      } catch(err) { 
        toast.error(err instanceof Error ? err.message : "Save failed");
        setAffectedMattersCount(0); 
      }
      setShowSaveDialog(true);
    }
  };

  /** Option 1: Update template only */
  const doSave = async () => {
    if (!flow) return;
    setSaving(true);
    setShowSaveDialog(false);
    try {
      const method = isNew ? "POST" : "PUT";
      const url = isNew ? "/api/matterflows" : `/api/matterflows/${flowId}`;
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(flow) });
       
      if (!res.ok) {
        const errorData = await res.json();
        toast.error(errorData.error || "Save failed");
        return;
      }
      const result = await res.json();
      setSaved(true); setTimeout(() => setSaved(false), 2000);
      if (isNew && result.id) router.push(`/matterflows/${result.id}`);
      else setFlow(result);
    } catch (err) { 
      toast.error(err instanceof Error ? err.message : "Save failed");
      console.error("Save failed:", err); 
    }
    finally { setSaving(false); }
  };

  /** Option 2: Update template AND apply to existing matters */
  const doSaveAndApply = async () => {
    if (!flow) return;
    setSaving(true);
    setShowSaveDialog(false);
    try {
      // First save the template
      const res = await fetch(`/api/matterflows/${flowId}`, {
        method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(flow),
      });

      if (!res.ok) {
        const errorData = await res.json();
        toast.error(errorData.error || "Save failed");
        return;
      }

      const result = await res.json();
      setFlow(result);
      // Then apply to existing matters
      await fetch(`/api/matterflows/${flowId}/apply`, { method: "POST" });
      setSaved(true); setTimeout(() => setSaved(false), 2000);
    } catch (err) { 
      toast.error(err instanceof Error ? err.message : "Save failed");
      console.error("Save + apply failed:", err); 
    }
    finally { setSaving(false); }
  };

  /** Option 3: Save as new Workflow */
  const doSaveAsNew = async () => {
    if (!flow) return;
    setSaving(true);
    setShowSaveDialog(false);
    try {
      const res = await fetch("/api/matterflows", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...flow, id: undefined, isDefault: false }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        toast.error(errorData.error || "Save failed");
        return;
      }

      const result = await res.json();
      setSaved(true); setTimeout(() => setSaved(false), 2000);
      if (result.id) router.push(`/matterflows/${result.id}`);
    } catch (err) { 
      toast.error(err instanceof Error ? err.message : "Save failed");
      console.error("Save as new failed:", err); 
    }
    finally { setSaving(false); }
  };

  // ── Mutation helpers ──
  const updateFlow = (u: Partial<MatterFlow>) => { if (flow) setFlow({ ...flow, ...u }); };
  const addStage = () => { if (!flow) return; updateFlow({ stages: [...flow.stages, newStage(flow.stages.length)] }); setSelectedStageIdx(flow.stages.length); };
  const removeStage = (idx: number) => { if (!flow || flow.stages.length <= 1) return; const s = flow.stages.filter((_, i) => i !== idx).map((s, i) => ({ ...s, order: i })); updateFlow({ stages: s }); if (selectedStageIdx >= s.length) setSelectedStageIdx(s.length - 1); };
  const updateStage = (idx: number, u: Partial<FlowStage>) => { if (flow) updateFlow({ stages: flow.stages.map((s, i) => i === idx ? { ...s, ...u } : s) }); };
  const addStep = (si: number) => { if (!flow) return; const st = flow.stages[si]; updateStage(si, { steps: [...st.steps, newStep(st.id, st.steps.length)] }); };
  const removeStep = (si: number, sti: number) => { if (!flow) return; const st = flow.stages[si]; updateStage(si, { steps: st.steps.filter((_, i) => i !== sti).map((s, i) => ({ ...s, order: i })) }); };
  const updateStep = (si: number, sti: number, u: Partial<FlowStep>) => {
    if (!flow) return;
    const st = flow.stages[si];
    const updatedSteps = st.steps.map((s, i) => i === sti ? { ...s, ...u } : s);
    // Auto-adjust: if any step's dueDaysOffset exceeds the stage's expected duration, bump it up.
    // The reverse does NOT happen — shortening a step won't shrink the duration (owner controls the ceiling).
    const maxDueDays = Math.max(...updatedSteps.map((s) => s.dueDaysOffset ?? 0));
    const newDuration = (st.defaultDurationDays ?? 0) < maxDueDays ? maxDueDays : st.defaultDurationDays;
    updateStage(si, { steps: updatedSteps, defaultDurationDays: newDuration });
  };
  const moveStep = (si: number, sti: number, dir: "up" | "down") => {
    if (!flow) return; const st = flow.stages[si]; const steps = [...st.steps]; const ti = dir === "up" ? sti - 1 : sti + 1;
    if (ti < 0 || ti >= steps.length) return; [steps[sti], steps[ti]] = [steps[ti], steps[sti]];
    updateStage(si, { steps: steps.map((s, i) => ({ ...s, order: i })) });
  };

  if (loading) return <PageLoader />;
  if (!flow) return null;
  //const selectedStage = flow.stages[selectedStageIdx];
  const stages = flow?.stages || [];
  const selectedStage = stages[selectedStageIdx] || null;

  return (
    <div>
      <Link href="/matterflows" className="inline-flex items-center gap-1.5 text-[14px] text-[var(--color-text-secondary)] hover:text-[var(--color-mf-600)] mb-2 no-underline">
        <ArrowLeft className="w-4 h-4" /> Back to Workflows
      </Link>

      <div className="flex items-start justify-between mb-7">
        <div>
          <h1 className="text-[34px] font-bold tracking-[-0.8px] text-[var(--color-text-primary)]">{isNew ? "New Workflow" : "Edit Workflow"}</h1>
          {flow.isPublic && <span className="text-[12px] font-semibold text-[#059669] bg-[#ECFDF5] px-2.5 py-1 rounded-[5px] mt-1 inline-block">Published to Public Library</span>}
        </div>
        <div className="flex items-center gap-2">
          {!isNew && (
            <button
              onClick={async () => {
                if (!flow.isPublic && !confirm("Publish this workflow to the Public Library?\n\nWhat's shared: Stages and Steps — workflow structure only.\n\nWhat's NEVER shared: Client or Law Firm data.")) return;
                if (flow.isPublic && !confirm("Remove this workflow from the Public Library?")) return;
                setPublishing(true);
                try {
                  const res = await fetch(`/api/matterflows/${flowId}/publish`, { method: "POST" });
                  if (!res.ok) {
                      const errorData = await res.json();
                      toast.error(errorData.error || "Save failed");
                      return;
                    }

                  const data = await res.json();
                  setFlow({ ...flow, isPublic: data.isPublic });
                }catch (err) { 
                  toast.error(err instanceof Error ? err.message : "Save failed");
                  console.error("Save as new failed:", err); 
                } finally { setPublishing(false); }
              }}
              disabled={publishing}
              className={clsx("flex items-center gap-2 text-[14px] py-2 px-4 rounded-[8px] border cursor-pointer transition-colors font-medium",
                flow.isPublic
                  ? "bg-[#ECFDF5] border-[#BBF7D0] text-[#059669] hover:bg-red-50 hover:border-red-200 hover:text-red-600"
                  : "bg-white border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-mf-400)] hover:text-[var(--color-mf-600)]",
                publishing && "opacity-50 cursor-not-allowed"
              )}>
              {publishing ? "..." : flow.isPublic ? "Unpublish" : "Publish to Public Library"}
            </button>
          )}
          <button 
          onClick={handleSaveClick} 
          disabled={saving || !flow?.name?.trim()} 
          className={clsx(
            "btn-primary flex items-center gap-2 text-[15px] py-2 px-4", 
            (saving || !flow?.name?.trim()) && "opacity-50 cursor-not-allowed"
          )}
        >
            {saving ? "Saving..." : saved ? "Saved!" : "Save"}
          </button>
        </div>
      </div>

      {/* Meta card */}
      <div className="rounded-[16px] p-7 mb-7 bg-[var(--color-surface-card)] shadow-[var(--shadow-card)]">
        <div className="grid grid-cols-2 gap-5 mb-4">
          <div><label className="block text-[14px] font-medium text-[var(--color-text-secondary)] mb-2">Name *</label><input className="input-field py-3.5 text-[16px]" value={flow.name} onChange={(e) => updateFlow({ name: e.target.value })} placeholder="e.g., Reg D Private Placement" /></div>
          <div><label className="block text-[14px] font-medium text-[var(--color-text-secondary)] mb-2">Description</label><input className="input-field py-3.5 text-[16px]" value={flow.description || ""} onChange={(e) => updateFlow({ description: e.target.value })} placeholder="Brief description..." /></div>
        </div>
        <label className="flex items-center gap-2.5 cursor-pointer"><input type="checkbox" checked={flow.isDefault} onChange={(e) => updateFlow({ isDefault: e.target.checked })} className="w-[18px] h-[18px] rounded" /><span className="text-[14px] text-[var(--color-text-secondary)]">Set as default workflow for new matters</span></label>
      </div>

      {/* Two-panel */}
      <div className="flex gap-6">
        {/* Stage list */}
        <div className="w-[300px] shrink-0">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[16px] font-medium text-[var(--color-text-primary)]">Flow Stages</span>
            <button onClick={addStage} className="text-[14px] text-[var(--color-mf-600)] hover:text-[var(--color-mf-700)] flex items-center gap-1 cursor-pointer font-medium"><Plus className="w-4 h-4" /> Add Stage</button>
          </div>
          <div className="space-y-1.5">
            {(flow?.stages || []).map((stage, idx) => (
              <button key={stage.id} onClick={() => setSelectedStageIdx(idx)} className={clsx("w-full flex items-center gap-3 px-4 py-4 rounded-[16px] text-left transition-all cursor-pointer shadow-[var(--shadow-card)]", selectedStageIdx === idx ? "bg-[var(--color-surface-card)] ring-[1.5px] ring-[var(--color-mf-400)]" : "bg-[var(--color-surface-card)] hover:bg-[var(--color-surface-hover)]")}>
                <div className={clsx("w-[30px] h-[30px] rounded-full flex items-center justify-center text-[13px] font-semibold shrink-0", selectedStageIdx === idx ? "bg-[var(--color-mf-600)] text-white" : "bg-gray-100 text-gray-500")}>{idx + 1}</div>
                <div className="flex-1 min-w-0"><span className="text-[15px] font-medium text-[var(--color-text-primary)] truncate block">{stage.name || "Untitled Stage"}</span><span className="text-[13px] text-[var(--color-text-muted)]">{stage.steps.length} step{stage.steps.length !== 1 ? "s" : ""}{stage.defaultDurationDays ? ` · ${stage.defaultDurationDays} days` : ""}</span></div>
              </button>
            ))}
          </div>
        </div>

        {/* Stage editor */}
        {selectedStage && (
          <div className="flex-1">
            <div className="rounded-[16px] p-7 bg-[var(--color-surface-card)] shadow-[var(--shadow-card)]">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-[22px] font-semibold text-[var(--color-text-primary)]">Stage {selectedStageIdx + 1}: {selectedStage.name || "Untitled"}</h3>
                {flow.stages.length > 1 && <button onClick={() => removeStage(selectedStageIdx)} className="text-[14px] text-red-500 hover:text-red-700 flex items-center gap-1 cursor-pointer font-medium"><Trash2 className="w-4 h-4" /> Remove</button>}
              </div>
              <div className="grid grid-cols-[1fr_200px] gap-4 mb-7">
                <div><label className="block text-[14px] font-medium text-[var(--color-text-secondary)] mb-2">Stage Name</label><input className="input-field py-3.5 text-[16px]" value={selectedStage.name} onChange={(e) => updateStage(selectedStageIdx, { name: e.target.value })} /></div>
                <div><label className="block text-[14px] font-medium text-[var(--color-text-secondary)] mb-2">Expected Duration</label><div className="relative"><input className="input-field py-3.5 text-[16px] pr-14" type="number" min={1} value={selectedStage.defaultDurationDays || ""} onChange={(e) => updateStage(selectedStageIdx, { defaultDurationDays: e.target.value ? parseInt(e.target.value) : undefined })} /><span className="absolute right-5 top-1/2 -translate-y-1/2 text-[14px] text-[var(--color-text-muted)] pointer-events-none">days</span></div></div>
              </div>

              <div className="flex items-center justify-between mb-4">
                <span className="text-[16px] font-medium text-[var(--color-text-primary)]">Flow Steps</span>
                <button onClick={() => addStep(selectedStageIdx)} className="text-[14px] text-[var(--color-mf-600)] hover:text-[var(--color-mf-700)] flex items-center gap-1 cursor-pointer font-medium"><Plus className="w-4 h-4" /> Add Step</button>
              </div>

              {selectedStage.steps.length > 0 && (
                <div className="grid grid-cols-[40px_1fr_100px_90px_32px] gap-3 px-4 mb-2">
                  <span /><span className="text-[11px] font-medium text-[var(--color-text-muted)] uppercase tracking-wider">Step name</span><span className="text-[11px] font-medium text-[var(--color-text-muted)] uppercase tracking-wider">Due by day</span><span className="text-[11px] font-medium text-[var(--color-text-muted)] uppercase tracking-wider text-center">Required</span><span />
                </div>
              )}

              {selectedStage.steps.length === 0 ? (
                <div className="text-center py-10 text-[15px] text-[var(--color-text-muted)]">No steps yet. Add steps to define the work in this stage.</div>
              ) : (
                <div className="space-y-2">
                  {selectedStage.steps.map((step, sti) => (
                    <div key={step.id} className="grid grid-cols-[40px_1fr_100px_90px_32px] gap-3 items-center px-4 py-3 rounded-[16px] bg-[var(--color-surface-dim)] border border-[var(--color-border-light)]">
                      <div className="flex flex-col items-center gap-0">
                        <button onClick={() => moveStep(selectedStageIdx, sti, "up")} disabled={sti === 0} className={clsx("p-0.5 cursor-pointer transition-colors", sti === 0 ? "text-gray-200 cursor-not-allowed" : "text-[var(--color-text-muted)] hover:text-[var(--color-mf-600)]")}><ChevronUp className="w-[14px] h-[14px]" /></button>
                        <button onClick={() => moveStep(selectedStageIdx, sti, "down")} disabled={sti === selectedStage.steps.length - 1} className={clsx("p-0.5 cursor-pointer transition-colors", sti === selectedStage.steps.length - 1 ? "text-gray-200 cursor-not-allowed" : "text-[var(--color-text-muted)] hover:text-[var(--color-mf-600)]")}><ChevronDownIcon className="w-[14px] h-[14px]" /></button>
                      </div>
                      <input className="input-field text-[15px] py-2.5" value={step.name} onChange={(e) => updateStep(selectedStageIdx, sti, { name: e.target.value })} placeholder="Step name" />
                      <input className="input-field text-[15px] py-2.5 text-center" type="number" min={0} value={step.dueDaysOffset ?? ""} onChange={(e) => updateStep(selectedStageIdx, sti, { dueDaysOffset: e.target.value ? parseInt(e.target.value) : undefined })} placeholder="—" />
                      <label className="flex items-center justify-center gap-1.5 text-[13px] text-[var(--color-text-secondary)] cursor-pointer"><input type="checkbox" checked={step.isRequired} onChange={(e) => updateStep(selectedStageIdx, sti, { isRequired: e.target.checked })} className="w-4 h-4 rounded" /><span>{step.isRequired ? "Yes" : "No"}</span></label>
                      <button onClick={() => removeStep(selectedStageIdx, sti)} className="text-[var(--color-text-muted)] hover:text-red-500 transition-colors cursor-pointer flex items-center justify-center"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  ))}
                </div>
              )}

              {selectedStage.steps.length > 0 && (
                <div className="mt-5 px-5 py-4 rounded-[16px] bg-[var(--color-mf-50)] border border-[var(--color-mf-200)]">
                  <div className="flex items-start gap-2.5">
                    <Info className="w-4 h-4 text-[var(--color-mf-600)] mt-0.5 shrink-0" />
                    <p className="text-[13px] text-[var(--color-mf-800)] leading-relaxed m-0">
                      <strong className="font-medium">Due by day</strong> = the day number within this stage when the step should be completed. For example, &quot;3&quot; means due by day 3 after the stage starts. The stage&apos;s expected duration ({selectedStage.defaultDurationDays || "—"} days) sets the overall timeframe.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Save Choice Dialog ── */}
      {showSaveDialog && (
        <SaveChoiceDialog
          affectedCount={affectedMattersCount}
          onUpdateOnly={doSave}
          onUpdateAndApply={doSaveAndApply}
          onSaveAsNew={doSaveAsNew}
          onCancel={() => setShowSaveDialog(false)}
        />
      )}
    </div>
  );
}

// ============================================================
// SAVE CHOICE DIALOG
// Appears when saving an existing MatterFlow template.
// Offers three options with clear descriptions.
// ============================================================
function SaveChoiceDialog({
  affectedCount, onUpdateOnly, onUpdateAndApply, onSaveAsNew, onCancel,
}: {
  affectedCount: number;
  onUpdateOnly: () => void;
  onUpdateAndApply: () => void;
  onSaveAsNew: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-white rounded-[16px] shadow-xl w-full max-w-md p-7 mx-4">
        <h2 className="text-[20px] font-bold text-[var(--color-text-primary)] mb-2">Save Changes</h2>
        <p className="text-[14px] text-[var(--color-text-secondary)] mb-6">How would you like to save your changes to this workflow?</p>

        <div className="space-y-3">
          {/* Option 1: Update only */}
          <button
            onClick={onUpdateOnly}
            className="w-full text-left p-4 rounded-[16px] border border-[var(--color-border)] hover:border-[var(--color-mf-300)] hover:bg-[var(--color-mf-50)] transition-all cursor-pointer group"
          >
            <div className="flex items-center gap-3 mb-1">
              <Save className="w-5 h-5 text-[var(--color-mf-600)]" />
              <span className="text-[15px] font-semibold text-[var(--color-text-primary)]">Update template only</span>
            </div>
            <p className="text-[13px] text-[var(--color-text-muted)] ml-8">Save changes for new matters only. Existing matters are not affected.</p>
          </button>

          {/* Option 2: Update and apply */}
          <button
            onClick={onUpdateAndApply}
            className="w-full text-left p-4 rounded-[16px] border border-[var(--color-border)] hover:border-amber-300 hover:bg-amber-50 transition-all cursor-pointer group"
          >
            <div className="flex items-center gap-3 mb-1">
              <FileUp className="w-5 h-5 text-amber-600" />
              <span className="text-[15px] font-semibold text-[var(--color-text-primary)]">
                Update and apply to {affectedCount} active matter{affectedCount !== 1 ? "s" : ""}
              </span>
            </div>
            <p className="text-[13px] text-[var(--color-text-muted)] ml-8">
              Save changes and merge new stages/steps into existing matters. Completed work is preserved.
            </p>
            {affectedCount > 0 && (
              <div className="flex items-center gap-1.5 ml-8 mt-1.5 text-[12px] text-amber-600">
                <AlertTriangle className="w-3.5 h-3.5" /> This will modify {affectedCount} active matter{affectedCount !== 1 ? "s" : ""}
              </div>
            )}
          </button>

          {/* Option 3: Save as new */}
          <button
            onClick={onSaveAsNew}
            className="w-full text-left p-4 rounded-[16px] border border-[var(--color-border)] hover:border-emerald-300 hover:bg-emerald-50 transition-all cursor-pointer group"
          >
            <div className="flex items-center gap-3 mb-1">
              <FilePlus className="w-5 h-5 text-emerald-600" />
              <span className="text-[15px] font-semibold text-[var(--color-text-primary)]">Save as new Workflow</span>
            </div>
            <p className="text-[13px] text-[var(--color-text-muted)] ml-8">Create a new template with these changes. The original template stays unchanged.</p>
          </button>
        </div>

        <button onClick={onCancel} className="w-full text-center text-[14px] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] mt-4 pt-4 border-t border-[var(--color-border)] cursor-pointer">
          Cancel
        </button>
      </div>
    </div>
  );
}
