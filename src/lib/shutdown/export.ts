import { createSupabaseDb } from "@/lib/supabase/db";

type RequestExportRow = {
  id: string;
  created_at: string;
  wo_number: string;
  wo_title: string | null;
  status: string | null;
  requestor_name: string | null;
  reason: string | null;
};

type ResourceExportRow = { request_id: string; hours: number | string };

type CombinedExportRow = {
  type: "Late" | "Emergent" | "Removed";
  wo: string;
  title: string | null;
  status: string | null;
  hours: number;
  requestor: string | null;
  reason: string | null;
  createdAt: string;
};

const exportColumns: Array<[keyof Omit<CombinedExportRow, "createdAt">, string]> = [
  ["type", "Type of request"],
  ["wo", "WO"],
  ["title", "Title"],
  ["status", "Status"],
  ["hours", "Hours"],
  ["requestor", "Requestor"],
  ["reason", "Reason"],
];

export async function buildShutdownExcelHtml(shutdownId?: string) {
  const supabase = createSupabaseDb();
  const select = "id, created_at, wo_number, wo_title, status, requestor_name, reason";
  const requestQuery = (table: string) => {
    let query = supabase.from(table).select(select).order("created_at", { ascending: false });
    if (shutdownId) query = query.eq("shutdown_id", shutdownId);
    return query;
  };

  const [emergentResult, lateResult, removedResult] = await Promise.all([
    requestQuery("break_in_requests"),
    requestQuery("late_work_requests"),
    requestQuery("work_removal_requests"),
  ]);
  const firstError = emergentResult.error || lateResult.error || removedResult.error;
  if (firstError) throw new Error(firstError.message);

  const emergent = (emergentResult.data ?? []) as RequestExportRow[];
  const late = (lateResult.data ?? []) as RequestExportRow[];
  const removed = (removedResult.data ?? []) as RequestExportRow[];
  const [emergentHours, lateHours, removedHours] = await Promise.all([
    loadHours("break_in_resources", emergent.map((row) => row.id)),
    loadHours("late_work_resources", late.map((row) => row.id)),
    loadHours("work_removal_resources", removed.map((row) => row.id)),
  ]);

  const rows = [
    ...combineRows("Emergent", emergent, emergentHours),
    ...combineRows("Late", late, lateHours),
    ...combineRows("Removed", removed, removedHours),
  ].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return [
    "<!doctype html>",
    '<html><head><meta charset="utf-8" />',
    '<style>table{border-collapse:collapse}th{background:#f3f4f6;font-weight:bold}th,td{border:1px solid #d1d5db;padding:6px 10px;text-align:left;vertical-align:top}td{mso-number-format:"\\@"}</style>',
    "</head><body>",
    tableHtml(rows),
    "</body></html>",
  ].join("");

  async function loadHours(table: string, requestIds: string[]) {
    const hoursById = new Map<string, number>();
    if (requestIds.length === 0) return hoursById;
    const result = await supabase.from(table).select("request_id, hours").in("request_id", requestIds);
    if (result.error) throw new Error(result.error.message);
    for (const resource of (result.data ?? []) as ResourceExportRow[]) {
      hoursById.set(resource.request_id, round1((hoursById.get(resource.request_id) ?? 0) + (Number(resource.hours) || 0)));
    }
    return hoursById;
  }
}

function combineRows(type: CombinedExportRow["type"], requests: RequestExportRow[], hoursById: Map<string, number>) {
  return requests.map((request): CombinedExportRow => ({
    type,
    wo: request.wo_number,
    title: request.wo_title,
    status: request.status,
    hours: hoursById.get(request.id) ?? 0,
    requestor: request.requestor_name,
    reason: request.reason,
    createdAt: request.created_at,
  }));
}

function tableHtml(rows: CombinedExportRow[]) {
  return [
    '<table border="1"><thead><tr>',
    exportColumns.map(([, label]) => `<th>${escapeHtml(label)}</th>`).join(""),
    "</tr></thead><tbody>",
    rows.length > 0
      ? rows.map((row) => `<tr>${exportColumns.map(([key]) => `<td>${escapeHtml(formatCell(row[key]))}</td>`).join("")}</tr>`).join("")
      : `<tr><td colspan="${exportColumns.length}">No requests found for this shutdown.</td></tr>`,
    "</tbody></table>",
  ].join("");
}

function round1(value: number) {
  return Math.round(value * 10) / 10;
}

function formatCell(value: unknown) {
  if (value === null || value === undefined) return "";
  return String(value);
}

function escapeHtml(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}
