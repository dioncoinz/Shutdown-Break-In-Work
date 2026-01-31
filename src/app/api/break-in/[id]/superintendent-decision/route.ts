import { NextResponse } from "next/server";
import { createSupabaseDb } from "../../../../../lib/supabase/db";

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;

  const body = await req.json().catch(() => ({}));
  const decision = body?.decision;

  if (decision !== "APPROVE" && decision !== "REJECT") {
    return NextResponse.json({ error: "Invalid decision" }, { status: 400 });
  }

  // ✅ Superintendent APPROVE goes to Manager review
  const nextStatus = decision === "APPROVE"
    ? "MANAGER_REVIEW"
    : "REJECTED";

  const supabase = createSupabaseDb();

  const { error } = await supabase
    .from("break_in_requests")
    .update({ status: nextStatus })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
