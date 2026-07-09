import Link from "next/link";
import { requireShutdownManagerUser } from "@/lib/auth/current-user";
import { getEffectiveApprovalStages, hasShutdownStarted, listShutdowns } from "@/lib/shutdown/setup";

const inputStyle = {
  width: "100%",
  padding: "10px 12px",
  border: "1px solid #d1d5db",
  borderRadius: 8,
  fontSize: 14,
  color: "#111",
  background: "#fff",
} as const;

export default async function AdminSetupPage({
  searchParams,
}: {
  searchParams: Promise<{ assigned?: string; created?: string; error?: string }>;
}) {
  const currentUser = await requireShutdownManagerUser();
  const sp = await searchParams;
  const loaded = await listShutdowns();
  const shutdowns = loaded.shutdowns;
  const displayName = currentUser.full_name || currentUser.email;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#e7eaee",
        color: "#101418",
        display: "grid",
        gridTemplateColumns: "240px minmax(0, 1fr)",
      }}
    >
      <aside
        style={{
          minHeight: "100vh",
          background: "#071012",
          color: "#f8fafc",
          padding: "22px 16px",
          display: "flex",
          flexDirection: "column",
          gap: 26,
          position: "sticky",
          top: 0,
        }}
      >
        <Link href="/" style={{ textDecoration: "none", display: "inline-flex" }}>
          <img src="/Breakinz_png.png" alt="Breakinz" style={{ height: 38, objectFit: "contain" }} />
        </Link>

        <nav style={{ display: "grid", gap: 7 }}>
          <SideLink href="/break-in/dashboard" label="Dashboard" />
          <RequestGroup />
          <SideLink href="/admin/calendar" label="Calendar" />
          <SideLink href="/admin/shutdowns" label="Shutdowns" />
          <SideLink href="/admin/setup" active label="Create Shutdown" />
          <SideLink href="/admin/reports" label="Reports" />
          <SideLink href="/admin/users" label="Users" />
          <SideLink href="/requests/new" label="Create Request" />
          <SideLink href="/logout" label="Log out" />
        </nav>

        <div style={{ marginTop: "auto", display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 999,
              background: "#334155",
              display: "grid",
              placeItems: "center",
              color: "#fff",
              fontWeight: 900,
            }}
          >
            {displayName.slice(0, 1).toUpperCase()}
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 800, lineHeight: 1.1 }}>{displayName}</div>
            <div style={{ marginTop: 3, fontSize: 11, color: "#a8b3bd", fontWeight: 700 }}>
              {currentUser.role}
            </div>
          </div>
        </div>
      </aside>

      <main style={{ minWidth: 0 }}>
        <header
          style={{
            height: 74,
            background: "#fff",
            borderBottom: "1px solid #dfe3e8",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 28px",
            gap: 18,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
            <span style={{ color: "#f05a1a", fontWeight: 900 }}>Admin</span>
            <span style={{ color: "#94a3b8", fontWeight: 900 }}>/</span>
            <h1 style={{ margin: 0, color: "#111827", fontSize: 20, fontWeight: 900 }}>
              Create Shutdown
            </h1>
          </div>
        </header>

        <div style={{ padding: 28 }}>
          {(sp.assigned || sp.created || sp.error || loaded.needsSetup) && (
            <div
              style={{
                marginBottom: 18,
                padding: "12px 14px",
                borderRadius: 8,
                border: sp.error || loaded.needsSetup ? "1px solid #fecaca" : "1px solid #bbf7d0",
                background: sp.error || loaded.needsSetup ? "#fef2f2" : "#f0fdf4",
                color: sp.error || loaded.needsSetup ? "#991b1b" : "#166534",
                fontWeight: 800,
              }}
            >
              {loaded.needsSetup
                ? "Run the shutdowns table section in supabase-schema.sql before creating shutdowns."
                : sp.error ||
                  (sp.assigned
                    ? `${sp.assigned} existing request${sp.assigned === "1" ? "" : "s"} assigned to shutdown.`
                    : "Shutdown created and existing unassigned requests were attached.")}
            </div>
          )}

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(300px, 380px) 1fr",
              gap: 18,
              alignItems: "start",
            }}
          >
            <section style={panelStyle}>
              <h2 style={{ margin: 0, color: "#111", fontSize: 18, fontWeight: 900 }}>
                Create shutdown
              </h2>

              <form action="/api/admin/shutdowns" method="post" style={{ marginTop: 16, display: "grid", gap: 12 }}>
                <label>
                  <FieldLabel>Name</FieldLabel>
                  <input name="name" required style={inputStyle} placeholder="March 2025 Shutdown" />
                </label>

                <label>
                  <FieldLabel>Start date</FieldLabel>
                  <input name="start_date" type="date" style={inputStyle} />
                </label>

                <label>
                  <FieldLabel>End date</FieldLabel>
                  <input name="end_date" type="date" style={inputStyle} />
                </label>

                <label>
                  <FieldLabel>Description</FieldLabel>
                  <textarea
                    name="description"
                    style={{ ...inputStyle, minHeight: 92, resize: "vertical" }}
                    placeholder="Optional notes for this shutdown"
                  />
                </label>

                <label style={{ display: "flex", alignItems: "center", gap: 9, color: "#111", fontWeight: 800 }}>
                  <input name="is_active" type="checkbox" defaultChecked />
                  Active
                </label>

                <div>
                  <FieldLabel>Approval requirements</FieldLabel>
                  <p style={{ margin: "0 0 8px", color: "#475569", fontSize: 12, fontWeight: 700, lineHeight: 1.45 }}>
                    These checkboxes apply during lead-up. On the shutdown start date, all approvers are required automatically.
                  </p>
                  <div style={{ border: "1px solid #e5e7eb", borderRadius: 8, overflow: "hidden" }}>
                    <ApprovalHeader />
                    <ApprovalRow
                      label="Emergent"
                      prefix="break_in"
                      defaults={{
                        planner: true,
                        coordinator: true,
                        superintendent: true,
                        manager: true,
                      }}
                    />
                    <ApprovalRow
                      label="Late work"
                      prefix="late_work"
                      defaults={{
                        planner: true,
                        coordinator: true,
                        superintendent: true,
                        manager: false,
                      }}
                    />
                    <ApprovalRow
                      label="Work removal"
                      prefix="work_removal"
                      defaults={{
                        planner: true,
                        coordinator: true,
                        superintendent: true,
                        manager: true,
                      }}
                    />
                  </div>
                </div>

                <button type="submit" style={primaryButtonStyle} disabled={loaded.needsSetup}>
                  Create shutdown
                </button>
              </form>
            </section>

            <section style={{ ...panelStyle, overflow: "hidden", padding: 0 }}>
              <div style={{ padding: "18px 20px", borderBottom: "1px solid #e5e7eb" }}>
                <h2 style={{ margin: 0, color: "#111", fontSize: 18, fontWeight: 900 }}>
                  Shutdowns
                </h2>
              </div>

              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead style={{ background: "#f8fafc" }}>
                  <tr>
                    <Th>Name</Th>
                    <Th>Dates</Th>
                    <Th>Status</Th>
                    <Th>Approvals</Th>
                    <Th>Notes</Th>
                    <Th>Existing</Th>
                  </tr>
                </thead>
                <tbody>
                  {shutdowns.map((shutdown) => {
                    const started = hasShutdownStarted(shutdown);

                    return (
                      <tr key={shutdown.id} style={{ borderTop: "1px solid #e5e7eb" }}>
                        <Td>{shutdown.name}</Td>
                        <Td>{formatDateRange(shutdown.start_date, shutdown.end_date)}</Td>
                        <Td>
                          <div style={{ display: "grid", gap: 4 }}>
                            <span>{shutdown.is_active ? "Active" : "Inactive"}</span>
                            <span style={{ color: started ? "#166534" : "#475569", fontSize: 12, fontWeight: 800 }}>
                              {started ? "All approvers active" : "Lead-up workflow"}
                            </span>
                          </div>
                        </Td>
                        <Td>
                          <div style={{ display: "grid", gap: 4 }}>
                            <ApprovalSummary
                              label="Emergent"
                              stages={getEffectiveApprovalStages(shutdown, "break_in")}
                            />
                            <ApprovalSummary
                              label="Late"
                              stages={getEffectiveApprovalStages(shutdown, "late_work")}
                            />
                            <ApprovalSummary
                              label="Removal"
                              stages={getEffectiveApprovalStages(shutdown, "work_removal")}
                            />
                          </div>
                        </Td>
                        <Td>{shutdown.description || "-"}</Td>
                        <Td>
                          <form action="/api/admin/shutdowns/assign-existing" method="post">
                            <input type="hidden" name="shutdown_id" value={shutdown.id} />
                            <button type="submit" style={smallButtonStyle}>
                              Assign unassigned
                            </button>
                          </form>
                        </Td>
                      </tr>
                    );
                  })}

                  {shutdowns.length === 0 && (
                    <tr>
                      <Td colSpan={6}>No shutdowns created yet.</Td>
                    </tr>
                  )}
                </tbody>
              </table>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}

