import { createSupabaseDb } from "@/lib/supabase/db";

export type EmailRequestType = "emergent" | "late_work" | "work_removal";

export type EmailActivityEvent = {
  id: string;
  created_at: string;
  request_type: EmailRequestType;
  subject: string | null;
  recipient_count: number;
};

export async function recordEmailSent(input: {
  provider_id?: string;
  recipient_count: number;
  request_id: string;
  request_type: EmailRequestType;
  shutdown_id?: string | null;
  subject: string;
}) {
  if (!input.shutdown_id || input.recipient_count <= 0) {
    return;
  }

  const supabase = createSupabaseDb();
  const { error } = await supabase.from("email_events").insert({
    provider_id: input.provider_id || null,
    recipient_count: input.recipient_count,
    request_id: input.request_id,
    request_type: input.request_type,
    shutdown_id: input.shutdown_id,
    subject: input.subject,
  });

  if (error) {
    console.warn("Failed to record email event", {
      requestId: input.request_id,
      requestType: input.request_type,
      shutdownId: input.shutdown_id,
      error: error.message,
    });
  }
}

export async function getEmailSavingsForShutdown(shutdownId: string | null | undefined) {
  if (!shutdownId) {
    return { emailsSent: 0, events: 0 };
  }

  const supabase = createSupabaseDb();
  const { data, error } = await supabase
    .from("email_events")
    .select("recipient_count")
    .eq("shutdown_id", shutdownId);

  if (error) {
    if (isMissingEmailEventsTableError(error.message)) {
      return { emailsSent: 0, events: 0 };
    }

    throw new Error(error.message);
  }

  return {
    emailsSent: (data ?? []).reduce((sum, row) => sum + (Number(row.recipient_count) || 0), 0),
    events: data?.length ?? 0,
  };
}

export async function listEmailActivityForShutdown(
  shutdownId: string | null | undefined,
  limit = 8,
) {
  if (!shutdownId) {
    return [] as EmailActivityEvent[];
  }

  const supabase = createSupabaseDb();
  const { data, error } = await supabase
    .from("email_events")
    .select("id, created_at, request_type, subject, recipient_count")
    .eq("shutdown_id", shutdownId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    if (isMissingEmailEventsTableError(error.message)) {
      return [] as EmailActivityEvent[];
    }

    throw new Error(error.message);
  }

  return (data ?? []).map((row) => ({
    id: String(row.id),
    created_at: String(row.created_at),
    request_type: row.request_type as EmailRequestType,
    subject: row.subject ? String(row.subject) : null,
    recipient_count: Number(row.recipient_count) || 0,
  }));
}

function isMissingEmailEventsTableError(message: string) {
  return (
    message.includes("Could not find the table") ||
    (message.includes("relation") && message.includes("does not exist"))
  );
}
