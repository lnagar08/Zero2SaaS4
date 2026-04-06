import { getCurrentOrg } from "@/lib/tenant";
// ============================================================
// DATA LAYER — MIGRATION REQUIRED
//
// This file still contains raw SQL queries from the SQLite version.
// A developer needs to convert each function to use Prisma:
//
// BEFORE (SQLite):
//   const db = getDb();
//   const rows = db.prepare("SELECT * FROM matters WHERE firm_id = ?").all(firmId);
//
// AFTER (Prisma):
//   const matters = await prisma.matter.findMany({ where: { orgId } });
//
// KEY CHANGES:
// 1. All functions that take firmId should get it from the API route:
//    const { orgId } = await getCurrentOrg();
// 2. Replace db.prepare().get/all/run with prisma.model.findMany/create/update/delete
// 3. All queries are now async (add await)
// 4. The Prisma schema in prisma/schema.prisma has all your tables defined
//
// Estimated effort: 3-5 hours for a developer familiar with Prisma
// ============================================================
// ============================================================
// Data Access Layer — all DB reads and writes
// Designed for easy swap to Postgres/Prisma for SaaS
// ============================================================

// import { getDb } from "./db"; // REMOVED — use prisma instead
import { prisma } from "./prisma";
import { v4 as uuid } from "uuid";
import {
  Firm,
  User,
  MatterFlow,
  FlowStage,
  FlowStep,
  Matter,
  MatterStageProgress,
  MatterStepProgress,
  FlowControls,
  MatterWithHealth,
} from "@/types";
import { computeFlowHealth } from "./flow-engine";
import { addDays, format, parseISO } from "date-fns";

// MasterSaaS: Tenant ID now comes from auth session via getCurrentOrg()

// getCurrentOrgId() /* TODO: make async — see migration note below */ removed — use getCurrentOrg() from @/lib/tenant instead

// ============================================================
// FIRM
// ============================================================

export function ensureLocalFirm(): Firm {
  const db = getDb();
  const existing = db
    .prepare("SELECT * FROM firms WHERE id = ?")
    .get(LOCAL_FIRM_ID) as any;
  if (existing) return mapFirm(existing);

  db.prepare(
    "INSERT INTO firms (id, name, slug) VALUES (?, ?, ?)"
  ).run(LOCAL_FIRM_ID, "My Firm", "my-firm");

  // Also create default flow controls
  db.prepare(
    `INSERT OR IGNORE INTO flow_controls (id, firm_id) VALUES (?, ?)`
  ).run(uuid(), LOCAL_FIRM_ID);

  return { id: LOCAL_FIRM_ID, name: "My Firm", slug: "my-firm", createdAt: "", updatedAt: "" };
}

/**
 * Get firm branding settings.
 * SaaS NOTE: In production, use orgId from getCurrentOrg() instead of LOCAL_FIRM_ID.
 * Brand settings are per-organization — each customer sees their own branding.
 */
export function getFirmBranding(firmId: string = LOCAL_FIRM_ID): {
  firmName: string; brandColor: string; brandTagline: string; brandLogoText: string; brandLogoUrl: string;
} {
  const db = getDb();
  const row = db.prepare(
    "SELECT name, brand_color, brand_tagline, brand_logo_text, brand_logo_url FROM firms WHERE id = ?"
  ).get(firmId) as any;
  return {
    firmName: row?.name || "My Firm",
    brandColor: row?.brand_color || "#1e3a5f",
    brandTagline: row?.brand_tagline || "",
    brandLogoText: row?.brand_logo_text || "",
    brandLogoUrl: row?.brand_logo_url || "",
  };
}

/**
 * Update firm branding settings.
 * SaaS NOTE: Restrict this to OWNER role only in production.
 */
export function updateFirmBranding(firmId: string = LOCAL_FIRM_ID, data: {
  firmName?: string; brandColor?: string; brandTagline?: string; brandLogoText?: string; brandLogoUrl?: string;
}) {
  const db = getDb();
  if (data.firmName !== undefined) db.prepare("UPDATE firms SET name = ? WHERE id = ?").run(data.firmName, firmId);
  if (data.brandColor !== undefined) db.prepare("UPDATE firms SET brand_color = ? WHERE id = ?").run(data.brandColor, firmId);
  if (data.brandTagline !== undefined) db.prepare("UPDATE firms SET brand_tagline = ? WHERE id = ?").run(data.brandTagline, firmId);
  if (data.brandLogoText !== undefined) db.prepare("UPDATE firms SET brand_logo_text = ? WHERE id = ?").run(data.brandLogoText, firmId);
  if (data.brandLogoUrl !== undefined) db.prepare("UPDATE firms SET brand_logo_url = ? WHERE id = ?").run(data.brandLogoUrl, firmId);
  return getFirmBranding(firmId);
}

