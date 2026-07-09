export type WorkRemovalStatus =
  | "SUBMITTED"
  | "COORD_REVIEW"
  | "SUPER_REVIEW"
  | "MANAGER_REVIEW"
  | "APPROVED"
  | "REJECTED";

export type WorkRemovalRequestRecord = {
  id: string;
  shutdown_id: string | null;
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
  planner_decided_by: string | null;
  planner_decided_at: string | null;
  coordinator_decided_by: string | null;
  coordinator_decided_at: string | null;
  superintendent_decided_by: string | null;
  superintendent_decided_at: string | null;
  manager_decided_by: string | null;
  manager_decided_at: string | null;
};

type StageConfig = {
  status: WorkRemovalStatus;
  label: string;
  envKey: string | null;
  commentColumn: keyof Pick<
    WorkRemovalRequestRecord,
    "planner_comment" | "coordinator_comment" | "superintendent_comment" | "manager_comment"
  > | null;
};

const STAGES: Record<WorkRemovalStatus, StageConfig> = {
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
  REJECTED: {
    status: "REJECTED",
    label: "Rejected",
    envKey: null,
    commentColumn: null,
  },
};

export function getStageConfig(status: WorkRemovalStatus) {
  return STAGES[status];
}

export function parseEmailList(value: string | undefined) {
  return (value || "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}
