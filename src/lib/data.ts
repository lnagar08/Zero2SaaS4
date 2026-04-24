import { getCurrentOrg } from "@/lib/tenant";

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

export async function ensureLocalFirm(): Promise<Firm> {
  const { orgId } = await getCurrentOrg();

  let existing = await prisma.organization.findUnique({
    where: { id: orgId },
  });
  if (!existing) {
    existing = await prisma.organization.create({
      data: {
        id: uuid(),
        name: "My Firm",
        slug: "my-firm",
        flowControls: {
          create: {
            id: uuid(),
          },
        },
      },
    });
  }

  return mapFirm(existing);
}


/**
 * Get firm branding settings.
 * SaaS NOTE: In production, use orgId from getCurrentOrg() instead of LOCAL_FIRM_ID.
 * Brand settings are per-organization — each customer sees their own branding.
 */
export async function getFirmBranding(): Promise<{
  firmName: string; brandColor: string; brandTagline: string; brandLogoText: string; brandLogoUrl: string;
}> {
  const { orgId } = await getCurrentOrg();

  const row = await prisma.organization.findUnique({
    where: { id: orgId },
    select: {
      name: true,
      brandColor: true,
      brandTagline: true,
      brandLogoText: true,
      brandLogoUrl: true,
    },
  });

  return {
    firmName: row?.name ?? "My Firm",
    brandColor: row?.brandColor ?? "#1e3a5f",
    brandTagline: row?.brandTagline ?? "",
    brandLogoText: row?.brandLogoText ?? "",
    brandLogoUrl: row?.brandLogoUrl ?? "",
  };
}


/**
 * Update firm branding settings.
 * SaaS NOTE: Restrict this to OWNER role only in production.
 */
export async function updateFirmBranding(data: {
  firmName?: string; 
  brandColor?: string; 
  brandTagline?: string; 
  brandLogoText?: string; 
  brandLogoUrl?: string;
}) {
  const { orgId } = await getCurrentOrg();

  await prisma.organization.update({
    where: { id: orgId },
    data: {
      name: data.firmName,
      brandColor: data.brandColor,
      brandTagline: data.brandTagline,
      brandLogoText: data.brandLogoText,
      brandLogoUrl: data.brandLogoUrl,
    },
  });

  return getFirmBranding();
}


// ============================================================
// USERS
// ============================================================

export async function getUsers(): Promise<User[]> {
  const { orgId } = await getCurrentOrg();

  const rows = await prisma.user.findMany({
    where: { 
      orgId: orgId 
    },
    orderBy: { 
      name: 'asc' 
    }
  });

  return rows.map(mapUser);
}


export async function ensureDefaultUser(): Promise<User> {
  const { orgId } = await getCurrentOrg();
  await ensureLocalFirm();

  let existing = await prisma.user.findFirst({
    where: { 
      orgId: orgId,
      role: 'OWNER'
    }
  });

  if (existing) return mapUser(existing);

  const newUser = await prisma.user.create({
    data: {
      id: uuid(),
      orgId: orgId,
      email: "owner@matterflow.local",
      name: "Firm Owner",
      role: "OWNER",
    }
  });

  return mapUser(newUser);
}


// ============================================================
// MATTER FLOWS (templates)
// ============================================================

export async function getMatterFlows(): Promise<MatterFlow[]> {
  const { orgId } = await getCurrentOrg();

  const flows = await prisma.matterFlow.findMany({
    where: { 
      orgId: orgId 
    },
    orderBy: { 
      name: 'asc' 
    },
    include: {
      stages: {
        orderBy: { 
          sortOrder: 'asc' 
        },
        include: {
          steps: {
            orderBy: { 
              sortOrder: 'asc' 
            }
          }
        }
      }
    }
  });

  return flows.map((f) => ({
    ...mapMatterFlow(f),
    stages: f.stages.map((s) => ({
      ...mapFlowStage(s),
      steps: s.steps.map(mapFlowStep),
    })),
  }));
}


