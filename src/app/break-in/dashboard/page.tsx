import Link from "next/link";
import { createSupabaseDb } from "@/lib/supabase/db";

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

type RemovalRow = {
  id: string;
  status: string | null;
};

type RemovalResourceRow = {
  request_id: string;
  hours: number;
};

async function loadDashboardData() {
  try {
    const supabase = createSupabaseDb();

    const { data, error } = await supabase
      .from("break_in_requests")
      .select(
        "id, created_at, wo_number, wo_title, area, priority, workgroup, status, progress_percent"
      )
      .order("created_at", { ascending: false });

    if (error) {
      return { ok: false as const, message: error.message || "Unknown Supabase error" };
    }

    const { data: resData, error: resErr } = await supabase
      .from("break_in_resources")
      .select("request_id, hours");

    if (resErr) {
      console.error("Error loading resources:", resErr.message);
    }

    const { data: removalData, error: removalErr } = await supabase
      .from("work_removal_requests")
      .select("id, status");

    if (removalErr) {
      console.error("Error loading removal requests:", removalErr.message);
    }

    const { data: removalResData, error: removalResErr } = await supabase
      .from("work_removal_resources")
      .select("request_id, hours");

    if (removalResErr) {
      console.error("Error loading removal resources:", removalResErr.message);
    }

    return {
      ok: true as const,
      rows: (data ?? []) as Row[],
      resources: (resData ?? []) as ResourceRow[],
      removalRows: (removalData ?? []) as RemovalRow[],
      removalResources: (removalResData ?? []) as RemovalResourceRow[],
    };
  } catch (error) {
    console.error("Dashboard load failed:", error);
    return {
      ok: false as const,
      message: error instanceof Error ? error.message : "Unknown network error",
    };
  }
}

export default async function BreakInDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const sp = await searchParams;
  const filter = (sp?.filter ?? "ALL").toUpperCase();
  const loaded = await loadDashboardData();
  if (!loaded.ok) {
    return (
      <div style={{ padding: 24 }}>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: "#111" }}>
          Error loading dashboard
        </h1>
        <p style={{ marginTop: 10, color: "#4b5563" }}>{loaded.message}</p>
        <p style={{ marginTop: 10, color: "#6b7280" }}>
          This usually means the app could not reach Supabase from your current environment.
        </p>
      </div>
    );
  }

  const rows = loaded.rows;
  const resources = loaded.resources;
  const removalRows = loaded.removalRows;
  const removalResources = loaded.removalResources;

  const plannedById = new Map<string, number>();
  for (const r of resources) {
    plannedById.set(
      r.request_id,
      (plannedById.get(r.request_id) ?? 0) + (Number(r.hours) || 0)
    );
  }

  const removedById = new Map<string, number>();
  for (const resource of removalResources) {
    removedById.set(
      resource.request_id,
      (removedById.get(resource.request_id) ?? 0) + (Number(resource.hours) || 0)
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

  const total = rows.length;
  const completed = rows.filter((r) => r.status === "COMPLETED").length;
  const inProgress = rows.filter((r) => r.status === "IN_PROGRESS").length;
  const rejected = rows.filter((r) => r.status === "REJECTED").length;
  const outstanding = total - completed - rejected;

  let totalPlannedHours = 0;
  let totalDoneHours = 0;

  for (const r of rows) {
    const planned = plannedById.get(r.id) ?? 0;
    totalPlannedHours += planned;
    totalDoneHours += doneHoursFor(r, planned);
  }

  totalPlannedHours = round1(totalPlannedHours);
  totalDoneHours = round1(totalDoneHours);

  const approvedRemovalRows = removalRows.filter((row) => row.status === "APPROVED");
  const approvedRemovalHours = round1(
    approvedRemovalRows.reduce((sum, row) => sum + (removedById.get(row.id) ?? 0), 0)
  );

  const workgroupHours = Array.from(
    rows.reduce((acc, row) => {
      const key = row.workgroup?.trim() || "Unallocated";
      const planned = plannedById.get(row.id) ?? 0;
      acc.set(key, (acc.get(key) ?? 0) + planned);
      return acc;
    }, new Map<string, number>())
  )
    .map(([name, hours]) => ({ name, hours: round1(hours) }))
    .sort((a, b) => b.hours - a.hours);

  const filteredRows = rows.filter((r) => {
    if (filter === "ALL") return true;
    if (filter === "OUTSTANDING") {
      return r.status !== "COMPLETED" && r.status !== "REJECTED";
    }
    return (r.status ?? "").toUpperCase() === filter;
  });

  return (
    <div style={{ padding: 28, background: "#f4f6f8", minHeight: "100vh" }}>
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
          <Link
            href="/work-removal/new"
            style={{
              fontWeight: 600,
              color: "#fff",
              textDecoration: "none",
              padding: "10px 14px",
              borderRadius: 10,
              border: "1px solid #b45309",
              background: "#d97706",
            }}
          >
            + New Removal Request
          </Link>
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
            + New Request
          </Link>
        </div>
      </div>

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
        <RemovalSummaryLink
          href="/work-removal/dashboard?filter=APPROVED"
          jobs={approvedRemovalRows.length}
          hours={approvedRemovalHours}
        />
      </div>

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

      <div style={{ marginTop: 16 }}>
        <WorkgroupHoursChart rows={workgroupHours} />
      </div>

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
                      }}
                    >
                      <Link
                        href={`/break-in/${r.id}`}
                        style={{
                          padding: "8px 12px",
                          borderRadius: 10,
                          border: "1px solid #cbd5e1",
                          background: "#f8fafc",
                          color: "#0f172a",
                          fontWeight: 700,
                          textDecoration: "none",
                        }}
                      >
                        Open
                      </Link>
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

      <div
        style={{
          marginTop: 14,
          fontSize: 14,
          color: "#444",
          textAlign: "center",
          fontWeight: 600,
        }}
      >
        Built by Valeron
      </div>
    </div>
  );
}

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

