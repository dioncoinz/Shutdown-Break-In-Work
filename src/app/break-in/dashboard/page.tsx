import Link from "next/link";
import { requireCurrentUser } from "@/lib/auth/current-user";
import { listEmailActivityForShutdown } from "@/lib/email/tracking";
import {
  listRequestActivityForShutdown,
  mergeDashboardActivity,
  type RequestActivityEvent,
} from "@/lib/request-activity";
import { listShutdowns, type Shutdown } from "@/lib/shutdown/setup";
import { createSupabaseDb } from "@/lib/supabase/db";
import { formatPerthActivityDate } from "@/lib/time/format";

type ApprovalSourceRow = {
  id: string;
  created_at: string;
  wo_number: string;
  requestor_name: string | null;
  status: string | null;
  planner_decided_by: string | null;
  planner_decided_at: string | null;
  coordinator_decided_by: string | null;
  coordinator_decided_at: string | null;
  superintendent_decided_by: string | null;
  superintendent_decided_at: string | null;
  manager_decided_by?: string | null;
  manager_decided_at?: string | null;
};

type ApprovalHistoryEvent = {
  id: string;
  at: string;
  by: string;
  label: string;
  woNumber: string;
};

type WorkflowEmailSavings = {
  emailsSaved: number;
  workflowSteps: number;
  requests: number;
};

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ shutdown?: string }>;
}) {
  const currentUser = await requireCurrentUser();
  const loadedShutdowns = await listShutdowns();
  const sp = await searchParams;
  const activeShutdown = getSelectedShutdown(loadedShutdowns.shutdowns, sp.shutdown);
  const [
    emailStats,
    emailActivityEvents,
    requestActivityEvents,
    historicalActivityEvents,
    adminActivityEvents,
    approvalHistory,
  ] = await Promise.all([
    getWorkflowEmailSavingsForShutdown(activeShutdown?.id),
    listEmailActivityForShutdown(activeShutdown?.id),
    listRequestActivityForShutdown(activeShutdown?.id),
    listHistoricalActivityForShutdown(activeShutdown?.id),
    listAdminActivity(),
    listApprovalHistoryForShutdown(activeShutdown?.id),
  ]);
  const activityEvents = mergeDashboardActivity({
    emails: emailActivityEvents,
    requestActivity: [...requestActivityEvents, ...historicalActivityEvents, ...adminActivityEvents],
    limit: 16,
  });
  const displayName = currentUser.full_name || currentUser.email;
  const canManageShutdownSetup = currentUser.role === "admin" || currentUser.role === "coordinator";
  const canManageUsers = currentUser.role === "admin" || currentUser.role === "coordinator";

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f5f6f7",
        color: "#101418",
        display: "grid",
        gridTemplateColumns: "176px minmax(0, 1fr)",
      }}
    >
      <aside style={sidebarStyle}>
        <Link href="/" style={{ textDecoration: "none", display: "inline-flex" }}>
          <img src="/Breakinz_png.png" alt="Breakinz" style={{ height: 38, objectFit: "contain" }} />
        </Link>

        <nav style={{ display: "grid", gap: 7 }}>
          <SideLink href="/break-in/dashboard" active label="Dashboard" />
          <RequestGroup />
          <SideLink href="/admin/calendar" label="Calendar" />
          <SideLink href="/admin/shutdowns" label="Shutdowns" />
          {canManageShutdownSetup ? <SideLink href="/admin/setup" label="Create Shutdown" /> : null}
          <SideLink href="/admin/reports" label="Reports" />
          {canManageUsers ? <SideLink href="/admin/users" label="Users" /> : null}
          <SideLink href="/requests/new" label="Create Request" />
        </nav>

        <div style={{ marginTop: "auto", display: "grid", gap: 18 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={avatarStyle}>{displayName.slice(0, 1).toUpperCase()}</div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 800, lineHeight: 1.2, color: "#fff" }}>
                {displayName}
              </div>
              <div style={{ marginTop: 3, fontSize: 11, color: "#cbd5e1", fontWeight: 600 }}>
                {currentUser.role}
              </div>
            </div>
          </div>
          <SideLink href="/logout" label="Log out" />
        </div>
      </aside>

      <main style={{ minWidth: 0, padding: 24 }}>
        <section style={workspaceStyle}>
          <div style={workspaceHeaderStyle}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
              <h1 style={{ margin: 0, color: "#111827", fontSize: 18, fontWeight: 900 }}>
                Dashboard
              </h1>
              <span style={{ color: "#f05a1a", fontSize: 12, fontWeight: 900 }}>
                {activeShutdown?.name || "No active shutdown"}
              </span>
            </div>
            {activeShutdown?.is_active ? (
              <span style={statusPillStyle}>ACTIVE</span>
            ) : activeShutdown ? (
              <span style={mutedPillStyle}>INACTIVE</span>
            ) : (
              <span style={mutedPillStyle}>SETUP NEEDED</span>
            )}
          </div>

          <div style={contentGridStyle}>
            <form method="GET" action="/break-in/dashboard" style={{ display: "flex", justifyContent: "flex-end" }}>
              <label style={{ display: "grid", gap: 6 }}>
                <span style={{ color: "#334155", fontSize: 12, fontWeight: 900 }}>Shutdown</span>
                <select name="shutdown" defaultValue={activeShutdown?.id || ""} style={shutdownSelectStyle}>
                  {loadedShutdowns.shutdowns.length === 0 ? (
                    <option value="">No shutdowns found</option>
                  ) : null}
                  {loadedShutdowns.shutdowns.map((shutdown) => (
                    <option key={shutdown.id} value={shutdown.id}>
                      {shutdown.name}{shutdown.is_active ? " (Active)" : ""}
                    </option>
                  ))}
                </select>
              </label>
              <button type="submit" style={shutdownApplyStyle}>Apply</button>
            </form>

            <section style={metricPanelStyle}>
              <div>
              <div style={{ color: "#f05a1a", fontSize: 13, fontWeight: 900 }}>
                  Email savings
              </div>
                <h2 style={{ margin: "8px 0 0", color: "#111827", fontSize: 24, fontWeight: 900 }}>
                Emails saved from manual sending
                </h2>
                <p style={{ margin: "10px 0 0", color: "#4b5563", fontSize: 13, lineHeight: 1.55, maxWidth: 560 }}>
                Every submitted request and completed approval milestone is counted live for the active shutdown, showing how much manual email work the app has taken off the team.
                </p>
              </div>

              <div style={counterCardStyle}>
                <div style={{ color: "#4b5563", fontSize: 12, fontWeight: 900, textTransform: "uppercase" }}>
                  Emails saved
                </div>
                <div style={{ marginTop: 8, color: "#f05a1a", fontSize: 54, lineHeight: 1, fontWeight: 900 }}>
                  {emailStats.emailsSaved}
                </div>
                <div style={{ marginTop: 8, color: "#111827", fontSize: 12, fontWeight: 800 }}>
                  Across {emailStats.requests} request{emailStats.requests === 1 ? "" : "s"} and {emailStats.workflowSteps} workflow step{emailStats.workflowSteps === 1 ? "" : "s"}
                </div>
              </div>
            </section>

            {!activeShutdown ? (
              <div style={warningStyle}>
              Create or activate a shutdown to start collecting email savings for it.
              </div>
            ) : null}

            <div style={lowerGridStyle}>
            <section style={panelSectionStyle}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "center" }}>
              <div>
                  <h2 style={{ margin: 0, color: "#111827", fontSize: 15, fontWeight: 900 }}>
                  Activity log
                  </h2>
                  <p style={{ margin: "5px 0 0", color: "#6b7280", fontSize: 12, fontWeight: 600 }}>
                  Latest request, approval, and email activity for this shutdown.
                  </p>
                </div>
                <div style={{ color: "#6b7280", fontSize: 12, fontWeight: 800 }}>
                  {activityEvents.length} recent
                </div>
              </div>

              <div style={{ marginTop: 14, overflow: "auto", border: "1px solid #e5e7eb", borderRadius: 4 }}>
                <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 680 }}>
                  <thead style={{ background: "#fafafa" }}>
                    <tr>
                      <Th>Date/Time</Th>
                      <Th>Request Type</Th>
                      <Th>Action</Th>
                      <Th>Details</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {activityEvents.map((event) => (
                      <tr key={event.id} style={{ borderTop: "1px solid #e5e7eb" }}>
                        <Td>{formatActivityDate(event.created_at)}</Td>
                        <Td>{formatRequestType(event.request_type)}</Td>
                        <Td>{event.action}</Td>
                        <Td>
                          {event.details}
                          {event.actor ? ` by ${event.actor}` : ""}
                          {event.recipient_count !== null ? ` (${event.recipient_count} recipient${event.recipient_count === 1 ? "" : "s"})` : ""}
                        </Td>
                      </tr>
                    ))}

                    {activityEvents.length === 0 ? (
                      <tr>
                        <Td colSpan={4}>
                          Activity will appear here once requests are created or move through review.
                        </Td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </section>

              <section style={panelSectionStyle}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "center" }}>
                  <div>
                    <h2 style={{ margin: 0, color: "#111827", fontSize: 15, fontWeight: 900 }}>
                      Approval History
                    </h2>
                    <p style={{ margin: "5px 0 0", color: "#6b7280", fontSize: 12, fontWeight: 600 }}>
                      Recent approvals and review milestones.
                    </p>
                  </div>
                  <div style={{ color: "#6b7280", fontSize: 12, fontWeight: 800 }}>
                    {approvalHistory.length} recent
                  </div>
                </div>

                <div style={{ marginTop: 16, display: "grid", gap: 0 }}>
                  {approvalHistory.map((event, index) => (
                    <div key={event.id} style={approvalRowStyle}>
                      <div style={approvalMarkerWrapStyle}>
                        <span style={approvalMarkerStyle}>
                          <Icon path="m7 12 3 3 7-7" />
                        </span>
                        {index < approvalHistory.length - 1 ? <span style={approvalLineStyle} /> : null}
                      </div>
                      <div style={approvalContentStyle}>
                        <div style={approvalTopLineStyle}>
                          <div style={approvalLabelStyle}>
                            {event.label}
                          </div>
                          <div style={approvalDateStyle}>
                            {formatActivityDate(event.at)}
                          </div>
                        </div>
                        <div style={approvalWoStyle}>
                          WO {event.woNumber}
                        </div>
                        <div style={approvalByStyle}>
                          {event.by}
                        </div>
                      </div>
                    </div>
                  ))}

                  {approvalHistory.length === 0 ? (
                    <div style={emptyHistoryStyle}>
                      Approval milestones will appear here once requests start moving through review.
                    </div>
                  ) : null}
                </div>
              </section>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

