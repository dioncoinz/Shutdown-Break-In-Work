import Link from "next/link";
import type { ReactNode } from "react";

type SidebarUser = {
  email: string;
  full_name: string | null;
  role: string;
};

type AppSidebarProps = {
  active?: "dashboard" | "calendar" | "shutdowns" | "create-shutdown" | "reports" | "users" | "emergent" | "late-work" | "work-removal";
  user: SidebarUser;
};

export function AppSidebar({ active, user }: AppSidebarProps) {
  const displayName = user.full_name || user.email;
  const canManageShutdownSetup = user.role === "admin" || user.role === "coordinator";
  const canManageUsers = user.role === "admin" || user.role === "coordinator";

  return (
    <aside style={sidebarStyle}>
      <Link href="/" style={{ textDecoration: "none", display: "inline-flex" }}>
        <img src="/Breakinz_png.png" alt="Breakinz" style={{ height: 38, objectFit: "contain" }} />
      </Link>

      <nav style={{ display: "grid", gap: 7 }}>
        <SideLink href="/break-in/dashboard" active={active === "dashboard"} label="Dashboard" />
        <RequestGroup active={active} />
        <SideLink href="/admin/calendar" active={active === "calendar"} label="Calendar" />
        <SideLink href="/admin/shutdowns" active={active === "shutdowns"} label="Shutdowns" />
        {canManageShutdownSetup ? (
          <SideLink href="/admin/setup" active={active === "create-shutdown"} label="Create Shutdown" />
        ) : null}
        <SideLink href="/admin/reports" active={active === "reports"} label="Reports" />
        {canManageUsers ? <SideLink href="/admin/users" active={active === "users"} label="Users" /> : null}
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
              {user.role}
            </div>
          </div>
        </div>
        <SideLink href="/logout" label="Log out" />
      </div>
    </aside>
  );
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

function RequestGroup({ active }: { active?: AppSidebarProps["active"] }) {
  return (
    <details open style={requestGroupStyle}>
      <summary style={requestSummaryStyle}>
        <span aria-hidden="true" style={sideIconStyle}>
          {iconForSideLink("Requests")}
        </span>
        Requests
      </summary>
      <div style={requestSubnavStyle}>
        <RequestSubLink href="/break-in/list" active={active === "emergent"}>
          Emergent
        </RequestSubLink>
        <RequestSubLink href="/late-work/dashboard" active={active === "late-work"}>
          Late Work
        </RequestSubLink>
        <RequestSubLink href="/work-removal/dashboard" active={active === "work-removal"}>
          Work Removal
        </RequestSubLink>
      </div>
    </details>
  );
}

function RequestSubLink({
  href,
  active,
  children,
}: {
  href: string;
  active?: boolean;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      prefetch={false}
      style={{
        ...requestSubLinkStyle,
        color: active ? "#fff" : "#a8b3bd",
        background: active ? "rgba(241, 90, 36, 0.22)" : "transparent",
        paddingLeft: active ? 8 : 0,
      }}
    >
      {children}
    </Link>
  );
}

function iconForSideLink(label: string) {
  if (label === "Dashboard") return <Icon path="M3 10.5 12 3l9 7.5M5 9.5V21h5v-6h4v6h5V9.5" />;
  if (label === "Requests") return <Icon path="M7 4h10a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Zm2 5h6M9 13h6M9 17h4" />;
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