function RemovalSummaryLink({
  href,
  jobs,
  hours,
}: {
  href: string;
  jobs: number;
  hours: number;
}) {
  return (
    <Link href={href} style={{ textDecoration: "none", color: "inherit" }}>
      <div
        style={{
          background: "#fff7ed",
          padding: 18,
          borderRadius: 14,
          boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
          border: "1px solid #fdba74",
        }}
      >
        <div style={{ fontSize: 13, color: "#9a3412", fontWeight: 800 }}>Approved Work Removal</div>
        <div style={{ marginTop: 10, display: "flex", justifyContent: "space-between", gap: 14 }}>
          <div>
            <div style={{ fontSize: 24, fontWeight: 900, color: "#c2410c" }}>{jobs}</div>
            <div style={{ fontSize: 12, color: "#7c2d12", fontWeight: 700 }}>WO removed</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 24, fontWeight: 900, color: "#b45309" }}>{hours.toFixed(1)}</div>
            <div style={{ fontSize: 12, color: "#7c2d12", fontWeight: 700 }}>hours removed</div>
          </div>
        </div>
        <div style={{ marginTop: 8, fontSize: 12, color: "#7c2d12", opacity: 0.85 }}>
          Click to open removal list
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
  const remaining = Math.max(0, safePlanned - safeDone);
  const donePct = safePlanned === 0 ? 0 : Math.round((safeDone / safePlanned) * 100);
  const remainingPct = Math.max(0, 100 - donePct);

  return (
    <div
      style={{
        background: "#fff",
        padding: 18,
        borderRadius: 14,
        boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
      }}
    >
      <div style={{ fontSize: 13, color: "#222", fontWeight: 800 }}>Total Hours Split</div>

      <div
        style={{
          marginTop: 10,
          height: 44,
          borderRadius: 14,
          overflow: "hidden",
          background: "#e5e7eb",
          display: "flex",
        }}
      >
        <div
          style={{
            width: `${donePct}%`,
            minWidth: donePct > 0 ? 90 : 0,
            height: "100%",
            background: "#2563eb",
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: donePct > 0 ? "0 12px" : 0,
            fontSize: 12,
            fontWeight: 800,
          }}
        >
          {donePct > 0 ? (
            <>
              <span>Completed</span>
              <span>{safeDone.toFixed(1)} h</span>
            </>
          ) : null}
        </div>
        <div
          style={{
            width: `${remainingPct}%`,
            minWidth: remainingPct > 0 ? 90 : 0,
            height: "100%",
            background: "#cbd5e1",
            color: "#0f172a",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: remainingPct > 0 ? "0 12px" : 0,
            fontSize: 12,
            fontWeight: 800,
          }}
        >
          {remainingPct > 0 ? (
            <>
              <span>Remaining</span>
              <span>{remaining.toFixed(1)} h</span>
            </>
          ) : null}
        </div>
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
        <span>
          <b>Remaining:</b> {remaining.toFixed(1)} h
        </span>
        <span style={{ color: "#2563eb", fontWeight: 900 }}>{donePct}% complete</span>
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
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const completedLen = (pctCompleted / 100) * circumference;
  const rejectedLen = (pctRejected / 100) * circumference;
  const outstandingLen = Math.max(0, circumference - completedLen - rejectedLen);

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
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 18,
          flexWrap: "wrap",
        }}
      >
        <div
          style={{
            position: "relative",
            width: 120,
            height: 120,
            display: "grid",
            placeItems: "center",
            flex: "0 0 auto",
          }}
        >
          <svg width="120" height="120" viewBox="0 0 120 120" style={{ transform: "rotate(-90deg)" }}>
            <circle cx="60" cy="60" r={radius} fill="none" stroke="#e5e7eb" strokeWidth="16" />
            <circle
              cx="60"
              cy="60"
              r={radius}
              fill="none"
              stroke="#16a34a"
              strokeWidth="16"
              strokeDasharray={`${completedLen} ${circumference}`}
            />
            <circle
              cx="60"
              cy="60"
              r={radius}
              fill="none"
              stroke="#dc2626"
              strokeWidth="16"
              strokeDasharray={`${rejectedLen} ${circumference}`}
              strokeDashoffset={-completedLen}
            />
            <circle
              cx="60"
              cy="60"
              r={radius}
              fill="none"
              stroke="#9ca3af"
              strokeWidth="16"
              strokeDasharray={`${outstandingLen} ${circumference}`}
              strokeDashoffset={-(completedLen + rejectedLen)}
            />
          </svg>

          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "grid",
              placeItems: "center",
              textAlign: "center",
            }}
          >
            <div>
              <div style={{ fontSize: 24, fontWeight: 900, color: "#111", lineHeight: 1 }}>
                {total}
              </div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#4b5563", marginTop: 4 }}>
                Total jobs
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: "grid", gap: 10, flex: "1 1 220px" }}>
          <LegendRow color="#6b7280" label="Outstanding" value={outstanding} percent={pctOutstanding} />
          <LegendRow color="#16a34a" label="Completed" value={completed} percent={pctCompleted} />
          <LegendRow color="#dc2626" label="Rejected" value={rejected} percent={pctRejected} />
        </div>
      </div>
    </div>
  );
}