function Th({ children }: { children?: React.ReactNode }) {
  return (
    <th style={{ padding: "8px 10px", textAlign: "left", color: "#111827", fontSize: 11, fontWeight: 900 }}>
      {children}
    </th>
  );
}

function Td({ children, colSpan }: { children: React.ReactNode; colSpan?: number }) {
  return (
    <td colSpan={colSpan} style={{ padding: "8px 10px", color: "#111827", fontSize: 12, fontWeight: 600 }}>
      {children}
    </td>
  );
}

function getSelectedShutdown(shutdowns: Shutdown[], requestedId?: string) {
  if (requestedId) {
    const requested = shutdowns.find((shutdown) => shutdown.id === requestedId);
    if (requested) return requested;
  }

  return shutdowns.find((shutdown) => shutdown.is_active) || shutdowns[0] || null;
}

async function listApprovalHistoryForShutdown(shutdownId: string | null | undefined) {
  if (!shutdownId) {
    return [] as ApprovalHistoryEvent[];
  }

  const selectWithManager =
    "id, created_at, wo_number, requestor_name, status, planner_decided_by, planner_decided_at, coordinator_decided_by, coordinator_decided_at, superintendent_decided_by, superintendent_decided_at, manager_decided_by, manager_decided_at";
  const selectWithoutManager =
    "id, created_at, wo_number, requestor_name, status, planner_decided_by, planner_decided_at, coordinator_decided_by, coordinator_decided_at, superintendent_decided_by, superintendent_decided_at";
  const supabase = createSupabaseDb();
  const [emergent, lateWork, workRemoval] = await Promise.all([
    supabase.from("break_in_requests").select(selectWithManager).eq("shutdown_id", shutdownId),
    supabase.from("late_work_requests").select(selectWithoutManager).eq("shutdown_id", shutdownId),
    supabase.from("work_removal_requests").select(selectWithManager).eq("shutdown_id", shutdownId),
  ]);

  const firstError = [emergent.error, lateWork.error, workRemoval.error].find(Boolean);
  if (firstError) {
    throw new Error(firstError.message);
  }

  return [
    ...approvalEventsFromRows((emergent.data ?? []) as unknown as ApprovalSourceRow[], "emergent"),
    ...approvalEventsFromRows((lateWork.data ?? []) as unknown as ApprovalSourceRow[], "late"),
    ...approvalEventsFromRows((workRemoval.data ?? []) as unknown as ApprovalSourceRow[], "removed"),
  ]
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, 8);
}

