export type ApprovalStage = "SUBMITTED" | "COORD_REVIEW" | "SUPER_REVIEW" | "MANAGER_REVIEW";

const STAGE_ROLES: Record<ApprovalStage, string> = {
  SUBMITTED: "planner",
  COORD_REVIEW: "coordinator",
  SUPER_REVIEW: "superintendent",
  MANAGER_REVIEW: "manager",
};

export function getApprovalStageRole(stage: ApprovalStage) {
  return STAGE_ROLES[stage];
}

export function canApproveStage(user: { role: string } | null | undefined, stage: ApprovalStage) {
  if (!user) return false;
  return user.role === "admin" || user.role === STAGE_ROLES[stage];
}

export function getApprovalPermissionError(stage: ApprovalStage) {
  return `Only the ${STAGE_ROLES[stage]} role can action this approval stage.`;
}
