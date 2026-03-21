import Link from "next/link";
import { createSupabaseDb } from "@/lib/supabase/db";
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
  photo_name: string | null;
  photo_data_url: string | null;
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

async function loadRequestDetail(id: string) {
  try {
    const supabase = createSupabaseDb();

    const { data: req, error } = await supabase
      .from("break_in_requests")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !req) {
      return { ok: false as const, kind: "not-found" as const };
    }

    const { data: resRows } = await supabase
      .from("break_in_resources")
      .select("id, request_id, resource_type, hours")
      .eq("request_id", id);

    return {
      ok: true as const,
      request: req as ReqRow,
      resources: (resRows ?? []) as ResourceRow[],
    };
  } catch (error) {
    console.error("Request detail load failed:", error);
    return {
      ok: false as const,
      kind: "network" as const,
      message: error instanceof Error ? error.message : "Unknown network error",
    };
  }
}

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
  const loaded = await loadRequestDetail(id);
  if (!loaded.ok && loaded.kind === "not-found") {
    return (
      <div style={{ padding: 24 }}>
        <Link href="/break-in/dashboard">Back to dashboard</Link>
        <h1 style={{ marginTop: 12 }}>Request not found</h1>
      </div>
    );
  }

  if (!loaded.ok) {
    return (
      <div style={{ padding: 24 }}>
        <Link href="/break-in/dashboard">Back to dashboard</Link>
        <h1 style={{ marginTop: 12, color: "#111" }}>Error loading request</h1>
        <p style={{ marginTop: 10, color: "#4b5563" }}>{loaded.message}</p>
        <p style={{ marginTop: 10, color: "#6b7280" }}>
          This usually means the app could not reach Supabase from your current environment.
        </p>
      </div>
    );
  }

  const request = loaded.request;
  const resources = loaded.resources;
  const plannedHours = round1(resources.reduce((sum, r) => sum + (Number(r.hours) || 0), 0));
  const pct = clampPct(request.progress_percent ?? 0);
  const doneHours =
    request.status === "COMPLETED"
      ? plannedHours
      : request.status === "REJECTED"
        ? 0
        : round1((plannedHours * pct) / 100);

  const st = request.status ?? "UNKNOWN";
  const stCol = statusColor(st);

  const approvalStages = [
    {
      title: "Planner review",
      activeStatuses: ["SUBMITTED"],
      doneStatuses: ["COORD_REVIEW", "SUPER_REVIEW", "MANAGER_REVIEW", "APPROVED", "IN_PROGRESS", "COMPLETED", "REJECTED"],
      comment: request.planner_comment,
    },
    {
      title: "Shutdown Coordinator review",
      activeStatuses: ["COORD_REVIEW"],
      doneStatuses: ["SUPER_REVIEW", "MANAGER_REVIEW", "APPROVED", "IN_PROGRESS", "COMPLETED", "REJECTED"],
      comment: request.coordinator_comment,
    },
    {
      title: "Superintendent review",
      activeStatuses: ["SUPER_REVIEW"],
      doneStatuses: ["MANAGER_REVIEW", "APPROVED", "IN_PROGRESS", "COMPLETED", "REJECTED"],
      comment: request.superintendent_comment,
    },
    {
      title: "Manager review",
      activeStatuses: ["MANAGER_REVIEW"],
      doneStatuses: ["APPROVED", "IN_PROGRESS", "COMPLETED", "REJECTED"],
      comment: request.manager_comment,
    },
  ] as const;

  return (
    <div style={{ padding: 28, background: "#f4f6f8", minHeight: "100vh" }}>
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
            <div style={{ fontSize: 12, color: "#444", fontWeight: 700 }}>Break-in Request</div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900, color: "#111" }}>
              {request.wo_number} - {request.wo_title || "Untitled"}
            </h1>
          </div>
        </div>

        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <Link
            href="/break-in/new"
            style={{
              fontWeight: 600,
              color: "#fff",
              textDecoration: "none",
              padding: "10px 14px",
              borderRadius: 10,
              border: "1px solid #15803d",
              background: "#16a34a",
            }}
          >
            + New request
          </Link>
          <Link
            href="/break-in/dashboard"
            style={{
              fontWeight: 600,
              color: "#111",
              textDecoration: "none",
              padding: "10px 14px",
              borderRadius: 10,
              border: "1px solid rgba(0,0,0,0.12)",
              background: "#fff",
            }}
          >
            Dashboard
          </Link>
        </div>
      </div>

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
          <div style={{ fontSize: 28, fontWeight: 900, color: "#111" }}>{plannedHours.toFixed(1)}</div>
          <div style={{ fontSize: 12, color: "#444", fontWeight: 700 }}>hrs</div>
        </Card>

        <Card title="Hours (Done)">
          <div style={{ fontSize: 28, fontWeight: 900, color: "#111" }}>{doneHours.toFixed(1)}</div>
          <div style={{ fontSize: 12, color: "#444", fontWeight: 700 }}>hrs</div>
        </Card>
      </div>

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

          <KeyVal label="Requested by" value={request.requestor_name || "-"} />
          <KeyVal label="Requestor email" value={request.requestor_email || "-"} />
          <KeyVal label="WO Number" value={request.wo_number} />
          <KeyVal label="WO Title" value={request.wo_title || "-"} />
          <KeyVal label="Area" value={request.area || "-"} />
          <KeyVal label="Priority" value={request.priority || "-"} />
          <KeyVal label="Workgroup" value={request.workgroup || "-"} />

          <div style={{ marginTop: 12 }}>
            <div style={{ fontWeight: 800, color: "#111", marginBottom: 6 }}>Reason</div>
            <div style={{ color: "#111", lineHeight: 1.45 }}>{request.reason || "-"}</div>
          </div>

          <div style={{ marginTop: 12 }}>
            <div style={{ fontWeight: 800, color: "#111", marginBottom: 6 }}>Consequence</div>
            <div style={{ color: "#111", lineHeight: 1.45 }}>{request.consequence || "-"}</div>
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
                  <div style={{ fontWeight: 800, color: "#111" }}>{r.resource_type}</div>
                  <div style={{ fontWeight: 900, color: "#111" }}>{round1(r.hours).toFixed(1)}h</div>
                </div>
              ))}
            </div>
          )}

          <div style={{ marginTop: 12, fontSize: 12, color: "#111" }}>
            Created: {request.created_at ? new Date(request.created_at).toLocaleString() : "-"}
          </div>

          {request.photo_data_url && (
            <div style={{ marginTop: 16 }}>
              <div style={{ fontWeight: 800, color: "#111", marginBottom: 8 }}>Photo</div>
              <img
                src={request.photo_data_url}
                alt={request.photo_name || "Break-in attachment"}
                style={{
                  width: "100%",
                  borderRadius: 12,
                  border: "1px solid #e5e7eb",
                  display: "block",
                }}
              />
            </div>
          )}
        </div>
      </div>

      <ProgressUpdater
        id={id}
        currentPercent={request.progress_percent ?? 0}
        currentStatus={request.status ?? ""}
      />

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

        <div
          style={{
            marginBottom: 12,
            padding: "12px 14px",
            borderRadius: 12,
            background: "#f8fafc",
            border: "1px solid #e2e8f0",
            color: "#1f2937",
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          Approval actions are completed from email notifications, not inside the app. This page
          shows the current review stage and any saved comments.
        </div>

        <div style={{ display: "grid", gap: 12 }}>
          {approvalStages.map((stage) => (
            <ReadOnlyApprovalBlock
              key={stage.title}
              title={stage.title}
              currentStatus={st}
              activeStatuses={stage.activeStatuses}
              doneStatuses={stage.doneStatuses}
              comment={stage.comment}
            />
          ))}
        </div>

        {["APPROVED", "IN_PROGRESS", "COMPLETED", "REJECTED"].includes(st) && (
          <div style={{ marginTop: 12, color: "#1f2937", fontSize: 13, fontWeight: 500 }}>
            This request is currently in <b style={{ color: "#111" }}>{st}</b>.
          </div>
        )}
      </div>
    </div>
  );
}

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