async function listHistoricalActivityForShutdown(
  shutdownId: string | null | undefined,
): Promise<RequestActivityEvent[]> {
  if (!shutdownId) {
    return [];
  }

  const selectWithManager =
    "id, created_at, wo_number, requestor_name, status, planner_decided_by, planner_decided_at, coordinator_decided_by, coordinator_decided_at, superintendent_decided_by, superintendent_decided_at, manager_decided_by, manager_decided_at";
  const selectWithoutManager =
    "id, created_at, wo_number, requestor_name, status, planner_decided_by, planner_decided_at, coordinator_decided_by, coordinator_decided_at, superintendent_decided_by, superintendent_decided_at";
  const supabase = createSupabaseDb();
  const [emergent, lateWork, workRemoval] = await Promise.all([
    supabase.from("break_in_requests").select(selectWithManager).eq("shutdown_id", shutdownId),
    supabase.from("late_work_requests").select(selectWithoutManager).eq("shutdown_id", shutdownId),
    supabase.from("work_removal_requests").select(selectWithManager).eq("shutdown_id", shutdownId),
  ]);

  const firstError = [emergent.error, lateWork.error, workRemoval.error].find(Boolean);
  if (firstError) {
    throw new Error(firstError.message);
  }

  return [
    ...historicalActivityFromRows((emergent.data ?? []) as unknown as ApprovalSourceRow[], "emergent"),
    ...historicalActivityFromRows((lateWork.data ?? []) as unknown as ApprovalSourceRow[], "late_work"),
    ...historicalActivityFromRows((workRemoval.data ?? []) as unknown as ApprovalSourceRow[], "work_removal"),
  ]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 32);
}