function LegendRow({
  color,
  label,
  value,
  percent,
}: {
  color: string;
  label: string;
  value: number;
  percent: number;
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "14px 1fr auto auto",
        alignItems: "center",
        gap: 10,
        fontSize: 13,
        color: "#111",
      }}
    >
      <span
        style={{
          width: 10,
          height: 10,
          borderRadius: 999,
          background: color,
          display: "inline-block",
        }}
      />
      <span style={{ fontWeight: 700 }}>{label}</span>
      <span style={{ color: "#4b5563", fontWeight: 700 }}>{value}</span>
      <span style={{ color, fontWeight: 900 }}>{percent}%</span>
    </div>
  );
}

function WorkgroupHoursChart({
  rows,
}: {
  rows: { name: string; hours: number }[];
}) {
  const maxHours = Math.max(...rows.map((r) => r.hours), 0);

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
        Planned Hours by Workgroup
      </div>

      {rows.length === 0 ? (
        <div style={{ marginTop: 12, fontSize: 13, color: "#4b5563" }}>
          No workgroup hours available yet.
        </div>
      ) : (
        <div style={{ marginTop: 14, display: "grid", gap: 12 }}>
          {rows.map((row) => {
            const pct = maxHours === 0 ? 0 : Math.round((row.hours / maxHours) * 100);

            return (
              <div key={row.name}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 12,
                    alignItems: "baseline",
                    marginBottom: 6,
                  }}
                >
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#111" }}>
                    {row.name}
                  </span>
                  <span style={{ fontSize: 12, fontWeight: 800, color: "#2563eb" }}>
                    {row.hours.toFixed(1)} h
                  </span>
                </div>
                <div
                  style={{
                    height: 12,
                    background: "#e5e7eb",
                    borderRadius: 999,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: `${pct}%`,
                      height: "100%",
                      background: "#0ea5e9",
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
