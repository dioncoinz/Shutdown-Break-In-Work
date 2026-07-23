import Link from "next/link";
import { AppSidebar } from "@/components/AppSidebar";
import { requireCurrentUser } from "@/lib/auth/current-user";
import { listShutdowns, type Shutdown } from "@/lib/shutdown/setup";
import { createSupabaseDb } from "@/lib/supabase/db";
import { StatusColumnFilter } from "./StatusColumnFilter";

type Row = {
  id: string;
  wo_number: string;
  wo_title: string | null;
  area: string | null;
  workgroup: string | null;
  status: string | null;
  progress_percent: number | null;
  requestor_name: string | null;
};

type ResourceRow = { request_id: string; hours: number };

async function loadEmergentWork(shutdownId: string | null) {
  const supabase = createSupabaseDb();
  let query = supabase
    .from("break_in_requests")
    .select("id, wo_number, wo_title, area, workgroup, status, progress_percent, requestor_name")
    .order("created_at", { ascending: false });

  if (shutdownId) query = query.eq("shutdown_id", shutdownId);

  const [requests, resources] = await Promise.all([
    query,
    supabase.from("break_in_resources").select("request_id, hours"),
  ]);
  const error = requests.error || resources.error;

  return error
    ? { ok: false as const, message: error.message }
    : {
        ok: true as const,
        rows: (requests.data ?? []) as Row[],
        resources: (resources.data ?? []) as ResourceRow[],
      };
}