async function listAdminActivity(): Promise<RequestActivityEvent[]> {
  const supabase = createSupabaseDb();
  const [users, shutdowns] = await Promise.all([
    supabase
      .from("app_users")
      .select("id, created_at, email, full_name, role, invited_at, invite_accepted_at")
      .order("created_at", { ascending: false })
      .limit(24),
    supabase
      .from("shutdowns")
      .select("id, created_at, name, is_active")
      .order("created_at", { ascending: false })
      .limit(24),
  ]);

  const firstError = [users.error, shutdowns.error].find(Boolean);
  if (firstError) {
    throw new Error(firstError.message);
  }

  return [
    ...((shutdowns.data ?? []).map((shutdown): RequestActivityEvent => ({
      id: `shutdown-${shutdown.id}-created`,
      created_at: String(shutdown.created_at),
      request_type: "admin",
      action: "Shutdown created",
      actor: null,
      details: `${shutdown.name}${shutdown.is_active ? " (active)" : ""}`,
    }))),
    ...((users.data ?? []).flatMap((user): RequestActivityEvent[] => {
      const displayName = user.full_name ? `${user.full_name} (${user.email})` : String(user.email);
      const events: RequestActivityEvent[] = [
        {
          id: `user-${user.id}-created`,
          created_at: String(user.created_at),
          request_type: "admin",
          action: "User created",
          actor: null,
          details: `${displayName} - ${user.role}`,
        },
      ];

      if (user.invited_at) {
        events.push({
          id: `user-${user.id}-invited`,
          created_at: String(user.invited_at),
          request_type: "admin",
          action: "User invited",
          actor: null,
          details: displayName,
        });
      }

      if (user.invite_accepted_at) {
        events.push({
          id: `user-${user.id}-invite-accepted`,
          created_at: String(user.invite_accepted_at),
          request_type: "admin",
          action: "Invite accepted",
          actor: displayName,
          details: `${user.role} access activated`,
        });
      }

      return events;
    })),
  ]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 32);
}

