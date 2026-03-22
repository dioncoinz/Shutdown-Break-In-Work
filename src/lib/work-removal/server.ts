import { createSupabaseDb } from "@/lib/supabase/db";
import { WorkRemovalRequestRecord } from "@/lib/work-removal/workflow";

export async function getWorkRemovalRequestById(id: string) {
  const supabase = createSupabaseDb();

  const { data, error } = await supabase
    .from("work_removal_requests")
    .select(
      "id, wo_number, wo_title, reason, consequence, area, priority, workgroup, status, requestor_name, requestor_email, planner_comment, coordinator_comment, superintendent_comment, manager_comment"
    )
    .eq("id", id)
    .single();

  if (error || !data) {
    return { request: null, error: error?.message || "Request not found" };
  }

  return { request: data as WorkRemovalRequestRecord, error: null };
}