export async function getMatterFlow(id: string): Promise<MatterFlow | null> {
  const { orgId } = await getCurrentOrg();

  const f = await prisma.matterFlow.findFirst({
    where: { 
      id, 
      orgId: orgId 
    },
    include: {
      stages: {
        orderBy: { sortOrder: 'asc' },
        include: {
          steps: {
            orderBy: { sortOrder: 'asc' }
          }
        }
      }
    }
  });

  if (!f) return null;

  return {
    ...mapMatterFlow(f),
    stages: f.stages.map((s) => ({
      ...mapFlowStage(s),
      steps: s.steps.map(mapFlowStep),
    })),
  };
}


export async function saveMatterFlow(flow: Partial<MatterFlow> & { name: string }): Promise<MatterFlow> {
  const { orgId } = await getCurrentOrg();
  await ensureLocalFirm();

  const id = flow.id || uuid();

  await prisma.matterFlow.upsert({
    where: { id },
    update: {
      name: flow.name,
      description: flow.description ?? null,
      isDefault: flow.isDefault ?? false,
    },
    create: {
      id,
      orgId: orgId,
      name: flow.name,
      description: flow.description ?? null,
      isDefault: flow.isDefault ?? false,
    },
  });

  if (flow.stages) {
    const incomingStageIds = flow.stages.map((s) => s.id).filter(Boolean) as string[];

    await prisma.flowStage.deleteMany({
      where: {
        matterFlowId: id,
        id: { notIn: incomingStageIds },
      },
    });

    for (const stage of flow.stages) {
      const stageId = stage.id || uuid();

      await prisma.flowStage.upsert({
        where: { id: stageId },
        update: {
          name: stage.name,
          sortOrder: stage.order,
          defaultDurationDays: stage.defaultDurationDays ?? null,
        },
        create: {
          id: stageId,
          orgId: orgId,
          matterFlowId: id,
          name: stage.name,
          sortOrder: stage.order,
          defaultDurationDays: stage.defaultDurationDays ?? null,
        },
      });

      
      if (stage.steps) {
        const incomingStepIds = stage.steps.map((s) => s.id).filter(Boolean) as string[];

        await prisma.flowStep.deleteMany({
          where: {
            stageId: stageId,
            id: { notIn: incomingStepIds },
          },
        });

        for (const step of stage.steps) {
          const stepId = step.id || uuid();
          await prisma.flowStep.upsert({
            where: { id: stepId },
            update: {
              name: step.name,
              description: step.description ?? null,
              sortOrder: step.order,
              dueDaysOffset: step.dueDaysOffset ?? null,
              isRequired: step.isRequired ?? false,
            },
            create: {
              id: stepId,
              stageId: stageId,
              orgId: orgId,
              name: step.name,
              description: step.description ?? null,
              sortOrder: step.order,
              dueDaysOffset: step.dueDaysOffset ?? null,
              isRequired: step.isRequired ?? false,
            },
          });
        }
      }
    }
  }

  const result = await getMatterFlow(id);
  if (!result) throw new Error("Failed to retrieve saved flow");
  return result;
}


export async function deleteMatterFlow(id: string): Promise<void> {
  const { orgId } = await getCurrentOrg();

  await prisma.matterFlow.delete({
    where: { 
      id,
      orgId
    },
  });
}


// ============================================================
// MATTERS
// ============================================================

export async function getMatters(): Promise<Matter[]> {
  const { orgId } = await getCurrentOrg();

  const rows = await prisma.matter.findMany({
    where: { orgId },
    orderBy: { createdAt: 'desc' },
    include: {
      stageProgress: {
        orderBy: { sortOrder: 'asc' },
        include: {
          steps: { orderBy: { sortOrder: 'asc' } }
        }
      }
    }
  });

  return Promise.all(rows.map((r) => loadMatterWithProgress(r)));
}



export async function getMatter(id: string): Promise<Matter | null> {
  const { orgId } = await getCurrentOrg();

  const row = await prisma.matter.findFirst({
    where: { 
      id, 
      orgId 
    },
    include: {
      stageProgress: {
        orderBy: { sortOrder: 'asc' },
        include: {
          steps: {
            orderBy: { sortOrder: 'asc' }
          }
        }
      }
    }
  });

  if (!row) return null;

  return await loadMatterWithProgress(row);
}

