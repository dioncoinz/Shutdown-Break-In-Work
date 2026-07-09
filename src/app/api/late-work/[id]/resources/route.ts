import { NextResponse } from "next/server";
import { createSupabaseDb } from "@/lib/supabase/db";
import { requireApiUser } from "@/lib/auth/current-user";

type ResourceLine = {
  id?: string;
  resource_type?: string;
  hours?: number;
};

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireApiUser();
  if (auth.response) return auth.response;

  const { id } = await params;
  const body = (await req.json()) as { resources?: ResourceLine[] };
  const resources = Array.isArray(body.resources) ? body.resources : [];

  if (resources.length === 0) {
    return NextResponse.json({ error: "At least one resource is required." }, { status: 400 });
  }

  const cleanResources = resources
    .map((resource) => ({
      resource_type: String(resource.resource_type || "").trim(),
      hours: Number(resource.hours),
    }))
    .filter((resource) => resource.resource_type);

  if (
    cleanResources.length === 0 ||
    cleanResources.some((resource) => !Number.isFinite(resource.hours) || resource.hours <= 0)
  ) {
    return NextResponse.json(
      { error: "Each resource must include a type and hours greater than 0." },
      { status: 400 }
    );
  }

  const supabase = createSupabaseDb();

  const { error: deleteError } = await supabase
    .from("late_work_resources")
    .delete()
    .eq("request_id", id);

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  const { error: insertError } = await supabase
    .from("late_work_resources")
    .insert(
      cleanResources.map((resource) => ({
        request_id: id,
        resource_type: resource.resource_type,
        hours: resource.hours,
      }))
    );

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
