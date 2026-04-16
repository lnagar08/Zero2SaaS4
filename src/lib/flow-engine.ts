// ============================================================
// Flow Health Engine — CORRECTED LOGIC
//
// Status precedence (highest to lowest):
// 1. Flow Breakdown — configurable: past due date, inactivity, step severely overdue
// 2. Out of Flow — any step is overdue (past its due date)
// 3. At Flow Risk — a step is due soon (within X days)
// 4. In Flow — everything on track
//
// Only the CURRENT stage drives active overdue/due-soon checks.
// Flow Breakdown can also check matter-level conditions (overall due date, inactivity).
//
// SaaS NOTE: This file is PURE LOGIC — no database calls. It works identically
// in both SQLite (local) and Prisma (SaaS) versions. No conversion needed.
// The FlowControls thresholds come from the database via the caller.
// ============================================================

import {
  FlowHealthStatus,
  FlowHealthResult,
  FlowControls,
  MatterStageProgress,
  MatterStepProgress,
  FLOW_STATUS_LABELS,
} from "@/types";
import { differenceInCalendarDays, parseISO, isValid } from "date-fns";

const DEFAULT_CONTROLS: FlowControls = {
  id: "default",
  firmId: "default",
  dueSoonWindowDays: 2,
  stageRiskThresholdDays: 14,
  graceWindowDays: 2,
  breakdownOnPastDue: true,
  breakdownOnInactivity: true,
  breakdownInactivityDays: 14,
  breakdownOnStepOverdue: true,
  breakdownStepOverdueDays: 21,
  outOfFlowThresholdDays: 30,     
  flowBreakdownThresholdDays: 60,
  createdAt: "",
  updatedAt: "",
};

export interface ComputeHealthInput {
  stageProgress: MatterStageProgress[];
  currentStageId?: string;
  startDate: string;
  targetEndDate?: string;
  status: string;
  controls?: FlowControls;
}