// ============================================================
// USERS
// ============================================================

export function getUsers(firmId: string /* Pass orgId from getCurrentOrg() in the API route */): User[] {
  const db = getDb();
  const rows = db.prepare("SELECT * FROM users WHERE firm_id = ? ORDER BY name").all(firmId);
  return rows.map(mapUser);
}

export function ensureDefaultUser(): User {
  const db = getDb();
  const firmId = getCurrentOrgId() /* TODO: make async — see migration note below */;
  ensureLocalFirm();

  const existing = db
    .prepare("SELECT * FROM users WHERE firm_id = ? AND role = 'owner' LIMIT 1")
    .get(firmId) as any;
  if (existing) return mapUser(existing);

  const id = uuid();
  db.prepare(
    "INSERT INTO users (id, firm_id, email, name, role) VALUES (?, ?, ?, ?, ?)"
  ).run(id, firmId, "owner@matterflow.local", "Firm Owner", "owner");

  return {
    id,
    firmId,
    email: "owner@matterflow.local",
    name: "Firm Owner",
    role: "owner",
    createdAt: "",
    updatedAt: "",
  };
}

// ============================================================
// MATTER FLOWS (templates)
// ============================================================

export function getMatterFlows(firmId: string /* Pass orgId from getCurrentOrg() in the API route */): MatterFlow[] {
  const db = getDb();
  const flows = db
    .prepare("SELECT * FROM matter_flows WHERE firm_id = ? ORDER BY name")
    .all(firmId) as any[];

  return flows.map((f) => {
    const stages = db
      .prepare(
        "SELECT * FROM flow_stages WHERE matter_flow_id = ? ORDER BY sort_order"
      )
      .all(f.id) as any[];

    return {
      ...mapMatterFlow(f),
      stages: stages.map((s) => {
        const steps = db
          .prepare(
            "SELECT * FROM flow_steps WHERE stage_id = ? ORDER BY sort_order"
          )
          .all(s.id) as any[];
        return {
          ...mapFlowStage(s),
          steps: steps.map(mapFlowStep),
        };
      }),
    };
  });
}

export function getMatterFlow(id: string): MatterFlow | null {
  const db = getDb();
  const f = db.prepare("SELECT * FROM matter_flows WHERE id = ?").get(id) as any;
  if (!f) return null;

  const stages = db
    .prepare("SELECT * FROM flow_stages WHERE matter_flow_id = ? ORDER BY sort_order")
    .all(f.id) as any[];

  return {
    ...mapMatterFlow(f),
    stages: stages.map((s) => {
      const steps = db
        .prepare("SELECT * FROM flow_steps WHERE stage_id = ? ORDER BY sort_order")
        .all(s.id) as any[];
      return { ...mapFlowStage(s), steps: steps.map(mapFlowStep) };
    }),
  };
}

