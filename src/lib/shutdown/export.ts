import { createSupabaseDb } from "@/lib/supabase/db";

type BreakInRequestExportRow = {
  id: string;
  created_at: string;
  wo_number: string;
  wo_title: string | null;
  reason: string | null;
  consequence: string | null;
  area: string | null;
  priority: string | null;
  workgroup: string | null;
  photo_name: string | null;
  status: string | null;
  progress_percent: number | null;
  requestor_name: string | null;
  requestor_email: string | null;
  planner_comment: string | null;
  coordinator_comment: string | null;
  superintendent_comment: string | null;
  manager_comment: string | null;
  planner_decided_by: string | null;
  planner_decided_at: string | null;
  coordinator_decided_by: string | null;
  coordinator_decided_at: string | null;
  superintendent_decided_by: string | null;
  superintendent_decided_at: string | null;
  manager_decided_by: string | null;
  manager_decided_at: string | null;
};

type WorkRemovalRequestExportRow = Omit<
  BreakInRequestExportRow,
  "photo_name" | "progress_percent"
>;

type LateWorkRequestExportRow = Omit<
  BreakInRequestExportRow,
  | "photo_name"
  | "progress_percent"
  | "manager_comment"
  | "manager_decided_by"
  | "manager_decided_at"
>;

type ResourceExportRow = {
  id: string;
  request_id: string;
  resource_type: string;
  hours: number | string;
};

const breakInColumns: Array<[keyof BreakInRequestExportRow, string]> = [
  ["created_at", "Created at"],
  ["wo_number", "WO number"],
  ["wo_title", "WO title"],
  ["reason", "Reason"],
  ["consequence", "Consequence"],
  ["area", "Area"],
  ["priority", "Priority"],
  ["workgroup", "Workgroup"],
  ["status", "Status"],
  ["progress_percent", "Progress percent"],
  ["requestor_name", "Requestor name"],
  ["requestor_email", "Requestor email"],
  ["photo_name", "Photo name"],
  ["planner_comment", "Planner comment"],
  ["planner_decided_by", "Planner decided by"],
  ["planner_decided_at", "Planner decided at"],
  ["coordinator_comment", "Coordinator comment"],
  ["coordinator_decided_by", "Coordinator decided by"],
  ["coordinator_decided_at", "Coordinator decided at"],
  ["superintendent_comment", "Superintendent comment"],
  ["superintendent_decided_by", "Superintendent decided by"],
  ["superintendent_decided_at", "Superintendent decided at"],
  ["manager_comment", "Manager comment"],
  ["manager_decided_by", "Manager decided by"],
  ["manager_decided_at", "Manager decided at"],
];

const removalColumns: Array<[keyof WorkRemovalRequestExportRow, string]> = [
  ["created_at", "Created at"],
  ["wo_number", "WO number"],
  ["wo_title", "WO title"],
  ["reason", "Reason"],
  ["consequence", "Consequence"],
  ["area", "Area"],
  ["priority", "Priority"],
  ["workgroup", "Workgroup"],
  ["status", "Status"],
  ["requestor_name", "Requestor name"],
  ["requestor_email", "Requestor email"],
  ["planner_comment", "Planner comment"],
  ["planner_decided_by", "Planner decided by"],
  ["planner_decided_at", "Planner decided at"],
  ["coordinator_comment", "Coordinator comment"],
  ["coordinator_decided_by", "Coordinator decided by"],
  ["coordinator_decided_at", "Coordinator decided at"],
  ["superintendent_comment", "Superintendent comment"],
  ["superintendent_decided_by", "Superintendent decided by"],
  ["superintendent_decided_at", "Superintendent decided at"],
  ["manager_comment", "Manager comment"],
  ["manager_decided_by", "Manager decided by"],
  ["manager_decided_at", "Manager decided at"],
];

const lateWorkColumns: Array<[keyof LateWorkRequestExportRow, string]> = [
  ["created_at", "Created at"],
  ["wo_number", "WO number"],
  ["wo_title", "WO title"],
  ["reason", "Reason"],
  ["consequence", "Consequence"],
  ["area", "Area"],
  ["priority", "Priority"],
  ["workgroup", "Workgroup"],
  ["status", "Status"],
  ["requestor_name", "Requestor name"],
  ["requestor_email", "Requestor email"],
  ["planner_comment", "Planner comment"],
  ["planner_decided_by", "Planner decided by"],
  ["planner_decided_at", "Planner decided at"],
  ["coordinator_comment", "Coordinator comment"],
  ["coordinator_decided_by", "Coordinator decided by"],
  ["coordinator_decided_at", "Coordinator decided at"],
  ["superintendent_comment", "Superintendent comment"],
  ["superintendent_decided_by", "Superintendent decided by"],
  ["superintendent_decided_at", "Superintendent decided at"],
];

