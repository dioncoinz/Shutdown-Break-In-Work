import { createSupabaseDb } from "@/lib/supabase/db";
import { LateWorkRequestRecord } from "@/lib/late-work/workflow";

export async function getLateWorkRequestById(id: string) {
  const supabase = createSupabaseDb();

  const { data, error } = await supabase
    .from("late_work_requests")
    .select(
      "id, shutdown_id, wo_number, wo_title, reason, consequence, area, priority, workgroup, status, requestor_name, requestor_email, planner_comment, coordinator_comment, superintendent_comment, planner_decided_by, planner_decided_at, coordinator_decided_by, coordinator_decided_at, superintendent_decided_by, superintendent_decided_at"
    )
    .eq("id", id)
    .single();

  if (error || !data) {
    return { request: null, error: error?.message || "Request not found" };
  }

  return { request: data as LateWorkRequestRecord, error: null };
}
