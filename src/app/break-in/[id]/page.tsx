import Link from "next/link";
import { createSupabaseDb } from "@/lib/supabase/db";
import DecisionForm from "../../../components/DecisionForm";
import ProgressUpdater from "../../../components/ProgressUpdater";

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
  progress_percent: number | null;

  requestor_name: string | null;
  requestor_email: string | null;

  planner_comment: string | null;
  coordinator_comment: string | null;
  superintendent_comment: string | null;
  manager_comment: string | null;
};

type ResourceRow = {
  id: string;
  request_id: string;
  resource_type: string;
  hours: number;
};

function clampPct(n: number) {
  return Math.max(0, Math.min(100, Math.round(n)));
}
function round1(n: number) {
  return Math.round((Number(n) || 0) * 10) / 10;
}
function statusColor(status: string) {
  if (status === "COMPLETED") return "#16a34a";
  if (status === "IN_PROGRESS") return "#2563eb";
  if (status === "APPROVED") return "#0ea5e9";
  if (status === "REJECTED") return "#dc2626";
  if (status === "MANAGER_REVIEW") return "#7c3aed";
  if (status === "SUPER_REVIEW") return "#a855f7";
  if (status === "COORD_REVIEW") return "#f59e0b";
  if (status === "SUBMITTED") return "#6b7280";
  return "#6b7280";
}