export async function loadMatterWithProgress(matter: any): Promise<Matter> {
 
  const data = matter.stageProgress ? matter : await prisma.matter.findUnique({
    where: { id: matter.id },
    include: {
      stageProgress: {
        orderBy: { sortOrder: 'asc' },
        include: {
          steps: {
            orderBy: { sortOrder: 'asc' }
          }
        }
      }
    }
  });

  if (!data) throw new Error("Matter not found");

  return {
    id: data.id,
    firmId: data.orgId, 
    matterFlowId: data.matterFlowId,
    referenceNumber: data.referenceNumber ?? undefined,
    name: data.name,
    clientName: data.clientName,
    clientCompany: data.clientCompany ?? undefined,
    clientEmail: data.clientEmail ?? undefined,
    description: data.description ?? undefined,
    status: data.status,
    assignedUserId: data.assignedUserId ?? undefined,
    currentStageId: data.currentStageId ?? undefined,
    startDate: data.startDate,
    targetEndDate: data.targetEndDate ?? undefined,
    completedDate: data.completedDate ?? undefined,
    amountPaid: Number(data.amountPaid) || 0,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
    
    // Nested Progress Mapping
    stageProgress: data.stageProgress.map((sp: any) => ({
      id: sp.id,
      matterId: sp.matterId,
      stageId: sp.stageId,
      stageName: sp.stageName,
      order: sp.sortOrder,
      startedAt: sp.startedAt ?? undefined,
      completedAt: sp.completedAt ?? undefined,
      steps: sp.steps.map(mapMatterStepProgress),
    })),
  };
}


export async function createMatter(data: {
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
}): Promise<Matter> {
  const { orgId } = await getCurrentOrg();
  await ensureLocalFirm();

  const flow = await getMatterFlow(data.matterFlowId);
  if (!flow) throw new Error("MatterFlow not found");

  const matterId = uuid();
  const startDateObj = data.startDate ? new Date(data.startDate) : new Date();
  const firstStage = flow.stages[0];

  await prisma.$transaction(async (tx) => {
    // 1. Matter 
    await tx.matter.create({
      data: {
        id: matterId,
        orgId: orgId,
        matterFlowId: data.matterFlowId,
        referenceNumber: data.referenceNumber ?? null,
        name: data.name,
        clientName: data.clientName,
        clientCompany: data.clientCompany ?? null,
        clientEmail: data.clientEmail ?? null,
        description: data.description ?? null,
        status: 'active',
        assignedUserId: data.assignedUserId ?? null,
        currentStageId: firstStage?.id ?? null,
        startDate: startDateObj,
        targetEndDate: data.targetEndDate ? new Date(data.targetEndDate) : null,
        amountPaid: data.amountPaid ?? 0,
      },
    });

    // 2. Stage OR Step Progress Initialize 
    let cumulativeDays = 0;
    for (const stage of flow.stages) {
      const spId = uuid();
      const stageStartDate = addDays(startDateObj, cumulativeDays);
      const isFirstStage = stage.order === 0;

      await tx.matterStageProgress.create({
        data: {
          id: spId,
          matterId: matterId,
          orgId: orgId, //
          stageId: stage.id,
          stageName: stage.name,
          sortOrder: stage.order,
          startedAt: isFirstStage ? stageStartDate : null,
          
          steps: {
            create: stage.steps.map((step) => ({
              id: uuid(),
              orgId: orgId,
              stepId: step.id,
              stepName: step.name,
              sortOrder: step.order,
              isRequired: step.isRequired,
              dueDate: step.dueDaysOffset != null
                ? addDays(stageStartDate, step.dueDaysOffset)
                : null,
            })),
          },
        },
      });

      cumulativeDays += stage.defaultDurationDays || 0;
    }
  });

  const result = await getMatter(matterId);
  if (!result) throw new Error("Failed to create matter");
  return result;
}


export async function updateMatter(
  id: string,
  data: Partial<Pick<Matter, "name" | "clientName" | "clientCompany" | "clientEmail" | "description" | "status" | "assignedUserId" | "currentStageId" | "targetEndDate" | "referenceNumber">>
): Promise<Matter> {
  const { orgId } = await getCurrentOrg();

  const updateData: any = {
    name: data.name,
    clientName: data.clientName,
    clientCompany: data.clientCompany ?? null,
    clientEmail: data.clientEmail ?? null,
    description: data.description ?? null,
    status: data.status,
    assignedUserId: data.assignedUserId ?? null,
    currentStageId: data.currentStageId,
    targetEndDate: data.targetEndDate ? new Date(data.targetEndDate) : null,
    referenceNumber: data.referenceNumber ?? null,
    amountPaid: (data as any).amountPaid,
  };

  if (data.status === "completed") {
    updateData.completedDate = new Date();
  }

  await prisma.matter.update({
    where: { 
      id,
      orgId 
    },
    data: updateData,
  });

  const result = await getMatter(id);
  if (!result) throw new Error("Matter not found after update");
  return result;
}


