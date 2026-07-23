import { createSupabaseDb } from "@/lib/supabase/db";
import type { ApprovalStage } from "@/lib/auth/approval-permissions";

export type OutstandingApproval = {
  id: string;
  requestType: "emergent" | "late_work" | "work_removal";
  requestTypeLabel: string;
  href: string;
  createdAt: string;
  woNumber: string;
  woTitle: string | null;
  area: string | null;
  status: ApprovalStage;
  requestorName: string | null;
};

type ApprovalRow = {
  id: string;
  created_at: string;
  wo_number: string;
  wo_title: string | null;
  area: string | null;
  status: string;
  requestor_name: string | null;
};

const ALL_APPROVAL_STAGES: ApprovalStage[] = [
  "SUBMITTED",
  "COORD_REVIEW",
  "SUPER_REVIEW",
  "MANAGER_REVIEW",
];

const ROLE_STAGE: Record<string, ApprovalStage | undefined> = {
  planner: "SUBMITTED",
  coordinator: "COORD_REVIEW",
  superintendent: "SUPER_REVIEW",
  manager: "MANAGER_REVIEW",
};

const REQUEST_SELECT = "id, created_at, wo_number, wo_title, area, status, requestor_name";

export function getApprovalStagesForRole(role: string) {
  const normalizedRole = role.trim().toLowerCase();
  if (normalizedRole === "admin") return ALL_APPROVAL_STAGES;
  const stage = ROLE_STAGE[normalizedRole];
  return stage ? [stage] : [];
}

export async function getOutstandingApprovalCount(role: string) {
  const stages = getApprovalStagesForRole(role);
  if (stages.length === 0) return 0;

  const supabase = createSupabaseDb();
  const results = await Promise.all([
    supabase.from("break_in_requests").select("id", { count: "exact", head: true }).in("status", stages),
    supabase.from("late_work_requests").select("id", { count: "exact", head: true }).in("status", stages),
    supabase.from("work_removal_requests").select("id", { count: "exact", head: true }).in("status", stages),
  ]);

  if (results.some((result) => result.error)) return 0;
  return results.reduce((sum, result) => sum + (result.count ?? 0), 0);
}

export async function listOutstandingApprovals(role: string) {
  const stages = getApprovalStagesForRole(role);
  if (stages.length === 0) return [] as OutstandingApproval[];

  const supabase = createSupabaseDb();
  const [emergent, lateWork, workRemoval] = await Promise.all([
    supabase.from("break_in_requests").select(REQUEST_SELECT).in("status", stages).order("created_at", { ascending: true }),
    supabase.from("late_work_requests").select(REQUEST_SELECT).in("status", stages).order("created_at", { ascending: true }),
    supabase.from("work_removal_requests").select(REQUEST_SELECT).in("status", stages).order("created_at", { ascending: true }),
  ]);

  const firstError = [emergent.error, lateWork.error, workRemoval.error].find(Boolean);
  if (firstError) throw new Error(firstError.message);

  return [
    ...mapRows((emergent.data ?? []) as ApprovalRow[], "emergent", "Emergent Work", "/break-in"),
    ...mapRows((lateWork.data ?? []) as ApprovalRow[], "late_work", "Late Work", "/late-work"),
    ...mapRows((workRemoval.data ?? []) as ApprovalRow[], "work_removal", "Work Removal", "/work-removal"),
  ].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
}

function mapRows(
  rows: ApprovalRow[],
  requestType: OutstandingApproval["requestType"],
  requestTypeLabel: string,
  path: string,
): OutstandingApproval[] {
  return rows.map((row) => ({
    id: row.id,
    requestType,
    requestTypeLabel,
    href: `${path}/${row.id}`,
    createdAt: row.created_at,
    woNumber: row.wo_number,
    woTitle: row.wo_title,
    area: row.area,
    status: row.status as ApprovalStage,
    requestorName: row.requestor_name,
  }));
}
