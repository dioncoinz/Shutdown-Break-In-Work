import { NextResponse } from "next/server";
import { createSupabaseDb } from "@/lib/supabase/db";


export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const supabase = createSupabaseDb();

  // delete children first
  await supabase.from("break_in_resources").delete().eq("request_id", params.id);

  // then delete the request
  await supabase.from("break_in_requests").delete().eq("id", params.id);

  return NextResponse.json({ ok: true });
}