function SideLink({
  href,
  label,
  active,
}: {
  href: string;
  label: string;
  active?: boolean;
}) {
  const icon = iconForSideLink(label);

  return (
    <Link
      href={href}
      prefetch={false}
      style={{
        display: "flex",
        alignItems: "center",
        minHeight: 38,
        padding: "0 12px",
        borderRadius: 6,
        background: active ? "#ea5b22" : "transparent",
        color: active ? "#fff" : "#d7dee4",
        textDecoration: "none",
        fontSize: 13,
        fontWeight: 800,
        gap: 10,
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: 20,
          height: 20,
          borderRadius: 5,
          display: "inline-grid",
          placeItems: "center",
          flex: "0 0 auto",
          background: active ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.08)",
          color: active ? "#fff" : "#a8b3bd",
          fontSize: 0,
        }}
      >
        {icon}
      </span>
      {label}
    </Link>
  );
}

function RequestGroup() {
  return (
    <details open style={{ borderRadius: 6 }}>
      <summary
        style={{
          display: "flex",
          alignItems: "center",
          minHeight: 38,
          padding: "0 12px",
          borderRadius: 6,
          color: "#d7dee4",
          cursor: "pointer",
          fontSize: 13,
          fontWeight: 800,
          gap: 10,
          listStyle: "none",
        }}
      >
        <span
          aria-hidden="true"
          style={{
            width: 20,
            height: 20,
            borderRadius: 5,
            display: "inline-grid",
            placeItems: "center",
            flex: "0 0 auto",
            background: "rgba(255,255,255,0.08)",
            color: "#a8b3bd",
            fontSize: 0,
          }}
        >
          {iconForSideLink("Requests")}
        </span>
        Requests
      </summary>
      <div style={{ margin: "4px 0 2px 32px", display: "grid", gap: 4 }}>
        <RequestSubLink href="/break-in/dashboard">Emergent</RequestSubLink>
        <RequestSubLink href="/late-work/dashboard">Late Work</RequestSubLink>
        <RequestSubLink href="/work-removal/dashboard">Work Removal</RequestSubLink>
      </div>
    </details>
  );
}

function RequestSubLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      prefetch={false}
      style={{
        minHeight: 28,
        display: "flex",
        alignItems: "center",
        borderRadius: 4,
        color: "#a8b3bd",
        textDecoration: "none",
        fontSize: 12,
        fontWeight: 800,
      }}
    >
      {children}
    </Link>
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
  if (label === "Create Shutdown") return <Icon path="M12 5v14M5 12h14" />;
  if (label === "Create Shutdown") return <Icon path="M12 5v14M5 12h14" />;
  if (label === "Users") return <Icon path="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2M9.5 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM21 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />;
  if (label === "Create Request") return <Icon path="M12 5v14M5 12h14" />;
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

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <span style={{ display: "block", marginBottom: 6, color: "#111", fontWeight: 800 }}>
      {children}
    </span>
  );
}

function ApprovalHeader() {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr repeat(4, 40px)",
        gap: 6,
        padding: "8px 10px",
        background: "#f8fafc",
        color: "#334155",
        fontSize: 11,
        fontWeight: 900,
        textAlign: "center",
      }}
    >
      <span style={{ textAlign: "left" }}>Type</span>
      <span>P</span>
      <span>C</span>
      <span>S</span>
      <span>M</span>
    </div>
  );
}

function ApprovalRow({
  label,
  prefix,
  defaults,
}: {
  label: string;
  prefix: string;
  defaults: {
    planner: boolean;
    coordinator: boolean;
    superintendent: boolean;
    manager: boolean;
  };
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr repeat(4, 40px)",
        gap: 6,
        alignItems: "center",
        padding: "9px 10px",
        borderTop: "1px solid #e5e7eb",
        color: "#111",
        fontSize: 13,
        fontWeight: 800,
      }}
    >
      <span>{label}</span>
      <ApprovalCheckbox name={`${prefix}_requires_planner`} defaultChecked={defaults.planner} />
      <ApprovalCheckbox name={`${prefix}_requires_coordinator`} defaultChecked={defaults.coordinator} />
      <ApprovalCheckbox name={`${prefix}_requires_superintendent`} defaultChecked={defaults.superintendent} />
      <ApprovalCheckbox name={`${prefix}_requires_manager`} defaultChecked={defaults.manager} />
    </div>
  );
}

