import { NextResponse } from "next/server";
import { createSupabaseDb } from "../../../../../lib/supabase/db";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = createSupabaseDb();

  const { error } = await supabase
    .from("break_in_requests")
    .update({
      status: "COMPLETED",
      progress_percent: 100,
    })
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
