import Link from "next/link";
import { createSupabaseDb } from "@/lib/supabase/db";
import { AppSidebar } from "@/components/AppSidebar";
import { RequestDeletePanel } from "@/components/RequestDeletePanel";
import ResourcePlannerEditor from "../../../components/ResourcePlannerEditor";
import { canApproveStage, getApprovalStageRole, type ApprovalStage } from "@/lib/auth/approval-permissions";
import { canEditRequests, canManageShutdowns, requireCurrentUser } from "@/lib/auth/current-user";
import { formatPerthDateTime } from "@/lib/time/format";

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
  planner_decided_by: string | null;
  planner_decided_at: string | null;
  coordinator_decided_by: string | null;
  coordinator_decided_at: string | null;
  superintendent_decided_by: string | null;
  superintendent_decided_at: string | null;
};

type ResourceRow = {
  id: string;
  request_id: string;
  resource_type: string;
  hours: number;
};

async function loadRequestDetail(id: string) {
  const supabase = createSupabaseDb();

  const { data: req, error } = await supabase.from("late_work_requests").select("*").eq("id", id).single();
  if (error || !req) {
    return { ok: false as const };
  }

  const { data: resRows } = await supabase
    .from("late_work_resources")
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
  if (status === "SUPER_REVIEW") return "#a855f7";
  if (status === "COORD_REVIEW") return "#f59e0b";
  if (status === "SUBMITTED") return "#6b7280";
  return "#6b7280";
}