async function getWorkflowEmailSavingsForShutdown(
  shutdownId: string | null | undefined,
): Promise<WorkflowEmailSavings> {
  if (!shutdownId) {
    return { emailsSaved: 0, workflowSteps: 0, requests: 0 };
  }

  const selectWithManager =
    "id, created_at, wo_number, requestor_name, status, planner_decided_by, planner_decided_at, coordinator_decided_by, coordinator_decided_at, superintendent_decided_by, superintendent_decided_at, manager_decided_by, manager_decided_at";
  const selectWithoutManager =
    "id, created_at, wo_number, requestor_name, status, planner_decided_by, planner_decided_at, coordinator_decided_by, coordinator_decided_at, superintendent_decided_by, superintendent_decided_at";
  const supabase = createSupabaseDb();
  const [emergent, lateWork, workRemoval] = await Promise.all([
    supabase.from("break_in_requests").select(selectWithManager).eq("shutdown_id", shutdownId),
    supabase.from("late_work_requests").select(selectWithoutManager).eq("shutdown_id", shutdownId),
    supabase.from("work_removal_requests").select(selectWithManager).eq("shutdown_id", shutdownId),
  ]);

  const firstError = [emergent.error, lateWork.error, workRemoval.error].find(Boolean);
  if (firstError) {
    throw new Error(firstError.message);
  }

  const rows = [
    ...((emergent.data ?? []) as unknown as ApprovalSourceRow[]),
    ...((lateWork.data ?? []) as unknown as ApprovalSourceRow[]),
    ...((workRemoval.data ?? []) as unknown as ApprovalSourceRow[]),
  ];
  const workflowSteps = rows.reduce((sum, row) => sum + countWorkflowEmailSteps(row), 0);

  return {
    emailsSaved: workflowSteps,
    workflowSteps,
    requests: rows.length,
  };
}

function countWorkflowEmailSteps(row: ApprovalSourceRow) {
  return [
    row.created_at,
    row.planner_decided_at,
    row.coordinator_decided_at,
    row.superintendent_decided_at,
    row.manager_decided_at,
  ].filter(Boolean).length;
}

function approvalEventsFromRows(rows: ApprovalSourceRow[], type: string) {
  const events: ApprovalHistoryEvent[] = [];

  for (const row of rows) {
    events.push({
      id: `${type}-${row.id}-submitted`,
      at: row.created_at,
      by: row.requestor_name || "Unknown",
      label: "Submitted",
      woNumber: row.wo_number,
    });

    addDecisionEvent(events, type, row, "planner", "Planner Review", row.planner_decided_by, row.planner_decided_at);
    addDecisionEvent(events, type, row, "coordinator", "Coordinator Review", row.coordinator_decided_by, row.coordinator_decided_at);
    addDecisionEvent(events, type, row, "superintendent", "Superintendent Review", row.superintendent_decided_by, row.superintendent_decided_at);
    addDecisionEvent(events, type, row, "manager", "Manager Review", row.manager_decided_by, row.manager_decided_at);

    const latestDecision = [
      [row.planner_decided_by, row.planner_decided_at],
      [row.coordinator_decided_by, row.coordinator_decided_at],
      [row.superintendent_decided_by, row.superintendent_decided_at],
      [row.manager_decided_by, row.manager_decided_at],
    ]
      .filter((entry): entry is [string, string] => Boolean(entry[0] && entry[1]))
      .sort((a, b) => new Date(b[1]).getTime() - new Date(a[1]).getTime())[0];

    if ((row.status === "APPROVED" || row.status === "COMPLETED") && latestDecision) {
      events.push({
        id: `${type}-${row.id}-approved`,
        at: latestDecision[1],
        by: latestDecision[0],
        label: "Approved",
        woNumber: row.wo_number,
      });
    }
  }

  return events;
}

