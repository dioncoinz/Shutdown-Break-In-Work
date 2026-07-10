import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth/current-user";
import { canApproveStage, getApprovalPermissionError } from "@/lib/auth/approval-permissions";
import { applyLateWorkDecision, type Decision, type ReviewStage } from "@/lib/late-work/decision";

const STAGES = ["SUBMITTED", "COORD_REVIEW", "SUPER_REVIEW"] as const;

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireApiUser();
  if (auth.response) return auth.response;

  const { id } = await ctx.params;
  const form = await req.formData();
  const stage = String(form.get("stage") || "") as ReviewStage;
  const decision = String(form.get("decision") || "") as Decision;
  const comment = String(form.get("comment") || "");
  const workgroup = String(form.get("workgroup") || "");

  if (!STAGES.includes(stage) || (decision !== "APPROVE" && decision !== "REJECT")) {
    return redirectToRequest(req, id, "Invalid approval action.");
  }

  if (!canApproveStage(auth.user, stage)) {
    return redirectToRequest(req, id, getApprovalPermissionError(stage));
  }

  const actor = auth.user?.full_name || auth.user?.email || "A reviewer";
  const result = await applyLateWorkDecision({
    requestId: id,
    stage,
    decision,
    actor,
    comment,
    workgroup,
  });

  if (!result.ok) {
    return redirectToRequest(req, id, result.error || "Approval failed.");
  }

  return redirectToRequest(req, id, null, result.emailWarning);
}

function redirectToRequest(req: Request, id: string, error: string | null, warning?: string) {
  const url = new URL(`/late-work/${id}`, req.url);
  if (error) {
    url.searchParams.set("approvalError", error);
  } else {
    url.searchParams.set("approvalSaved", "1");
  }
  if (warning) {
    url.searchParams.set("emailWarning", warning);
  }

  return NextResponse.redirect(url, { status: 303 });
}