export default async function LateWorkDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ approvalError?: string; approvalSaved?: string; deleteError?: string; detailsError?: string; detailsUpdated?: string; emailWarning?: string; reopened?: string }>;
}) {
  const currentUser = await requireCurrentUser();
  const { id } = await params;
  const sp = await searchParams;
  const loaded = await loadRequestDetail(id);
  if (!loaded.ok) {
    return (
      <div style={{ padding: 24 }}>
        <Link href="/late-work/dashboard">Back to dashboard</Link>
        <h1 style={{ marginTop: 12 }}>Request not found</h1>
      </div>
    );
  }

  const request = loaded.request;
  const resources = loaded.resources;
  const lateHours = round1(resources.reduce((sum, resource) => sum + (Number(resource.hours) || 0), 0));
  const st = request.status ?? "UNKNOWN";
  const stCol = statusColor(st);
  const canDeleteRequest = canManageShutdowns(currentUser);
  const canEditRequest = canEditRequests(currentUser);
  const approvalStages = [
    { title: "Planner review", stage: "SUBMITTED", activeStatuses: ["SUBMITTED"], doneStatuses: ["COORD_REVIEW", "SUPER_REVIEW", "APPROVED", "REJECTED"], comment: request.planner_comment, completedBy: request.planner_decided_by, completedAt: request.planner_decided_at },
    { title: "Shutdown Coordinator review", stage: "COORD_REVIEW", activeStatuses: ["COORD_REVIEW"], doneStatuses: ["SUPER_REVIEW", "APPROVED", "REJECTED"], comment: request.coordinator_comment, completedBy: request.coordinator_decided_by, completedAt: request.coordinator_decided_at },
    { title: "Superintendent review", stage: "SUPER_REVIEW", activeStatuses: ["SUPER_REVIEW"], doneStatuses: ["APPROVED", "REJECTED"], comment: request.superintendent_comment, completedBy: request.superintendent_decided_by, completedAt: request.superintendent_decided_at },
  ] as const;
  const rejectedStage = st === "REJECTED"
    ? [...approvalStages].reverse().find((stage) => stage.completedBy || stage.completedAt)?.stage
      ?? approvalStages[0].stage
    : null;
  const rejectedStageIndex = approvalStages.findIndex((stage) => stage.stage === rejectedStage);

  return (
    <div style={{ minHeight: "100vh", background: "#f4f6f8", display: "grid", gridTemplateColumns: "176px minmax(0, 1fr)" }}>
      <AppSidebar active="late-work" user={currentUser} />
      <main style={{ minWidth: 0, padding: 28 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 12, color: "#444", fontWeight: 700 }}>Late Work Request</div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900, color: "#111" }}>{request.wo_number} - {request.wo_title || "Untitled"}</h1>
        </div>
      </div>

      <div style={{ marginTop: 18, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
        <Card title="Status">
          <span style={{ display: "inline-block", padding: "6px 12px", borderRadius: 999, background: `${stCol}20`, color: stCol, fontWeight: 900, fontSize: 13 }}>{st}</span>
          {st === "REJECTED" && canEditRequest ? (
            <form action={`/api/late-work/${id}/reopen`} method="post" style={{ marginTop: 12 }}>
              <button type="submit" style={reopenButtonStyle}>Reopen for review</button>
            </form>
          ) : null}
        </Card>
        <Card title="Late Work Hours">
          <div style={{ fontSize: 28, fontWeight: 900, color: "#111" }}>{lateHours.toFixed(1)}</div>
          <div style={{ fontSize: 12, color: "#444", fontWeight: 700 }}>hrs</div>
        </Card>
      </div>

      {sp.detailsUpdated ? <Notice tone="success">Request details updated.</Notice> : null}
      {sp.reopened ? <Notice tone="success">Rejected request reopened for review.</Notice> : null}
      {sp.deleteError ? <Notice tone="error">{sp.deleteError}</Notice> : null}
      {sp.detailsError ? <Notice tone="error">{sp.detailsError}</Notice> : null}

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
            <div style={{ fontWeight: 800, color: "#111", marginBottom: 6 }}>Reason for late work</div>
            <div style={{ color: "#111", lineHeight: 1.45 }}>{request.reason || "-"}</div>
          </div>
          <div style={{ marginTop: 12 }}>
            <div style={{ fontWeight: 800, color: "#111", marginBottom: 6 }}>Consequence if not added</div>
            <div style={{ color: "#111", lineHeight: 1.45 }}>{request.consequence || "-"}</div>
          </div>
        </div>

        <div style={panelStyle}>
          <SectionTitle>Late work resources</SectionTitle>
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
            Created: {request.created_at ? formatPerthDateTime(request.created_at) : "-"}
          </div>
        </div>
      </div>

      {canEditRequest ? (
        <RequestDetailsEditor
          action={`/api/late-work/${id}/update`}
          request={request}
          reasonLabel="Reason for late work"
          consequenceLabel="Consequence if not added"
        />
      ) : null}

      {canDeleteRequest ? <RequestDeletePanel action={`/api/late-work/${id}/delete`} /> : null}

      {canEditRequest ? (
        <ResourcePlannerEditor
          id={id}
          initialResources={resources.map((resource) => ({
            id: resource.id,
            resource_type: resource.resource_type,
            hours: String(round1(resource.hours)),
          }))}
          savePath={`/api/late-work/${id}/resources`}
          title="Late work hours"
          description="Update the late work resource lines after submission if the added scope changes."
          successMessage="Late work hours updated."
          errorMessage="Failed to update late work hours."
          buttonLabel="Save late work hours"
        />
      ) : null}

      <div style={{ marginTop: 14, ...panelStyle }}>
        <SectionTitle>Approvals</SectionTitle>
        {sp.approvalSaved ? (
          <Notice tone="success">
            Approval action saved. {sp.emailWarning ? `Email warning: ${sp.emailWarning}` : ""}
          </Notice>
        ) : null}
        {sp.approvalError ? <Notice tone="error">{sp.approvalError}</Notice> : null}
        <div style={{ display: "grid", gap: 12 }}>
          {approvalStages.map((stage, stageIndex) => (
            <ApprovalBlock
              key={stage.title}
              title={stage.title}
              stage={stage.stage}
              currentStatus={st}
              activeStatuses={stage.activeStatuses}
              doneStatuses={stage.doneStatuses}
              comment={stage.comment}
              completedBy={stage.completedBy}
              completedAt={stage.completedAt}
              rejected={stage.stage === rejectedStage}
              notApplicable={st === "REJECTED" && stageIndex > rejectedStageIndex}
              savePath={`/api/late-work/${id}/decision`}
              workgroup={request.workgroup}
              canAction={canApproveStage(currentUser, stage.stage)}
            />
          ))}
        </div>
      </div>
      </main>
    </div>
  );
}

