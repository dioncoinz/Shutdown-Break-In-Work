import { createSupabaseDb } from "@/lib/supabase/db";
import { recordRequestActivity } from "@/lib/request-activity";
import type { EmailRequestType } from "@/lib/email/tracking";

type RequestTable = "break_in_requests" | "late_work_requests" | "work_removal_requests";

type EditableRequestRow = {
  id: string;
  shutdown_id: string | null;
  wo_number: string;
  wo_title: string | null;
  reason: string | null;
  consequence: string | null;
  area: string | null;
  priority: string | null;
  workgroup: string | null;
  requestor_name: string | null;
  requestor_email: string | null;
};

const EDITABLE_FIELDS = [
  "requestor_name",
  "requestor_email",
  "wo_number",
  "wo_title",
  "area",
  "priority",
  "workgroup",
  "reason",
  "consequence",
] as const;

export async function updateRequestDetails(input: {
  actor: string;
  form: FormData;
  id: string;
  requestType: EmailRequestType;
  table: RequestTable;
}) {
  const supabase = createSupabaseDb();
  const { data: existing, error: loadError } = await supabase
    .from(input.table)
    .select("id, shutdown_id, wo_number, wo_title, reason, consequence, area, priority, workgroup, requestor_name, requestor_email")
    .eq("id", input.id)
    .single();

  if (loadError || !existing) {
    throw new Error(loadError?.message || "Request not found.");
  }

  const current = existing as EditableRequestRow;
  const update = Object.fromEntries(
    EDITABLE_FIELDS.map((field) => [field, cleanField(input.form.get(field))]),
  ) as Record<(typeof EDITABLE_FIELDS)[number], string | null>;

  if (!update.wo_number) {
    throw new Error("WO number is required.");
  }

  const changedFields = EDITABLE_FIELDS.filter((field) => normalize(current[field]) !== normalize(update[field]));

  if (changedFields.length === 0) {
    return { changed: false };
  }

  const { error: updateError } = await supabase
    .from(input.table)
    .update(update)
    .eq("id", input.id);

  if (updateError) {
    throw new Error(updateError.message);
  }

  await recordRequestActivity({
    action: "Details edited",
    actor: input.actor,
    details: `Updated ${changedFields.map(formatFieldLabel).join(", ")} for WO ${update.wo_number}.`,
    request_id: input.id,
    request_type: input.requestType,
    shutdown_id: current.shutdown_id,
  });

  return { changed: true };
}

export async function reopenRejectedRequest(input: {
  actor: string;
  id: string;
  requestType: EmailRequestType;
  table: RequestTable;
}) {
  const supabase = createSupabaseDb();
  const { data: existing, error: loadError } = await supabase
    .from(input.table)
    .select("id, shutdown_id, wo_number, status")
    .eq("id", input.id)
    .single();

  if (loadError || !existing) {
    throw new Error(loadError?.message || "Request not found.");
  }

  const row = existing as { shutdown_id: string | null; status: string | null; wo_number: string };
  if (row.status !== "REJECTED") {
    throw new Error("Only rejected requests can be reopened.");
  }

  const reset: Record<string, string | null> = {
    coordinator_comment: null,
    coordinator_decided_at: null,
    coordinator_decided_by: null,
    planner_comment: null,
    planner_decided_at: null,
    planner_decided_by: null,
    status: "SUBMITTED",
    superintendent_comment: null,
    superintendent_decided_at: null,
    superintendent_decided_by: null,
  };

  if (input.table !== "late_work_requests") {
    reset.manager_comment = null;
    reset.manager_decided_at = null;
    reset.manager_decided_by = null;
  }

  const { error: updateError } = await supabase
    .from(input.table)
    .update(reset)
    .eq("id", input.id);

  if (updateError) {
    throw new Error(updateError.message);
  }

  await recordRequestActivity({
    action: "Request reopened",
    actor: input.actor,
    details: `Reopened rejected WO ${row.wo_number} for review.`,
    request_id: input.id,
    request_type: input.requestType,
    shutdown_id: row.shutdown_id,
  });
}

function cleanField(value: FormDataEntryValue | null) {
  const text = String(value || "").trim();
  return text ? text : null;
}

function normalize(value: string | null | undefined) {
  return String(value || "").trim();
}

function formatFieldLabel(field: string) {
  return field
    .split("_")
    .map((part) => part.slice(0, 1).toUpperCase() + part.slice(1))
    .join(" ");
}
