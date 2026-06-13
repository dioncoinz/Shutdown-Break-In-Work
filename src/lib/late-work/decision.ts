import { createSupabaseDb } from "@/lib/supabase/db";
import { getLateWorkRequestById } from "@/lib/late-work/server";
import {
  notifyLateWorkRequestorOutcome,
  notifyLateWorkStageApprovers,
} from "@/lib/email/late-work-notifications";
import type { LateWorkRequestRecord } from "@/lib/late-work/workflow";

export type Decision = "APPROVE" | "REJECT";
export type ReviewStage = "SUBMITTED" | "COORD_REVIEW" | "SUPER_REVIEW";

type ApplyDecisionInput = {
  requestId: string;
  stage: ReviewStage;
  decision: Decision;
  actor: string;
  comment?: string | null;
  workgroup?: string | null;
};

type ApplyDecisionResult = {
  ok: boolean;
  error?: string;
  request?: LateWorkRequestRecord;
  emailWarning?: string;
  nextStatus?: string;
};

type StageConfig = {
  expectedStatus: ReviewStage;
  approveStatus: string;
  rejectStatus: "REJECTED";
  commentColumn:
    | "planner_comment"
    | "coordinator_comment"
    | "superintendent_comment";
  decidedByColumn:
    | "planner_decided_by"
    | "coordinator_decided_by"
    | "superintendent_decided_by";
  decidedAtColumn:
    | "planner_decided_at"
    | "coordinator_decided_at"
    | "superintendent_decided_at";
  requireWorkgroupOnApprove: boolean;
  nextReviewStatus?: ReviewStage;
};

const STAGE_CONFIG: Record<ReviewStage, StageConfig> = {
  SUBMITTED: {
    expectedStatus: "SUBMITTED",
    approveStatus: "COORD_REVIEW",
    rejectStatus: "REJECTED",
    commentColumn: "planner_comment",
    decidedByColumn: "planner_decided_by",
    decidedAtColumn: "planner_decided_at",
    requireWorkgroupOnApprove: false,
    nextReviewStatus: "COORD_REVIEW",
  },
  COORD_REVIEW: {
    expectedStatus: "COORD_REVIEW",
    approveStatus: "SUPER_REVIEW",
    rejectStatus: "REJECTED",
    commentColumn: "coordinator_comment",
    decidedByColumn: "coordinator_decided_by",
    decidedAtColumn: "coordinator_decided_at",
    requireWorkgroupOnApprove: true,
    nextReviewStatus: "SUPER_REVIEW",
  },
  SUPER_REVIEW: {
    expectedStatus: "SUPER_REVIEW",
    approveStatus: "APPROVED",
    rejectStatus: "REJECTED",
    commentColumn: "superintendent_comment",
    decidedByColumn: "superintendent_decided_by",
    decidedAtColumn: "superintendent_decided_at",
    requireWorkgroupOnApprove: false,
  },
};

export async function applyLateWorkDecision(input: ApplyDecisionInput): Promise<ApplyDecisionResult> {
  const config = STAGE_CONFIG[input.stage];
  const comment = input.comment?.trim() || null;
  const workgroup = input.workgroup?.trim() || null;

  const { request: existing, error: fetchError } = await getLateWorkRequestById(input.requestId);
  if (!existing) {
    return { ok: false, error: fetchError || "Request not found" };
  }

  if (existing.status !== config.expectedStatus) {
    return {
      ok: false,
      error: `This email is no longer valid because the request is currently ${existing.status}.`,
      request: existing,
    };
  }

  if (input.decision === "APPROVE" && config.requireWorkgroupOnApprove && !workgroup) {
    return { ok: false, error: "Workgroup is required to approve this request.", request: existing };
  }

  const nextStatus = input.decision === "APPROVE" ? config.approveStatus : config.rejectStatus;
  const update: Record<string, string | null> = {
    status: nextStatus,
    [config.commentColumn]: comment,
    [config.decidedByColumn]: input.actor,
    [config.decidedAtColumn]: new Date().toISOString(),
  };

  if (workgroup) {
    update.workgroup = workgroup;
  }

  const supabase = createSupabaseDb();
  const { error: updateError } = await supabase
    .from("late_work_requests")
    .update(update)
    .eq("id", input.requestId);

  if (updateError) {
    return { ok: false, error: updateError.message, request: existing };
  }

  const { request: updated, error: updatedError } = await getLateWorkRequestById(input.requestId);
  if (!updated) {
    return { ok: false, error: updatedError || "Request updated, but failed to reload it." };
  }

  let emailWarning: string | undefined;
  if (input.decision === "APPROVE" && config.nextReviewStatus) {
    const emailResult = await notifyLateWorkStageApprovers(updated, config.nextReviewStatus, input.actor).catch(
      (emailError) => ({
        attempted: true,
        sent: false,
        reason: emailError instanceof Error ? emailError.message : "Unknown email failure",
      })
    );

    if (!emailResult.sent) {
      emailWarning = emailResult.reason;
    }
  } else {
    const outcome = input.decision === "APPROVE" ? "APPROVED" : "REJECTED";
    const emailResults = [
      await notifyLateWorkRequestorOutcome(updated, outcome, comment || "", input.actor).catch(
        (emailError) => ({
          attempted: true,
          sent: false,
          reason: emailError instanceof Error ? emailError.message : "Unknown email failure",
        })
      ),
    ];

    const failures = emailResults
      .filter((result) => !result.sent)
      .map((result) => result.reason)
      .filter(Boolean);

    if (failures.length > 0) {
      emailWarning = failures.join(" | ");
      console.warn("Late work approval completed with email warnings", {
        requestId: updated.id,
        nextStatus,
        emailWarning,
      });
    }
  }

  return {
    ok: true,
    request: updated,
    emailWarning,
    nextStatus,
  };
}