export async function toggleStepCompletion(
  matterId: string,
  stepProgressId: string
): Promise<{ step: MatterStepProgress; stageAdvanced: boolean }> {
  const { orgId } = await getCurrentOrg();

  const currentStep = await prisma.matterStepProgress.findUnique({
    where: { id: stepProgressId, orgId },
  });

  if (!currentStep) throw new Error("Step progress not found");

  const isCompleting = !currentStep.isCompleted;
  const completedAt = isCompleting ? new Date() : null; 

  let stageAdvanced = false;

  const updatedStep = await prisma.$transaction(async (tx) => {
    const step = await tx.matterStepProgress.update({
      where: { id: stepProgressId },
      data: {
        isCompleted: isCompleting,
        completedAt: completedAt,
      },
    });

    await tx.matter.update({
      where: { id: matterId },
      data: { updatedAt: new Date() },
    });

    return step;
  });

  
  if (isCompleting) {
    const allStepsInStage = await prisma.matterStepProgress.findMany({
      where: { matterStageProgressId: currentStep.matterStageProgressId },
    });

    const allDone = allStepsInStage.every((s) => s.isCompleted);
    
    if (allDone) {
      try {
        
        await advanceStage(matterId); 
        stageAdvanced = true;
      } catch (e: any) {
        console.warn("Advance stage failed or skipped:", e.message);
        
      }
    }
  }

  return { 
    step: mapMatterStepProgress(updatedStep), 
    stageAdvanced 
  };
}


export async function advanceStage(matterId: string): Promise<Matter> {
  const { orgId } = await getCurrentOrg();
  
  const matter = await getMatter(matterId);
  if (!matter) throw new Error("Matter not found");

  const currentIdx = matter.stageProgress.findIndex(
    (sp) => sp.stageId === matter.currentStageId
  );
  
  if (currentIdx < 0 || currentIdx >= matter.stageProgress.length - 1) {
    throw new Error("Cannot advance: already at last stage or no current stage");
  }

  const now = new Date();
  const currentSp = matter.stageProgress[currentIdx];
  const nextSp = matter.stageProgress[currentIdx + 1];

  await prisma.$transaction(async (tx) => {
    
    await tx.matterStageProgress.update({
      where: { id: currentSp.id },
      data: { completedAt: now }
    });

    await tx.matterStageProgress.update({
      where: { id: nextSp.id },
      data: { startedAt: now }
    });

    await tx.matter.update({
      where: { id: matterId },
      data: { 
        currentStageId: nextSp.stageId,
        updatedAt: new Date()
      }
    });

    const flow = await getMatterFlow(matter.matterFlowId);
    if (flow) {
      const nextFlowStage = flow.stages.find((s) => s.id === nextSp.stageId);
      if (nextFlowStage) {
        for (const step of nextFlowStage.steps) {
          if (step.dueDaysOffset != null) {
            const dueDate = step.dueDaysOffset != null 
                  ? addDays(new Date(now), step.dueDaysOffset) 
                  : null;
            
            await tx.matterStepProgress.updateMany({
              where: { 
                matterStageProgressId: nextSp.id,
                stepId: step.id 
              },
              data: { dueDate: dueDate }
            });
          }
        }
      }
    }
  });

  const updatedMatter = await getMatter(matterId);
  if (!updatedMatter) throw new Error("Failed to retrieve updated matter");
  return updatedMatter;
}


export async function deleteMatter(id: string): Promise<void> {
  const { orgId } = await getCurrentOrg();
  await prisma.matter.delete({
    where: { 
      id,
      orgId
    },
  });
}


// ============================================================
// MATTERS WITH HEALTH (for dashboard/lists)
// ============================================================