export function saveMatterFlow(flow: Partial<MatterFlow> & { name: string }): MatterFlow {
  const db = getDb();
  const firmId = getCurrentOrgId() /* TODO: make async — see migration note below */;
  ensureLocalFirm();

  const id = flow.id || uuid();
  const now = new Date().toISOString();

  const existing = flow.id
    ? db.prepare("SELECT id FROM matter_flows WHERE id = ?").get(flow.id)
    : null;

  if (existing) {
    // If setting this as default, clear all other defaults first
    if (flow.isDefault) {
      db.prepare("UPDATE matter_flows SET is_default = 0 WHERE firm_id = ? AND id != ?").run(firmId, id);
    }
    db.prepare(
      `UPDATE matter_flows SET name = ?, description = ?, is_default = ?, updated_at = ? WHERE id = ?`
    ).run(flow.name, flow.description || null, flow.isDefault ? 1 : 0, now, id);
  } else {
    // If setting this as default, clear all other defaults first
    if (flow.isDefault) {
      db.prepare("UPDATE matter_flows SET is_default = 0 WHERE firm_id = ?").run(firmId);
    }
    db.prepare(
      `INSERT INTO matter_flows (id, firm_id, name, description, is_default, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(id, firmId, flow.name, flow.description || null, flow.isDefault ? 1 : 0, now, now);
  }

  // Save stages and steps
  if (flow.stages) {
    // Delete removed stages (cascade deletes steps)
    const stageIds = flow.stages.map((s) => s.id).filter(Boolean);
    if (stageIds.length > 0) {
      const placeholders = stageIds.map(() => "?").join(",");
      db.prepare(
        `DELETE FROM flow_stages WHERE matter_flow_id = ? AND id NOT IN (${placeholders})`
      ).run(id, ...stageIds);
    } else {
      db.prepare("DELETE FROM flow_stages WHERE matter_flow_id = ?").run(id);
    }

    for (const stage of flow.stages) {
      const stageId = stage.id || uuid();
      const existingStage = stage.id
        ? db.prepare("SELECT id FROM flow_stages WHERE id = ?").get(stage.id)
        : null;

      if (existingStage) {
        db.prepare(
          `UPDATE flow_stages SET name = ?, sort_order = ?, default_duration_days = ? WHERE id = ?`
        ).run(stage.name, stage.order, stage.defaultDurationDays ?? null, stageId);
      } else {
        db.prepare(
          `INSERT INTO flow_stages (id, matter_flow_id, name, sort_order, default_duration_days)
           VALUES (?, ?, ?, ?, ?)`
        ).run(stageId, id, stage.name, stage.order, stage.defaultDurationDays ?? null);
      }

      // Save steps
      if (stage.steps) {
        const stepIds = stage.steps.map((s) => s.id).filter(Boolean);
        if (stepIds.length > 0) {
          const placeholders = stepIds.map(() => "?").join(",");
          db.prepare(
            `DELETE FROM flow_steps WHERE stage_id = ? AND id NOT IN (${placeholders})`
          ).run(stageId, ...stepIds);
        } else {
          db.prepare("DELETE FROM flow_steps WHERE stage_id = ?").run(stageId);
        }

        for (const step of stage.steps) {
          const stepId = step.id || uuid();
          const existingStep = step.id
            ? db.prepare("SELECT id FROM flow_steps WHERE id = ?").get(step.id)
            : null;

          if (existingStep) {
            db.prepare(
              `UPDATE flow_steps SET name = ?, description = ?, sort_order = ?, due_days_offset = ?, is_required = ? WHERE id = ?`
            ).run(
              step.name,
              step.description || null,
              step.order,
              step.dueDaysOffset ?? null,
              step.isRequired ? 1 : 0,
              stepId
            );
          } else {
            db.prepare(
              `INSERT INTO flow_steps (id, stage_id, name, description, sort_order, due_days_offset, is_required)
               VALUES (?, ?, ?, ?, ?, ?, ?)`
            ).run(
              stepId,
              stageId,
              step.name,
              step.description || null,
              step.order,
              step.dueDaysOffset ?? null,
              step.isRequired ? 1 : 0
            );
          }
        }
      }
    }
  }

  return getMatterFlow(id)!;
}

export function deleteMatterFlow(id: string): void {
  const db = getDb();
  db.prepare("DELETE FROM matter_flows WHERE id = ?").run(id);
}

// ============================================================
// MATTERS
// ============================================================

export function getMatters(firmId: string /* Pass orgId from getCurrentOrg() in the API route */): Matter[] {
  const db = getDb();
  const rows = db
    .prepare("SELECT * FROM matters WHERE firm_id = ? ORDER BY created_at DESC")
    .all(firmId) as any[];

  return rows.map((r) => loadMatterWithProgress(r));
}

export function getMatter(id: string): Matter | null {
  const db = getDb();
  const row = db.prepare("SELECT * FROM matters WHERE id = ?").get(id) as any;
  if (!row) return null;
  return loadMatterWithProgress(row);
}

function loadMatterWithProgress(row: any): Matter {
  const db = getDb();
  const stageRows = db
    .prepare("SELECT * FROM matter_stage_progress WHERE matter_id = ? ORDER BY sort_order")
    .all(row.id) as any[];

  const stageProgress: MatterStageProgress[] = stageRows.map((sp) => {
    const stepRows = db
      .prepare(
        "SELECT * FROM matter_step_progress WHERE matter_stage_progress_id = ? ORDER BY sort_order"
      )
      .all(sp.id) as any[];

    return {
      id: sp.id,
      matterId: sp.matter_id,
      stageId: sp.stage_id,
      stageName: sp.stage_name,
      order: sp.sort_order,
      startedAt: sp.started_at || undefined,
      completedAt: sp.completed_at || undefined,
      steps: stepRows.map(mapMatterStepProgress),
    };
  });

  return {
    id: row.id,
    firmId: row.firm_id,
    matterFlowId: row.matter_flow_id,
    referenceNumber: row.reference_number || undefined,
    name: row.name,
    clientName: row.client_name,
    clientCompany: row.client_company || undefined,
    clientEmail: row.client_email || undefined,
    description: row.description || undefined,
    status: row.status,
    assignedUserId: row.assigned_user_id || undefined,
    currentStageId: row.current_stage_id || undefined,
    startDate: row.start_date,
    targetEndDate: row.target_end_date || undefined,
    completedDate: row.completed_date || undefined,
    amountPaid: row.amount_paid || 0,
    stageProgress,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function createMatter(data: {
  name: string;
  clientName: string;
  clientCompany?: string;
  clientEmail?: string;
  description?: string;
  matterFlowId: string;
  assignedUserId?: string;
  referenceNumber?: string;
  startDate?: string;
  targetEndDate?: string;
  amountPaid?: number;
}): Matter {
  const db = getDb();
  const firmId = getCurrentOrgId() /* TODO: make async — see migration note below */;
  ensureLocalFirm();

  const flow = getMatterFlow(data.matterFlowId);
  if (!flow) throw new Error("MatterFlow not found");

  const matterId = uuid();
  const startDate = data.startDate || format(new Date(), "yyyy-MM-dd");
  const firstStage = flow.stages[0];

  db.prepare(
    `INSERT INTO matters (id, firm_id, matter_flow_id, reference_number, name, client_name, client_company, client_email, description, status, assigned_user_id, current_stage_id, start_date, target_end_date, amount_paid)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?, ?, ?)`
  ).run(
    matterId,
    firmId,
    data.matterFlowId,
    data.referenceNumber || null,
    data.name,
    data.clientName,
    data.clientCompany || null,
    data.clientEmail || null,
    data.description || null,
    data.assignedUserId || null,
    firstStage?.id || null,
    startDate,
    data.targetEndDate || null,
    data.amountPaid || 0
  );

  // Initialize stage progress from template
  let cumulativeDays = 0;
  for (const stage of flow.stages) {
    const spId = uuid();
    const stageStartDate = addDays(new Date(startDate), cumulativeDays);
    const isFirstStage = stage.order === 0;

    db.prepare(
      `INSERT INTO matter_stage_progress (id, matter_id, stage_id, stage_name, sort_order, started_at)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).run(
      spId,
      matterId,
      stage.id,
      stage.name,
      stage.order,
      isFirstStage ? format(stageStartDate, "yyyy-MM-dd") : null
    );

    // Initialize step progress
    for (const step of stage.steps) {
      const dueDate =
        step.dueDaysOffset != null
          ? format(addDays(stageStartDate, step.dueDaysOffset), "yyyy-MM-dd")
          : null;

      db.prepare(
        `INSERT INTO matter_step_progress (id, matter_stage_progress_id, step_id, step_name, sort_order, is_required, due_date)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      ).run(uuid(), spId, step.id, step.name, step.order, step.isRequired ? 1 : 0, dueDate);
    }

    cumulativeDays += stage.defaultDurationDays || 0;
  }

  return getMatter(matterId)!;
}

export function updateMatter(
  id: string,
  data: Partial<Pick<Matter, "name" | "clientName" | "clientCompany" | "clientEmail" | "description" | "status" | "assignedUserId" | "currentStageId" | "targetEndDate" | "referenceNumber" | "startDate">>
): Matter {
  const db = getDb();
  const now = new Date().toISOString();

  const sets: string[] = [];
  const values: any[] = [];

  if (data.name !== undefined) { sets.push("name = ?"); values.push(data.name); }
  if (data.clientName !== undefined) { sets.push("client_name = ?"); values.push(data.clientName); }
  if (data.clientCompany !== undefined) { sets.push("client_company = ?"); values.push(data.clientCompany || null); }
  if (data.clientEmail !== undefined) { sets.push("client_email = ?"); values.push(data.clientEmail || null); }
  if (data.description !== undefined) { sets.push("description = ?"); values.push(data.description || null); }
  if (data.status !== undefined) { sets.push("status = ?"); values.push(data.status); }
  if (data.assignedUserId !== undefined) { sets.push("assigned_user_id = ?"); values.push(data.assignedUserId || null); }
  if (data.currentStageId !== undefined) { sets.push("current_stage_id = ?"); values.push(data.currentStageId); }
  if (data.startDate !== undefined) { sets.push("start_date = ?"); values.push(data.startDate || null); }
  if (data.targetEndDate !== undefined) { sets.push("target_end_date = ?"); values.push(data.targetEndDate || null); }
  if (data.referenceNumber !== undefined) { sets.push("reference_number = ?"); values.push(data.referenceNumber || null); }
  if ((data as any).amountPaid !== undefined) { sets.push("amount_paid = ?"); values.push((data as any).amountPaid || 0); }

  if (data.status === "completed") {
    sets.push("completed_date = ?");
    values.push(format(new Date(), "yyyy-MM-dd"));
  }

  sets.push("updated_at = ?");
  values.push(now);
  values.push(id);

  db.prepare(`UPDATE matters SET ${sets.join(", ")} WHERE id = ?`).run(...values);

  return getMatter(id)!;
}

export function toggleStepCompletion(
  matterId: string,
  stepProgressId: string
): { step: MatterStepProgress; stageAdvanced: boolean } {
  const db = getDb();
  const row = db
    .prepare("SELECT * FROM matter_step_progress WHERE id = ?")
    .get(stepProgressId) as any;
  if (!row) throw new Error("Step progress not found");

  const newCompleted = row.is_completed ? 0 : 1;
  const completedAt = newCompleted ? format(new Date(), "yyyy-MM-dd'T'HH:mm:ss") : null;

  db.prepare(
    "UPDATE matter_step_progress SET is_completed = ?, completed_at = ? WHERE id = ?"
  ).run(newCompleted, completedAt, stepProgressId);

  // Update matter's updated_at
  db.prepare("UPDATE matters SET updated_at = ? WHERE id = ?").run(
    new Date().toISOString(),
    matterId
  );

  // Auto-advance: if all steps in the current stage are now completed, advance to next stage
  let stageAdvanced = false;
  if (newCompleted) {
    const stageProgressId = row.matter_stage_progress_id;
    const allStepsInStage = db.prepare(
      "SELECT * FROM matter_step_progress WHERE matter_stage_progress_id = ?"
    ).all(stageProgressId) as any[];
    
    const allDone = allStepsInStage.every((s: any) => s.is_completed);
    if (allDone) {
      try {
        advanceStage(matterId);
        stageAdvanced = true;
      } catch {
        // Already at last stage or cannot advance — that's fine
      }
    }
  }

  const updated = db
    .prepare("SELECT * FROM matter_step_progress WHERE id = ?")
    .get(stepProgressId) as any;
  return { step: mapMatterStepProgress(updated), stageAdvanced };
}

export function advanceStage(matterId: string): Matter {
  const db = getDb();
  const matter = getMatter(matterId);
  if (!matter) throw new Error("Matter not found");

  const currentIdx = matter.stageProgress.findIndex(
    (sp) => sp.stageId === matter.currentStageId
  );
  if (currentIdx < 0 || currentIdx >= matter.stageProgress.length - 1) {
    throw new Error("Cannot advance: already at last stage or no current stage");
  }

  const now = format(new Date(), "yyyy-MM-dd");
  const currentSp = matter.stageProgress[currentIdx];
  const nextSp = matter.stageProgress[currentIdx + 1];

  // Complete current stage
  db.prepare(
    "UPDATE matter_stage_progress SET completed_at = ? WHERE id = ?"
  ).run(now, currentSp.id);

  // Start next stage
  db.prepare(
    "UPDATE matter_stage_progress SET started_at = ? WHERE id = ?"
  ).run(now, nextSp.id);

  // Update matter's current stage
  db.prepare(
    "UPDATE matters SET current_stage_id = ?, updated_at = ? WHERE id = ?"
  ).run(nextSp.stageId, new Date().toISOString(), matterId);

  // Recompute due dates for next stage steps based on actual start date
  const flow = getMatterFlow(matter.matterFlowId);
  if (flow) {
    const nextFlowStage = flow.stages.find((s) => s.id === nextSp.stageId);
    if (nextFlowStage) {
      for (const step of nextFlowStage.steps) {
        if (step.dueDaysOffset != null) {
          const dueDate = format(addDays(new Date(now), step.dueDaysOffset), "yyyy-MM-dd");
          db.prepare(
            "UPDATE matter_step_progress SET due_date = ? WHERE matter_stage_progress_id = ? AND step_id = ?"
          ).run(dueDate, nextSp.id, step.id);
        }
      }
    }
  }

  return getMatter(matterId)!;
}

export function deleteMatter(id: string): void {
  const db = getDb();
  db.prepare("DELETE FROM matters WHERE id = ?").run(id);
}

// ============================================================
// MATTERS WITH HEALTH (for dashboard/lists)
// ============================================================

export function getMattersWithHealth(
  firmId: string /* Pass orgId from getCurrentOrg() in the API route */
): MatterWithHealth[] {
  const matters = getMatters(firmId);
  const controls = getFlowControls(firmId);
  const users = getUsers(firmId);
  const flows = getMatterFlows(firmId);

  return matters
    .filter((m) => m.status === "active")
    .map((m) => {
      const health = computeFlowHealth({
        stageProgress: m.stageProgress,
        currentStageId: m.currentStageId,
        startDate: m.startDate,
        targetEndDate: m.targetEndDate,
        status: m.status,
        controls,
      });
      const user = users.find((u) => u.id === m.assignedUserId);
      const flow = flows.find((f) => f.id === m.matterFlowId);
      return {
        ...m,
        health,
        assignedUserName: user?.name,
        matterFlowName: flow?.name,
      };
    });
}

// ============================================================
// DUPLICATE MATTERFLOW
// Creates an exact copy of a template with all stages and steps.
// SaaS NOTE: In production, add audit logging for template changes.
// ============================================================

export function duplicateMatterFlow(sourceId: string): MatterFlow {
  const source = getMatterFlow(sourceId);
  if (!source) throw new Error("MatterFlow not found");

  const newFlow: Partial<MatterFlow> & { name: string } = {
    name: `Copy of ${source.name}`,
    description: source.description,
    isDefault: false,
    stages: source.stages.map((stage, si) => ({
      ...stage,
      id: uuid(),
      steps: stage.steps.map((step, sti) => ({
        ...step,
        id: uuid(),
        stageId: "", // will be set by saveMatterFlow
      })),
    })),
  };

  return saveMatterFlow(newFlow);
}

// ============================================================
// APPLY MATTERFLOW CHANGES TO EXISTING MATTERS
// Merges new stages/steps into active matters without resetting
// completed work. Additive only — never deletes in-progress work.
//
// Logic:
// - New stage in template → add to matter progress (uncompleted)
// - New step in existing stage → add to matter's stage progress
// - Stage renamed → update name in matter progress
// - Step removed from template → leave in matter (don't delete work)
// - Existing completed stages/steps → untouched
//
// SaaS NOTE: This is a batch operation. In production, wrap in a
// transaction and add error handling per-matter. Consider queuing
// for large firms with 100+ active matters.
// ============================================================

export function getActiveMattersCountForFlow(matterFlowId: string): number {
  const db = getDb();
  const row = db
    .prepare("SELECT COUNT(*) as count FROM matters WHERE matter_flow_id = ? AND status = 'active'")
    .get(matterFlowId) as any;
  return row?.count || 0;
}

/**
 * Reassign all active matters from one MatterFlow to another (or to null).
 * This is metadata-only — it updates the matter_flow_id reference.
 * It does NOT reset stage/step progress. Matters continue with their existing progress.
 *
 * @param fromFlowId - The MatterFlow being deleted
 * @param toFlowId - The target MatterFlow, or null to orphan them (displays as "Custom")
 * @returns Number of matters reassigned
 *
 * SaaS NOTE: In production, add an audit log entry for each reassignment.
 */
export function reassignMattersFromFlow(fromFlowId: string, toFlowId: string | null): number {
  const db = getDb();
  const result = db
    .prepare("UPDATE matters SET matter_flow_id = ?, updated_at = ? WHERE matter_flow_id = ? AND status = 'active'")
    .run(toFlowId, new Date().toISOString(), fromFlowId);
  return result.changes;
}

export function applyMatterFlowToExistingMatters(matterFlowId: string): number {
  const db = getDb();
  const flow = getMatterFlow(matterFlowId);
  if (!flow) throw new Error("MatterFlow not found");

  // Get all active matters using this template
  const matterRows = db
    .prepare("SELECT id FROM matters WHERE matter_flow_id = ? AND status = 'active'")
    .all(matterFlowId) as any[];

  let updatedCount = 0;

  for (const matterRow of matterRows) {
    const matter = getMatter(matterRow.id);
    if (!matter) continue;

    const existingStageIds = matter.stageProgress.map((sp) => sp.stageId);

    for (const templateStage of flow.stages) {
      const existingSp = matter.stageProgress.find((sp) => sp.stageId === templateStage.id);

      if (existingSp) {
        // Stage exists — update name if changed
        if (existingSp.stageName !== templateStage.name) {
          db.prepare("UPDATE matter_stage_progress SET stage_name = ? WHERE id = ?")
            .run(templateStage.name, existingSp.id);
        }

        // Check for new steps in this stage
        const existingStepIds = existingSp.steps.map((s) => s.stepId);
        for (const templateStep of templateStage.steps) {
          if (!existingStepIds.includes(templateStep.id)) {
            // New step — add it to the matter's stage progress
            const dueDate = templateStep.dueDaysOffset != null && existingSp.startedAt
              ? format(addDays(parseISO(existingSp.startedAt), templateStep.dueDaysOffset), "yyyy-MM-dd")
              : null;

            db.prepare(
              `INSERT INTO matter_step_progress (id, matter_stage_progress_id, step_id, step_name, sort_order, is_required, due_date)
               VALUES (?, ?, ?, ?, ?, ?, ?)`
            ).run(
              uuid(), existingSp.id, templateStep.id, templateStep.name,
              templateStep.order, templateStep.isRequired ? 1 : 0, dueDate
            );
          } else {
            // Step exists — update name if changed
            const existingStep = existingSp.steps.find((s) => s.stepId === templateStep.id);
            if (existingStep && existingStep.stepName !== templateStep.name) {
              db.prepare("UPDATE matter_step_progress SET step_name = ? WHERE id = ?")
                .run(templateStep.name, existingStep.id);
            }
          }
        }
      } else {
        // New stage — add it to the matter
        const spId = uuid();
        db.prepare(
          `INSERT INTO matter_stage_progress (id, matter_id, stage_id, stage_name, sort_order)
           VALUES (?, ?, ?, ?, ?)`
        ).run(spId, matter.id, templateStage.id, templateStage.name, templateStage.order);

        // Add all steps for the new stage
        for (const templateStep of templateStage.steps) {
          db.prepare(
            `INSERT INTO matter_step_progress (id, matter_stage_progress_id, step_id, step_name, sort_order, is_required)
             VALUES (?, ?, ?, ?, ?, ?)`
          ).run(
            uuid(), spId, templateStep.id, templateStep.name,
            templateStep.order, templateStep.isRequired ? 1 : 0
          );
        }
      }
    }

    // Update the matter's updated_at timestamp
    db.prepare("UPDATE matters SET updated_at = ? WHERE id = ?")
      .run(new Date().toISOString(), matter.id);

    updatedCount++;
  }

  return updatedCount;
}

// ============================================================
// FLOW CONTROLS
// ============================================================

export function getFlowControls(
  firmId: string /* Pass orgId from getCurrentOrg() in the API route */
): FlowControls {
  const db = getDb();
  ensureLocalFirm();
  const row = db
    .prepare("SELECT * FROM flow_controls WHERE firm_id = ?")
    .get(firmId) as any;

  if (!row) {
    // Create defaults
    const id = uuid();
    db.prepare(
      "INSERT INTO flow_controls (id, firm_id) VALUES (?, ?)"
    ).run(id, firmId);
    return getFlowControls(firmId);
  }

  return {
    id: row.id,
    firmId: row.firm_id,
    dueSoonWindowDays: row.due_soon_window_days ?? 2,
    stageRiskThresholdDays: row.stage_risk_threshold_days ?? 14,
    graceWindowDays: row.grace_window_days ?? 2,
    breakdownOnPastDue: row.breakdown_on_past_due !== undefined ? !!row.breakdown_on_past_due : true,
    breakdownOnInactivity: row.breakdown_on_inactivity !== undefined ? !!row.breakdown_on_inactivity : true,
    breakdownInactivityDays: row.breakdown_inactivity_days ?? 14,
    breakdownOnStepOverdue: row.breakdown_on_step_overdue !== undefined ? !!row.breakdown_on_step_overdue : true,
    breakdownStepOverdueDays: row.breakdown_step_overdue_days ?? 21,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function updateFlowControls(
  firmId: string /* Pass orgId from getCurrentOrg() in the API route */,
  data: Partial<Omit<FlowControls, "id" | "firmId" | "createdAt" | "updatedAt">>
): FlowControls {
  const db = getDb();
  const now = new Date().toISOString();

  const sets: string[] = [];
  const values: any[] = [];

  if (data.dueSoonWindowDays !== undefined) { sets.push("due_soon_window_days = ?"); values.push(data.dueSoonWindowDays); }
  if (data.stageRiskThresholdDays !== undefined) { sets.push("stage_risk_threshold_days = ?"); values.push(data.stageRiskThresholdDays); }
  if (data.graceWindowDays !== undefined) { sets.push("grace_window_days = ?"); values.push(data.graceWindowDays); }
  if (data.breakdownOnPastDue !== undefined) { sets.push("breakdown_on_past_due = ?"); values.push(data.breakdownOnPastDue ? 1 : 0); }
  if (data.breakdownOnInactivity !== undefined) { sets.push("breakdown_on_inactivity = ?"); values.push(data.breakdownOnInactivity ? 1 : 0); }
  if (data.breakdownInactivityDays !== undefined) { sets.push("breakdown_inactivity_days = ?"); values.push(data.breakdownInactivityDays); }
  if (data.breakdownOnStepOverdue !== undefined) { sets.push("breakdown_on_step_overdue = ?"); values.push(data.breakdownOnStepOverdue ? 1 : 0); }
  if (data.breakdownStepOverdueDays !== undefined) { sets.push("breakdown_step_overdue_days = ?"); values.push(data.breakdownStepOverdueDays); }

  sets.push("updated_at = ?");
  values.push(now);
  values.push(firmId);

  db.prepare(`UPDATE flow_controls SET ${sets.join(", ")} WHERE firm_id = ?`).run(...values);

  return getFlowControls(firmId);
}

// ============================================================
// ROW MAPPERS
// ============================================================

function mapFirm(row: any): Firm {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapUser(row: any): User {
  return {
    id: row.id,
    firmId: row.firm_id,
    email: row.email,
    name: row.name,
    role: row.role,
    avatarUrl: row.avatar_url || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapMatterFlow(row: any): Omit<MatterFlow, "stages"> {
  return {
    id: row.id,
    firmId: row.firm_id,
    name: row.name,
    description: row.description || undefined,
    isDefault: !!row.is_default,
    isPublic: !!row.is_public,
    publishedAt: row.published_at || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapFlowStage(row: any): Omit<FlowStage, "steps"> {
  return {
    id: row.id,
    matterFlowId: row.matter_flow_id,
    name: row.name,
    order: row.sort_order,
    defaultDurationDays: row.default_duration_days ?? undefined,
    createdAt: row.created_at,
  };
}

function mapFlowStep(row: any): FlowStep {
  return {
    id: row.id,
    stageId: row.stage_id,
    name: row.name,
    description: row.description || undefined,
    order: row.sort_order,
    dueDaysOffset: row.due_days_offset ?? undefined,
    isRequired: !!row.is_required,
    createdAt: row.created_at,
  };
}

function mapMatterStepProgress(row: any): MatterStepProgress {
  return {
    id: row.id,
    matterStageProgressId: row.matter_stage_progress_id,
    stepId: row.step_id,
    stepName: row.step_name,
    order: row.sort_order,
    isRequired: !!row.is_required,
    isCompleted: !!row.is_completed,
    completedAt: row.completed_at || undefined,
    dueDate: row.due_date || undefined,
    manualDueDate: row.manual_due_date || undefined,
    notes: row.notes || undefined,
    withClient: !!row.with_client,
    withClientSince: row.with_client_since || undefined,
  };
}
