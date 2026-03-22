import { createSupabaseDb } from "@/lib/supabase/db";
import { getWorkRemovalRequestById } from "@/lib/work-removal/server";
import {
  notifyRemovalApprovedDistribution,
  notifyRemovalRequestorOutcome,
  notifyRemovalStageApprovers,
} from "@/lib/email/removal-notifications";
import type { WorkRemovalRequestRecord } from "@/lib/work-removal/workflow";

export type Decision = "APPROVE" | "REJECT";
export type ReviewStage = "SUBMITTED" | "COORD_REVIEW" | "SUPER_REVIEW" | "MANAGER_REVIEW";

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
  request?: WorkRemovalRequestRecord;
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
    | "superintendent_comment"
    | "manager_comment";
  requireWorkgroupOnApprove: boolean;
  nextReviewStatus?: ReviewStage;
};

const STAGE_CONFIG: Record<ReviewStage, StageConfig> = {
  SUBMITTED: {
    expectedStatus: "SUBMITTED",
    approveStatus: "COORD_REVIEW",
    rejectStatus: "REJECTED",
    commentColumn: "planner_comment",
    requireWorkgroupOnApprove: false,
    nextReviewStatus: "COORD_REVIEW",
  },
  COORD_REVIEW: {
    expectedStatus: "COORD_REVIEW",
    approveStatus: "SUPER_REVIEW",
    rejectStatus: "REJECTED",
    commentColumn: "coordinator_comment",
    requireWorkgroupOnApprove: true,
    nextReviewStatus: "SUPER_REVIEW",
  },
  SUPER_REVIEW: {
    expectedStatus: "SUPER_REVIEW",
    approveStatus: "MANAGER_REVIEW",
    rejectStatus: "REJECTED",
    commentColumn: "superintendent_comment",
    requireWorkgroupOnApprove: false,
    nextReviewStatus: "MANAGER_REVIEW",
  },
  MANAGER_REVIEW: {
    expectedStatus: "MANAGER_REVIEW",
    approveStatus: "APPROVED",
    rejectStatus: "REJECTED",
    commentColumn: "manager_comment",
    requireWorkgroupOnApprove: false,
  },
};

export async function applyWorkRemovalDecision(input: ApplyDecisionInput): Promise<ApplyDecisionResult> {
  const config = STAGE_CONFIG[input.stage];
  const comment = input.comment?.trim() || null;
  const workgroup = input.workgroup?.trim() || null;

  const { request: existing, error: fetchError } = await getWorkRemovalRequestById(input.requestId);
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
  };

  if (workgroup) {
    update.workgroup = workgroup;
  }

  const supabase = createSupabaseDb();
  const { error: updateError } = await supabase
    .from("work_removal_requests")
    .update(update)
    .eq("id", input.requestId);

  if (updateError) {
    return { ok: false, error: updateError.message, request: existing };
  }

  const { request: updated, error: updatedError } = await getWorkRemovalRequestById(input.requestId);
  if (!updated) {
    return { ok: false, error: updatedError || "Request updated, but failed to reload it." };
  }

  let emailWarning: string | undefined;
  if (input.decision === "APPROVE" && config.nextReviewStatus) {
    const emailResult = await notifyRemovalStageApprovers(updated, config.nextReviewStatus, input.actor).catch(
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
      await notifyRemovalRequestorOutcome(updated, outcome, comment || "", input.actor).catch(
        (emailError) => ({
          attempted: true,
          sent: false,
          reason: emailError instanceof Error ? emailError.message : "Unknown email failure",
        })
      ),
    ];

    if (outcome === "APPROVED") {
      emailResults.push(
        await notifyRemovalApprovedDistribution(updated, input.actor, comment || "").catch(
          (emailError) => ({
            attempted: true,
            sent: false,
            reason: emailError instanceof Error ? emailError.message : "Unknown email failure",
          })
        )
      );
    }

    const failures = emailResults
      .filter((result) => !result.sent)
      .map((result) => result.reason)
      .filter(Boolean);

    if (failures.length > 0) {
      emailWarning = failures.join(" | ");
      console.warn("Work removal approval completed with email warnings", {
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