function ReadOnlyApprovalBlock({
  title,
  currentStatus,
  activeStatuses,
  doneStatuses,
  comment,
}: {
  title: string;
  currentStatus: string;
  activeStatuses: readonly string[];
  doneStatuses: readonly string[];
  comment: string | null;
}) {
  const isActive = activeStatuses.includes(currentStatus);
  const isDone = doneStatuses.includes(currentStatus);
  const label = isActive ? "Email sent" : isDone ? "Completed" : "Waiting";
  const labelColor = isActive ? "#b45309" : isDone ? "#166534" : "#475569";
  const labelBg = isActive ? "#fef3c7" : isDone ? "#dcfce7" : "#e2e8f0";

  return (
    <div
      style={{
        padding: "14px 0",
        borderTop: "1px solid #f0f0f0",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
        <div>
          <div style={{ fontWeight: 900, color: "#111" }}>{title}</div>
          {comment ? (
            <div
              style={{
                marginTop: 8,
                fontSize: 13,
                color: "#1f2937",
                fontWeight: 500,
                lineHeight: 1.45,
              }}
            >
              {comment}
            </div>
          ) : (
            <div style={{ fontSize: 12, color: "#64748b", marginTop: 6, fontWeight: 500 }}>
              No comment recorded.
            </div>
          )}
        </div>

        <div
          style={{
            fontSize: 12,
            color: labelColor,
            background: labelBg,
            fontWeight: 800,
            padding: "6px 10px",
            borderRadius: 999,
            height: "fit-content",
            whiteSpace: "nowrap",
          }}
        >
          {label}
        </div>
      </div>
    </div>
  );
}