export function computeFlowHealth(input: ComputeHealthInput): FlowHealthResult {
  const {
    stageProgress,
    currentStageId,
    startDate,
    targetEndDate,
    status,
    controls = DEFAULT_CONTROLS,
  } = input;

  const now = new Date();
  const start = startDate;
  const daysElapsed = isValid(start) ? differenceInCalendarDays(now, start) : 0;

  // If matter is not active, return simple state
  if (status === "completed") {
    return buildResult("in_flow", stageProgress, 0, daysElapsed, ["Matter completed"]);
  }
  if (status === "on_hold" || status === "archived") {
    return buildResult("in_flow", stageProgress, 0, daysElapsed, [`Matter is ${status.replace("_", " ")}`]);
  }

  // Flatten all steps
  const allSteps = stageProgress.flatMap((sp) => sp.steps);
  const totalSteps = allSteps.length;
  const completedSteps = allSteps.filter((s) => s.isCompleted).length;

  // Find current stage
  const currentStage = currentStageId
    ? stageProgress.find((sp) => sp.stageId === currentStageId)
    : stageProgress.find((sp) => !sp.completedAt);
  const currentStageIndex = currentStage ? stageProgress.indexOf(currentStage) : 0;

  // Days in current stage
  let daysInCurrentStage = 0;
  if (currentStage?.startedAt) {
    const stageStart = currentStage.startedAt;
    if (isValid(stageStart)) daysInCurrentStage = differenceInCalendarDays(now, stageStart);
  }

  // Evaluate steps in CURRENT stage only
  const currentStageSteps = currentStage?.steps ?? [];
  const incompleteCurrentSteps = currentStageSteps.filter((s) => !s.isCompleted);

  let overdueSteps = 0;
  let dueSoonSteps = 0;
  let maxOverdueDays = 0;
  const reasons: string[] = [];

  for (const step of incompleteCurrentSteps) {
    const dueDate = step.manualDueDate || step.dueDate;
    if (!dueDate) continue;
    const due = dueDate;
    if (!isValid(due)) continue;
    const daysUntilDue = differenceInCalendarDays(due, now);

    if (daysUntilDue < 0) {
      overdueSteps++;
      const overdueDays = Math.abs(daysUntilDue);
      if (overdueDays > maxOverdueDays) maxOverdueDays = overdueDays;
    } else if (daysUntilDue <= controls.dueSoonWindowDays) {
      dueSoonSteps++;
    }
  }

  // Days since last activity (last completed step across all stages)
  let daysSinceLastActivity = daysElapsed; // fallback to matter age
  for (const sp of stageProgress) {
    for (const step of sp.steps) {
      if (step.completedAt) {
        const completed = step.completedAt;
        if (isValid(completed)) {
          const days = differenceInCalendarDays(now, completed);
          if (days < daysSinceLastActivity) daysSinceLastActivity = days;
        }
      }
    }
  }

  // Grace period check
  const inGracePeriod = currentStage?.startedAt && daysInCurrentStage <= controls.graceWindowDays;

  // ============================================================
  // Apply precedence rules (corrected)
  // ============================================================
  let healthStatus: FlowHealthStatus = "in_flow";

  if (!inGracePeriod) {
    // ── FLOW BREAKDOWN — configurable conditions (OR logic) ──
    let isBreakdown = false;

    // Condition 1: Matter exceeded overall due date
    if (controls.breakdownOnPastDue && targetEndDate) {
      const target = targetEndDate;
      if (isValid(target) && differenceInCalendarDays(target, now) < 0) {
        isBreakdown = true;
        reasons.push("Matter past overall due date");
      }
    }

    // Condition 2: No activity for X days
    if (controls.breakdownOnInactivity && daysSinceLastActivity >= controls.breakdownInactivityDays) {
      isBreakdown = true;
      reasons.push(`No activity for ${daysSinceLastActivity} days (threshold: ${controls.breakdownInactivityDays})`);
    }

    // Condition 3: Step overdue by X days
    if (controls.breakdownOnStepOverdue && maxOverdueDays >= controls.breakdownStepOverdueDays) {
      isBreakdown = true;
      reasons.push(`Step overdue by ${maxOverdueDays} days (threshold: ${controls.breakdownStepOverdueDays})`);
    }

    if (isBreakdown) {
      healthStatus = "flow_breakdown";
    }
    // ── OUT OF FLOW — any step is overdue (past due date) ──
    else if (overdueSteps > 0) {
      healthStatus = "out_of_flow";
      reasons.push(`${overdueSteps} step${overdueSteps !== 1 ? "s" : ""} overdue`);
      if (maxOverdueDays > 0) reasons.push(`Most overdue: ${maxOverdueDays} day${maxOverdueDays !== 1 ? "s" : ""}`);
    }
    // ── AT FLOW RISK — step due soon or stage stalling ──
    else if (
      dueSoonSteps > 0 ||
      daysInCurrentStage >= controls.stageRiskThresholdDays
    ) {
      healthStatus = "at_flow_risk";
      if (dueSoonSteps > 0) reasons.push(`${dueSoonSteps} step${dueSoonSteps !== 1 ? "s" : ""} due within ${controls.dueSoonWindowDays} day${controls.dueSoonWindowDays !== 1 ? "s" : ""}`);
      if (daysInCurrentStage >= controls.stageRiskThresholdDays) reasons.push(`${daysInCurrentStage} days in stage (threshold: ${controls.stageRiskThresholdDays})`);
    }
  }

  if (healthStatus === "in_flow") {
    reasons.push("On track");
  }

  return {
    status: healthStatus,
    label: FLOW_STATUS_LABELS[healthStatus],
    reasons,
    progressPercent: totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0,
    totalSteps,
    completedSteps,
    overdueSteps,
    dueSoonSteps,
    currentStageName: currentStage?.stageName,
    currentStageIndex,
    totalStages: stageProgress.length,
    daysElapsed,
    daysInCurrentStage,
  };
}

function buildResult(
  status: FlowHealthStatus,
  stageProgress: MatterStageProgress[],
  daysInCurrentStage: number,
  daysElapsed: number,
  reasons: string[]
): FlowHealthResult {
  const allSteps = stageProgress.flatMap((sp) => sp.steps);
  return {
    status,
    label: FLOW_STATUS_LABELS[status],
    reasons,
    progressPercent: allSteps.length > 0 ? Math.round((allSteps.filter((s) => s.isCompleted).length / allSteps.length) * 100) : 0,
    totalSteps: allSteps.length,
    completedSteps: allSteps.filter((s) => s.isCompleted).length,
    overdueSteps: 0,
    dueSoonSteps: 0,
    currentStageName: stageProgress.find((sp) => !sp.completedAt)?.stageName,
    currentStageIndex: stageProgress.findIndex((sp) => !sp.completedAt),
    totalStages: stageProgress.length,
    daysElapsed,
    daysInCurrentStage,
  };
}
