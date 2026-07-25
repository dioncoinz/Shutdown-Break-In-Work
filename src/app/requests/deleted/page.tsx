import { AppSidebar } from "@/components/AppSidebar";
import { requireCurrentUser } from "@/lib/auth/current-user";
import { listShutdowns, type Shutdown } from "@/lib/shutdown/setup";
import { createSupabaseDb } from "@/lib/supabase/db";
import { formatPerthDateTime } from "@/lib/time/format";

type DeletedActivity = {
  id: string;
  created_at: string;
  request_type: string;
  actor: string | null;
  details: string | null;
};

async function loadDeletedActivity(shutdownId: string | null) {
  if (!shutdownId) {
    return { events: [] as DeletedActivity[], needsSetup: false };
  }

  const supabase = createSupabaseDb();
  const { data, error } = await supabase
    .from("request_activity_events")
    .select("id, created_at, request_type, actor, details")
    .eq("shutdown_id", shutdownId)
    .eq("action", "Request deleted")
    .order("created_at", { ascending: false })
    .limit(250);

  if (error) {
    if (isMissingActivityTableError(error.message)) {
      return { events: [] as DeletedActivity[], needsSetup: true };
    }
    throw new Error(error.message);
  }

  return { events: (data ?? []) as DeletedActivity[], needsSetup: false };
}

