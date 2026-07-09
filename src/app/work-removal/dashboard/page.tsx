import Link from "next/link";
import { createSupabaseDb } from "@/lib/supabase/db";
import { AppSidebar } from "@/components/AppSidebar";
import { requireCurrentUser } from "@/lib/auth/current-user";
import { listShutdowns, type Shutdown } from "@/lib/shutdown/setup";

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

async function loadDashboardData(shutdownId: string | null) {
  const supabase = createSupabaseDb();

  let requestQuery = supabase
    .from("work_removal_requests")
    .select("id, created_at, wo_number, wo_title, area, priority, workgroup, status, requestor_name")
    .order("created_at", { ascending: false });

  if (shutdownId) {
    requestQuery = requestQuery.eq("shutdown_id", shutdownId);
  }

  const { data, error } = await requestQuery;

  if (error) {
    return { ok: false as const, message: error.message || "Unknown Supabase error" };
  }

  const { data: resData, error: resErr } = await supabase
    .from("work_removal_resources")
    .select("request_id, hours");

  if (resErr) {
    return { ok: false as const, message: resErr.message || "Unknown Supabase error" };
  }

  return {
    ok: true as const,
    rows: (data ?? []) as Row[],
    resources: (resData ?? []) as ResourceRow[],
  };
}

export default async function WorkRemovalDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; shutdown?: string }>;
}) {
  const currentUser = await requireCurrentUser();
  const sp = await searchParams;
  const filter = (sp?.filter ?? "ALL").toUpperCase();
  const loadedShutdowns = await listShutdowns();
  const selectedShutdown = getSelectedShutdown(loadedShutdowns.shutdowns, sp.shutdown);
  const selectedShutdownId = selectedShutdown?.id ?? null;
  const loaded = await loadDashboardData(selectedShutdownId);

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
    <div style={{ minHeight: "100vh", background: "#f4f6f8", display: "grid", gridTemplateColumns: "176px minmax(0, 1fr)" }}>
      <AppSidebar active="work-removal" user={currentUser} />

      <main style={{ minWidth: 0, padding: 28 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
        <h1 style={{ fontSize: 26, fontWeight: 600, color: "#111", margin: 0 }}>Work Removal Dashboard</h1>
      </div>

      <form method="GET" action="/work-removal/dashboard" style={{ marginTop: 18, display: "flex", justifyContent: "flex-end", gap: 8, flexWrap: "wrap", alignItems: "end" }}>
        <input type="hidden" name="filter" value={filter} />
        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ color: "#334155", fontSize: 12, fontWeight: 900 }}>Shutdown</span>
          <select name="shutdown" defaultValue={selectedShutdownId || ""} style={selectStyle}>
            {loadedShutdowns.shutdowns.length === 0 ? <option value="">No shutdowns found</option> : null}
            {loadedShutdowns.shutdowns.map((shutdown) => (
              <option key={shutdown.id} value={shutdown.id}>
                {shutdown.name}{shutdown.is_active ? " (Active)" : ""}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" style={applyButtonStyle}>Apply</button>
      </form>

      <div style={{ marginTop: 20, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16 }}>
        <KpiLink href={dashboardHref("ALL", selectedShutdownId)} active={filter === "ALL"} label="Total Requests" value={loaded.rows.length} />
        <KpiLink href={dashboardHref("OUTSTANDING", selectedShutdownId)} active={filter === "OUTSTANDING"} label="Outstanding" value={loaded.rows.filter((row) => row.status !== "APPROVED" && row.status !== "REJECTED").length} />
        <KpiLink href={dashboardHref("APPROVED", selectedShutdownId)} active={filter === "APPROVED"} label="Approved WOs Removed" value={approvedRows.length} color="#d97706" />
        <KpiCard label="Approved Hours Removed" value={approvedHours.toFixed(1)} suffix="h" color="#b45309" />
      </div>

      <div style={{ marginTop: 22, background: "#fff", borderRadius: 14, boxShadow: "0 2px 8px rgba(0,0,0,0.05)", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead style={{ background: "#f1f3f5" }}>
            <tr>
              <Th>WO</Th>
              <Th>Title</Th>
              <Th>Area</Th>
              <Th>Status</Th>
              <Th>Removed hrs</Th>
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
                <Td><Link href={`/work-removal/${row.id}`} style={openButtonStyle}>Open</Link></Td>
              </tr>
            ))}
            {filteredRows.length === 0 && (
              <tr>
                <Td colSpan={7}>No removal requests found.</Td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      </main>
    </div>
  );
}

function getSelectedShutdown(shutdowns: Shutdown[], requestedId?: string) {
  if (requestedId) {
    const requested = shutdowns.find((shutdown) => shutdown.id === requestedId);
    if (requested) return requested;
  }

  return shutdowns.find((shutdown) => shutdown.is_active) || shutdowns[0] || null;
}

function dashboardHref(filter: string, shutdownId: string | null) {
  const params = new URLSearchParams();
  if (filter !== "ALL") params.set("filter", filter);
  if (shutdownId) params.set("shutdown", shutdownId);
  const query = params.toString();
  return query ? `/work-removal/dashboard?${query}` : "/work-removal/dashboard";
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
    status === "MANAGER_REVIEW" ? "#7c3aed" :
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

const selectStyle = {
  minWidth: 260,
  height: 40,
  border: "1px solid #d1d5db",
  borderRadius: 8,
  background: "#fff",
  color: "#111827",
  padding: "0 10px",
  fontWeight: 800,
} as const;

const applyButtonStyle = {
  height: 40,
  border: "1px solid #ea580c",
  borderRadius: 8,
  background: "#f97316",
  color: "#fff",
  padding: "0 14px",
  fontWeight: 900,
  cursor: "pointer",
} as const;
