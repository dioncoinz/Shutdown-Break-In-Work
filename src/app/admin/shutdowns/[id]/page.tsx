import Link from "next/link";
import { notFound } from "next/navigation";
import { canManageShutdowns, requireCurrentUser } from "@/lib/auth/current-user";
import {
  getEffectiveApprovalStages,
  getShutdownById,
  hasShutdownStarted,
} from "@/lib/shutdown/setup";

const inputStyle = {
  width: "100%",
  padding: "10px 12px",
  border: "1px solid #d1d5db",
  borderRadius: 8,
  fontSize: 14,
  color: "#111",
  background: "#fff",
} as const;

export default async function EditShutdownPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; updated?: string }>;
}) {
  const currentUser = await requireCurrentUser();
  const { id } = await params;
  const sp = await searchParams;
  const { shutdown } = await getShutdownById(id);
  const displayName = currentUser.full_name || currentUser.email;
  const canManageShutdownSetup = currentUser.role === "admin" || currentUser.role === "coordinator";
  const canManageUsers = currentUser.role === "admin" || currentUser.role === "coordinator";
  const canEditShutdown = canManageShutdowns(currentUser);

  if (!shutdown) {
    notFound();
  }

  const started = hasShutdownStarted(shutdown);

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
              {canEditShutdown ? "Edit Shutdown" : "View Shutdown"}
            </h1>
          </div>
          <Link href="/admin/shutdowns" style={secondaryLinkStyle}>
            Back to shutdowns
          </Link>
        </header>

        <div style={{ padding: 28 }}>
          {(sp.updated || sp.error) && (
            <div
              style={{
                marginBottom: 18,
                padding: "12px 14px",
                borderRadius: 8,
                border: sp.error ? "1px solid #fecaca" : "1px solid #bbf7d0",
                background: sp.error ? "#fef2f2" : "#f0fdf4",
                color: sp.error ? "#991b1b" : "#166534",
                fontWeight: 800,
              }}
            >
              {sp.error || "Shutdown updated."}
            </div>
          )}

          <form action="/api/admin/shutdowns/update" method="post" style={formGridStyle}>
            <input type="hidden" name="id" value={shutdown.id} />

            <section style={panelStyle}>
              <h2 style={{ margin: 0, color: "#111", fontSize: 18, fontWeight: 900 }}>
                Details
              </h2>

              <div style={{ marginTop: 16, display: "grid", gap: 12 }}>
                <label>
                  <FieldLabel>Name</FieldLabel>
                  <input name="name" required defaultValue={shutdown.name} disabled={!canEditShutdown} style={inputStyle} />
                </label>

                <label>
                  <FieldLabel>Start date</FieldLabel>
                  <input
                    name="start_date"
                    type="date"
                    defaultValue={shutdown.start_date || ""}
                    disabled={!canEditShutdown}
                    style={inputStyle}
                  />
                </label>

                <label>
                  <FieldLabel>End date</FieldLabel>
                  <input
                    name="end_date"
                    type="date"
                    defaultValue={shutdown.end_date || ""}
                    disabled={!canEditShutdown}
                    style={inputStyle}
                  />
                </label>

                <label>
                  <FieldLabel>Description</FieldLabel>
                  <textarea
                    name="description"
                    defaultValue={shutdown.description || ""}
                    disabled={!canEditShutdown}
                    style={{ ...inputStyle, minHeight: 110, resize: "vertical" }}
                  />
                </label>

                <label style={{ display: "flex", alignItems: "center", gap: 9, color: "#111", fontWeight: 800 }}>
                  <input name="is_active" type="checkbox" defaultChecked={shutdown.is_active} disabled={!canEditShutdown} />
                  Active
                </label>
              </div>
            </section>

            <section style={panelStyle}>
              <h2 style={{ margin: 0, color: "#111", fontSize: 18, fontWeight: 900 }}>
                Approval requirements
              </h2>
              <p style={{ margin: "8px 0 0", color: "#475569", fontSize: 12, fontWeight: 700, lineHeight: 1.45 }}>
                These checkboxes apply during lead-up. On the shutdown start date, all approvers are required automatically.
              </p>

              <div style={{ marginTop: 14, border: "1px solid #e5e7eb", borderRadius: 8, overflow: "hidden" }}>
                <ApprovalHeader />
                <ApprovalRow
                  label="Emergent"
                  prefix="break_in"
                  defaults={{
                    planner: shutdown.break_in_requires_planner,
                    coordinator: shutdown.break_in_requires_coordinator,
                    superintendent: shutdown.break_in_requires_superintendent,
                    manager: shutdown.break_in_requires_manager,
                  }}
                  disabled={!canEditShutdown}
                />
                <ApprovalRow
                  label="Late work"
                  prefix="late_work"
                  defaults={{
                    planner: shutdown.late_work_requires_planner,
                    coordinator: shutdown.late_work_requires_coordinator,
                    superintendent: shutdown.late_work_requires_superintendent,
                    manager: shutdown.late_work_requires_manager,
                  }}
                  disabled={!canEditShutdown}
                />
                <ApprovalRow
                  label="Work removal"
                  prefix="work_removal"
                  defaults={{
                    planner: shutdown.work_removal_requires_planner,
                    coordinator: shutdown.work_removal_requires_coordinator,
                    superintendent: shutdown.work_removal_requires_superintendent,
                    manager: shutdown.work_removal_requires_manager,
                  }}
                  disabled={!canEditShutdown}
                />
              </div>

              <div style={{ marginTop: 14, display: "grid", gap: 5, color: "#111", fontSize: 13, fontWeight: 700 }}>
                <div style={{ color: started ? "#166534" : "#475569", fontWeight: 900 }}>
                  {started ? "All approvers active" : "Lead-up workflow"}
                </div>
                <div>Emergent: {getEffectiveApprovalStages(shutdown, "break_in").join(", ")}</div>
                <div>Late: {getEffectiveApprovalStages(shutdown, "late_work").join(", ")}</div>
                <div>Removal: {getEffectiveApprovalStages(shutdown, "work_removal").join(", ")}</div>
              </div>

              {canEditShutdown ? (
                <div style={{ marginTop: 16, display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <button type="submit" style={{ ...primaryButtonStyle, marginTop: 0 }}>
                    Save shutdown
                  </button>
                  <a href={`/api/shutdown/export?shutdown=${encodeURIComponent(shutdown.id)}`} style={exportButtonStyle}>
                    Export Excel
                  </a>
                </div>
              ) : null}
            </section>
          </form>
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
        <RequestSubLink href="/break-in/list">Emergent</RequestSubLink>
        <RequestSubLink href="/late-work/dashboard">Late Work</RequestSubLink>
        <RequestSubLink href="/work-removal/dashboard">Work Removal</RequestSubLink>
        <RequestSubLink href="/requests/deleted">Deleted</RequestSubLink>
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
  if (label === "Reports") return <Icon path="M4 19V9M10 19v-7M22 19H2" />;
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
    <div style={approvalGridHeaderStyle}>
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
  disabled,
}: {
  label: string;
  prefix: string;
  disabled?: boolean;
  defaults: {
    planner: boolean;
    coordinator: boolean;
    superintendent: boolean;
    manager: boolean;
  };
}) {
  return (
    <div style={approvalGridRowStyle}>
      <span>{label}</span>
      <ApprovalCheckbox name={`${prefix}_requires_planner`} defaultChecked={defaults.planner} disabled={disabled} />
      <ApprovalCheckbox name={`${prefix}_requires_coordinator`} defaultChecked={defaults.coordinator} disabled={disabled} />
      <ApprovalCheckbox name={`${prefix}_requires_superintendent`} defaultChecked={defaults.superintendent} disabled={disabled} />
      <ApprovalCheckbox name={`${prefix}_requires_manager`} defaultChecked={defaults.manager} disabled={disabled} />
    </div>
  );
}

function ApprovalCheckbox({
  name,
  defaultChecked,
  disabled,
}: {
  name: string;
  defaultChecked: boolean;
  disabled?: boolean;
}) {
  return (
    <label style={{ display: "grid", placeItems: "center" }}>
      <input name={name} type="checkbox" defaultChecked={defaultChecked} disabled={disabled} />
    </label>
  );
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

const formGridStyle = {
  display: "grid",
  gridTemplateColumns: "minmax(300px, 420px) minmax(360px, 1fr)",
  gap: 18,
  alignItems: "start",
} as const;

const panelStyle = {
  background: "#fff",
  border: "1px solid rgba(0,0,0,0.08)",
  borderRadius: 8,
  padding: 20,
  boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
} as const;

const primaryButtonStyle = {
  marginTop: 16,
  padding: "11px 14px",
  borderRadius: 8,
  border: "1px solid #ea580c",
  background: "#f97316",
  color: "#fff",
  fontWeight: 900,
  cursor: "pointer",
} as const;

const secondaryLinkStyle = {
  padding: "10px 12px",
  borderRadius: 8,
  border: "1px solid #d1d5db",
  background: "#fff",
  color: "#111",
  textDecoration: "none",
  fontWeight: 900,
} as const;

const exportButtonStyle = {
  padding: "11px 14px",
  borderRadius: 8,
  border: "1px solid #d1d5db",
  background: "#fff",
  color: "#111",
  fontWeight: 900,
  textDecoration: "none",
} as const;

const approvalGridHeaderStyle = {
  display: "grid",
  gridTemplateColumns: "1fr repeat(4, 40px)",
  gap: 6,
  padding: "8px 10px",
  background: "#f8fafc",
  color: "#334155",
  fontSize: 11,
  fontWeight: 900,
  textAlign: "center",
} as const;

const approvalGridRowStyle = {
  display: "grid",
  gridTemplateColumns: "1fr repeat(4, 40px)",
  gap: 6,
  alignItems: "center",
  padding: "9px 10px",
  borderTop: "1px solid #e5e7eb",
  color: "#111",
  fontSize: 13,
  fontWeight: 800,
} as const;
