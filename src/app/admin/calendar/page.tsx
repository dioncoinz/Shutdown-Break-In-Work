import Link from "next/link";
import { requireCurrentUser } from "@/lib/auth/current-user";
import { listShutdowns, type Shutdown } from "@/lib/shutdown/setup";

type CalendarDay = {
  dateKey: string;
  day: number;
  inMonth: boolean;
  shutdowns: Shutdown[];
};

export default async function AdminCalendarPage() {
  const currentUser = await requireCurrentUser();
  const loaded = await listShutdowns();
  const shutdowns = loaded.shutdowns;
  const displayName = currentUser.full_name || currentUser.email;
  const canManageShutdownSetup = currentUser.role === "admin" || currentUser.role === "coordinator";
  const canManageUsers = currentUser.role === "admin" || currentUser.role === "coordinator";
  const visibleMonth = getVisibleMonth(shutdowns);
  const calendarDays = buildCalendarDays(visibleMonth.year, visibleMonth.month, shutdowns);

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
          <SideLink href="/admin/calendar" active label="Calendar" />
          <SideLink href="/admin/shutdowns" label="Shutdowns" />
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
              Calendar
            </h1>
          </div>
        </header>

        <div style={{ padding: 28 }}>
          {loaded.needsSetup ? (
            <div style={warningStyle}>
              Run the shutdowns table section in supabase-schema.sql before using the calendar.
            </div>
          ) : null}

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(0, 1fr) 340px",
              gap: 18,
              alignItems: "start",
            }}
          >
            <section style={panelStyle}>
              <div style={{ padding: "18px 20px", borderBottom: "1px solid #e5e7eb" }}>
                <h2 style={{ margin: 0, color: "#111", fontSize: 18, fontWeight: 900 }}>
                  {monthName(visibleMonth.year, visibleMonth.month)}
                </h2>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))" }}>
                {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
                  <div key={day} style={weekdayStyle}>
                    {day}
                  </div>
                ))}
                {calendarDays.map((day) => (
                  <CalendarCell key={day.dateKey} day={day} />
                ))}
              </div>
            </section>

            <section style={panelStyle}>
              <div style={{ padding: "18px 20px", borderBottom: "1px solid #e5e7eb" }}>
                <h2 style={{ margin: 0, color: "#111", fontSize: 18, fontWeight: 900 }}>
                  Shutdown Overview
                </h2>
              </div>
              <div style={{ padding: 16, display: "grid", gap: 10 }}>
                {shutdowns.map((shutdown) => (
                  <Link
                    key={shutdown.id}
                    href={`/admin/shutdowns/${shutdown.id}`}
                    style={{
                      display: "block",
                      border: "1px solid #e5e7eb",
                      borderRadius: 8,
                      padding: 12,
                      color: "#111",
                      textDecoration: "none",
                      background: shutdown.is_active ? "#f0fdf4" : "#f8fafc",
                    }}
                  >
                    <div style={{ fontWeight: 900 }}>{shutdown.name}</div>
                    <div style={{ marginTop: 5, color: "#475569", fontSize: 13, fontWeight: 700 }}>
                      {formatDateRange(shutdown.start_date, shutdown.end_date)}
                    </div>
                    <div style={{ marginTop: 6, color: shutdown.is_active ? "#166534" : "#64748b", fontSize: 12, fontWeight: 900 }}>
                      {shutdown.is_active ? "Active" : "Inactive"}
                    </div>
                  </Link>
                ))}

                {shutdowns.length === 0 ? (
                  <div style={{ color: "#475569", fontSize: 14, fontWeight: 700 }}>
                    No shutdowns created yet.
                  </div>
                ) : null}
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}

function CalendarCell({ day }: { day: CalendarDay }) {
  return (
    <div
      style={{
        minHeight: 118,
        borderRight: "1px solid #e5e7eb",
        borderBottom: "1px solid #e5e7eb",
        padding: 10,
        background: day.inMonth ? "#fff" : "#f8fafc",
        color: day.inMonth ? "#111" : "#94a3b8",
      }}
    >
      <div style={{ fontSize: 12, fontWeight: 900 }}>{day.day}</div>
      <div style={{ marginTop: 8, display: "grid", gap: 5 }}>
        {day.shutdowns.slice(0, 3).map((shutdown) => (
          <Link
            key={shutdown.id}
            href={`/admin/shutdowns/${shutdown.id}`}
            style={{
              display: "block",
              borderRadius: 6,
              padding: "5px 7px",
              background: shutdown.is_active ? "#dcfce7" : "#e2e8f0",
              color: shutdown.is_active ? "#166534" : "#334155",
              textDecoration: "none",
              fontSize: 11,
              fontWeight: 900,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {shutdown.name}
          </Link>
        ))}
        {day.shutdowns.length > 3 ? (
          <div style={{ fontSize: 11, color: "#475569", fontWeight: 800 }}>
            +{day.shutdowns.length - 3} more
          </div>
        ) : null}
      </div>
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

function getVisibleMonth(shutdowns: Shutdown[]) {
  const firstDatedShutdown = shutdowns.find((shutdown) => shutdown.start_date || shutdown.end_date);

  if (firstDatedShutdown?.start_date || firstDatedShutdown?.end_date) {
    const date = parseDateKey(firstDatedShutdown.start_date || firstDatedShutdown.end_date || "");
    return { year: date.getUTCFullYear(), month: date.getUTCMonth() };
  }

  const today = new Date();
  return { year: today.getFullYear(), month: today.getMonth() };
}

function buildCalendarDays(year: number, month: number, shutdowns: Shutdown[]) {
  const firstOfMonth = new Date(Date.UTC(year, month, 1));
  const mondayOffset = (firstOfMonth.getUTCDay() + 6) % 7;
  const firstCell = new Date(Date.UTC(year, month, 1 - mondayOffset));

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(firstCell);
    date.setUTCDate(firstCell.getUTCDate() + index);
    const dateKey = toDateKey(date);

    return {
      dateKey,
      day: date.getUTCDate(),
      inMonth: date.getUTCMonth() === month,
      shutdowns: shutdowns.filter((shutdown) => shutdownCoversDate(shutdown, dateKey)),
    };
  });
}

function shutdownCoversDate(shutdown: Shutdown, dateKey: string) {
  const start = shutdown.start_date || shutdown.end_date;
  const end = shutdown.end_date || shutdown.start_date;

  if (!start || !end) {
    return false;
  }

  return dateKey >= start && dateKey <= end;
}

function parseDateKey(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function toDateKey(date: Date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function monthName(year: number, month: number) {
  return new Intl.DateTimeFormat("en-AU", {
    month: "long",
    year: "numeric",
  }).format(new Date(Date.UTC(year, month, 1)));
}

function formatDateRange(start: string | null, end: string | null) {
  if (!start && !end) return "No dates set";
  if (start && end) return `${start} to ${end}`;
  return start || end || "No dates set";
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

const weekdayStyle = {
  padding: "10px 12px",
  background: "#f8fafc",
  borderRight: "1px solid #e5e7eb",
  borderBottom: "1px solid #e5e7eb",
  color: "#334155",
  fontSize: 12,
  fontWeight: 900,
} as const;

const warningStyle = {
  marginBottom: 18,
  padding: "12px 14px",
  borderRadius: 8,
  border: "1px solid #fecaca",
  background: "#fef2f2",
  color: "#991b1b",
  fontWeight: 800,
} as const;
