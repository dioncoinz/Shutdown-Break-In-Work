import Link from "next/link";
import { createSupabaseDb } from "@/lib/supabase/db";
import DeleteButton from "../../../components/DeleteButton";

type Row = {
  id: string;
  created_at: string;
  wo_number: string;
  wo_title: string | null;

  area: string | null;
  priority: string | null;
  workgroup: string | null;

  status: string | null;
  progress_percent: number | null;
};

type ResourceRow = {
  request_id: string;
  hours: number;
};

export default async function BreakInDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const sp = await searchParams;
  const filter = (sp?.filter ?? "ALL").toUpperCase();

  const supabase = createSupabaseDb();

  const { data, error } = await supabase
    .from("break_in_requests")
    .select(
      "id, created_at, wo_number, wo_title, area, priority, workgroup, status, progress_percent"
    )
    .order("created_at", { ascending: false });

  if (error) {
    return <div style={{ padding: 24 }}>Error loading dashboard</div>;
  }

  const { data: resData, error: resErr } = await supabase
    .from("break_in_resources")
    .select("request_id, hours");

  if (resErr) {
    // Don't kill the page — table + KPIs can still load.
    console.error("Error loading resources:", resErr.message);
  }

  const rows = (data ?? []) as Row[];
  const resources = (resData ?? []) as ResourceRow[];

  // Planned hours map: request_id -> total planned hours
  const plannedById = new Map<string, number>();
  for (const r of resources) {
    plannedById.set(
      r.request_id,
      (plannedById.get(r.request_id) ?? 0) + (Number(r.hours) || 0)
    );
  }

  const clampPct = (n: number) => Math.max(0, Math.min(100, Math.round(n)));
  const round1 = (n: number) => Math.round((Number(n) || 0) * 10) / 10;

  function doneHoursFor(row: Row, planned: number) {
    const st = row.status ?? "UNKNOWN";
    if (st === "REJECTED") return 0;
    if (st === "COMPLETED") return planned;

    const pct = clampPct(row.progress_percent ?? 0);
    return (planned * pct) / 100;
  }

  // KPI calculations (based on all rows, not filtered)
  const total = rows.length;
  const completed = rows.filter((r) => r.status === "COMPLETED").length;
  const inProgress = rows.filter((r) => r.status === "IN_PROGRESS").length;
  const rejected = rows.filter((r) => r.status === "REJECTED").length;
  const outstanding = total - completed - rejected;

  // Total hours across ALL jobs (meeting view)
  let totalPlannedHours = 0;
  let totalDoneHours = 0;

  for (const r of rows) {
    const planned = plannedById.get(r.id) ?? 0;
    totalPlannedHours += planned;
    totalDoneHours += doneHoursFor(r, planned);
  }

  totalPlannedHours = round1(totalPlannedHours);
  totalDoneHours = round1(totalDoneHours);

  // Filter table rows
  const filteredRows = rows.filter((r) => {
    if (filter === "ALL") return true;
    if (filter === "OUTSTANDING") {
      return r.status !== "COMPLETED" && r.status !== "REJECTED";
    }
    return (r.status ?? "").toUpperCase() === filter;
  });

  return (
    <div style={{ padding: 28, background: "#f4f6f8", minHeight: "100vh" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <img
            src="/logo.png"
            alt="Company logo"
            style={{ height: 48, objectFit: "contain" }}
          />

          <h1 style={{ fontSize: 26, fontWeight: 600, color: "#111", margin: 0 }}>
            Shutdown Break-in Work Dashboard
          </h1>
        </div>

        <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
          <Link href="/break-in/new" style={{ fontWeight: 600, color: "#111" }}>
            + New Request
          </Link>
        </div>
      </div>

      {/* KPI cards (clickable filters) */}
      <div
        style={{
          marginTop: 20,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 16,
        }}
      >
        <KpiLink
          href="/break-in/dashboard"
          active={filter === "ALL"}
          label="Total Jobs"
          value={total}
        />
        <KpiLink
          href="/break-in/dashboard?filter=OUTSTANDING"
          active={filter === "OUTSTANDING"}
          label="Outstanding"
          value={outstanding}
        />
        <KpiLink
          href="/break-in/dashboard?filter=IN_PROGRESS"
          active={filter === "IN_PROGRESS"}
          label="In Progress"
          value={inProgress}
          color="#2563eb"
        />
        <KpiLink
          href="/break-in/dashboard?filter=COMPLETED"
          active={filter === "COMPLETED"}
          label="Completed"
          value={completed}
          color="#16a34a"
        />
        <KpiLink
          href="/break-in/dashboard?filter=REJECTED"
          active={filter === "REJECTED"}
          label="Rejected"
          value={rejected}
          color="#dc2626"
        />
      </div>

      {/* Two top bars */}
      <div
        style={{
          marginTop: 16,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: 16,
        }}
      >
        <HoursBar planned={totalPlannedHours} done={totalDoneHours} />
        <OverallStatusBar
          total={total}
          outstanding={outstanding}
          completed={completed}
          rejected={rejected}
        />
      </div>

      {/* Table */}
      <div
        style={{
          marginTop: 22,
          background: "#fff",
          borderRadius: 14,
          boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
          overflow: "hidden",
        }}
      >
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead style={{ background: "#f1f3f5" }}>
            <tr>
              <Th>WO</Th>
              <Th>Title</Th>
              <Th>Area</Th>
              <Th>Workgroup</Th>
              <Th>Status</Th>
              <Th>Progress</Th>
              <Th>Planned hrs</Th>
              <Th>Done hrs</Th>
              <Th />
            </tr>
          </thead>

          <tbody>
            {filteredRows.map((r, idx) => {
              const planned = round1(plannedById.get(r.id) ?? 0);
              const done = round1(doneHoursFor(r, planned));

              return (
                <tr
                  key={r.id}
                  style={{
                    borderBottom: "1px solid #eee",
                    background: idx % 2 === 0 ? "#fff" : "#fafafa",
                  }}
                >
                  <Td>{r.wo_number}</Td>
                  <Td>{r.wo_title || "Untitled"}</Td>
                  <Td>{r.area || "-"}</Td>
                  <Td>{r.workgroup || "-"}</Td>
                  <Td>
                    <StatusBadge status={r.status || ""} />
                  </Td>
                  <Td>
                    <ProgressBar status={r.status || ""} value={r.progress_percent || 0} />
                  </Td>
                  <Td>{planned.toFixed(1)}</Td>
                  <Td>{done.toFixed(1)}</Td>
                  <Td>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "flex-end",
                        gap: 10,
                      }}
                    >
                      <Link href={`/break-in/${r.id}`}>Open</Link>
                      <DeleteButton id={r.id} />
                    </div>
                  </Td>
                </tr>
              );
            })}

            {filteredRows.length === 0 && (
              <tr>
                <Td colSpan={9}>No requests found.</Td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: 10, fontSize: 12, color: "#444" }}>
        Built by Valeron
              </div>
    </div>
  );
}

