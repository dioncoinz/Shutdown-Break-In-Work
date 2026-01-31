import { NextResponse } from "next/server";
import { createSupabaseDb } from "@/lib/supabase/db";

export async function POST(req: Request) {
  const body = (await req.json()) as { id?: string };

  if (!body?.id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const supabase = createSupabaseDb();

  const { error } = await supabase
    .from("break_in_requests")
    .update({ status: "IN_PROGRESS" })
    .eq("id", body.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
