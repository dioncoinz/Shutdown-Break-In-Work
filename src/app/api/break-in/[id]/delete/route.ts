import { NextResponse } from "next/server";
import { createSupabaseDb } from "@/lib/supabase/db";

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const supabase = createSupabaseDb();

  const { error: resourceError } = await supabase
    .from("break_in_resources")
    .delete()
    .eq("request_id", id);

  if (resourceError) {
    return NextResponse.json({ error: resourceError.message }, { status: 500 });
  }

  const { error } = await supabase
    .from("break_in_requests")
    .delete()
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