export default async function EmergentWorkListPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; q?: string; shutdown?: string; status?: string | string[] }>;
}) {
  const currentUser = await requireCurrentUser();
  const params = await searchParams;
  const filter = (params.filter ?? "ALL").toUpperCase();
  const searchQuery = params.q?.trim() ?? "";
  const requestedStatuses = Array.isArray(params.status)
    ? params.status
    : params.status
      ? [params.status]
      : [];
  const selectedStatuses = [...new Set(requestedStatuses.map((status) => status.toUpperCase()))];
  const loadedShutdowns = await listShutdowns();
  const selectedShutdown = selectShutdown(loadedShutdowns.shutdowns, params.shutdown);
  const shutdownId = selectedShutdown?.id ?? null;
  const loaded = await loadEmergentWork(shutdownId);

  if (!loaded.ok) {
    return <main style={{ padding: 24 }}><h1>Error loading emergent work</h1><p>{loaded.message}</p></main>;
  }

  const hoursByRequest = new Map<string, number>();
  for (const resource of loaded.resources) {
    hoursByRequest.set(resource.request_id, (hoursByRequest.get(resource.request_id) ?? 0) + (Number(resource.hours) || 0));
  }

  const approved = (row: Row) =>
    row.status === "APPROVED" || row.status === "IN_PROGRESS" || row.status === "COMPLETED";
  const outstanding = (row: Row) => !approved(row) && row.status !== "REJECTED";
  const normalizedSearch = searchQuery.toLowerCase();
  const searchedRows = loaded.rows.filter((row) => {
    const searchText = `${row.wo_number} ${row.wo_title ?? ""}`.toLowerCase();
    return !normalizedSearch || searchText.includes(normalizedSearch);
  });
  const selectedStatusSet = new Set(selectedStatuses);
  const kpiFilteredRows = searchedRows.filter((row) => {
    if (filter === "ALL") return true;
    if (filter === "OUTSTANDING") return outstanding(row);
    if (filter === "APPROVED") return approved(row);
    return (row.status ?? "").toUpperCase() === filter;
  });
  const filteredRows = kpiFilteredRows.filter((row) =>
    selectedStatusSet.size === 0 || selectedStatusSet.has((row.status ?? "UNKNOWN").toUpperCase())
  );
  const availableStatuses = sortStatuses(
    [...new Set(loaded.rows.map((row) => (row.status ?? "UNKNOWN").toUpperCase()))]
  );
  const approvedRows = searchedRows.filter(approved);
  const approvedHours = approvedRows.reduce((sum, row) => sum + (hoursByRequest.get(row.id) ?? 0), 0);

  return (
    <div style={pageStyle}>
      <AppSidebar active="emergent" user={currentUser} />
      <main style={{ minWidth: 0, padding: 28 }}>
        <h1 style={{ fontSize: 26, fontWeight: 600, color: "#111", margin: 0 }}>Emergent Work List</h1>

        <form method="GET" action="/break-in/list" style={filterFormStyle}>
          <input type="hidden" name="filter" value={filter} />
          {selectedStatuses.map((status) => <input key={status} type="hidden" name="status" value={status} />)}
          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ color: "#334155", fontSize: 12, fontWeight: 900 }}>Search</span>
            <input name="q" defaultValue={searchQuery} placeholder="WO or description" style={searchInputStyle} />
          </label>
          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ color: "#334155", fontSize: 12, fontWeight: 900 }}>Shutdown</span>
            <select name="shutdown" defaultValue={shutdownId || ""} style={selectStyle}>
              {loadedShutdowns.shutdowns.length === 0 ? <option value="">No shutdowns found</option> : null}
              {loadedShutdowns.shutdowns.map((shutdown) => (
                <option key={shutdown.id} value={shutdown.id}>{shutdown.name}{shutdown.is_active ? " (Active)" : ""}</option>
              ))}
            </select>
          </label>
          <button type="submit" style={applyButtonStyle}>Apply</button>
        </form>

        <div style={kpiGridStyle}>
          <Kpi href={listHref("ALL", shutdownId, searchQuery, selectedStatuses)} active={filter === "ALL"} label="Total Requests" value={searchedRows.length} />
          <Kpi href={listHref("OUTSTANDING", shutdownId, searchQuery, selectedStatuses)} active={filter === "OUTSTANDING"} label="Outstanding" value={searchedRows.filter(outstanding).length} />
          <Kpi href={listHref("APPROVED", shutdownId, searchQuery, selectedStatuses)} active={filter === "APPROVED"} label="Approved Emergent Work" value={approvedRows.length} color="#2563eb" />
          <KpiCard label="Approved Emergent hours" value={approvedHours.toFixed(1)} suffix="h" color="#1d4ed8" />
        </div>

        <div style={tableWrapStyle}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 900 }}>
            <thead style={{ background: "#f1f3f5" }}>
              <tr><Th>WO</Th><Th>Title</Th><Th>Area</Th><Th>Workgroup</Th><Th><StatusColumnFilter statuses={availableStatuses} selectedStatuses={selectedStatuses} /></Th><Th>Progress</Th><Th>Planned hrs</Th><Th>Requestor</Th><Th /></tr>
            </thead>
            <tbody>
              {filteredRows.map((row, index) => (
                <tr key={row.id} style={{ borderBottom: "1px solid #eee", background: index % 2 ? "#fafafa" : "#fff" }}>
                  <Td>{row.wo_number}</Td><Td>{row.wo_title || "Untitled"}</Td><Td>{row.area || "-"}</Td><Td>{row.workgroup || "-"}</Td>
                  <Td><Status status={row.status || ""} /></Td>
                  <Td>{Math.max(0, Math.min(100, Math.round(row.progress_percent ?? 0)))}%</Td>
                  <Td>{(hoursByRequest.get(row.id) ?? 0).toFixed(1)}</Td><Td>{row.requestor_name || "-"}</Td>
                  <Td><Link href={`/break-in/${row.id}`} style={openButtonStyle}>Open</Link></Td>
                </tr>
              ))}
              {filteredRows.length === 0 ? <tr><Td colSpan={9}>No emergent work requests found.</Td></tr> : null}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}

function selectShutdown(shutdowns: Shutdown[], requestedId?: string) {
  return shutdowns.find((shutdown) => shutdown.id === requestedId)
    || shutdowns.find((shutdown) => shutdown.is_active)
    || shutdowns[0]
    || null;
}

function listHref(filter: string, shutdownId: string | null, searchQuery: string, statuses: string[]) {
  const params = new URLSearchParams();
  if (filter !== "ALL") params.set("filter", filter);
  if (shutdownId) params.set("shutdown", shutdownId);
  if (searchQuery) params.set("q", searchQuery);
  for (const status of statuses) params.append("status", status);
  return params.size ? `/break-in/list?${params}` : "/break-in/list";
}

