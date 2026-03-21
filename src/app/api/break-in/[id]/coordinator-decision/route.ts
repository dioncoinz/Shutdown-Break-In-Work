import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSessionTokenParts, SESSION_COOKIE } from "@/lib/auth/session";
import { applyBreakInDecision } from "@/lib/break-in/decision";

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;

  const body = (await req.json().catch(() => ({}))) as {
    decision?: "APPROVE" | "REJECT";
    workgroup?: string;
    comment?: string;
  };

  if (body.decision !== "APPROVE" && body.decision !== "REJECT") {
    return NextResponse.json({ error: "Invalid decision" }, { status: 400 });
  }

  const cookieStore = await cookies();
  const actor = getSessionTokenParts(cookieStore.get(SESSION_COOKIE)?.value)?.email || "A coordinator";
  const result = await applyBreakInDecision({
    requestId: id,
    stage: "COORD_REVIEW",
    decision: body.decision,
    actor,
    comment: body.comment,
    workgroup: body.workgroup,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ ok: true, emailWarning: result.emailWarning });
}
