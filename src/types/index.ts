// ============================================================
// MatterFlow — Core Domain Types
// Designed for multi-tenant SaaS from day one
// ============================================================

// ---------- Multi-tenant / Auth ----------

export interface Firm {
  id: string;
  name: string;
  slug: string; // URL-safe identifier
  createdAt: string;
  updatedAt: string;
}

export type UserRole = "owner" | "associate" | "admin";

export interface User {
  id: string;
  firmId: string;
  email: string;
  name: string;
  role: UserRole;
  avatarUrl?: string;
  createdAt: string;
  updatedAt: string;
}

// ---------- MatterFlow (Workflow Template) ----------

export interface MatterFlow {
  id: string;
  firmId: string;
  name: string;
  description?: string;
  isPublic: boolean;
  isDefault: boolean;
  stages: FlowStage[];
  createdAt: string;
  updatedAt: string;
}

export interface FlowStage {
  id: string;
  matterFlowId: string;
  name: string;
  order: number;
  /** Default duration in business days for this stage */
  expectedDurationDays: number;
  defaultDurationDays?: number;
  steps: FlowStep[];
  createdAt: string;
}

export interface FlowStep {
  id: string;
  stageId: string;
  name: string;
  description?: string;
  order: number;
  /** Due offset in business days from stage start (or matter start) */
  dueDaysOffset?: number;
  isRequired: boolean;
  createdAt: string;
}

// ---------- Matter ----------

export type MatterStatus = "active" | "completed" | "on_hold" | "archived";

export interface Matter {
  id: string;
  firmId: string;
  matterFlowId: string;
  /** External reference / case number */
  referenceNumber?: string;
  name: string;
  clientName: string;
  clientCompany?: string; 
  clientEmail?: string;
  description?: string;
  status: MatterStatus;
  assignedUserId?: string;
  currentStageId?: string;
  startDate: string;
  targetEndDate?: string;
  completedDate?: string;
  /** Flat fee / amount paid for this engagement */
  amountPaid?: number;
  /** Per-matter stage/step progress */
  stageProgress: MatterStageProgress[];
  createdAt: string;
  updatedAt: string;
}

export interface MatterStageProgress {
  id: string;
  matterId: string;
  stageId: string;
  stageName: string;
  order: number;
  startedAt?: string;
  completedAt?: string;
  expectedDurationDays?: number;
  steps: MatterStepProgress[];
}

export interface MatterStepProgress {
  id: string;
  matterStageProgressId: string;
  stepId: string;
  stepName: string;
  order: number;
  isRequired: boolean;
  isCompleted: boolean;
  completedAt?: string;
  /** Actual due date computed from stage start + offset */
  dueDate?: string;
  /** Manual override due date */
  manualDueDate?: string;
  notes?: string;
  /** Whether this step is currently with the client (waiting on them) */
  withClient: boolean;
  /** Timestamp when step was sent to client */
  withClientSince?: string;
}

// ---------- Flow Health / Status ----------

/**
 * Flow health status — single source of truth.
 * Precedence: flow_breakdown > out_of_flow > at_flow_risk > in_flow
 */
export type FlowHealthStatus =
  | "in_flow"
  | "at_flow_risk"
  | "out_of_flow"
  | "flow_breakdown";

export interface FlowHealthResult {
  status: FlowHealthStatus;
  label: string;
  reasons: string[];
  /** Overall progress 0-100 */
  progressPercent: number;
  /** Steps summary */
  stepWarnings: number;
  totalSteps: number;
  completedSteps: number;
  overdueSteps: number;
  dueSoonSteps: number;
  /** Current stage info */
  stepWarningLevel?: string;
  currentStageName?: string;
  currentStageIndex?: number;
  totalStages: number;
  /** Days info */
  daysElapsed: number;
  daysInCurrentStage: number;
}

// ---------- Flow Controls (Rules/Settings) ----------

export interface FlowControls {
  id: string;
  firmId: string;
  /** "step" = any overdue step changes matter status. "stage" = only stage deadline changes status. */
  healthEvaluation: "step" | "stage";
  /** Days before due date to flag as "due soon" → At Flow Risk */
  dueSoonWindowDays: number;
  /** Days in stage before "At Flow Risk" (secondary trigger) */
  stageRiskThresholdDays: number;
  /** Grace period days after stage start before tracking begins */
  graceWindowDays: number;
  /** Flow Breakdown conditions — at least one must be enabled */
  outOfFlowThresholdDays?: number; 
  flowBreakdownThresholdDays?: number;
  breakdownOnPastDue: boolean;
  breakdownOnInactivity: boolean;
  breakdownInactivityDays: number;
  breakdownOnStepOverdue: boolean;
  breakdownStepOverdueDays: number;
  createdAt: string;
  updatedAt: string;
}

// ---------- UI Label Helpers ----------

export const FLOW_STATUS_LABELS: Record<FlowHealthStatus, string> = {
  in_flow: "In Flow",
  at_flow_risk: "At Flow Risk",
  out_of_flow: "Out of Flow",
  flow_breakdown: "Flow Breakdown",
};

export const FLOW_STATUS_COLORS: Record<
  FlowHealthStatus,
  { bg: string; text: string; dot: string }
> = {
  in_flow: { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" },
  at_flow_risk: { bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-500" },
  out_of_flow: { bg: "bg-red-50", text: "text-red-700", dot: "bg-red-500" },
  flow_breakdown: { bg: "bg-violet-50", text: "text-violet-700", dot: "bg-violet-500" },
};

// ---------- Dashboard Summary ----------

export interface DashboardSummary {
  totalActive: number;
  inFlow: number;
  atFlowRisk: number;
  outOfFlow: number;
  flowBreakdown: number;
  matters: MatterWithHealth[];
}

export interface MatterWithHealth extends Matter {
  health: FlowHealthResult;
  assignedUserName?: string;
  matterFlowName?: string;
  amountPaid:number
}
