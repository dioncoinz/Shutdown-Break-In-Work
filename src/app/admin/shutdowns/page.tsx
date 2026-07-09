import Link from "next/link";
import { requireCurrentUser } from "@/lib/auth/current-user";
import { hasShutdownStarted, listShutdowns } from "@/lib/shutdown/setup";

export default async function AdminShutdownsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; updated?: string }>;
}) {
  const currentUser = await requireCurrentUser();
  const sp = await searchParams;
  const loaded = await listShutdowns();
  const shutdowns = loaded.shutdowns;
  const displayName = currentUser.full_name || currentUser.email;
  const canManageShutdownSetup = currentUser.role === "admin" || currentUser.role === "coordinator";
  const canManageUsers = currentUser.role === "admin" || currentUser.role === "coordinator";

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
      <aside style={sidebarStyle}>
        <Link href="/" style={{ textDecoration: "none", display: "inline-flex" }}>
          <img src="/Breakinz_png.png" alt="Breakinz" style={{ height: 38, objectFit: "contain" }} />
        </Link>

        <nav style={{ display: "grid", gap: 7 }}>
          <SideLink href="/break-in/dashboard" label="Dashboard" />
          <RequestGroup />
          <SideLink href="/admin/calendar" label="Calendar" />
          <SideLink href="/admin/shutdowns" active label="Shutdowns" />
          {canManageShutdownSetup ? <SideLink href="/admin/setup" label="Create Shutdown" /> : null}
          <SideLink href="/admin/reports" label="Reports" />
          {canManageUsers ? <SideLink href="/admin/users" label="Users" /> : null}
          <SideLink href="/requests/new" label="Create Request" />
          <SideLink href="/logout" label="Log out" />
        </nav>

        <div style={{ marginTop: "auto", display: "flex", alignItems: "center", gap: 10 }}>
          <div style={avatarStyle}>{displayName.slice(0, 1).toUpperCase()}</div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 800, lineHeight: 1.1 }}>{displayName}</div>
            <div style={{ marginTop: 3, fontSize: 11, color: "#a8b3bd", fontWeight: 700 }}>
              {currentUser.role}
            </div>
          </div>
        </div>
      </aside>

      <main style={{ minWidth: 0 }}>
        <header style={headerStyle}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
            <span style={{ color: "#f05a1a", fontWeight: 900 }}>Admin</span>
            <span style={{ color: "#94a3b8", fontWeight: 900 }}>/</span>
            <h1 style={{ margin: 0, color: "#111827", fontSize: 20, fontWeight: 900 }}>
              Shutdowns
            </h1>
          </div>
        </header>

        <div style={{ padding: 28 }}>
          {(sp.updated || sp.error || loaded.needsSetup) && (
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
                ? "Run the shutdowns table section in supabase-schema.sql before managing shutdowns."
                : sp.error || "Shutdown updated."}
            </div>
          )}

          <section style={panelStyle}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead style={{ background: "#f8fafc" }}>
                <tr>
                  <Th>Name</Th>
                  <Th>Dates</Th>
                  <Th>Mode</Th>
                  <Th>Active</Th>
                  <Th />
                </tr>
              </thead>
              <tbody>
                {shutdowns.map((shutdown) => {
                  const started = hasShutdownStarted(shutdown);

                  return (
                    <tr key={shutdown.id} style={{ borderTop: "1px solid #e5e7eb" }}>
                      <Td>{shutdown.name}</Td>
                      <Td>{formatDateRange(shutdown.start_date, shutdown.end_date)}</Td>
                      <Td>{started ? "All approvers active" : "Lead-up workflow"}</Td>
                      <Td>
                        {canManageShutdownSetup ? (
                          <form
                            id={`active-${shutdown.id}`}
                            action="/api/admin/shutdowns/active"
                            method="post"
                            style={{ display: "flex", alignItems: "center", gap: 9 }}
                          >
                            <input type="hidden" name="shutdown_id" value={shutdown.id} />
                            <input type="hidden" name="is_active" value="off" />
                            <input
                              name="is_active"
                              type="checkbox"
                              defaultChecked={shutdown.is_active}
                            />
                            <span>{shutdown.is_active ? "Active" : "Inactive"}</span>
                          </form>
                        ) : (
                          <span>{shutdown.is_active ? "Active" : "Inactive"}</span>
                        )}
                      </Td>
                      <Td>
                        {canManageShutdownSetup ? (
                          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                            <Link href={`/admin/shutdowns/${shutdown.id}`} style={smallLinkStyle}>
                              Open
                            </Link>
                            <button type="submit" form={`active-${shutdown.id}`} style={smallButtonStyle}>
                              Save
                            </button>
                          </div>
                        ) : (
                          <span style={{ color: "#64748b", fontSize: 13, fontWeight: 800 }}>View only</span>
                        )}
                      </Td>
                    </tr>
                  );
                })}

                {shutdowns.length === 0 && (
                  <tr>
                    <Td colSpan={5}>No shutdowns created yet.</Td>
                  </tr>
                )}
              </tbody>
            </table>
          </section>
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

function Th({ children }: { children?: React.ReactNode }) {
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

const sidebarStyle = {
  minHeight: "100vh",
  background: "#071012",
  color: "#f8fafc",
  padding: "22px 16px",
  display: "flex",
  flexDirection: "column",
  gap: 26,
  position: "sticky",
  top: 0,
} as const;

const avatarStyle = {
  width: 34,
  height: 34,
  borderRadius: 999,
  background: "#334155",
  display: "grid",
  placeItems: "center",
  color: "#fff",
  fontWeight: 900,
} as const;

const headerStyle = {
  height: 74,
  background: "#fff",
  borderBottom: "1px solid #dfe3e8",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "0 28px",
  gap: 18,
} as const;

const panelStyle = {
  background: "#fff",
  border: "1px solid rgba(0,0,0,0.08)",
  borderRadius: 8,
  overflow: "hidden",
  boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
} as const;

const smallButtonStyle = {
  padding: "8px 10px",
  borderRadius: 8,
  border: "1px solid #d1d5db",
  background: "#fff",
  color: "#111",
  fontWeight: 800,
  cursor: "pointer",
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
