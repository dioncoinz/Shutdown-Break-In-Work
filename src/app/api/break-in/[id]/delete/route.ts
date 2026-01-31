import { NextResponse } from "next/server";
import { createSupabaseDb } from "@/lib/supabase/db";

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  const supabase = createSupabaseDb();

  const { error } = await supabase
    .from("break_in_requests")
    .delete()
    .eq("id", params.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
