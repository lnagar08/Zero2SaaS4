/**
 * MATTERFLOWS LIST PAGE
 *
 * Shows all workflow templates with Duplicate and Delete functionality.
 *
 * DELETE BEHAVIOR:
 * - If no active matters use the template → simple confirm dialog
 * - If active matters exist → dialog shows count and offers:
 *   1. Reassign matters to another template (dropdown) and delete
 *   2. Keep matters as "Custom" (orphan) and delete
 *   3. Cancel
 *
 * Matters are NEVER deleted when removing a template. Their stage/step
 * progress is independent and continues to function without a template.
 *
 * SaaS NOTES:
 * - Templates are tenant-scoped via firm_id.
 * - In SaaS, add role checks: only owners/admins can delete templates.
 * - Consider soft-delete (archive) instead of hard delete for audit trails.
 */
"use client";

import { useEffect, useState, useCallback } from "react";
import { PageLoader } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Plus, Workflow, Layers, ArrowRight, Star, Copy, Trash2,
  AlertTriangle, X,
} from "lucide-react";
import { clsx } from "clsx";
import type { MatterFlow } from "@/types";
import { toast } from "sonner";

export default function MatterFlowsPage() {
  const router = useRouter();
  const [flows, setFlows] = useState<MatterFlow[]>([]);
  const [loading, setLoading] = useState(true);
  const [duplicating, setDuplicating] = useState<string | null>(null);

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState<MatterFlow | null>(null);
  const [deleteAffectedCount, setDeleteAffectedCount] = useState(0);
  const [deleteReassignTo, setDeleteReassignTo] = useState<string>("");
  const [deleting, setDeleting] = useState(false);
  const [activeTab, setActiveTab] = useState<"mine" | "library">("mine");
  const [importedName, setImportedName] = useState("");

  const fetchFlows = useCallback(async () => {
    try {
      const res = await fetch("/api/matterflows");
      setFlows(await res.json());
    } catch (err) {
      console.error("Failed to load:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchFlows(); }, [fetchFlows]);

  const handleDuplicate = async (flowId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDuplicating(flowId);
    try {
      const res = await fetch(`/api/matterflows/${flowId}/duplicate`, { method: "POST" });
      if (!res.ok) {
        const errorData = await res.json();
        toast.error(errorData.error || "Save failed");
        return;
      }
      const newFlow = await res.json();
      if (newFlow.id) router.push(`/matterflows/${newFlow.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
      console.error("Failed to duplicate:", err);
      setDuplicating(null);
    }
  };

  /** Open delete dialog — fetch affected matters count first */
  const handleDeleteClick = async (flow: MatterFlow, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const res = await fetch(`/api/matterflows/${flow.id}/apply`);
      if (!res.ok) {
        const errorData = await res.json();
        toast.error(errorData.error || "Save failed");
        return;
      }
      const data = await res.json();
      setDeleteAffectedCount(data.count || 0);
    } catch(err) { 
      toast.error(err instanceof Error ? err.message : "Save failed");
      setDeleteAffectedCount(0); 
    }
    setDeleteReassignTo("");
    setDeleteTarget(flow);
  };

  /** Execute delete with optional reassignment */
  const executeDelete = async (mode: "reassign" | "orphan") => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      let url = `/api/matterflows/${deleteTarget.id}`;
      if (mode === "reassign" && deleteReassignTo) {
        url += `?reassignTo=${deleteReassignTo}`;
      } else {
        url += `?orphan=true`;
      }
      const res = await fetch(url, { method: "DELETE" });
      if (!res.ok) {
        const errorData = await res.json();
        toast.error(errorData.error || "Save failed");
        return;
      }
      setDeleteTarget(null);
      fetchFlows();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
      console.error("Failed to delete:", err);
    } finally {
      setDeleting(false);
    }
  };

  /** Simple delete (no active matters) */
  const executeSimpleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/matterflows/${deleteTarget.id}`, { method: "DELETE" });
      if (!res.ok) {
        const errorData = await res.json();
        toast.error(errorData.error || "Save failed");
        return;
      }
      setDeleteTarget(null);
      fetchFlows();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
      console.error("Failed to delete:", err);
    } finally {
      setDeleting(false);
    }
  };

  // Other MatterFlows available for reassignment (exclude the one being deleted)
  const reassignOptions = flows.filter((f) => f.id !== deleteTarget?.id);

  if (loading) return <PageLoader />;

  // Pre-built workflow library
  /**
   * SaaS NOTE: In production, replace this hardcoded array with an API call:
   * fetch("/api/workflows/library") → returns all PublishedWorkflow records
   * This would include both MatterGuardian pre-built workflows AND
   * user-published workflows from other orgs. Each record includes
   * authorOrgId, authorName, category, stages[], steps[], importCount.
   * The Import button should deep-clone all stages and steps into the
   * importing org's private MatterFlow table with a new orgId.
   */
  const LIBRARY_WORKFLOWS = [
    { name: "Reg D Private Placement", author: "MatterGuardian", category: "Securities", stages: 5, steps: 20, description: "Complete Reg D 506(b)/506(c) offering workflow from intake through SEC filing and closing." },
    { name: "Family-Based Green Card (I-130/I-485)", author: "MatterGuardian", category: "Immigration", stages: 5, steps: 18, description: "Petition preparation, USCIS filing, biometrics, interview prep, and approval tracking." },
    { name: "Residential Real Estate Closing", author: "MatterGuardian", category: "Real Estate", stages: 5, steps: 16, description: "From engagement through title search, contract review, closing prep, and post-closing." },
    { name: "Estate Plan — Will + Trust Package", author: "MatterGuardian", category: "Estate Planning", stages: 5, steps: 15, description: "Client intake, document drafting, review rounds, execution ceremony, and funding." },
    { name: "Corporate Formation (LLC/Corp)", author: "MatterGuardian", category: "Corporate", stages: 4, steps: 14, description: "Entity selection, formation filing, operating documents, and post-formation compliance." },
  ];

  const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
    Securities: { bg: "#EEF2FF", text: "#6366F1" },
    Immigration: { bg: "#ECFDF5", text: "#059669" },
    "Real Estate": { bg: "#FFFBEB", text: "#B45309" },
    "Estate Planning": { bg: "#F3E8FF", text: "#7C3AED" },
    Corporate: { bg: "#E0F2FE", text: "#0284C7" },
  };

  return (
    <div>
      <div className="flex items-start justify-between mb-5">
        <div>
          <h1 className="text-[34px] font-bold tracking-[-0.8px] text-[var(--color-text-primary)]">Workflows</h1>
          <p className="mt-1 text-[16px] text-[var(--color-text-secondary)]">Build and manage your matter workflows</p>
        </div>
        <Link href="/matterflows/new" className="btn-primary flex items-center gap-2 text-[15px] py-2 px-4 no-underline">
          <Plus className="w-[18px] h-[18px]" /> New Workflow
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-[var(--color-border)]">
        <button onClick={() => setActiveTab("mine")}
          className={clsx("px-4 py-2.5 text-[14px] font-medium border-none cursor-pointer transition-all bg-transparent",
            activeTab === "mine" ? "text-[var(--color-mf-600)] border-b-2 border-[var(--color-mf-500)]" : "text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
          )} style={activeTab === "mine" ? { borderBottom: "2px solid var(--color-mf-500)", marginBottom: "-1px" } : {}}>
          My Workflows
        </button>
        <button onClick={() => setActiveTab("library")}
          className={clsx("px-4 py-2.5 text-[14px] font-medium border-none cursor-pointer transition-all bg-transparent",
            activeTab === "library" ? "text-[var(--color-mf-600)] border-b-2 border-[var(--color-mf-500)]" : "text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
          )} style={activeTab === "library" ? { borderBottom: "2px solid var(--color-mf-500)", marginBottom: "-1px" } : {}}>
          Workflow Library
        </button>
      </div>

      {/* ── My Workflows Tab ── */}
      {activeTab === "mine" && (
        <>
      {flows.length === 0 ? (
        <EmptyState
          icon={<Workflow className="w-10 h-10" />}
          title="No workflows yet"
          description="Create a workflow or import one from the Workflow Library"
          action={<Link href="/matterflows/new" className="btn-primary no-underline">Create Workflow</Link>}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {flows.map((flow) => (
            <Link
              key={flow.id}
              href={`/matterflows/${flow.id}`}
              className={clsx(
                "rounded-[16px] p-6 no-underline group relative",
                "bg-[var(--color-surface-card)] shadow-[var(--shadow-card)]",
                "hover:shadow-[var(--shadow-card-hover)] hover:-translate-y-px transition-all duration-150"
              )}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-10 h-10 rounded-[16px] bg-gradient-to-br from-[var(--color-mf-100)] to-[var(--color-mf-200)] flex items-center justify-center">
                  <Workflow className="w-5 h-5 text-[var(--color-mf-600)]" />
                </div>
                <div className="flex items-center gap-2">
                  {flow.isDefault && (
                    <span className="flex items-center gap-1 text-[12px] font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-[5px]">
                      <Star className="w-3 h-3" /> Default
                    </span>
                  )}
                  {flow.isPublic && (
                    <span className="text-[12px] font-medium text-[#059669] bg-[#ECFDF5] px-2 py-0.5 rounded-[5px]">
                      Published
                    </span>
                  )}
                  <button
                    onClick={(e) => handleDuplicate(flow.id, e)}
                    disabled={duplicating === flow.id}
                    className="flex items-center gap-1.5 text-[12px] font-medium text-[var(--color-text-muted)] bg-[var(--color-surface-dim)] hover:bg-[var(--color-mf-50)] hover:text-[var(--color-mf-600)] px-2 py-0.5 rounded-[5px] transition-colors cursor-pointer border border-[var(--color-border-light)]"
                    title="Duplicate this Workflow"
                  >
                    <Copy className="w-3 h-3" />
                    {duplicating === flow.id ? "..." : "Duplicate"}
                  </button>
                  <button
                    onClick={(e) => handleDeleteClick(flow, e)}
                    className="flex items-center justify-center w-[26px] h-[26px] rounded-lg text-[var(--color-text-muted)] hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer border border-[var(--color-border-light)]"
                    title="Delete this Workflow"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                  <ArrowRight className="w-4 h-4 text-[var(--color-text-muted)] group-hover:text-[var(--color-mf-500)] transition-colors" />
                </div>
              </div>
              <h3 className="text-[18px] font-semibold text-[var(--color-text-primary)] mb-1">{flow.name}</h3>
              {flow.description && <p className="text-[14px] text-[var(--color-text-muted)] mb-4 line-clamp-2">{flow.description}</p>}
              <div className="flex items-center gap-4 text-[14px] text-[var(--color-text-muted)]">
                <span className="flex items-center gap-1.5"><Layers className="w-4 h-4" /> {flow.stages.length} stage{flow.stages.length !== 1 ? "s" : ""}</span>
                <span>{flow.stages.reduce((sum, s) => sum + s.steps.length, 0)} total steps</span>
              </div>
            </Link>
          ))}
        </div>
      )}
        </>
      )}

      {/* ── Workflow Library Tab ── */}
      {activeTab === "library" && (
        <div>
          <div className="rounded-[12px] p-4 mb-6" style={{ background: "var(--color-mf-50)", border: "1px solid var(--color-mf-200)" }}>
            <p className="text-[13px] m-0" style={{ color: "var(--color-mf-700)" }}>
              Pre-built workflows designed for common practice areas. Click <strong>Import</strong> to copy one into your workflows — then customize stages, steps, and timing to match your firm.
            </p>
          </div>
          {importedName && (
            <div className="fixed inset-0 z-50 flex items-center justify-center">
              <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
              <div className="relative bg-white rounded-[16px] shadow-xl w-full max-w-sm p-7 mx-4 text-center">
                <div className="w-[56px] h-[56px] rounded-full bg-[#ECFDF5] flex items-center justify-center mx-auto mb-4">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                </div>
                <h3 className="text-[18px] font-bold text-[var(--color-text-primary)] m-0 mb-2">Workflow imported!</h3>
                <p className="text-[14px] text-[var(--color-text-secondary)] m-0 mb-5">
                  <strong>"{importedName}"</strong> has been added to My Workflows. You can customize the stages and steps to match your firm.
                </p>
                <button
                  onClick={() => { setImportedName(""); setActiveTab("mine"); }}
                  className="btn-primary py-2.5 px-8 text-[15px]">
                  OK
                </button>
              </div>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* User-published workflows from My Workflows */}
            {flows.filter(f => f.isPublic).map((flow) => (
              <div key={`pub-${flow.id}`} className="rounded-[16px] p-6 bg-[var(--color-surface-card)] shadow-[var(--shadow-card)]">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-[16px] flex items-center justify-center" style={{ background: "#EEF2FF" }}>
                    <Workflow className="w-5 h-5" style={{ color: "#6366F1" }} />
                  </div>
                  <span className="text-[11px] font-semibold px-2.5 py-1 rounded-[5px]" style={{ background: "#ECFDF5", color: "#059669" }}>
                    Your firm
                  </span>
                </div>
                <h3 className="text-[17px] font-bold text-[var(--color-text-primary)] m-0 mb-1">{flow.name}</h3>
                <p className="text-[13px] text-[var(--color-text-muted)] m-0 mb-3">{flow.description || "Published from your workflows"}</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 text-[12px] text-[var(--color-text-muted)]">
                    <span className="flex items-center gap-1"><Layers className="w-3 h-3" /> {flow.stages?.length || 0} stages</span>
                    <span>·</span>
                    <span>by PPM Lawyers</span>
                  </div>
                  <span className="text-[12px] font-semibold text-[#059669] bg-[#ECFDF5] px-3 py-1.5 rounded-[8px]">Published ✓</span>
                </div>
              </div>
            ))}
            {/* Pre-built MatterGuardian workflows */}
            {LIBRARY_WORKFLOWS.map((lib) => {
              const colors = CATEGORY_COLORS[lib.category] || { bg: "#F0F1F3", text: "#666" };
              return (
                <div key={lib.name} className="rounded-[16px] p-6 bg-[var(--color-surface-card)] shadow-[var(--shadow-card)]">
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-10 h-10 rounded-[16px] flex items-center justify-center" style={{ background: colors.bg }}>
                      <Workflow className="w-5 h-5" style={{ color: colors.text }} />
                    </div>
                    <span className="text-[11px] font-semibold px-2.5 py-1 rounded-[5px]" style={{ background: colors.bg, color: colors.text }}>
                      {lib.category}
                    </span>
                  </div>
                  <h3 className="text-[17px] font-bold text-[var(--color-text-primary)] m-0 mb-1">{lib.name}</h3>
                  <p className="text-[13px] text-[var(--color-text-muted)] m-0 mb-3">{lib.description}</p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 text-[12px] text-[var(--color-text-muted)]">
                      <span className="flex items-center gap-1"><Layers className="w-3 h-3" /> {lib.stages} stages</span>
                      <span>·</span>
                      <span>{lib.steps} steps</span>
                      <span>·</span>
                      <span>by {lib.author}</span>
                    </div>
                    <button
                      onClick={async () => {
                        const res = await fetch("/api/matterflows", {
                          method: "POST", headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ name: lib.name, description: lib.description, isDefault: false, stages: [] }),
                        });
                        if (res.ok) { setImportedName(lib.name); fetchFlows(); }
                      }}
                      className="text-[12px] font-semibold px-3 py-1.5 rounded-[8px] cursor-pointer transition-colors border-none hover:opacity-90"
                      style={{ background: "var(--color-mf-500)", color: "white" }}>
                      Import
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Delete Workflow Dialog ── */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setDeleteTarget(null)} />
          <div className="relative bg-white rounded-[16px] shadow-xl w-full max-w-md p-7 mx-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[20px] font-bold text-[var(--color-text-primary)]">Delete Workflow</h2>
              <button onClick={() => setDeleteTarget(null)} className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-[15px] text-[var(--color-text-secondary)] mb-2">
              Are you sure you want to delete <strong className="text-[var(--color-text-primary)]">{deleteTarget.name}</strong>?
            </p>

            {deleteAffectedCount === 0 ? (
              <>
                <p className="text-[14px] text-[var(--color-text-muted)] mb-6">
                  No active matters are using this template. It can be safely deleted.
                </p>
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-[var(--color-border)]">
                  <button onClick={() => setDeleteTarget(null)} className="btn-secondary py-2.5 px-5">Cancel</button>
                  <button
                    onClick={executeSimpleDelete}
                    disabled={deleting}
                    className={clsx(
                      "flex items-center gap-2 py-2.5 px-5 rounded-[8px] bg-red-500 text-white font-medium text-[15px] cursor-pointer hover:bg-red-600 transition-colors border-none",
                      deleting && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    <Trash2 className="w-4 h-4" />
                    {deleting ? "Deleting..." : "Delete"}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2 mb-4 px-4 py-3 rounded-[16px] bg-amber-50 border border-amber-200">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <p className="text-[14px] text-amber-800 m-0">
                    <strong>{deleteAffectedCount}</strong> active matter{deleteAffectedCount !== 1 ? "s" : ""} {deleteAffectedCount !== 1 ? "are" : "is"} currently using this template.
                  </p>
                </div>

                <p className="text-[14px] text-[var(--color-text-secondary)] mb-4">
                  What should happen to {deleteAffectedCount === 1 ? "this matter" : "these matters"}?
                </p>

                <div className="space-y-3 mb-6">
                  {/* Option 1: Reassign */}
                  {reassignOptions.length > 0 && (
                    <div className="p-4 rounded-[16px] border border-[var(--color-border)] hover:border-[var(--color-mf-300)] transition-colors">
                      <p className="text-[14px] font-medium text-[var(--color-text-primary)] mb-2">
                        Reassign matters to another template
                      </p>
                      <select
                        value={deleteReassignTo}
                        onChange={(e) => setDeleteReassignTo(e.target.value)}
                        className="input-field py-2.5 text-[14px] mb-3"
                      >
                        <option value="">Select a Workflow...</option>
                        {reassignOptions.map((f) => (
                          <option key={f.id} value={f.id}>{f.name}</option>
                        ))}
                      </select>
                      <button
                        onClick={() => executeDelete("reassign")}
                        disabled={!deleteReassignTo || deleting}
                        className={clsx(
                          "w-full py-2.5 rounded-[8px] bg-red-500 text-white font-medium text-[14px] cursor-pointer hover:bg-red-600 transition-colors border-none",
                          (!deleteReassignTo || deleting) && "opacity-50 cursor-not-allowed"
                        )}
                      >
                        {deleting ? "Deleting..." : `Reassign ${deleteAffectedCount} matter${deleteAffectedCount !== 1 ? "s" : ""} & delete template`}
                      </button>
                    </div>
                  )}

                  {/* Option 2: Orphan */}
                  <div className="p-4 rounded-[16px] border border-[var(--color-border)] hover:border-amber-300 transition-colors">
                    <p className="text-[14px] font-medium text-[var(--color-text-primary)] mb-1">
                      Keep matters as &quot;Custom&quot;
                    </p>
                    <p className="text-[13px] text-[var(--color-text-muted)] mb-3">
                      Matters keep their current progress but won&apos;t be linked to any template. They&apos;ll show as &quot;Custom&quot; on the Home page.
                    </p>
                    <button
                      onClick={() => executeDelete("orphan")}
                      disabled={deleting}
                      className={clsx(
                        "w-full py-2.5 rounded-[8px] bg-amber-500 text-white font-medium text-[14px] cursor-pointer hover:bg-amber-600 transition-colors border-none",
                        deleting && "opacity-50 cursor-not-allowed"
                      )}
                    >
                      {deleting ? "Deleting..." : `Mark as Custom & delete template`}
                    </button>
                  </div>
                </div>

                <button
                  onClick={() => setDeleteTarget(null)}
                  className="w-full text-center text-[14px] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] pt-4 border-t border-[var(--color-border)] cursor-pointer"
                >
                  Cancel
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