function Kpi({ href, active, label, value, color }: { href: string; active: boolean; label: string; value: number; color?: string }) {
  return (
    <Link href={href} style={{ textDecoration: "none", color: "inherit" }}>
      <div style={{ ...kpiStyle, border: active ? "2px solid #111" : "1px solid rgba(0,0,0,0.06)" }}>
        <div style={{ fontSize: 13, color: "#222", fontWeight: 800 }}>{label}</div>
        <div style={{ marginTop: 6, fontSize: 28, fontWeight: 900, color: color || "#111" }}>{value}</div>
        <div style={{ marginTop: 8, fontSize: 12, color: "#444", opacity: 0.85 }}>Click to filter</div>
      </div>
    </Link>
  );
}

function sortStatuses(statuses: string[]) {
  const order = ["SUBMITTED", "COORD_REVIEW", "SUPER_REVIEW", "MANAGER_REVIEW", "APPROVED", "IN_PROGRESS", "COMPLETED", "REJECTED"];
  return statuses.sort((a, b) => {
    const aIndex = order.indexOf(a);
    const bIndex = order.indexOf(b);
    return (aIndex === -1 ? order.length : aIndex) - (bIndex === -1 ? order.length : bIndex) || a.localeCompare(b);
  });
}

function KpiCard({ label, value, suffix, color }: { label: string; value: string; suffix?: string; color?: string }) {
  return (
    <div style={{ ...kpiStyle, border: "1px solid rgba(0,0,0,0.06)" }}>
      <div style={{ fontSize: 13, color: "#222", fontWeight: 800 }}>{label}</div>
      <div style={{ marginTop: 6, fontSize: 28, fontWeight: 900, color: color || "#111" }}>{value}{suffix || ""}</div>
    </div>
  );
}

function Th({ children }: { children?: React.ReactNode }) {
  return <th style={{ padding: 14, textAlign: "left", fontSize: 13, color: "#222", whiteSpace: "nowrap" }}>{children}</th>;
}

function Td({ children, colSpan }: { children: React.ReactNode; colSpan?: number }) {
  return <td colSpan={colSpan} style={{ padding: 14, fontSize: 14, color: "#111", verticalAlign: "top" }}>{children}</td>;
}

function Status({ status }: { status: string }) {
  const color = status === "COMPLETED" ? "#16a34a" : status === "IN_PROGRESS" ? "#2563eb" : status === "REJECTED" ? "#dc2626" : "#6b7280";
  return <span style={{ padding: "4px 10px", borderRadius: 999, background: `${color}20`, color, fontWeight: 900, fontSize: 12 }}>{status || "UNKNOWN"}</span>;
}

const pageStyle = { minHeight: "100vh", background: "#f4f6f8", display: "grid", gridTemplateColumns: "176px minmax(0, 1fr)" } as const;
const filterFormStyle = { marginTop: 18, display: "flex", justifyContent: "flex-end", gap: 8, flexWrap: "wrap", alignItems: "end" } as const;
const kpiGridStyle = { marginTop: 20, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16 } as const;
const kpiStyle = { background: "#fff", padding: 18, borderRadius: 14, boxShadow: "0 2px 8px rgba(0,0,0,0.05)" } as const;
const tableWrapStyle = { marginTop: 22, background: "#fff", borderRadius: 14, boxShadow: "0 2px 8px rgba(0,0,0,0.05)", overflowX: "auto" } as const;
const selectStyle = { minWidth: 260, height: 40, border: "1px solid #d1d5db", borderRadius: 8, background: "#fff", color: "#111827", padding: "0 10px", fontWeight: 800 } as const;
const searchInputStyle = { ...selectStyle, fontWeight: 600 } as const;
const applyButtonStyle = { height: 40, border: "1px solid #ea580c", borderRadius: 8, background: "#f97316", color: "#fff", padding: "0 14px", fontWeight: 900, cursor: "pointer" } as const;
const openButtonStyle = { padding: "8px 12px", borderRadius: 10, border: "1px solid #cbd5e1", background: "#f8fafc", color: "#0f172a", fontWeight: 700, textDecoration: "none" } as const;