function RequestDetailsEditor({
  action,
  consequenceLabel,
  reasonLabel,
  request,
}: {
  action: string;
  consequenceLabel: string;
  reasonLabel: string;
  request: ReqRow;
}) {
  return (
    <form action={action} method="post" style={{ marginTop: 14, ...panelStyle }}>
      <SectionTitle>Edit request details</SectionTitle>
      <div style={editGridStyle}>
        <Field name="requestor_name" label="Requested by" value={request.requestor_name || ""} />
        <Field name="requestor_email" label="Requestor email" type="email" value={request.requestor_email || ""} />
        <Field name="wo_number" label="WO Number" required value={request.wo_number} />
        <Field name="wo_title" label="WO Title" value={request.wo_title || ""} />
        <Field name="area" label="Area" value={request.area || ""} />
        <Field name="priority" label="Priority" value={request.priority || ""} />
        <Field name="workgroup" label="Workgroup" value={request.workgroup || ""} />
      </div>
      <div style={{ marginTop: 12, display: "grid", gap: 12 }}>
        <TextArea name="reason" label={reasonLabel} value={request.reason || ""} />
        <TextArea name="consequence" label={consequenceLabel} value={request.consequence || ""} />
      </div>
      <button type="submit" style={{ ...approveButtonStyle, marginTop: 14 }}>
        Save request details
      </button>
    </form>
  );
}

function Field({
  label,
  name,
  required,
  type = "text",
  value,
}: {
  label: string;
  name: string;
  required?: boolean;
  type?: string;
  value: string;
}) {
  return (
    <label>
      <div style={editLabelStyle}>{label}</div>
      <input name={name} required={required} type={type} defaultValue={value} style={editInputStyle} />
    </label>
  );
}

