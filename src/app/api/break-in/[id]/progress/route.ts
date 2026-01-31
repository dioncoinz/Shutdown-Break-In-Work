import { NextResponse } from "next/server";
import { createSupabaseDb } from "@/lib/supabase/db";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { progress } = (await req.json()) as { progress?: number };

  if (typeof progress !== "number" || progress < 0 || progress > 100) {
    return NextResponse.json(
      { error: "Progress must be a number between 0 and 100" },
      { status: 400 }
    );
  }

  const supabase = createSupabaseDb();

  const { error } = await supabase
    .from("break_in_requests")
    .update({
      progress_percent: progress,
      status: progress >= 100 ? "COMPLETED" : "IN_PROGRESS",
    })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
