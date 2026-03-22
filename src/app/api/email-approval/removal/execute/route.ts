import { NextResponse } from "next/server";
import { verifyApprovalToken } from "@/lib/email/approval-links";
import { applyWorkRemovalDecision } from "@/lib/work-removal/decision";

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

  const result = await applyWorkRemovalDecision({
    requestId: parsed.data.requestId,
    stage: parsed.data.stage,
    decision: parsed.data.decision,
    actor: parsed.data.recipientEmail,
    comment: body.comment,
    workgroup: body.workgroup,
  });

  if (!result.ok) {
    if (result.emailWarning) {
      console.warn("Work removal email approval failed with warning", {
        requestId: parsed.data.requestId,
        stage: parsed.data.stage,
        decision: parsed.data.decision,
        emailWarning: result.emailWarning,
      });
    }
    return NextResponse.json({ error: result.error, emailWarning: result.emailWarning }, { status: 400 });
  }

  if (result.emailWarning) {
    console.warn("Work removal email approval completed with warning", {
      requestId: parsed.data.requestId,
      stage: parsed.data.stage,
      decision: parsed.data.decision,
      emailWarning: result.emailWarning,
    });
  }

  return NextResponse.json({
    ok: true,
    nextStatus: result.nextStatus,
    emailWarning: result.emailWarning,
  });
}
