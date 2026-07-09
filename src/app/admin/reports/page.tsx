import Link from "next/link";
import { requireCurrentUser } from "@/lib/auth/current-user";
import { AppSidebar } from "@/components/AppSidebar";
import { listShutdowns, type Shutdown } from "@/lib/shutdown/setup";
import { createSupabaseDb } from "@/lib/supabase/db";

type ReportType = "emergent" | "late" | "removed";

type Row = {
  id: string;
  wo_number: string;
  wo_title: string | null;
  area: string | null;
  priority: string | null;
  workgroup: string | null;
  status: string | null;
  requestor_name: string | null;
  progress_percent?: number | null;
};

type ResourceRow = {
  request_id: string;
  hours: number;
};

type ReportData = {
  resources: ResourceRow[];
  rows: Row[];
  type: ReportType;
};

async function loadReport(type: ReportType, shutdownId: string | null) {
  const supabase = createSupabaseDb();
  const requestTable =
    type === "late"
      ? "late_work_requests"
      : type === "removed"
        ? "work_removal_requests"
        : "break_in_requests";
  const resourceTable =
    type === "late"
      ? "late_work_resources"
      : type === "removed"
        ? "work_removal_resources"
        : "break_in_resources";
  const requestSelect =
    type === "emergent"
      ? "id, wo_number, wo_title, area, priority, workgroup, status, requestor_name, progress_percent"
      : "id, wo_number, wo_title, area, priority, workgroup, status, requestor_name";

  let requestQuery = supabase
    .from(requestTable)
    .select(requestSelect)
    .order("created_at", { ascending: false });

  if (shutdownId) {
    requestQuery = requestQuery.eq("shutdown_id", shutdownId);
  }

  const { data: rows, error: rowError } = await requestQuery;
  if (rowError) {
    return { ok: false as const, message: rowError.message };
  }

  const { data: resources, error: resourceError } = await supabase
    .from(resourceTable)
    .select("request_id, hours");

  if (resourceError) {
    return { ok: false as const, message: resourceError.message };
  }

  return {
    ok: true as const,
    data: {
      type,
      rows: (rows ?? []) as unknown as Row[],
      resources: (resources ?? []) as unknown as ResourceRow[],
    },
  };
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ shutdown?: string; type?: string }>;
}) {
  const currentUser = await requireCurrentUser();
  const sp = await searchParams;
  const type = normalizeType(sp.type);
  const loadedShutdowns = await listShutdowns();
  const selectedShutdown = getSelectedShutdown(loadedShutdowns.shutdowns, sp.shutdown);
  const selectedShutdownId = selectedShutdown?.id ?? null;
  const reports = await Promise.all([
    loadReport("emergent", selectedShutdownId),
    loadReport("late", selectedShutdownId),
    loadReport("removed", selectedShutdownId),
  ]);
  const firstError = reports.find((report) => !report.ok);

  if (firstError && !firstError.ok) {
    return (
      <div style={{ minHeight: "100vh", background: "#f4f6f8", display: "grid", gridTemplateColumns: "176px minmax(0, 1fr)" }}>
        <AppSidebar active="reports" user={currentUser} />
        <main style={{ padding: 28 }}>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 900, color: "#111" }}>
            Error loading reports
          </h1>
          <p style={{ marginTop: 10, color: "#4b5563" }}>{firstError.message}</p>
        </main>
      </div>
    );
  }

  const reportData = reports
    .filter((report): report is { ok: true; data: ReportData } => report.ok)
    .map((report) => report.data);
  const activeReport = reportData.find((report) => report.type === type) || reportData[0];
  const summaries = reportData.map(buildSummary);
  const executive = buildExecutiveSummary(summaries);
  const activeSummary = summaries.find((summary) => summary.type === activeReport.type) || summaries[0];
  const detailRows = activeReport.rows.slice(0, 12);

  return (
    <div style={{ minHeight: "100vh", background: "#f4f6f8", display: "grid", gridTemplateColumns: "176px minmax(0, 1fr)" }}>
      <AppSidebar active="reports" user={currentUser} />

      <main style={{ minWidth: 0, padding: 28 }}>
        <section style={heroStyle}>
          <div>
            <div style={{ color: "#f05a1a", fontSize: 12, fontWeight: 900, textTransform: "uppercase" }}>
              Executive shutdown report
            </div>
            <h1 style={{ margin: "6px 0 0", color: "#111827", fontSize: 30, fontWeight: 900 }}>
              {selectedShutdown?.name || "No shutdown selected"}
            </h1>
            <p style={{ margin: "10px 0 0", color: "#4b5563", fontSize: 14, fontWeight: 700 }}>
              {formatDateRange(selectedShutdown?.start_date || null, selectedShutdown?.end_date || null)}
              {selectedShutdown?.is_active ? " · Active" : selectedShutdown ? " · Inactive" : ""}
            </p>
          </div>

          <form method="GET" action="/admin/reports" style={{ display: "flex", alignItems: "end", gap: 8, flexWrap: "wrap" }}>
            <input type="hidden" name="type" value={type} />
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
        </section>

        <section style={kpiGridStyle}>
          <ExecutiveKpi label="Total requests" value={executive.total} />
          <ExecutiveKpi label="Approved" value={executive.approved} color="#15803d" />
          <ExecutiveKpi label="Outstanding" value={executive.outstanding} color="#b45309" />
          <ExecutiveKpi label="Rejected" value={executive.rejected} color="#dc2626" />
          <ExecutiveKpi label="Total hours impact" value={`${executive.totalHours.toFixed(1)}h`} color="#1d4ed8" />
          <ExecutiveKpi label="Approved hours" value={`${executive.approvedHours.toFixed(1)}h`} color="#0f766e" />
        </section>

        <section style={meetingGridStyle}>
          <div style={panelStyle}>
            <SectionHeader title="Request Mix" note="Volume and approved hours by request stream." />
            <div style={{ display: "grid", gap: 12 }}>
              {summaries.map((summary) => (
                <MixRow key={summary.type} summary={summary} total={Math.max(executive.total, 1)} />
              ))}
            </div>
          </div>

          <div style={panelStyle}>
            <SectionHeader title="Approval Position" note="Current status split for meeting discussion." />
            <div style={{ display: "grid", gap: 12 }}>
              <StatusRow label="Approved" value={executive.approved} total={executive.total} color="#16a34a" />
              <StatusRow label="Outstanding" value={executive.outstanding} total={executive.total} color="#f59e0b" />
              <StatusRow label="Rejected" value={executive.rejected} total={executive.total} color="#dc2626" />
            </div>
          </div>
        </section>

        <section style={{ ...panelStyle, marginTop: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 14, flexWrap: "wrap", alignItems: "center" }}>
            <SectionHeader
              title="Detailed Report"
              note={`${typeLabel(activeReport.type)} · ${activeSummary.total} requests · ${activeSummary.totalHours.toFixed(1)}h total impact`}
            />
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <ReportTab active={type === "emergent"} href={reportHref("emergent", selectedShutdownId)} label="Emergent" />
              <ReportTab active={type === "late"} href={reportHref("late", selectedShutdownId)} label="Late Work" />
              <ReportTab active={type === "removed"} href={reportHref("removed", selectedShutdownId)} label="Removed" />
            </div>
          </div>

          <div style={{ marginTop: 14, overflow: "auto", border: "1px solid #e5e7eb", borderRadius: 8 }}>
            <table style={{ width: "100%", minWidth: 900, borderCollapse: "collapse" }}>
              <thead style={{ background: "#f8fafc" }}>
                <tr>
                  <Th>WO</Th>
                  <Th>Title</Th>
                  <Th>Area</Th>
                  <Th>Workgroup</Th>
                  <Th>Status</Th>
                  <Th>Hours</Th>
                  {activeReport.type === "emergent" ? <Th>Progress</Th> : null}
                  <Th>Requestor</Th>
                  <Th />
                </tr>
              </thead>
              <tbody>
                {detailRows.map((row) => (
                  <tr key={row.id} style={{ borderTop: "1px solid #e5e7eb" }}>
                    <Td>{row.wo_number}</Td>
                    <Td>{row.wo_title || "Untitled"}</Td>
                    <Td>{row.area || "-"}</Td>
                    <Td>{row.workgroup || "-"}</Td>
                    <Td><StatusBadge status={row.status || ""} /></Td>
                    <Td>{(activeSummary.hoursById.get(row.id) ?? 0).toFixed(1)}</Td>
                    {activeReport.type === "emergent" ? <Td>{row.progress_percent ?? 0}%</Td> : null}
                    <Td>{row.requestor_name || "-"}</Td>
                    <Td>
                      <Link href={openHref(activeReport.type, row.id)} style={smallLinkStyle}>
                        Open
                      </Link>
                    </Td>
                  </tr>
                ))}

                {detailRows.length === 0 ? (
                  <tr>
                    <Td colSpan={activeReport.type === "emergent" ? 9 : 8}>No report data found.</Td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}

function buildSummary(report: ReportData) {
  const hoursById = new Map<string, number>();
  for (const resource of report.resources) {
    hoursById.set(resource.request_id, (hoursById.get(resource.request_id) ?? 0) + (Number(resource.hours) || 0));
  }

  const approvedRows = report.rows.filter((row) => isApproved(row.status));
  const rejected = report.rows.filter((row) => row.status === "REJECTED").length;
  const totalHours = round1(report.rows.reduce((sum, row) => sum + (hoursById.get(row.id) ?? 0), 0));
  const approvedHours = round1(approvedRows.reduce((sum, row) => sum + (hoursById.get(row.id) ?? 0), 0));

  return {
    approved: approvedRows.length,
    approvedHours,
    hoursById,
    outstanding: report.rows.length - approvedRows.length - rejected,
    rejected,
    total: report.rows.length,
    totalHours,
    type: report.type,
  };
}

function buildExecutiveSummary(summaries: ReturnType<typeof buildSummary>[]) {
  return summaries.reduce(
    (acc, summary) => ({
      approved: acc.approved + summary.approved,
      approvedHours: round1(acc.approvedHours + summary.approvedHours),
      outstanding: acc.outstanding + summary.outstanding,
      rejected: acc.rejected + summary.rejected,
      total: acc.total + summary.total,
      totalHours: round1(acc.totalHours + summary.totalHours),
    }),
    { approved: 0, approvedHours: 0, outstanding: 0, rejected: 0, total: 0, totalHours: 0 },
  );
}

function normalizeType(value?: string): ReportType {
  if (value === "late" || value === "removed") return value;
  return "emergent";
}

function getSelectedShutdown(shutdowns: Shutdown[], requestedId?: string) {
  if (requestedId) {
    const requested = shutdowns.find((shutdown) => shutdown.id === requestedId);
    if (requested) return requested;
  }

  return shutdowns.find((shutdown) => shutdown.is_active) || shutdowns[0] || null;
}

function reportHref(type: ReportType, shutdownId: string | null) {
  const params = new URLSearchParams({ type });
  if (shutdownId) params.set("shutdown", shutdownId);
  return `/admin/reports?${params.toString()}`;
}

function openHref(type: ReportType, id: string) {
  if (type === "late") return `/late-work/${id}`;
  if (type === "removed") return `/work-removal/${id}`;
  return `/break-in/${id}`;
}

function typeLabel(type: ReportType) {
  if (type === "late") return "Late Work";
  if (type === "removed") return "Removed Work";
  return "Emergent";
}

function isApproved(status: string | null) {
  return status === "APPROVED" || status === "COMPLETED";
}

function round1(value: number) {
  return Math.round((Number(value) || 0) * 10) / 10;
}

function formatDateRange(start: string | null, end: string | null) {
  if (!start && !end) return "No dates set";
  if (start && end) return `${start} to ${end}`;
  return start || end || "No dates set";
}

function ExecutiveKpi({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <div style={kpiCardStyle}>
      <div style={{ color: "#475569", fontSize: 12, fontWeight: 900, textTransform: "uppercase" }}>{label}</div>
      <div style={{ marginTop: 8, color: color || "#111827", fontSize: 32, lineHeight: 1, fontWeight: 900 }}>{value}</div>
    </div>
  );
}

function SectionHeader({ note, title }: { note: string; title: string }) {
  return (
    <div>
      <h2 style={{ margin: 0, color: "#111827", fontSize: 18, fontWeight: 900 }}>{title}</h2>
      <p style={{ margin: "5px 0 0", color: "#64748b", fontSize: 13, fontWeight: 700 }}>{note}</p>
    </div>
  );
}

function MixRow({ summary, total }: { summary: ReturnType<typeof buildSummary>; total: number }) {
  const percent = Math.round((summary.total / total) * 100);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: 13, fontWeight: 900, color: "#111827" }}>
        <span>{typeLabel(summary.type)}</span>
        <span>{summary.total} requests · {summary.approvedHours.toFixed(1)} approved hrs</span>
      </div>
      <div style={barTrackStyle}>
        <div style={{ ...barFillStyle, width: `${percent}%`, background: requestColor(summary.type) }} />
      </div>
    </div>
  );
}