const resourceColumns: Array<[keyof ResourceExportRow, string]> = [
  ["request_id", "Request ID"],
  ["resource_type", "Resource type"],
  ["hours", "Hours"],
];

export async function buildShutdownExcelHtml() {
  const supabase = createSupabaseDb();

  const [
    breakInRequests,
    breakInResources,
    removalRequests,
    removalResources,
    lateWorkRequests,
    lateWorkResources,
  ] = await Promise.all([
    supabase
      .from("break_in_requests")
      .select(
        "id, created_at, wo_number, wo_title, reason, consequence, area, priority, workgroup, photo_name, status, progress_percent, requestor_name, requestor_email, planner_comment, coordinator_comment, superintendent_comment, manager_comment, planner_decided_by, planner_decided_at, coordinator_decided_by, coordinator_decided_at, superintendent_decided_by, superintendent_decided_at, manager_decided_by, manager_decided_at"
      )
      .order("created_at", { ascending: false }),
    supabase
      .from("break_in_resources")
      .select("id, request_id, resource_type, hours")
      .order("resource_type", { ascending: true }),
    supabase
      .from("work_removal_requests")
      .select(
        "id, created_at, wo_number, wo_title, reason, consequence, area, priority, workgroup, status, requestor_name, requestor_email, planner_comment, coordinator_comment, superintendent_comment, manager_comment, planner_decided_by, planner_decided_at, coordinator_decided_by, coordinator_decided_at, superintendent_decided_by, superintendent_decided_at, manager_decided_by, manager_decided_at"
      )
      .order("created_at", { ascending: false }),
    supabase
      .from("work_removal_resources")
      .select("id, request_id, resource_type, hours")
      .order("resource_type", { ascending: true }),
    supabase
      .from("late_work_requests")
      .select(
        "id, created_at, wo_number, wo_title, reason, consequence, area, priority, workgroup, status, requestor_name, requestor_email, planner_comment, coordinator_comment, superintendent_comment, planner_decided_by, planner_decided_at, coordinator_decided_by, coordinator_decided_at, superintendent_decided_by, superintendent_decided_at"
      )
      .order("created_at", { ascending: false }),
    supabase
      .from("late_work_resources")
      .select("id, request_id, resource_type, hours")
      .order("resource_type", { ascending: true }),
  ]);

  const firstError =
    breakInRequests.error ||
    breakInResources.error ||
    removalRequests.error ||
    removalResources.error ||
    lateWorkRequests.error ||
    lateWorkResources.error;

  if (firstError) {
    throw new Error(firstError.message);
  }

  return [
    "<!doctype html>",
    '<html><head><meta charset="utf-8" /></head><body>',
    tableHtml(
      "Break-in Requests",
      (breakInRequests.data ?? []) as BreakInRequestExportRow[],
      breakInColumns
    ),
    tableHtml(
      "Break-in Resources",
      (breakInResources.data ?? []) as ResourceExportRow[],
      resourceColumns
    ),
    tableHtml(
      "Work Removal Requests",
      (removalRequests.data ?? []) as WorkRemovalRequestExportRow[],
      removalColumns
    ),
    tableHtml(
      "Work Removal Resources",
      (removalResources.data ?? []) as ResourceExportRow[],
      resourceColumns
    ),
    tableHtml(
      "Late Work Requests",
      (lateWorkRequests.data ?? []) as LateWorkRequestExportRow[],
      lateWorkColumns
    ),
    tableHtml(
      "Late Work Resources",
      (lateWorkResources.data ?? []) as ResourceExportRow[],
      resourceColumns
    ),
    "</body></html>",
  ].join("");
}

function tableHtml<T extends Record<string, unknown>>(
  title: string,
  rows: T[],
  columns: Array<[keyof T, string]>
) {
  return [
    `<h2>${escapeHtml(title)}</h2>`,
    '<table border="1">',
    "<thead><tr>",
    columns.map(([, label]) => `<th>${escapeHtml(label)}</th>`).join(""),
    "</tr></thead>",
    "<tbody>",
    rows.length > 0
      ? rows
          .map(
            (row) =>
              `<tr>${columns
                .map(([key]) => `<td>${escapeHtml(formatCell(row[key]))}</td>`)
                .join("")}</tr>`
          )
          .join("")
      : `<tr><td colspan="${columns.length}">No rows</td></tr>`,
    "</tbody></table><br />",
  ].join("");
}

function formatCell(value: unknown) {
  if (value === null || value === undefined) return "";
  if (typeof value === "number") return value.toString();
  return String(value);
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
