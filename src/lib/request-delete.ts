import { createSupabaseDb } from "@/lib/supabase/db";
import { recordRequestActivity } from "@/lib/request-activity";
import type { EmailRequestType } from "@/lib/email/tracking";

type RequestTable = "break_in_requests" | "late_work_requests" | "work_removal_requests";
type ResourceTable = "break_in_resources" | "late_work_resources" | "work_removal_resources";

type DeletableRequestRow = {
  id: string;
  shutdown_id: string | null;
  status: string | null;
  wo_number: string;
  wo_title: string | null;
};

export async function deleteRequestWithAudit(input: {
  actor: string;
  id: string;
  reason: string;
  requestType: EmailRequestType;
  resourceTable: ResourceTable;
  table: RequestTable;
}) {
  const reason = input.reason.trim();
  if (!reason) {
    throw new Error("A deletion reason is required.");
  }

  const supabase = createSupabaseDb();
  const { data: existing, error: loadError } = await supabase
    .from(input.table)
    .select("id, shutdown_id, status, wo_number, wo_title")
    .eq("id", input.id)
    .single();

  if (loadError || !existing) {
    throw new Error(loadError?.message || "Request not found.");
  }

  const row = existing as DeletableRequestRow;

  await recordRequestActivity({
    action: "Request deleted",
    actor: input.actor,
    details: `Deleted WO ${row.wo_number}${row.wo_title ? ` - ${row.wo_title}` : ""}. Reason: ${reason}`,
    request_id: input.id,
    request_type: input.requestType,
    shutdown_id: row.shutdown_id,
  });

  const { error: resourceError } = await supabase
    .from(input.resourceTable)
    .delete()
    .eq("request_id", input.id);

  if (resourceError) {
    throw new Error(resourceError.message);
  }

  const { error: deleteError } = await supabase
    .from(input.table)
    .delete()
    .eq("id", input.id);

  if (deleteError) {
    throw new Error(deleteError.message);
  }

  return row;
}