export default async function DeletedRequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ shutdown?: string }>;
}) {
  const [currentUser, shutdownResult, params] = await Promise.all([
    requireCurrentUser(),
    listShutdowns(),
    searchParams,
  ]);
  const shutdown = selectShutdown(shutdownResult.shutdowns, params.shutdown);
  const deletedActivity = await loadDeletedActivity(shutdown?.id ?? null);
  const deleted = deletedActivity.events;

  return (
    <div style={pageStyle}>
      <AppSidebar active="deleted" user={currentUser} />

      <main style={{ minWidth: 0, padding: 28 }}>
        <div style={headerStyle}>
          <div>
            <h1 style={{ margin: 0, color: "#111827", fontSize: 26, fontWeight: 700 }}>
              Deleted Requests
            </h1>
            <p style={{ margin: "7px 0 0", color: "#64748b", fontSize: 13, fontWeight: 600 }}>
              Read-only deletion history. Original request and resource records are permanently removed.
            </p>
          </div>

          <form method="GET" action="/requests/deleted" style={filterStyle}>
            <label style={{ display: "grid", gap: 6 }}>
              <span style={labelStyle}>Shutdown</span>
              <select name="shutdown" defaultValue={shutdown?.id ?? ""} style={selectStyle}>
                {shutdownResult.shutdowns.length === 0 ? (
                  <option value="">No shutdowns found</option>
                ) : null}
                {shutdownResult.shutdowns.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                    {item.is_active ? " (Active)" : ""}
                  </option>
                ))}
              </select>
            </label>
            <button type="submit" style={applyStyle}>Apply</button>
          </form>
        </div>

        <section style={summaryStyle}>
          <div>
            <div style={summaryLabelStyle}>Deletion records</div>
            <div style={summaryValueStyle}>{deleted.length}</div>
          </div>
          <div style={{ color: "#64748b", fontSize: 12, fontWeight: 700 }}>
            {shutdown?.name ?? "No shutdown selected"}
          </div>
        </section>

        {deletedActivity.needsSetup ? (
          <div style={setupWarningStyle}>
            <strong>Deletion history is not enabled in this Supabase project.</strong>
            <span>
              Run the <code>request_activity_events</code> section of <code>supabase-schema.sql</code> in the
              Supabase SQL Editor. Deletions made before that table is created cannot be recovered.
            </span>
          </div>
        ) : null}

        <div style={tableWrapStyle}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 760 }}>
            <thead style={{ background: "#f1f5f9" }}>
              <tr>
                <Th>Deleted</Th>
                <Th>Request type</Th>
                <Th>Request and reason</Th>
                <Th>Deleted by</Th>
              </tr>
            </thead>
            <tbody>
              {deleted.map((event, index) => (
                <tr
                  key={event.id}
                  style={{
                    borderTop: "1px solid #e5e7eb",
                    background: index % 2 === 0 ? "#fff" : "#fafafa",
                  }}
                >
                  <Td>{formatPerthDateTime(event.created_at)}</Td>
                  <Td><TypeBadge type={event.request_type} /></Td>
                  <Td>{event.details || "Deletion details were not recorded."}</Td>
                  <Td>{event.actor || "Unknown user"}</Td>
                </tr>
              ))}
              {deleted.length === 0 && !deletedActivity.needsSetup ? (
                <tr style={{ borderTop: "1px solid #e5e7eb" }}>
                  <Td colSpan={4}>No deleted requests have been recorded for this shutdown.</Td>
                </tr>
              ) : deletedActivity.needsSetup ? (
                <tr style={{ borderTop: "1px solid #e5e7eb" }}>
                  <Td colSpan={4}>Deletion records will appear here after deletion history is enabled.</Td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}

function isMissingActivityTableError(message: string) {
  return (
    message.includes("Could not find the table") ||
    (message.includes("relation") && message.includes("does not exist"))
  );
}

function selectShutdown(shutdowns: Shutdown[], requestedId?: string) {
  return (
    shutdowns.find((shutdown) => shutdown.id === requestedId) ||
    shutdowns.find((shutdown) => shutdown.is_active) ||
    shutdowns[0] ||
    null
  );
}

function TypeBadge({ type }: { type: string }) {
  const label =
    type === "emergent"
      ? "Emergent"
      : type === "late_work"
        ? "Late Work"
        : type === "work_removal"
          ? "Work Removal"
          : type.replaceAll("_", " ");
  const colour =
    type === "emergent" ? "#2563eb" : type === "late_work" ? "#7c3aed" : "#d97706";

  return (
    <span
      style={{
        display: "inline-block",
        padding: "5px 9px",
        borderRadius: 999,
        background: `${colour}18`,
        color: colour,
        fontSize: 11,
        fontWeight: 900,
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </span>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th style={{ padding: 14, color: "#334155", textAlign: "left", fontSize: 12, fontWeight: 900 }}>
      {children}
    </th>
  );
}

function Td({ children, colSpan }: { children: React.ReactNode; colSpan?: number }) {
  return (
    <td colSpan={colSpan} style={{ padding: 14, color: "#1f2937", fontSize: 13, lineHeight: 1.45, verticalAlign: "top" }}>
      {children}
    </td>
  );
}

const pageStyle = {
  minHeight: "100vh",
  background: "#f4f6f8",
  display: "grid",
  gridTemplateColumns: "176px minmax(0, 1fr)",
} as const;

const headerStyle = {
  display: "flex",
  alignItems: "end",
  justifyContent: "space-between",
  gap: 20,
  flexWrap: "wrap",
} as const;

const filterStyle = {
  display: "flex",
  alignItems: "end",
  gap: 8,
} as const;

const labelStyle = {
  color: "#475569",
  fontSize: 11,
  fontWeight: 900,
} as const;

const selectStyle = {
  minWidth: 270,
  height: 40,
  border: "1px solid #cbd5e1",
  borderRadius: 8,
  background: "#fff",
  color: "#111827",
  padding: "0 10px",
  fontWeight: 800,
} as const;

const applyStyle = {
  height: 40,
  border: 0,
  borderRadius: 8,
  background: "#f15a24",
  color: "#fff",
  padding: "0 15px",
  fontWeight: 900,
  cursor: "pointer",
} as const;

const summaryStyle = {
  marginTop: 22,
  padding: "16px 18px",
  border: "1px solid #e2e8f0",
  borderRadius: 12,
  background: "#fff",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 18,
} as const;

const summaryLabelStyle = {
  color: "#64748b",
  fontSize: 11,
  fontWeight: 900,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
} as const;

const summaryValueStyle = {
  marginTop: 5,
  color: "#111827",
  fontSize: 30,
  lineHeight: 1,
  fontWeight: 900,
} as const;

const tableWrapStyle = {
  marginTop: 16,
  border: "1px solid #e2e8f0",
  borderRadius: 12,
  background: "#fff",
  boxShadow: "0 4px 14px rgba(15, 23, 42, 0.05)",
  overflowX: "auto",
} as const;

const setupWarningStyle = {
  marginTop: 16,
  padding: "14px 16px",
  border: "1px solid #fdba74",
  borderRadius: 10,
  background: "#fff7ed",
  color: "#9a3412",
  display: "grid",
  gap: 6,
  fontSize: 12,
  lineHeight: 1.5,
  fontWeight: 700,
} as const;