function TextArea({ label, name, value }: { label: string; name: string; value: string }) {
  return (
    <label>
      <div style={editLabelStyle}>{label}</div>
      <textarea name={name} defaultValue={value} rows={4} style={editTextareaStyle} />
    </label>
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

function Notice({ children, tone }: { children: React.ReactNode; tone: "error" | "success" }) {
  const isError = tone === "error";
  return (
    <div style={{ marginBottom: 12, padding: "12px 14px", borderRadius: 12, background: isError ? "#fef2f2" : "#f0fdf4", border: isError ? "1px solid #fecaca" : "1px solid #bbf7d0", color: isError ? "#991b1b" : "#166534", fontSize: 13, fontWeight: 800 }}>
      {children}
    </div>
  );
}

function ApprovalBlock({
  title,
  stage,
  currentStatus,
  activeStatuses,
  doneStatuses,
  comment,
  completedBy,
  completedAt,
  rejected,
  notApplicable,
  savePath,
  workgroup,
  canAction,
}: {
  title: string;
  stage: ApprovalStage;
  currentStatus: string;
  activeStatuses: readonly string[];
  doneStatuses: readonly string[];
  comment: string | null;
  completedBy: string | null;
  completedAt: string | null;
  rejected: boolean;
  notApplicable: boolean;
  savePath: string;
  workgroup: string | null;
  canAction: boolean;
}) {
  const isActive = activeStatuses.includes(currentStatus);
  const isDone = currentStatus === "REJECTED"
    ? !rejected && Boolean(completedBy || completedAt)
    : doneStatuses.includes(currentStatus);
  const label = notApplicable ? "N/A" : rejected ? "Rejected" : isActive ? "Awaiting review" : isDone ? "Completed" : "Waiting";
  const labelColor = rejected ? "#b91c1c" : isActive ? "#b45309" : isDone ? "#166534" : "#475569";
  const labelBg = rejected ? "#fee2e2" : isActive ? "#fef3c7" : isDone ? "#dcfce7" : "#e2e8f0";
  const needsWorkgroup = stage === "COORD_REVIEW";

  return (
    <div style={{ padding: "14px 0", borderTop: "1px solid #f0f0f0" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
        <div>
          <div style={{ fontWeight: 900, color: "#111" }}>{title}</div>
          {notApplicable ? (
            <div style={{ fontSize: 12, color: "#64748b", marginTop: 6, fontWeight: 500 }}>
              Not applicable — workflow stopped after rejection.
            </div>
          ) : comment ? (
            <div style={{ marginTop: 8, fontSize: 13, color: "#1f2937", fontWeight: 500, lineHeight: 1.45 }}>{comment}</div>
          ) : (
            <div style={{ fontSize: 12, color: "#64748b", marginTop: 6, fontWeight: 500 }}>No comment recorded.</div>
          )}
          {(isDone || rejected) && (completedBy || completedAt || rejected) && (
            <div style={{ fontSize: 12, color: rejected ? "#b91c1c" : "#475569", marginTop: 8, fontWeight: 600 }}>
              {completedBy ? `${rejected ? "Rejected" : "Completed"} by ${completedBy}` : rejected ? "Rejecting reviewer not recorded" : "Completed"}
              {completedAt ? ` on ${formatPerthDateTime(completedAt)}` : ""}
            </div>
          )}
        </div>
        <div style={{ fontSize: 12, color: labelColor, background: labelBg, fontWeight: 800, padding: "6px 10px", borderRadius: 999, height: "fit-content", whiteSpace: "nowrap" }}>
          {label}
        </div>
      </div>
      {isActive && canAction ? (
        <form action={savePath} method="post" style={{ marginTop: 12, display: "grid", gap: 10 }}>
          <input type="hidden" name="stage" value={stage} />
          {needsWorkgroup ? (
            <label>
              <div style={{ fontSize: 12, color: "#111", fontWeight: 800, marginBottom: 6 }}>Workgroup</div>
              <input name="workgroup" defaultValue={workgroup || ""} required style={approvalInputStyle} />
            </label>
          ) : null}
          <label>
            <div style={{ fontSize: 12, color: "#111", fontWeight: 800, marginBottom: 6 }}>Comment</div>
            <textarea name="comment" rows={3} style={approvalTextareaStyle} />
          </label>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button type="submit" name="decision" value="APPROVE" style={approveButtonStyle}>Approve</button>
            <button type="submit" name="decision" value="REJECT" style={rejectButtonStyle}>Reject</button>
          </div>
        </form>
      ) : isActive ? (
        <div style={restrictedApprovalStyle}>
          Awaiting {getApprovalStageRole(stage)} approval.
        </div>
      ) : null}
    </div>
  );
}

const restrictedApprovalStyle = {
  marginTop: 12,
  padding: "10px 12px",
  borderRadius: 8,
  border: "1px solid #e2e8f0",
  background: "#f8fafc",
  color: "#475569",
  fontSize: 12,
  fontWeight: 800,
} as const;

const approvalInputStyle = {
  width: "100%",
  padding: "10px 12px",
  border: "1px solid #d1d5db",
  borderRadius: 8,
  color: "#111",
  fontWeight: 700,
} as const;

const approvalTextareaStyle = {
  ...approvalInputStyle,
  minHeight: 82,
  resize: "vertical",
} as const;

const approveButtonStyle = {
  padding: "10px 14px",
  borderRadius: 8,
  border: "1px solid #15803d",
  background: "#16a34a",
  color: "#fff",
  fontWeight: 900,
  cursor: "pointer",
} as const;

const rejectButtonStyle = {
  padding: "10px 14px",
  borderRadius: 8,
  border: "1px solid #b91c1c",
  background: "#dc2626",
  color: "#fff",
  fontWeight: 900,
  cursor: "pointer",
} as const;

const reopenButtonStyle = {
  padding: "9px 12px",
  borderRadius: 8,
  border: "1px solid #ea580c",
  background: "#f97316",
  color: "#fff",
  fontWeight: 900,
  cursor: "pointer",
} as const;

const panelStyle = {
  background: "#fff",
  borderRadius: 14,
  boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
  padding: 18,
};

const editGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 12,
} as const;

const editLabelStyle = {
  color: "#111",
  display: "block",
  fontSize: 12,
  fontWeight: 900,
  marginBottom: 6,
} as const;

const editInputStyle = {
  width: "100%",
  border: "1px solid #d1d5db",
  borderRadius: 8,
  color: "#111",
  fontWeight: 700,
  padding: "10px 12px",
} as const;

const editTextareaStyle = {
  ...editInputStyle,
  minHeight: 90,
  resize: "vertical",
} as const;
