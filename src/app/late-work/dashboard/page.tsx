import Link from "next/link";
import { createSupabaseDb } from "@/lib/supabase/db";
import { ShutdownDataActions } from "@/components/ShutdownDataActions";
import { shutdownAdminActionsEnabled } from "@/lib/shutdown/admin-actions";

type Row = {
  id: string;
  created_at: string;
  wo_number: string;
  wo_title: string | null;
  area: string | null;
  priority: string | null;
  workgroup: string | null;
  status: string | null;
  requestor_name: string | null;
};

type ResourceRow = {
  request_id: string;
  hours: number;
};

async function loadDashboardData() {
  const supabase = createSupabaseDb();

  const { data, error } = await supabase
    .from("late_work_requests")
    .select("id, created_at, wo_number, wo_title, area, priority, workgroup, status, requestor_name")
    .order("created_at", { ascending: false });

  if (error) {
    if (isMissingTableError(error.message)) {
      return {
        ok: true as const,
        rows: [] as Row[],
        resources: [] as ResourceRow[],
        needsSetup: true,
      };
    }

    return { ok: false as const, message: error.message || "Unknown Supabase error" };
  }

  const { data: resData, error: resErr } = await supabase
    .from("late_work_resources")
    .select("request_id, hours");

  if (resErr) {
    return { ok: false as const, message: resErr.message || "Unknown Supabase error" };
  }

  return {
    ok: true as const,
    rows: (data ?? []) as Row[],
    resources: (resData ?? []) as ResourceRow[],
    needsSetup: false,
  };
}

function isMissingTableError(message: string) {
  return (
    message.includes("Could not find the table") ||
    (message.includes("relation") && message.includes("does not exist"))
  );
}

