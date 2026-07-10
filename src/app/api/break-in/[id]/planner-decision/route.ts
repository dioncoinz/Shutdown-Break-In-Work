import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth/current-user";
import { canApproveStage, getApprovalPermissionError } from "@/lib/auth/approval-permissions";
import { applyBreakInDecision } from "@/lib/break-in/decision";

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const auth = await requireApiUser();
  if (auth.response) return auth.response;

  const { id } = await ctx.params;

  const body = (await req.json().catch(() => ({}))) as {
    decision?: "APPROVE" | "REJECT";
    comment?: string;
  };

  if (body.decision !== "APPROVE" && body.decision !== "REJECT") {
    return NextResponse.json({ error: "Bad decision" }, { status: 400 });
  }

  if (!canApproveStage(auth.user, "SUBMITTED")) {
    return NextResponse.json({ error: getApprovalPermissionError("SUBMITTED") }, { status: 403 });
  }

  const actor = auth.user?.full_name || auth.user?.email || "A planner";
  const result = await applyBreakInDecision({
    requestId: id,
    stage: "SUBMITTED",
    decision: body.decision,
    actor,
    comment: body.comment,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ ok: true, emailWarning: result.emailWarning });
}
