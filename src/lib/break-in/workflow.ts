export type BreakInStatus =
  | "SUBMITTED"
  | "COORD_REVIEW"
  | "SUPER_REVIEW"
  | "MANAGER_REVIEW"
  | "APPROVED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "REJECTED";

export type BreakInRequestRecord = {
  id: string;
  wo_number: string;
  wo_title: string | null;
  reason: string | null;
  consequence: string | null;
  area: string | null;
  priority: string | null;
  workgroup: string | null;
  status: string | null;
  requestor_name: string | null;
  requestor_email: string | null;
  planner_comment: string | null;
  coordinator_comment: string | null;
  superintendent_comment: string | null;
  manager_comment: string | null;
};

type StageConfig = {
  status: BreakInStatus;
  label: string;
  envKey: string | null;
  commentColumn: keyof Pick<
    BreakInRequestRecord,
    "planner_comment" | "coordinator_comment" | "superintendent_comment" | "manager_comment"
  > | null;
};

const STAGES: Record<BreakInStatus, StageConfig> = {
  SUBMITTED: {
    status: "SUBMITTED",
    label: "Planner Review",
    envKey: "PLANNER_APPROVER_EMAILS",
    commentColumn: "planner_comment",
  },
  COORD_REVIEW: {
    status: "COORD_REVIEW",
    label: "Coordinator Review",
    envKey: "COORDINATOR_APPROVER_EMAILS",
    commentColumn: "coordinator_comment",
  },
  SUPER_REVIEW: {
    status: "SUPER_REVIEW",
    label: "Superintendent Review",
    envKey: "SUPERINTENDENT_APPROVER_EMAILS",
    commentColumn: "superintendent_comment",
  },
  MANAGER_REVIEW: {
    status: "MANAGER_REVIEW",
    label: "Manager Review",
    envKey: "MANAGER_APPROVER_EMAILS",
    commentColumn: "manager_comment",
  },
  APPROVED: {
    status: "APPROVED",
    label: "Approved",
    envKey: null,
    commentColumn: null,
  },
  IN_PROGRESS: {
    status: "IN_PROGRESS",
    label: "In Progress",
    envKey: null,
    commentColumn: null,
  },
  COMPLETED: {
    status: "COMPLETED",
    label: "Completed",
    envKey: null,
    commentColumn: null,
  },
  REJECTED: {
    status: "REJECTED",
    label: "Rejected",
    envKey: null,
    commentColumn: null,
  },
};

export function getStageConfig(status: BreakInStatus) {
  return STAGES[status];
}

export function parseEmailList(value: string | undefined) {
  return (value || "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}