function StatusRow({ color, label, total, value }: { color: string; label: string; total: number; value: number }) {
  const percent = total > 0 ? Math.round((value / total) * 100) : 0;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: 13, fontWeight: 900, color: "#111827" }}>
        <span>{label}</span>
        <span>{value} · {percent}%</span>
      </div>
      <div style={barTrackStyle}>
        <div style={{ ...barFillStyle, width: `${percent}%`, background: color }} />
      </div>
    </div>
  );
}

function ReportTab({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      style={{
        padding: "10px 13px",
        borderRadius: 8,
        border: active ? "1px solid #ea580c" : "1px solid #d1d5db",
        background: active ? "#f97316" : "#fff",
        color: active ? "#fff" : "#111",
        textDecoration: "none",
        fontWeight: 900,
      }}
    >
      {label}
    </Link>
  );
}

function Th({ children }: { children?: React.ReactNode }) {
  return <th style={{ textAlign: "left", padding: 14, color: "#111", fontSize: 13, whiteSpace: "nowrap" }}>{children}</th>;
}

function Td({ children, colSpan }: { children: React.ReactNode; colSpan?: number }) {
  return <td colSpan={colSpan} style={{ padding: 14, color: "#111", fontSize: 14, fontWeight: 600 }}>{children}</td>;
}

