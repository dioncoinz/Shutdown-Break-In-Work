import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { notifyStageApprovers } from "@/lib/email/notifications";
import { getSessionTokenParts, SESSION_COOKIE } from "@/lib/auth/session";
import type { BreakInRequestRecord } from "@/lib/break-in/workflow";
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
      photo_name?: string;
      photo_data_url?: string;
      resources?: ResourceLine[];
    };

    console.log("Create route started", {
      wo_number: body.wo_number,
      requestor_email: body.requestor_email,
      resources: Array.isArray(body.resources) ? body.resources.length : 0,
    });

    if (!body.wo_number || !body.reason || !body.consequence) {
      return NextResponse.json(
        { error: "Missing required fields (wo_number, reason, consequence)" },
        { status: 400 }
      );
    }

    const requestorEmailRaw = body.requestor_email?.trim().toLowerCase() || "";
    const requestorEmail =
      requestorEmailRaw && requestorEmailRaw.includes("@") ? requestorEmailRaw : null;

    const photoName = body.photo_name?.trim() || null;
    const photoDataUrl = body.photo_data_url?.trim() || null;

    if (photoDataUrl && !photoDataUrl.startsWith("data:image/")) {
      return NextResponse.json({ error: "Photo must be an image" }, { status: 400 });
    }

    if (photoDataUrl && photoDataUrl.length > 5_000_000) {
      return NextResponse.json(
        { error: "Photo is too large. Please use a smaller image." },
        { status: 400 }
      );
    }

    const supabase = createSupabaseDb();
    console.log("Create route inserting header");

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
        requestor_email: requestorEmail,
        photo_name: photoName,
        photo_data_url: photoDataUrl,
        status: "SUBMITTED",
      })
      .select(
        "id, wo_number, wo_title, reason, consequence, area, priority, workgroup, status, requestor_name, requestor_email"
      )
      .single();

    if (headerErr || !header?.id) {
      console.error("Create route header insert failed", headerErr);
      return NextResponse.json(
        { error: headerErr?.message || "Failed to create request" },
        { status: 500 }
      );
    }

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
      console.log("Create route inserting resources", { count: cleanLines.length });
      const { error: linesErr } = await supabase
        .from("break_in_resources")
        .insert(cleanLines);

      if (linesErr) {
        console.error("Create route resource insert failed", linesErr);
        return NextResponse.json(
          { error: `Header created, but resources failed: ${linesErr.message}` },
          { status: 500 }
        );
      }
    }

    const cookieStore = await cookies();
    const actor =
      getSessionTokenParts(cookieStore.get(SESSION_COOKIE)?.value)?.email ||
      requestorEmail ||
      body.requestor_name?.trim() ||
      "Unknown";
    const request = header as BreakInRequestRecord;

    let emailWarning: string | undefined;
    const emailDebug: {
      attempted: boolean;
      sent: boolean;
      providerId?: string;
      reason?: string;
    } = emailResultPlaceholder();

    console.log("Create route sending stage email", { requestId: header.id });
    const emailResult = await notifyStageApprovers(request, "SUBMITTED", actor).catch((error) => ({
      attempted: true,
      sent: false,
      providerId: undefined,
      reason: error instanceof Error ? error.message : "Unknown email failure",
    }));
    emailDebug.attempted = emailResult.attempted;
    emailDebug.sent = emailResult.sent;
    emailDebug.providerId = emailResult.providerId;
    emailDebug.reason = emailResult.reason;

    if (!emailResult.sent) {
      emailWarning = emailResult.reason;
      console.error("Failed to send submitted notification:", emailResult.reason);
    }

    return NextResponse.json({ ok: true, id: header.id, emailWarning, emailDebug });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown create route failure";
    console.error("Create route crashed", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function emailResultPlaceholder() {
  return {
    attempted: false,
    sent: false,
    providerId: undefined as string | undefined,
    reason: undefined as string | undefined,
  };
}