export default async function BreakInDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = createSupabaseDb();

  const { data: req, error } = await supabase
    .from("break_in_requests")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !req) {
    return (
      <div style={{ padding: 24 }}>
        <Link href="/break-in/dashboard">← Back to dashboard</Link>
        <h1 style={{ marginTop: 12 }}>Request not found</h1>
      </div>
    );
  }

  const request = req as ReqRow;

  const { data: resRows } = await supabase
    .from("break_in_resources")
    .select("id, request_id, resource_type, hours")
    .eq("request_id", id);

  const resources = (resRows ?? []) as ResourceRow[];

  const plannedHours = round1(
    resources.reduce((sum, r) => sum + (Number(r.hours) || 0), 0)
  );
  const pct = clampPct(request.progress_percent ?? 0);
  const doneHours =
    request.status === "COMPLETED"
      ? plannedHours
      : request.status === "REJECTED"
      ? 0
      : round1((plannedHours * pct) / 100);

  const st = request.status ?? "UNKNOWN";
  const stCol = statusColor(st);

  return (
    <div style={{ padding: 28, background: "#f4f6f8", minHeight: "100vh" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <img
            src="/logo.png"
            alt="Company logo"
            style={{ height: 44, objectFit: "contain" }}
          />
          <div>
            <div style={{ fontSize: 12, color: "#444", fontWeight: 700 }}>
              Break-in Request
            </div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900, color: "#111" }}>
              {request.wo_number} — {request.wo_title || "Untitled"}
            </h1>
          </div>
        </div>

        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <Link href="/break-in/new" style={{ fontWeight: 800, color: "#111" }}>
            + New request
          </Link>
          <Link href="/break-in/dashboard" style={{ fontWeight: 800, color: "#111" }}>
            Dashboard
          </Link>
        </div>
      </div>

      {/* Top KPI row */}
      <div
        style={{
          marginTop: 18,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 14,
        }}
      >
        <Card title="Status">
          <span
            style={{
              display: "inline-block",
              padding: "6px 12px",
              borderRadius: 999,
              background: `${stCol}20`,
              color: stCol,
              fontWeight: 900,
              fontSize: 13,
            }}
          >
            {st}
          </span>
        </Card>

        <Card title="Progress">
          <div style={{ fontSize: 28, fontWeight: 900, color: "#111" }}>{pct}%</div>
          <div
            style={{
              marginTop: 10,
              height: 10,
              background: "#e5e7eb",
              borderRadius: 999,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${pct}%`,
                height: "100%",
                background: stCol,
              }}
            />
          </div>
        </Card>

        <Card title="Hours (Planned)">
          <div style={{ fontSize: 28, fontWeight: 900, color: "#111" }}>
            {plannedHours.toFixed(1)}
          </div>
          <div style={{ fontSize: 12, color: "#444", fontWeight: 700 }}>hrs</div>
        </Card>

        <Card title="Hours (Done)">
          <div style={{ fontSize: 28, fontWeight: 900, color: "#111" }}>
            {doneHours.toFixed(1)}
          </div>
          <div style={{ fontSize: 12, color: "#444", fontWeight: 700 }}>hrs</div>
        </Card>
      </div>

      {/* Details */}
      <div
        style={{
          marginTop: 16,
          display: "grid",
          gridTemplateColumns: "1.2fr 0.8fr",
          gap: 14,
          alignItems: "start",
        }}
      >
        <div
          style={{
            background: "#fff",
            borderRadius: 14,
            boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
            padding: 18,
          }}
        >
          <SectionTitle>Request details</SectionTitle>

          <KeyVal label="WO Number" value={request.wo_number} />
          <KeyVal label="WO Title" value={request.wo_title || "-"} />
          <KeyVal label="Area" value={request.area || "-"} />
          <KeyVal label="Priority" value={request.priority || "-"} />
          <KeyVal label="Workgroup" value={request.workgroup || "-"} />

          <div style={{ marginTop: 12 }}>
            <div style={{ fontWeight: 800, color: "#111", marginBottom: 6 }}>
              Reason
            </div>
            <div style={{ color: "#111", lineHeight: 1.45 }}>
              {request.reason || "-"}
            </div>
          </div>

          <div style={{ marginTop: 12 }}>
            <div style={{ fontWeight: 800, color: "#111", marginBottom: 6 }}>
              Consequence
            </div>
            <div style={{ color: "#111", lineHeight: 1.45 }}>
              {request.consequence || "-"}
            </div>
          </div>
        </div>

        <div
          style={{
            background: "#fff",
            borderRadius: 14,
            boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
            padding: 18,
          }}
        >
          <SectionTitle>Resources</SectionTitle>

          {resources.length === 0 ? (
            <div style={{ color: "#444" }}>No resources</div>
          ) : (
            <div style={{ display: "grid", gap: 8 }}>
              {resources.map((r) => (
                <div
                  key={r.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    border: "1px solid #eee",
                    borderRadius: 10,
                    padding: "10px 12px",
                  }}
                >
                  <div style={{ fontWeight: 800, color: "#111" }}>
                    {r.resource_type}
                  </div>
                  <div style={{ fontWeight: 900, color: "#111" }}>
                    {round1(r.hours).toFixed(1)}h
                  </div>
                </div>
              ))}
            </div>
          )}

          <div style={{ marginTop: 12, fontSize: 12, color: "#111" }}>
            Created:{" "}
            {request.created_at ? new Date(request.created_at).toLocaleString() : "-"}
          </div>
        </div>
      </div>
<ProgressUpdater
  id={id}
  currentPercent={request.progress_percent ?? 0}
  currentStatus={request.status ?? ""}
/>

      {/* Approvals */}
      <div
        style={{
          marginTop: 14,
          background: "#fff",
          borderRadius: 14,
          boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
          padding: 18,
        }}
      >
        <SectionTitle>Approvals</SectionTitle>

        {/* Planner */}
        <ApprovalBlock
          title="Planner decision"
          hint="Approve moves to Coordinator. Reject ends the request."
          currentStatus={st}
          showWhen={["SUBMITTED"]}
        >
          <DecisionForm
            title="Planner"
            endpoint={`/api/break-in/${id}/planner-decision`}
            approveLabel="Approve"
            rejectLabel="Reject"
            // no workgroup allocation here
          />
        </ApprovalBlock>

        {/* Coordinator (free-text workgroup allocation happens here) */}
        <ApprovalBlock
          title="Shutdown Coordinator decision"
          hint="Approve allocates a Workgroup and moves to Superintendent."
          currentStatus={st}
          showWhen={["COORD_REVIEW"]}
        >
          <DecisionForm
            title="Coordinator"
            endpoint={`/api/break-in/${id}/coordinator-decision`}
            approveLabel="Approve"
            rejectLabel="Reject"
            requireWorkgroup={true} // ✅ free text allocation (DecisionForm should render a name='workgroup' input)
          />
        </ApprovalBlock>

        {/* Superintendent */}
        <ApprovalBlock
          title="Superintendent decision"
          hint="Approve moves to Manager."
          currentStatus={st}
          showWhen={["SUPER_REVIEW"]}
        >
          <DecisionForm
            title="Superintendent"
            endpoint={`/api/break-in/${id}/superintendent-decision`}
            approveLabel="Approve"
            rejectLabel="Reject"
          />
        </ApprovalBlock>

        {/* Manager */}
        <ApprovalBlock
          title="Manager decision"
          hint="Approve finalises to Approved."
          currentStatus={st}
          showWhen={["MANAGER_REVIEW"]}
        >
          <DecisionForm
            title="Manager"
            endpoint={`/api/break-in/${id}/manager-decision`}
            approveLabel="Approve"
            rejectLabel="Reject"
          />
        </ApprovalBlock>

        {/* Read-only summary once approved/in progress/completed */}
        {["APPROVED", "IN_PROGRESS", "COMPLETED", "REJECTED"].includes(st) && (
          <div style={{ marginTop: 10, color: "#444", fontSize: 13 }}>
            This request is in <b style={{ color: "#111" }}>{st}</b>. Decisions above
            are no longer editable.
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------- Small UI helpers ---------- */

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        background: "#fff",
        borderRadius: 14,
        boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
        padding: 18,
      }}
    >
      <div style={{ fontSize: 13, color: "#222", fontWeight: 800 }}>{title}</div>
      <div style={{ marginTop: 8 }}>{children}</div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 15, fontWeight: 900, color: "#111", marginBottom: 10 }}>
      {children}
    </div>
  );
}

function KeyVal({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "140px 1fr",
        gap: 10,
        padding: "8px 0",
        borderBottom: "1px solid #f0f0f0",
      }}
    >
      <div style={{ color: "#444", fontWeight: 800, fontSize: 13 }}>{label}</div>
      <div style={{ color: "#111", fontWeight: 600 }}>{value}</div>
    </div>
  );
}

function ApprovalBlock({
  title,
  hint,
  currentStatus,
  showWhen,
  children,
}: {
  title: string;
  hint: string;
  currentStatus: string;
  showWhen: string[];
  children: React.ReactNode;
}) {
  const visible = showWhen.includes(currentStatus);
  return (
    <div
      style={{
        marginTop: 14,
        paddingTop: 14,
        borderTop: "1px solid #f0f0f0",
        opacity: visible ? 1 : 0.55,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
        <div>
          <div style={{ fontWeight: 900, color: "#111" }}>{title}</div>
          <div style={{ fontSize: 12, color: "#444", marginTop: 4 }}>{hint}</div>
        </div>

        <div style={{ fontSize: 12, color: "#444", fontWeight: 800 }}>
          {visible ? "Action required" : "Not active"}
        </div>
      </div>

      <div style={{ marginTop: 10 }}>{visible ? children : null}</div>
    </div>
  );
}
