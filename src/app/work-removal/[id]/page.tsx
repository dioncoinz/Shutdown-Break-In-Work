import Link from "next/link";
import { createSupabaseDb } from "@/lib/supabase/db";
import ResourcePlannerEditor from "../../../components/ResourcePlannerEditor";

type ReqRow = {
  id: string;
  created_at: string;
  wo_number: string;
  wo_title: string | null;
  reason: string | null;
  consequence: string | null;
  area: string | null;
  priority: string | null;
  workgroup: string | null;
  status: string | null;
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

type ResourceRow = {
  id: string;
  request_id: string;
  resource_type: string;
  hours: number;
};

async function loadRequestDetail(id: string) {
  const supabase = createSupabaseDb();

  const { data: req, error } = await supabase.from("work_removal_requests").select("*").eq("id", id).single();
  if (error || !req) {
    return { ok: false as const };
  }

  const { data: resRows } = await supabase
    .from("work_removal_resources")
    .select("id, request_id, resource_type, hours")
    .eq("request_id", id);

  return { ok: true as const, request: req as ReqRow, resources: (resRows ?? []) as ResourceRow[] };
}

function round1(n: number) {
  return Math.round((Number(n) || 0) * 10) / 10;
}

function statusColor(status: string) {
  if (status === "APPROVED") return "#d97706";
  if (status === "REJECTED") return "#dc2626";
  if (status === "MANAGER_REVIEW") return "#7c3aed";
  if (status === "SUPER_REVIEW") return "#a855f7";
  if (status === "COORD_REVIEW") return "#f59e0b";
  if (status === "SUBMITTED") return "#6b7280";
  return "#6b7280";
}

export default async function WorkRemovalDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const loaded = await loadRequestDetail(id);
  if (!loaded.ok) {
    return (
      <div style={{ padding: 24 }}>
        <Link href="/work-removal/dashboard">Back to dashboard</Link>
        <h1 style={{ marginTop: 12 }}>Request not found</h1>
      </div>
    );
  }

  const request = loaded.request;
  const resources = loaded.resources;
  const removedHours = round1(resources.reduce((sum, resource) => sum + (Number(resource.hours) || 0), 0));
  const st = request.status ?? "UNKNOWN";
  const stCol = statusColor(st);
  const approvalStages = [
    { title: "Planner review", activeStatuses: ["SUBMITTED"], doneStatuses: ["COORD_REVIEW", "SUPER_REVIEW", "MANAGER_REVIEW", "APPROVED", "REJECTED"], comment: request.planner_comment, completedBy: request.planner_decided_by, completedAt: request.planner_decided_at },
    { title: "Shutdown Coordinator review", activeStatuses: ["COORD_REVIEW"], doneStatuses: ["SUPER_REVIEW", "MANAGER_REVIEW", "APPROVED", "REJECTED"], comment: request.coordinator_comment, completedBy: request.coordinator_decided_by, completedAt: request.coordinator_decided_at },
    { title: "Superintendent review", activeStatuses: ["SUPER_REVIEW"], doneStatuses: ["MANAGER_REVIEW", "APPROVED", "REJECTED"], comment: request.superintendent_comment, completedBy: request.superintendent_decided_by, completedAt: request.superintendent_decided_at },
    { title: "Manager review", activeStatuses: ["MANAGER_REVIEW"], doneStatuses: ["APPROVED", "REJECTED"], comment: request.manager_comment, completedBy: request.manager_decided_by, completedAt: request.manager_decided_at },
  ] as const;

  return (
    <div style={{ padding: 28, background: "#f4f6f8", minHeight: "100vh" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <img src="/logo.png" alt="Company logo" style={{ height: 44, objectFit: "contain" }} />
          <div>
            <div style={{ fontSize: 12, color: "#444", fontWeight: 700 }}>Work Removal Request</div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900, color: "#111" }}>{request.wo_number} - {request.wo_title || "Untitled"}</h1>
          </div>
        </div>

        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <Link href="/work-removal/new" style={primaryButton}>+ New removal</Link>
          <Link href="/work-removal/dashboard" style={secondaryButton}>Removal Dashboard</Link>
        </div>
      </div>

      <div style={{ marginTop: 18, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
        <Card title="Status">
          <span style={{ display: "inline-block", padding: "6px 12px", borderRadius: 999, background: `${stCol}20`, color: stCol, fontWeight: 900, fontSize: 13 }}>{st}</span>
        </Card>
        <Card title="Removed Hours">
          <div style={{ fontSize: 28, fontWeight: 900, color: "#111" }}>{removedHours.toFixed(1)}</div>
          <div style={{ fontSize: 12, color: "#444", fontWeight: 700 }}>hrs</div>
        </Card>
      </div>

      <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: 14, alignItems: "start" }}>
        <div style={panelStyle}>
          <SectionTitle>Request details</SectionTitle>
          <KeyVal label="Requested by" value={request.requestor_name || "-"} />
          <KeyVal label="Requestor email" value={request.requestor_email || "-"} />
          <KeyVal label="WO Number" value={request.wo_number} />
          <KeyVal label="WO Title" value={request.wo_title || "-"} />
          <KeyVal label="Area" value={request.area || "-"} />
          <KeyVal label="Priority" value={request.priority || "-"} />
          <KeyVal label="Workgroup" value={request.workgroup || "-"} />
          <div style={{ marginTop: 12 }}>
            <div style={{ fontWeight: 800, color: "#111", marginBottom: 6 }}>Reason for removal</div>
            <div style={{ color: "#111", lineHeight: 1.45 }}>{request.reason || "-"}</div>
          </div>
          <div style={{ marginTop: 12 }}>
            <div style={{ fontWeight: 800, color: "#111", marginBottom: 6 }}>Consequence if not removed</div>
            <div style={{ color: "#111", lineHeight: 1.45 }}>{request.consequence || "-"}</div>
          </div>
        </div>

        <div style={panelStyle}>
          <SectionTitle>Removed resources</SectionTitle>
          {resources.length === 0 ? (
            <div style={{ color: "#444" }}>No resources</div>
          ) : (
            <div style={{ display: "grid", gap: 8 }}>
              {resources.map((resource) => (
                <div key={resource.id} style={{ display: "flex", justifyContent: "space-between", border: "1px solid #eee", borderRadius: 10, padding: "10px 12px" }}>
                  <div style={{ fontWeight: 800, color: "#111" }}>{resource.resource_type}</div>
                  <div style={{ fontWeight: 900, color: "#111" }}>{round1(resource.hours).toFixed(1)}h</div>
                </div>
              ))}
            </div>
          )}

          <div style={{ marginTop: 12, fontSize: 12, color: "#111" }}>
            Created: {request.created_at ? new Date(request.created_at).toLocaleString() : "-"}
          </div>
        </div>
      </div>

      <ResourcePlannerEditor
        id={id}
        initialResources={resources.map((resource) => ({
          id: resource.id,
          resource_type: resource.resource_type,
          hours: String(round1(resource.hours)),
        }))}
        savePath={`/api/work-removal/${id}/resources`}
        title="Removed hours"
        description="Update the removal resource lines after submission if the removed scope changes."
        successMessage="Removed hours updated."
        errorMessage="Failed to update removed hours."
        buttonLabel="Save removed hours"
      />

      <div style={{ marginTop: 14, ...panelStyle }}>
        <SectionTitle>Approvals</SectionTitle>
        <div style={{ marginBottom: 12, padding: "12px 14px", borderRadius: 12, background: "#f8fafc", border: "1px solid #e2e8f0", color: "#1f2937", fontSize: 13, fontWeight: 600 }}>
          Approval actions are completed from email notifications, not inside the app. This page shows the current review stage and any saved comments.
        </div>
        <div style={{ display: "grid", gap: 12 }}>
          {approvalStages.map((stage) => (
            <ReadOnlyApprovalBlock key={stage.title} title={stage.title} currentStatus={st} activeStatuses={stage.activeStatuses} doneStatuses={stage.doneStatuses} comment={stage.comment} completedBy={stage.completedBy} completedAt={stage.completedAt} />
          ))}
        </div>
      </div>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return <div style={panelStyle}><div style={{ fontSize: 13, color: "#222", fontWeight: 800 }}>{title}</div><div style={{ marginTop: 8 }}>{children}</div></div>;
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 15, fontWeight: 900, color: "#111", marginBottom: 10 }}>{children}</div>;
}

