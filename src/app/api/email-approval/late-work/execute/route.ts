import { NextResponse } from "next/server";
import { verifyApprovalToken } from "@/lib/email/approval-links";
import { applyLateWorkDecision } from "@/lib/late-work/decision";

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

  if (parsed.data.stage === "MANAGER_REVIEW") {
    return NextResponse.json(
      { error: "Late work requests do not require manager approval." },
      { status: 400 }
    );
  }

  const result = await applyLateWorkDecision({
    requestId: parsed.data.requestId,
    stage: parsed.data.stage,
    decision: parsed.data.decision,
    actor: parsed.data.recipientEmail,
    comment: body.comment,
    workgroup: body.workgroup,
  });

  if (!result.ok) {
    if (result.emailWarning) {
      console.warn("Late work email approval failed with warning", {
        requestId: parsed.data.requestId,
        stage: parsed.data.stage,
        decision: parsed.data.decision,
        emailWarning: result.emailWarning,
      });
    }
    return NextResponse.json({ error: result.error, emailWarning: result.emailWarning }, { status: 400 });
  }

  if (result.emailWarning) {
    console.warn("Late work email approval completed with warning", {
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
