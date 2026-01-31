import { NextResponse } from "next/server";
import { createSupabaseDb } from "../../../../../lib/supabase/db";

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;

  const body = (await req.json().catch(() => ({}))) as {
    decision?: "APPROVE" | "REJECT";
    workgroup?: string;
    comment?: string; // accepted but NOT stored (no column)
  };

  const decision = body.decision;
  if (decision !== "APPROVE" && decision !== "REJECT") {
    return NextResponse.json({ error: "Invalid decision" }, { status: 400 });
  }

  const nextStatus = decision === "APPROVE" ? "SUPER_REVIEW" : "REJECTED";

  const wg = (body.workgroup ?? "").trim();

  // Require workgroup only when approving
  if (decision === "APPROVE" && !wg) {
    return NextResponse.json(
      { error: "Workgroup is required to approve" },
      { status: 400 }
    );
  }

  const supabase = createSupabaseDb();

  const update: Record<string, any> = { status: nextStatus };

  // Save free-text workgroup (only if provided)
  if (wg) update.workgroup = wg;

  const { error } = await supabase.from("break_in_requests").update(update).eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