function StatusBadge({ status }: { status: string }) {
  const color =
    status === "APPROVED" || status === "COMPLETED"
      ? "#16a34a"
      : status === "REJECTED"
        ? "#dc2626"
        : status === "IN_PROGRESS"
          ? "#2563eb"
          : "#6b7280";

  return <span style={{ padding: "4px 10px", borderRadius: 999, background: `${color}20`, color, fontWeight: 900, fontSize: 12 }}>{status || "UNKNOWN"}</span>;
}

function requestColor(type: ReportType) {
  if (type === "late") return "#2563eb";
  if (type === "removed") return "#d97706";
  return "#f05a1a";
}

const heroStyle = {
  background: "#fff",
  border: "1px solid #e5e7eb",
  borderRadius: 8,
  boxShadow: "0 10px 30px rgba(15, 23, 42, 0.08)",
  display: "flex",
  justifyContent: "space-between",
  gap: 18,
  alignItems: "center",
  padding: 22,
  flexWrap: "wrap",
} as const;

const kpiGridStyle = {
  marginTop: 18,
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
  gap: 14,
} as const;

const kpiCardStyle = {
  background: "#fff",
  border: "1px solid #e5e7eb",
  borderRadius: 8,
  padding: 16,
  boxShadow: "0 2px 8px rgba(15, 23, 42, 0.04)",
} as const;

const meetingGridStyle = {
  marginTop: 18,
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
  gap: 18,
} as const;

const panelStyle = {
  background: "#fff",
  border: "1px solid #e5e7eb",
  borderRadius: 8,
  boxShadow: "0 2px 8px rgba(15, 23, 42, 0.04)",
  padding: 18,
} as const;

const barTrackStyle = {
  height: 10,
  marginTop: 8,
  background: "#e5e7eb",
  borderRadius: 999,
  overflow: "hidden",
} as const;

const barFillStyle = {
  height: "100%",
  borderRadius: 999,
} as const;

const smallLinkStyle = {
  padding: "8px 10px",
  borderRadius: 8,
  border: "1px solid #d1d5db",
  background: "#fff",
  color: "#111",
  fontWeight: 800,
  textDecoration: "none",
} as const;

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
