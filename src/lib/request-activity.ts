import { createSupabaseDb } from "@/lib/supabase/db";
import type { EmailActivityEvent, EmailRequestType } from "@/lib/email/tracking";

export type ActivityRequestType = EmailRequestType | "admin";

export type RequestActivityEvent = {
  id: string;
  created_at: string;
  request_type: ActivityRequestType;
  action: string;
  actor: string | null;
  details: string | null;
};

export type DashboardActivityEvent = {
  id: string;
  created_at: string;
  request_type: ActivityRequestType;
  action: string;
  actor: string | null;
  details: string;
  recipient_count: number | null;
};

export async function recordRequestActivity(input: {
  action: string;
  actor?: string | null;
  details?: string | null;
  request_id: string;
  request_type: EmailRequestType;
  shutdown_id?: string | null;
}) {
  if (!input.shutdown_id) {
    return;
  }

  const supabase = createSupabaseDb();
  const { error } = await supabase.from("request_activity_events").insert({
    action: input.action,
    actor: input.actor || null,
    details: input.details || null,
    request_id: input.request_id,
    request_type: input.request_type,
    shutdown_id: input.shutdown_id,
  });

  if (error && !isMissingActivityTableError(error.message)) {
    console.warn("Failed to record request activity", {
      action: input.action,
      requestId: input.request_id,
      requestType: input.request_type,
      shutdownId: input.shutdown_id,
      error: error.message,
    });
  }
}

export async function listRequestActivityForShutdown(
  shutdownId: string | null | undefined,
  limit = 8,
) {
  if (!shutdownId) {
    return [] as RequestActivityEvent[];
  }

  const supabase = createSupabaseDb();
  const { data, error } = await supabase
    .from("request_activity_events")
    .select("id, created_at, request_type, action, actor, details")
    .eq("shutdown_id", shutdownId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    if (isMissingActivityTableError(error.message)) {
      return [] as RequestActivityEvent[];
    }

    throw new Error(error.message);
  }

  return (data ?? []).map((row) => ({
    id: String(row.id),
    created_at: String(row.created_at),
    request_type: row.request_type as EmailRequestType,
    action: String(row.action || "Activity"),
    actor: row.actor ? String(row.actor) : null,
    details: row.details ? String(row.details) : null,
  }));
}

export function mergeDashboardActivity(input: {
  emails: EmailActivityEvent[];
  requestActivity: RequestActivityEvent[];
  limit?: number;
}) {
  return [
    ...input.emails.map((event): DashboardActivityEvent => ({
      id: `email-${event.id}`,
      created_at: event.created_at,
      request_type: event.request_type,
      action: "Email sent",
      actor: null,
      details: event.subject || "Notification email sent",
      recipient_count: event.recipient_count,
    })),
    ...input.requestActivity.map((event): DashboardActivityEvent => ({
      id: `request-${event.id}`,
      created_at: event.created_at,
      request_type: event.request_type,
      action: event.action,
      actor: event.actor,
      details: event.details || event.action,
      recipient_count: null,
    })),
  ]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, input.limit ?? 8);
}

function isMissingActivityTableError(message: string) {
  return (
    message.includes("Could not find the table") ||
    (message.includes("relation") && message.includes("does not exist"))
  );
}