/* ---------- Components ---------- */

function KpiLink({
  href,
  active,
  label,
  value,
  color,
}: {
  href: string;
  active: boolean;
  label: string;
  value: number;
  color?: string;
}) {
  return (
    <Link href={href} style={{ textDecoration: "none", color: "inherit" }}>
      <div
        style={{
          background: "#fff",
          padding: 18,
          borderRadius: 14,
          boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
          border: active ? "2px solid #111" : "1px solid rgba(0,0,0,0.06)",
        }}
      >
        <div style={{ fontSize: 13, color: "#222", fontWeight: 800 }}>{label}</div>
        <div
          style={{
            marginTop: 6,
            fontSize: 28,
            fontWeight: 900,
            color: color || "#111",
          }}
        >
          {value}
        </div>
        <div style={{ marginTop: 8, fontSize: 12, color: "#444", opacity: 0.85 }}>
          Click to filter
        </div>
      </div>
    </Link>
  );
}

function Th({ children }: { children?: React.ReactNode }) {
  return (
    <th
      style={{
        padding: 14,
        textAlign: "left",
        fontWeight: 800,
        fontSize: 13,
        color: "#222",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  colSpan,
}: {
  children: React.ReactNode;
  colSpan?: number;
}) {
  return (
    <td
      colSpan={colSpan}
      style={{
        padding: 14,
        fontSize: 14,
        color: "#111",
        fontWeight: 500,
        verticalAlign: "top",
      }}
    >
      {children}
    </td>
  );
}

function StatusBadge({ status }: { status: string }) {
  const color =
    status === "COMPLETED"
      ? "#16a34a"
      : status === "IN_PROGRESS"
      ? "#2563eb"
      : status === "REJECTED"
      ? "#dc2626"
      : "#6b7280";

  return (
    <span
      style={{
        padding: "4px 10px",
        borderRadius: 999,
        background: `${color}20`,
        color,
        fontWeight: 900,
        fontSize: 12,
        display: "inline-block",
      }}
    >
      {status || "UNKNOWN"}
    </span>
  );
}

function ProgressBar({ value, status }: { value: number; status: string }) {
  const v = Math.max(0, Math.min(100, Math.round(value)));

  const color =
    status === "COMPLETED"
      ? "#16a34a"
      : status === "IN_PROGRESS"
      ? "#2563eb"
      : status === "REJECTED"
      ? "#dc2626"
      : "#9ca3af";

  return (
    <div style={{ width: 160 }}>
      <div
        style={{
          height: 10,
          background: "#e5e7eb",
          borderRadius: 999,
          overflow: "hidden",
        }}
      >
        <div style={{ width: `${v}%`, height: "100%", background: color }} />
      </div>
      <div style={{ marginTop: 6, fontSize: 12, fontWeight: 800, color: "#111" }}>
        {v}%
      </div>
    </div>
  );
}

function HoursBar({ planned, done }: { planned: number; done: number }) {
  const safePlanned = Math.max(0, planned);
  const safeDone = Math.max(0, Math.min(safePlanned, done));
  const pct = safePlanned === 0 ? 0 : Math.round((safeDone / safePlanned) * 100);

  return (
    <div
      style={{
        background: "#fff",
        padding: 18,
        borderRadius: 14,
        boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
      }}
    >
      <div style={{ fontSize: 13, color: "#222", fontWeight: 800 }}>
        Total Hours (Planned vs Completed)
      </div>

      <div
        style={{
          marginTop: 10,
          height: 12,
          background: "#e5e7eb",
          borderRadius: 999,
          overflow: "hidden",
        }}
      >
        <div style={{ width: `${pct}%`, height: "100%", background: "#2563eb" }} />
      </div>

      <div
        style={{
          marginTop: 10,
          display: "flex",
          gap: 14,
          flexWrap: "wrap",
          fontSize: 12,
          color: "#111",
        }}
      >
        <span>
          <b>Planned:</b> {safePlanned.toFixed(1)} h
        </span>
        <span>
          <b>Done:</b> {safeDone.toFixed(1)} h
        </span>
        <span style={{ color: "#2563eb", fontWeight: 900 }}>{pct}%</span>
      </div>
    </div>
  );
}

function OverallStatusBar({
  total,
  outstanding,
  completed,
  rejected,
}: {
  total: number;
  outstanding: number;
  completed: number;
  rejected: number;
}) {
  const safeTotal = Math.max(1, total);
  const pctOutstanding = Math.round((outstanding / safeTotal) * 100);
  const pctCompleted = Math.round((completed / safeTotal) * 100);
  const pctRejected = Math.max(0, 100 - pctOutstanding - pctCompleted);

  return (
    <div
      style={{
        background: "#fff",
        padding: 18,
        borderRadius: 14,
        boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
      }}
    >
      <div style={{ fontSize: 13, color: "#222", fontWeight: 800 }}>
        Overall Status (Outstanding / Completed / Rejected)
      </div>

      <div
        style={{
          marginTop: 10,
          height: 12,
          width: "100%",
          borderRadius: 999,
          overflow: "hidden",
          background: "#e5e7eb",
          display: "flex",
        }}
      >
        <div style={{ width: `${pctOutstanding}%`, background: "#9ca3af" }} />
        <div style={{ width: `${pctCompleted}%`, background: "#16a34a" }} />
        <div style={{ width: `${pctRejected}%`, background: "#dc2626" }} />
      </div>

      <div
        style={{
          marginTop: 10,
          display: "flex",
          gap: 14,
          flexWrap: "wrap",
          fontSize: 12,
          color: "#111",
        }}
      >
        <span>
          <b style={{ color: "#6b7280" }}>■</b> Outstanding: {outstanding}
        </span>
        <span>
          <b style={{ color: "#16a34a" }}>■</b> Completed: {completed}
        </span>
        <span>
          <b style={{ color: "#dc2626" }}>■</b> Rejected: {rejected}
        </span>
        <span style={{ opacity: 0.75 }}>Total: {total}</span>
      </div>
    </div>
  );
}