function historicalActivityFromRows(
  rows: ApprovalSourceRow[],
  requestType: RequestActivityEvent["request_type"],
) {
  const events: RequestActivityEvent[] = [];

  for (const row of rows) {
    events.push({
      id: `${requestType}-${row.id}-submitted`,
      created_at: row.created_at,
      request_type: requestType,
      action: "Submitted",
      actor: row.requestor_name || null,
      details: `WO ${row.wo_number} submitted`,
    });

    addHistoricalDecisionActivity(
      events,
      requestType,
      row,
      "planner",
      "Planner review",
      row.planner_decided_by,
      row.planner_decided_at,
    );
    addHistoricalDecisionActivity(
      events,
      requestType,
      row,
      "coordinator",
      "Coordinator review",
      row.coordinator_decided_by,
      row.coordinator_decided_at,
    );
    addHistoricalDecisionActivity(
      events,
      requestType,
      row,
      "superintendent",
      "Superintendent review",
      row.superintendent_decided_by,
      row.superintendent_decided_at,
    );
    addHistoricalDecisionActivity(
      events,
      requestType,
      row,
      "manager",
      "Manager review",
      row.manager_decided_by,
      row.manager_decided_at,
    );

    const latestDecision = getLatestDecision(row);
    if ((row.status === "APPROVED" || row.status === "COMPLETED") && latestDecision) {
      events.push({
        id: `${requestType}-${row.id}-approved`,
        created_at: latestDecision.at,
        request_type: requestType,
        action: "Approved",
        actor: latestDecision.by,
        details: `WO ${row.wo_number} fully approved`,
      });
    }
  }

  return events;
}

function addHistoricalDecisionActivity(
  events: RequestActivityEvent[],
  requestType: RequestActivityEvent["request_type"],
  row: ApprovalSourceRow,
  stage: string,
  action: string,
  by?: string | null,
  at?: string | null,
) {
  if (!by || !at) {
    return;
  }

  events.push({
    id: `${requestType}-${row.id}-${stage}`,
    created_at: at,
    request_type: requestType,
    action,
    actor: by,
    details: `WO ${row.wo_number} ${action.toLowerCase()} completed`,
  });
}

function getLatestDecision(row: ApprovalSourceRow) {
  const latestDecision = [
    [row.planner_decided_by, row.planner_decided_at],
    [row.coordinator_decided_by, row.coordinator_decided_at],
    [row.superintendent_decided_by, row.superintendent_decided_at],
    [row.manager_decided_by, row.manager_decided_at],
  ]
    .filter((entry): entry is [string, string] => Boolean(entry[0] && entry[1]))
    .sort((a, b) => new Date(b[1]).getTime() - new Date(a[1]).getTime())[0];

  if (!latestDecision) return null;
  return { by: latestDecision[0], at: latestDecision[1] };
}

function addDecisionEvent(
  events: ApprovalHistoryEvent[],
  type: string,
  row: ApprovalSourceRow,
  stage: string,
  label: string,
  by?: string | null,
  at?: string | null,
) {
  if (!by || !at) {
    return;
  }

  events.push({
    id: `${type}-${row.id}-${stage}`,
    at,
    by,
    label,
    woNumber: row.wo_number,
  });
}

function formatRequestType(type: string) {
  if (type === "admin") return "Admin";
  if (type === "emergent") return "Emergent";
  if (type === "late_work") return "Late Work";
  if (type === "work_removal") return "Work Removal";
  return "Request";
}

function formatActivityDate(value: string) {
  return formatPerthActivityDate(value);
}

function SideLink({ href, label, active }: { href: string; label: string; active?: boolean }) {
  const icon = iconForSideLink(label);

  return (
    <Link
      href={href}
      prefetch={false}
      style={{
        display: "flex",
        alignItems: "center",
        minHeight: 36,
        padding: "0 10px",
        borderRadius: 4,
        background: active ? "linear-gradient(135deg, #f15a24, #db3f12)" : "transparent",
        color: active ? "#fff" : "#d7dee4",
        boxShadow: active ? "0 8px 18px rgba(219, 63, 18, 0.3)" : "none",
        textDecoration: "none",
        fontSize: 12,
        fontWeight: 800,
        gap: 10,
      }}
    >
      <span aria-hidden="true" style={sideIconStyle}>
        {icon}
      </span>
      {label}
    </Link>
  );
}

