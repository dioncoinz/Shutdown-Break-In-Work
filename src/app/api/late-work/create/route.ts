import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { notifyLateWorkStageApprovers } from "@/lib/email/late-work-notifications";
import { getSessionTokenParts, SESSION_COOKIE } from "@/lib/auth/session";
import type { LateWorkRequestRecord } from "@/lib/late-work/workflow";
import { createSupabaseDb } from "@/lib/supabase/db";

type ResourceLine = { resource_type: string; hours: number };

export async function POST(req: Request) {
  try {
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

    if (!body.wo_number || !body.reason || !body.consequence) {
      return NextResponse.json(
        { error: "Missing required fields (wo_number, reason, consequence)" },
        { status: 400 }
      );
    }

    const requestorEmailRaw = body.requestor_email?.trim().toLowerCase() || "";
    const requestorEmail =
      requestorEmailRaw && requestorEmailRaw.includes("@") ? requestorEmailRaw : null;

    const resources = Array.isArray(body.resources) ? body.resources : [];
    const cleanLinesInput = resources
      .filter((r) => r?.resource_type && Number.isFinite(r?.hours))
      .map((r) => ({
        resource_type: String(r.resource_type).trim(),
        hours: Number(r.hours),
      }))
      .filter((r) => r.resource_type && r.hours > 0);

    if (cleanLinesInput.length === 0 || cleanLinesInput.length !== resources.length) {
      return NextResponse.json(
        { error: "At least one late work resource is required, and each line must include hours greater than 0." },
        { status: 400 }
      );
    }

    const supabase = createSupabaseDb();

    const { data: header, error: headerErr } = await supabase
      .from("late_work_requests")
      .insert({
        wo_number: body.wo_number,
        wo_title: body.wo_title,
        reason: body.reason,
        consequence: body.consequence,
        area: body.area ?? null,
        priority: body.priority ?? "P2",
        requestor_name: body.requestor_name ?? "Unknown",
        requestor_email: requestorEmail,
        status: "SUBMITTED",
      })
      .select(
        "id, wo_number, wo_title, reason, consequence, area, priority, workgroup, status, requestor_name, requestor_email"
      )
      .single();

    if (headerErr || !header?.id) {
      return NextResponse.json(
        { error: headerErr?.message || "Failed to create request" },
        { status: 500 }
      );
    }

    const cleanLines = cleanLinesInput.map((r) => ({
        request_id: header.id,
        resource_type: r.resource_type,
        hours: r.hours,
      }));

    const { error: linesErr } = await supabase.from("late_work_resources").insert(cleanLines);

    if (linesErr) {
      return NextResponse.json(
        { error: `Header created, but resources failed: ${linesErr.message}` },
        { status: 500 }
      );
    }

    const cookieStore = await cookies();
    const actor =
      getSessionTokenParts(cookieStore.get(SESSION_COOKIE)?.value)?.email ||
      requestorEmail ||
      body.requestor_name?.trim() ||
      "Unknown";
    const request = header as LateWorkRequestRecord;

    let emailWarning: string | undefined;
    const emailResult = await notifyLateWorkStageApprovers(request, "SUBMITTED", actor).catch((error) => ({
      attempted: true,
      sent: false,
      providerId: undefined,
      reason: error instanceof Error ? error.message : "Unknown email failure",
    }));

    if (!emailResult.sent) {
      emailWarning = emailResult.reason;
    }

    return NextResponse.json({ ok: true, id: header.id, emailWarning });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown create route failure";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