export async function getMattersWithHealth(): Promise<MatterWithHealth[]> {
  const { orgId } = await getCurrentOrg();

  const [matters, controls, users, flows] = await Promise.all([
    await getMatters(),
    await getFlowControls(),
    await getUsers(),
    await getMatterFlows()
  ]);

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
        amountPaid: Number(m.amountPaid ?? 0),
      };
    });
}


// ============================================================
// DUPLICATE MATTERFLOW
// Creates an exact copy of a template with all stages and steps.
// SaaS NOTE: In production, add audit logging for template changes.
// ============================================================

export async function duplicateMatterFlow(sourceId: string): Promise<MatterFlow> {
  
  const source = await getMatterFlow(sourceId);
  if (!source) throw new Error("MatterFlow not found");

  
  const newFlow: Partial<MatterFlow> & { name: string } = {
    name: `Copy of ${source.name}`,
    description: source.description,
    isDefault: false,
    stages: source.stages.map((stage) => ({
      ...stage,
      id: uuid(), 
      steps: stage.steps.map((step) => ({
        ...step,
        id: uuid(), 
        stageId: "", 
      })),
    })),
  };

  return await saveMatterFlow(newFlow);
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

export async function getActiveMattersCountForFlow(matterFlowId: string): Promise<number> {
  const { orgId } = await getCurrentOrg();

  const count = await prisma.matter.count({
    where: {
      matterFlowId: matterFlowId,
      orgId: orgId,
      status: 'active'
    }
  });

  return count;
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
export async function reassignMattersFromFlow(
  fromFlowId: string, 
  toFlowId: string | null
): Promise<number> {
  const { orgId } = await getCurrentOrg();

  if (!toFlowId) return 0; 

  const result = await prisma.matter.updateMany({
    where: {
      matterFlowId: fromFlowId,
      orgId: orgId,
      status: 'active'
    },
    data: {
      matterFlowId: toFlowId, 
      updatedAt: new Date()
    }
  });

  return result.count;
}



export async function applyMatterFlowToExistingMatters(matterFlowId: string): Promise<number> {
  const { orgId } = await getCurrentOrg();

  const flow = await getMatterFlow(matterFlowId);
  if (!flow) throw new Error("MatterFlow not found");

  const matterRows = await prisma.matter.findMany({
    where: { matterFlowId, status: 'active', orgId },
    select: { id: true }
  });

  let updatedCount = 0;

  //for (const row of matterRows) {
  await Promise.all(matterRows.map(async (row) => {
    const matter = await getMatter(row.id);
    if (!matter) return;

    await prisma.$transaction(async (tx) => {
      for (const templateStage of flow.stages) {
        const existingSp = matter.stageProgress.find((sp) => sp.stageId === templateStage.id);

        if (existingSp) {
         
          await tx.matterStageProgress.update({
            where: { id: existingSp.id },
            data: { stageName: templateStage.name, sortOrder: templateStage.order }
          });

          
          for (const templateStep of templateStage.steps) {
            const existingStep = existingSp.steps.find((s) => s.stepId === templateStep.id);
            
            if (!existingStep) {
              
              const dueDate = templateStep.dueDaysOffset != null && existingSp.startedAt
              ? addDays(new Date(existingSp.startedAt), templateStep.dueDaysOffset)
              : null;

              await tx.matterStepProgress.create({
                data: {
                  id: uuid(),
                  orgId,
                  matterStageProgressId: existingSp.id,
                  stepId: templateStep.id,
                  stepName: templateStep.name,
                  sortOrder: templateStep.order,
                  isRequired: templateStep.isRequired,
                  dueDate: dueDate
                }
              });
            } else {
             
              await tx.matterStepProgress.update({
                where: { id: existingStep.id },
                data: { 
                  stepName: templateStep.name, 
                  sortOrder: templateStep.order,
                  isRequired: templateStep.isRequired 
                }
              });
            }
          }
        } else {
          
          const spId = uuid();
          await tx.matterStageProgress.create({
            data: {
              id: spId,
              orgId,
              matterId: matter.id,
              stageId: templateStage.id,
              stageName: templateStage.name,
              sortOrder: templateStage.order,
              steps: {
                create: templateStage.steps.map(ts => ({
                  id: uuid(),
                  orgId,
                  stepId: ts.id,
                  stepName: ts.name,
                  sortOrder: ts.order,
                  isRequired: ts.isRequired
                }))
              }
            }
          });
        }
      }

      
      await tx.matter.update({
        where: { id: matter.id },
        data: { updatedAt: new Date() }
      });
    });

    updatedCount++;
  }));

  return updatedCount;
}


// ============================================================
// FLOW CONTROLS
// ============================================================

export async function getFlowControls(): Promise<FlowControls> {
  const { orgId } = await getCurrentOrg();
  await ensureLocalFirm();

  const row = await prisma.flowControl.upsert({
    where: { orgId: orgId },
    update: {}, 
    create: {
      id: uuid(),
      orgId: orgId,
      dueSoonWindowDays: 2,
      stageRiskThresholdDays: 14,
      graceWindowDays: 2,
      breakdownOnPastDue: true,
      breakdownOnInactivity: true,
      breakdownInactivityDays: 14,
      breakdownOnStepOverdue: true,
      breakdownStepOverdueDays: 21,
    },
  });

  return {
    id: row.id,
    firmId: row.orgId,
    healthEvaluation: (row.healthEvaluation || "step") as "step" | "stage",
    dueSoonWindowDays: row.dueSoonWindowDays ?? 2,
    stageRiskThresholdDays: row.stageRiskThresholdDays ?? 14,
    graceWindowDays: row.graceWindowDays ?? 2,
    breakdownOnPastDue: row.breakdownOnPastDue ?? true,
    breakdownOnInactivity: row.breakdownOnInactivity ?? true,
    breakdownInactivityDays: row.breakdownInactivityDays ?? 14,
    breakdownOnStepOverdue: row.breakdownOnStepOverdue ?? true,
    breakdownStepOverdueDays: row.breakdownStepOverdueDays ?? 21,
    outOfFlowThresholdDays: 30,
    flowBreakdownThresholdDays: 60,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}


export async function updateFlowControls(
  data: Partial<Omit<FlowControls, "id" | "firmId" | "createdAt" | "updatedAt">>
): Promise<FlowControls> {
  const { orgId } = await getCurrentOrg();
  await prisma.flowControl.update({
    where: { 
      orgId: orgId 
    },
    data: {
      healthEvaluation: data.healthEvaluation ?? "step",
      dueSoonWindowDays: data.dueSoonWindowDays,
      stageRiskThresholdDays: data.stageRiskThresholdDays,
      graceWindowDays: data.graceWindowDays,
      breakdownOnPastDue: data.breakdownOnPastDue,
      breakdownOnInactivity: data.breakdownOnInactivity,
      breakdownInactivityDays: data.breakdownInactivityDays,
      breakdownOnStepOverdue: data.breakdownOnStepOverdue,
      breakdownStepOverdueDays: data.breakdownStepOverdueDays,

    },
  });

  return await getFlowControls();
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
    firmId: row.orgId,
    name: row.name,
    description: row.description || undefined,
    isPublic: row.isPublic,
    isDefault: !!row.isDefault,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function mapFlowStage(row: any): Omit<FlowStage, "steps"> {
  
  return {
    id: row.id,
    matterFlowId: row.matterFlowId,
    name: row.name,
    order: row.sortOrder,
    expectedDurationDays: row.expectedDurationDays,
    defaultDurationDays: row.defaultDurationDays ?? undefined,
    createdAt: row.createdAt,
  };
}

function mapFlowStep(row: any): FlowStep {
  return {
    id: row.id,
    stageId: row.stage_id,
    name: row.name,
    description: row.description || undefined,
    order: row.sortOrder,
    dueDaysOffset: row.dueDaysOffset ?? undefined,
    isRequired: !!row.isRequired,
    createdAt: row.createdAt,
  };
}

function mapMatterStepProgress(row: any): MatterStepProgress {
  return {
    id: row.id,
    matterStageProgressId: row.matterStageProgressId,
    stepId: row.stepId,
    stepName: row.stepName,
    order: row.sortOrder,
    isRequired: !!row.isRequired,
    isCompleted: !!row.isCompleted,
    completedAt: row.completedAt || undefined,
    dueDate: row.dueDate || undefined,
    manualDueDate: row.manualDueDate || undefined,
    notes: row.notes || undefined,
    withClient: !!row.withClient,
    withClientSince: row.withClientSince || undefined,
  };
}