function RequestGroup() {
  return (
    <details open style={requestGroupStyle}>
      <summary style={requestSummaryStyle}>
        <span aria-hidden="true" style={sideIconStyle}>
          {iconForSideLink("Requests")}
        </span>
        Requests
      </summary>
      <div style={requestSubnavStyle}>
        <Link href="/break-in/list" prefetch={false} style={requestSubLinkStyle}>
          Emergent
        </Link>
        <Link href="/late-work/dashboard" prefetch={false} style={requestSubLinkStyle}>
          Late Work
        </Link>
        <Link href="/work-removal/dashboard" prefetch={false} style={requestSubLinkStyle}>
          Work Removal
        </Link>
      </div>
    </details>
  );
}

function iconForSideLink(label: string) {
  if (label === "Dashboard") return <Icon path="M3 10.5 12 3l9 7.5M5 9.5V21h5v-6h4v6h5V9.5" />;
  if (label === "Requests") return <Icon path="M7 4h10a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Zm2 5h6M9 13h6M9 17h4" />;
  if (label === "Late Work") return <Icon path="M12 6v6l4 2M21 12a9 9 0 1 1-3-6.7" />;
  if (label === "Work Removal") return <Icon path="M5 12h14M8 8l-4 4 4 4M16 8l4 4-4 4" />;
  if (label === "Calendar") return <Icon path="M7 3v4M17 3v4M4 8h16M6 5h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" />;
  if (label === "Shutdowns") return <Icon path="M12 2v10M7 5.5a8 8 0 1 0 10 0" />;
  if (label === "Reports") return <Icon path="M4 19V9M10 19V5M16 19v-7M22 19H2" />;
  if (label === "Create Shutdown" || label === "Create Request") return <Icon path="M12 5v14M5 12h14" />;
  if (label === "Users") return <Icon path="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2M9.5 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM21 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />;
  if (label === "Log out") return <Icon path="M10 17l5-5-5-5M15 12H3M21 3v18" />;
  return <Icon path="M12 12h.01" />;
}

function Icon({ path }: { path: string }) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d={path} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const sidebarStyle = {
  minHeight: "100vh",
  background: "linear-gradient(180deg, #071011 0%, #0a1214 55%, #050809 100%)",
  color: "#f8fafc",
  padding: "18px 10px",
  display: "flex",
  flexDirection: "column",
  gap: 24,
  position: "sticky",
  top: 0,
} as const;

const sideIconStyle = {
  width: 20,
  height: 20,
  display: "inline-grid",
  placeItems: "center",
  flex: "0 0 auto",
  color: "currentColor",
  fontSize: 0,
} as const;

const requestGroupStyle = {
  borderRadius: 4,
} as const;

const requestSummaryStyle = {
  display: "flex",
  alignItems: "center",
  minHeight: 36,
  padding: "0 10px",
  borderRadius: 4,
  color: "#d7dee4",
  cursor: "pointer",
  fontSize: 12,
  fontWeight: 800,
  gap: 10,
  listStyle: "none",
} as const;

const requestSubnavStyle = {
  margin: "4px 0 2px 30px",
  display: "grid",
  gap: 4,
} as const;

const requestSubLinkStyle = {
  minHeight: 28,
  display: "flex",
  alignItems: "center",
  borderRadius: 4,
  color: "#a8b3bd",
  textDecoration: "none",
  fontSize: 11,
  fontWeight: 800,
} as const;

const avatarStyle = {
  width: 34,
  height: 34,
  borderRadius: 999,
  background: "linear-gradient(135deg, #475569, #111827)",
  display: "grid",
  placeItems: "center",
  color: "#fff",
  fontWeight: 900,
} as const;

const workspaceStyle = {
  maxWidth: 1040,
  minHeight: "calc(100vh - 48px)",
  margin: "0 auto",
  background: "#fff",
  border: "1px solid #e5e7eb",
  borderRadius: 8,
  boxShadow: "0 10px 30px rgba(15, 23, 42, 0.08)",
  overflow: "hidden",
} as const;

