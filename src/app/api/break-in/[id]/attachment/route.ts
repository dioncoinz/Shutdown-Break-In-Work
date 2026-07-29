import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth/current-user";
import { createSupabaseDb } from "@/lib/supabase/db";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireApiUser();
  if (auth.response) return auth.response;

  const { id } = await params;
  const supabase = createSupabaseDb();
  const { data, error } = await supabase
    .from("break_in_requests")
    .select("photo_name, photo_data_url")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "Request not found" }, { status: 404 });
  }

  return NextResponse.json({
    name: data.photo_name ?? null,
    dataUrl: data.photo_data_url ?? null,
  });
}
