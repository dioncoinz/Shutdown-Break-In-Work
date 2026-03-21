import { createSupabaseDb } from "@/lib/supabase/db";
import { BreakInRequestRecord } from "@/lib/break-in/workflow";

export async function getBreakInRequestById(id: string) {
  const supabase = createSupabaseDb();

  const { data, error } = await supabase
    .from("break_in_requests")
    .select(
      "id, wo_number, wo_title, reason, consequence, area, priority, workgroup, status, requestor_name, requestor_email, planner_comment, coordinator_comment, superintendent_comment, manager_comment"
    )
    .eq("id", id)
    .single();

  if (error || !data) {
    return { request: null, error: error?.message || "Request not found" };
  }

  return { request: data as BreakInRequestRecord, error: null };
}
