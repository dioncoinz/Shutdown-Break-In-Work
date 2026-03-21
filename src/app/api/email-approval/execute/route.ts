import { NextResponse } from "next/server";
import { verifyApprovalToken } from "@/lib/email/approval-links";
import { applyBreakInDecision } from "@/lib/break-in/decision";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as {
    token?: string;
    comment?: string;
    workgroup?: string;
  };

  const parsed = verifyApprovalToken(body.token);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const result = await applyBreakInDecision({
    requestId: parsed.data.requestId,
    stage: parsed.data.stage,
    decision: parsed.data.decision,
    actor: parsed.data.recipientEmail,
    comment: body.comment,
    workgroup: body.workgroup,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error, emailWarning: result.emailWarning }, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    nextStatus: result.nextStatus,
    emailWarning: result.emailWarning,
  });
}