export default async function LateWorkDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const sp = await searchParams;
  const filter = (sp?.filter ?? "ALL").toUpperCase();
  const loaded = await loadDashboardData();
  const showShutdownAdminActions = shutdownAdminActionsEnabled();

  if (!loaded.ok) {
    return (
      <div style={{ padding: 24 }}>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: "#111" }}>Error loading dashboard</h1>
        <p style={{ marginTop: 10, color: "#4b5563" }}>{loaded.message}</p>
      </div>
    );
  }

  const plannedById = new Map<string, number>();
  for (const resource of loaded.resources) {
    plannedById.set(resource.request_id, (plannedById.get(resource.request_id) ?? 0) + (Number(resource.hours) || 0));
  }

  const approvedRows = loaded.rows.filter((row) => row.status === "APPROVED");
  const approvedHours = approvedRows.reduce((sum, row) => sum + (plannedById.get(row.id) ?? 0), 0);

  const filteredRows = loaded.rows.filter((row) => {
    if (filter === "ALL") return true;
    if (filter === "OUTSTANDING") return row.status !== "APPROVED" && row.status !== "REJECTED";
    return (row.status ?? "").toUpperCase() === filter;
  });

  return (
    <div style={{ padding: 28, background: "#f4f6f8", minHeight: "100vh" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <img src="/logo.png" alt="Company logo" style={{ height: 48, objectFit: "contain" }} />
          <h1 style={{ fontSize: 26, fontWeight: 600, color: "#111", margin: 0 }}>Late Work Dashboard</h1>
        </div>

        <div style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
          {showShutdownAdminActions ? <ShutdownDataActions /> : null}
          <Link href="/break-in/dashboard" style={buttonStyle(false)}>Break-in Dashboard</Link>
          <Link href="/work-removal/dashboard" style={buttonStyle(false)}>Removal Dashboard</Link>
          <Link href="/late-work/new" style={buttonStyle(true)}>+ New Late Work Request</Link>
        </div>
      </div>

      <div style={{ marginTop: 20, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16 }}>
        <KpiLink href="/late-work/dashboard" active={filter === "ALL"} label="Total Requests" value={loaded.rows.length} />
        <KpiLink href="/late-work/dashboard?filter=OUTSTANDING" active={filter === "OUTSTANDING"} label="Outstanding" value={loaded.rows.filter((row) => row.status !== "APPROVED" && row.status !== "REJECTED").length} />
        <KpiLink href="/late-work/dashboard?filter=APPROVED" active={filter === "APPROVED"} label="Approved Late Work" value={approvedRows.length} color="#2563eb" />
        <KpiCard label="Approved Late Hours" value={approvedHours.toFixed(1)} suffix="h" color="#1d4ed8" />
      </div>

      {loaded.needsSetup ? (
        <div style={{ marginTop: 18, background: "#eff6ff", border: "1px solid #93c5fd", borderRadius: 14, padding: 18, color: "#1e3a8a", fontWeight: 700 }}>
          Late Work is ready in the app, but the Supabase tables have not been created yet. Run the late_work_requests and late_work_resources section in supabase-schema.sql to start using it.
        </div>
      ) : null}

      <div style={{ marginTop: 22, background: "#fff", borderRadius: 14, boxShadow: "0 2px 8px rgba(0,0,0,0.05)", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead style={{ background: "#f1f3f5" }}>
            <tr>
              <Th>WO</Th>
              <Th>Title</Th>
              <Th>Area</Th>
              <Th>Status</Th>
              <Th>Late hrs</Th>
              <Th>Requestor</Th>
              <Th />
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((row, idx) => (
              <tr key={row.id} style={{ borderBottom: "1px solid #eee", background: idx % 2 === 0 ? "#fff" : "#fafafa" }}>
                <Td>{row.wo_number}</Td>
                <Td>{row.wo_title || "Untitled"}</Td>
                <Td>{row.area || "-"}</Td>
                <Td><StatusBadge status={row.status || ""} /></Td>
                <Td>{(plannedById.get(row.id) ?? 0).toFixed(1)}</Td>
                <Td>{row.requestor_name || "-"}</Td>
                <Td><Link href={`/late-work/${row.id}`} style={openButtonStyle}>Open</Link></Td>
              </tr>
            ))}
            {filteredRows.length === 0 && (
              <tr>
                <Td colSpan={7}>No late work requests found.</Td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function buttonStyle(primary: boolean) {
  return {
    fontWeight: 600,
    color: primary ? "#fff" : "#111",
    textDecoration: "none",
    padding: "10px 14px",
    borderRadius: 10,
    border: primary ? "1px solid #b45309" : "1px solid rgba(0,0,0,0.12)",
    background: primary ? "#d97706" : "#fff",
  };
}

function KpiLink({ href, active, label, value, color }: { href: string; active: boolean; label: string; value: number; color?: string }) {
  return (
    <Link href={href} style={{ textDecoration: "none", color: "inherit" }}>
      <div style={{ background: "#fff", padding: 18, borderRadius: 14, boxShadow: "0 2px 8px rgba(0,0,0,0.05)", border: active ? "2px solid #111" : "1px solid rgba(0,0,0,0.06)" }}>
        <div style={{ fontSize: 13, color: "#222", fontWeight: 800 }}>{label}</div>
        <div style={{ marginTop: 6, fontSize: 28, fontWeight: 900, color: color || "#111" }}>{value}</div>
        <div style={{ marginTop: 8, fontSize: 12, color: "#444", opacity: 0.85 }}>Click to filter</div>
      </div>
    </Link>
  );
}

function KpiCard({ label, value, suffix, color }: { label: string; value: string; suffix?: string; color?: string }) {
  return (
    <div style={{ background: "#fff", padding: 18, borderRadius: 14, boxShadow: "0 2px 8px rgba(0,0,0,0.05)", border: "1px solid rgba(0,0,0,0.06)" }}>
      <div style={{ fontSize: 13, color: "#222", fontWeight: 800 }}>{label}</div>
      <div style={{ marginTop: 6, fontSize: 28, fontWeight: 900, color: color || "#111" }}>{value}{suffix ? suffix : ""}</div>
    </div>
  );
}

function Th({ children }: { children?: React.ReactNode }) {
  return <th style={{ padding: 14, textAlign: "left", fontWeight: 800, fontSize: 13, color: "#222", whiteSpace: "nowrap" }}>{children}</th>;
}

function Td({ children, colSpan }: { children: React.ReactNode; colSpan?: number }) {
  return <td colSpan={colSpan} style={{ padding: 14, fontSize: 14, color: "#111", fontWeight: 500, verticalAlign: "top" }}>{children}</td>;
}

function StatusBadge({ status }: { status: string }) {
  const color =
    status === "APPROVED" ? "#d97706" :
    status === "REJECTED" ? "#dc2626" :
    status === "SUPER_REVIEW" ? "#a855f7" :
    status === "COORD_REVIEW" ? "#f59e0b" :
    "#6b7280";

  return <span style={{ padding: "4px 10px", borderRadius: 999, background: `${color}20`, color, fontWeight: 900, fontSize: 12, display: "inline-block" }}>{status || "UNKNOWN"}</span>;
}

const openButtonStyle = {
  padding: "8px 12px",
  borderRadius: 10,
  border: "1px solid #cbd5e1",
  background: "#f8fafc",
  color: "#0f172a",
  fontWeight: 700,
  textDecoration: "none",
};
