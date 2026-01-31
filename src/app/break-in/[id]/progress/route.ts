import { NextResponse } from "next/server";
import { createSupabaseDb } from "@/lib/supabase/db";


export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;

  const body = (await req.json().catch(() => ({}))) as {
    progress_percent?: number;
    status?: string;
  };

  const progress = Number(body.progress_percent ?? 0);
  const progress_percent = Math.max(0, Math.min(100, Math.round(progress)));

  const update: Record<string, any> = { progress_percent };

  // Optional status change
  if (body.status && typeof body.status === "string") {
    update.status = body.status;
  } else {
    // Helpful auto-status: if they move the slider >0, mark in progress (unless already completed/rejected)
    // (comment this block out if you want manual only)
    // update.status = undefined;
  }

  const supabase = createSupabaseDb();
  const { error } = await supabase.from("break_in_requests").update(update).eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
