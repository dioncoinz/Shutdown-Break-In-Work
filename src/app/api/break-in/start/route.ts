import { NextResponse } from "next/server";
import { createSupabaseDb } from "@/lib/supabase/db";


export async function POST(req: Request) {
  const { id } = (await req.json()) as { id?: string };

  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }
  const supabase = createSupabaseDb();

  // set status IN_PROGRESS; keep existing progress if already set, else 0
  const { data: existing, error: fetchErr } = await supabase
    .from("break_in_requests")
    .select("progress_percent")
    .eq("id", id)
    .single();

  if (fetchErr) {
    return NextResponse.json({ error: fetchErr.message }, { status: 500 });
  }

  const progress = existing?.progress_percent ?? 0;

  const { error } = await supabase
    .from("break_in_requests")
    .update({
      status: "IN_PROGRESS",
      progress_percent: progress,
    })
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