function KeyVal({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "140px 1fr", gap: 10, padding: "8px 0", borderBottom: "1px solid #f0f0f0" }}>
      <div style={{ color: "#444", fontWeight: 800, fontSize: 13 }}>{label}</div>
      <div style={{ color: "#111", fontWeight: 600 }}>{value}</div>
    </div>
  );
}

function ReadOnlyApprovalBlock({
  title,
  currentStatus,
  activeStatuses,
  doneStatuses,
  comment,
  completedBy,
  completedAt,
}: {
  title: string;
  currentStatus: string;
  activeStatuses: readonly string[];
  doneStatuses: readonly string[];
  comment: string | null;
  completedBy: string | null;
  completedAt: string | null;
}) {
  const isActive = activeStatuses.includes(currentStatus);
  const isDone = doneStatuses.includes(currentStatus);
  const label = isActive ? "Email sent" : isDone ? "Completed" : "Waiting";
  const labelColor = isActive ? "#b45309" : isDone ? "#166534" : "#475569";
  const labelBg = isActive ? "#fef3c7" : isDone ? "#dcfce7" : "#e2e8f0";

  return (
    <div style={{ padding: "14px 0", borderTop: "1px solid #f0f0f0" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
        <div>
          <div style={{ fontWeight: 900, color: "#111" }}>{title}</div>
          {comment ? (
            <div style={{ marginTop: 8, fontSize: 13, color: "#1f2937", fontWeight: 500, lineHeight: 1.45 }}>{comment}</div>
          ) : (
            <div style={{ fontSize: 12, color: "#64748b", marginTop: 6, fontWeight: 500 }}>No comment recorded.</div>
          )}
          {isDone && (completedBy || completedAt) && (
            <div style={{ fontSize: 12, color: "#475569", marginTop: 8, fontWeight: 600 }}>
              {completedBy ? `By ${completedBy}` : "Completed"}
              {completedAt ? ` on ${new Date(completedAt).toLocaleString()}` : ""}
            </div>
          )}
        </div>
        <div style={{ fontSize: 12, color: labelColor, background: labelBg, fontWeight: 800, padding: "6px 10px", borderRadius: 999, height: "fit-content", whiteSpace: "nowrap" }}>
          {label}
        </div>
      </div>
    </div>
  );
}

const panelStyle = {
  background: "#fff",
  borderRadius: 14,
  boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
  padding: 18,
};

const primaryButton = {
  fontWeight: 600,
  color: "#fff",
  textDecoration: "none",
  padding: "10px 14px",
  borderRadius: 10,
  border: "1px solid #b45309",
  background: "#d97706",
};

const secondaryButton = {
  fontWeight: 600,
  color: "#111",
  textDecoration: "none",
  padding: "10px 14px",
  borderRadius: 10,
  border: "1px solid rgba(0,0,0,0.12)",
  background: "#fff",
};