function ApprovalCheckbox({
  name,
  defaultChecked,
}: {
  name: string;
  defaultChecked: boolean;
}) {
  return (
    <label style={{ display: "grid", placeItems: "center" }}>
      <input name={name} type="checkbox" defaultChecked={defaultChecked} />
    </label>
  );
}

function ApprovalSummary({
  label,
  stages,
}: {
  label: string;
  stages: string[];
}) {
  return (
    <div style={{ color: "#111", fontSize: 12, fontWeight: 700 }}>
      <b>{label}:</b> {stages.length > 0 ? stages.join(", ") : "No approvals"}
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th style={{ textAlign: "left", padding: 14, color: "#111", fontSize: 13 }}>{children}</th>;
}

function Td({ children, colSpan }: { children: React.ReactNode; colSpan?: number }) {
  return (
    <td colSpan={colSpan} style={{ padding: 14, color: "#111", fontSize: 14, fontWeight: 600 }}>
      {children}
    </td>
  );
}

function formatDateRange(start: string | null, end: string | null) {
  if (!start && !end) return "-";
  if (start && end) return `${start} to ${end}`;
  return start || end || "-";
}

const panelStyle = {
  background: "#fff",
  border: "1px solid rgba(0,0,0,0.08)",
  borderRadius: 8,
  padding: 20,
  boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
} as const;

const primaryButtonStyle = {
  marginTop: 4,
  padding: "11px 14px",
  borderRadius: 8,
  border: "1px solid #ea580c",
  background: "#f97316",
  color: "#fff",
  fontWeight: 900,
  cursor: "pointer",
} as const;

const smallButtonStyle = {
  padding: "8px 10px",
  borderRadius: 8,
  border: "1px solid #d1d5db",
  background: "#fff",
  color: "#111",
  fontWeight: 800,
  cursor: "pointer",
  whiteSpace: "nowrap",
} as const;
