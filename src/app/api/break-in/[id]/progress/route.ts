import { NextResponse } from "next/server";
import { createSupabaseDb } from "@/lib/supabase/db";


export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = createSupabaseDb();

  const body = await req.json();
  let progress = Number(body.progress_percent);

  if (!Number.isFinite(progress)) progress = 0;
  progress = Math.max(0, Math.min(100, Math.round(progress)));

  const nextStatus = progress >= 100 ? "COMPLETED" : "IN_PROGRESS";

  const { error } = await supabase
    .from("break_in_requests")
    .update({
      progress_percent: progress,
      status: nextStatus,
    })
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, progress_percent: progress, status: nextStatus });
}
