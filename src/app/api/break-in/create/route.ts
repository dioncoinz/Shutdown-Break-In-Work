import { NextResponse } from "next/server";
import { createSupabaseDb } from "@/lib/supabase/db";


type ResourceLine = { resource_type: string; hours: number };

export async function POST(req: Request) {
  const body = (await req.json()) as {
  wo_number: string;
  wo_title: string;
  reason: string;
  consequence: string;
  area?: string;
    priority?: string;
    requestor_name?: string;
    requestor_email?: string;
    resources?: ResourceLine[];
  };

  // Basic validation
  if (!body.wo_number || !body.reason || !body.consequence) {
    return NextResponse.json(
      { error: "Missing required fields (wo_number, reason, consequence)" },
      { status: 400 }
    );
  }

  const supabase = createSupabaseDb();

  // 1) Insert header
  const { data: header, error: headerErr } = await supabase
    .from("break_in_requests")
    .insert({
      wo_number: body.wo_number,
      wo_title: body.wo_title,
      reason: body.reason,
      consequence: body.consequence,
      area: body.area ?? null,
      priority: body.priority ?? "P2",
      requestor_name: body.requestor_name ?? "Unknown",
      requestor_email: body.requestor_email ?? "unknown@unknown",
      status: "SUBMITTED",
    })
    .select("id")
    .single();

  if (headerErr || !header?.id) {
    return NextResponse.json(
      { error: headerErr?.message || "Failed to create request" },
      { status: 500 }
    );
  }

  // 2) Insert resource lines
  const resources = Array.isArray(body.resources) ? body.resources : [];
  const cleanLines = resources
    .filter((r) => r?.resource_type && Number.isFinite(r?.hours))
    .map((r) => ({
      request_id: header.id,
      resource_type: String(r.resource_type).trim(),
      hours: Number(r.hours),
    }))
    .filter((r) => r.resource_type && r.hours > 0);

  if (cleanLines.length > 0) {
    const { error: linesErr } = await supabase
      .from("break_in_resources")
      .insert(cleanLines);

    if (linesErr) {
      return NextResponse.json(
        { error: `Header created, but resources failed: ${linesErr.message}` },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({ ok: true, id: header.id });
}