const workspaceHeaderStyle = {
  minHeight: 58,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "0 20px",
  borderBottom: "1px solid #e5e7eb",
} as const;

const contentGridStyle = {
  padding: 20,
  display: "grid",
  gap: 18,
} as const;

const metricPanelStyle = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) 240px",
  gap: 24,
  alignItems: "center",
} as const;

const counterCardStyle = {
  border: "1px solid #e5e7eb",
  background: "#fafafa",
  borderRadius: 4,
  padding: 18,
  textAlign: "center",
} as const;

const statusPillStyle = {
  borderRadius: 4,
  padding: "8px 16px",
  background: "#dcfce7",
  color: "#15803d",
  fontSize: 12,
  fontWeight: 900,
} as const;

const mutedPillStyle = {
  borderRadius: 4,
  padding: "8px 16px",
  background: "#f3f4f6",
  color: "#6b7280",
  fontSize: 12,
  fontWeight: 900,
} as const;

const shutdownSelectStyle = {
  minWidth: 260,
  height: 38,
  border: "1px solid #d1d5db",
  borderRadius: 6,
  background: "#fff",
  color: "#111827",
  padding: "0 10px",
  fontWeight: 800,
} as const;

const shutdownApplyStyle = {
  alignSelf: "end",
  height: 38,
  marginLeft: 8,
  border: "1px solid #ea580c",
  borderRadius: 6,
  background: "#f97316",
  color: "#fff",
  padding: "0 12px",
  fontWeight: 900,
  cursor: "pointer",
} as const;

const warningStyle = {
  marginTop: 18,
  padding: "12px 14px",
  borderRadius: 8,
  border: "1px solid #fed7aa",
  background: "#fff7ed",
  color: "#9a3412",
  fontWeight: 800,
} as const;

const lowerGridStyle = {
  borderTop: "1px solid #e5e7eb",
  paddingTop: 18,
  display: "grid",
  gridTemplateColumns: "minmax(0, 1.3fr) minmax(320px, 0.7fr)",
  gap: 18,
} as const;

const panelSectionStyle = {
  minWidth: 0,
} as const;

const approvalRowStyle = {
  display: "grid",
  gridTemplateColumns: "24px minmax(0, 1fr)",
  gap: 8,
  alignItems: "start",
  minHeight: 54,
  padding: "0 0 10px",
} as const;

const approvalMarkerWrapStyle = {
  position: "relative",
  display: "grid",
  justifyItems: "center",
  minHeight: 38,
} as const;

const approvalMarkerStyle = {
  width: 15,
  height: 15,
  borderRadius: 999,
  display: "inline-grid",
  placeItems: "center",
  color: "#16a34a",
  background: "#dcfce7",
  border: "1px solid #86efac",
  fontSize: 0,
  zIndex: 1,
} as const;

const approvalLineStyle = {
  position: "absolute",
  top: 15,
  bottom: 0,
  width: 1,
  background: "#86efac",
} as const;

const approvalContentStyle = {
  minWidth: 0,
  display: "grid",
  gap: 3,
  paddingBottom: 4,
} as const;

const approvalTopLineStyle = {
  display: "flex",
  alignItems: "baseline",
  justifyContent: "space-between",
  gap: 10,
  minWidth: 0,
} as const;

const approvalLabelStyle = {
  minWidth: 0,
  color: "#111827",
  fontSize: 12,
  fontWeight: 900,
  lineHeight: 1.25,
  overflowWrap: "anywhere",
} as const;

const approvalDateStyle = {
  flex: "0 0 auto",
  color: "#4b5563",
  fontSize: 11,
  fontWeight: 800,
  whiteSpace: "nowrap",
} as const;

const approvalWoStyle = {
  color: "#6b7280",
  fontSize: 11,
  fontWeight: 700,
  lineHeight: 1.25,
} as const;

const approvalByStyle = {
  color: "#374151",
  fontSize: 11,
  fontWeight: 700,
  lineHeight: 1.3,
  overflowWrap: "anywhere",
} as const;

const emptyHistoryStyle = {
  border: "1px dashed #d1d5db",
  borderRadius: 4,
  padding: 14,
  color: "#6b7280",
  fontSize: 12,
  fontWeight: 700,
} as const;
