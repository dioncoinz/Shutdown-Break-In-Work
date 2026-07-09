import Image from "next/image";
import Link from "next/link";
import { hasShutdownStarted, listShutdowns, type Shutdown } from "@/lib/shutdown/setup";

export default async function NewRequestChooserPage({
  searchParams,
}: {
  searchParams: Promise<{ shutdown?: string }>;
}) {
  const sp = await searchParams;
  const loaded = await listShutdowns();
  const selectedShutdown = getSelectedShutdown(loaded.shutdowns, sp.shutdown);
  const shutdownId = selectedShutdown?.id || "";
  const shutdownStarted = selectedShutdown ? hasShutdownStarted(selectedShutdown) : false;
  const emergentAvailable = shutdownStarted;
  const lateWorkAvailable = Boolean(shutdownId) && !shutdownStarted;

  return (
    <div style={{ minHeight: "100vh", background: "#f4f6f8", padding: 28 }}>
      <main style={{ width: "100%", maxWidth: 980, margin: "0 auto" }}>
        <section style={panelStyle}>
          <Image
            src="/Breakinz_png.png"
            alt="Breakinz"
            width={526}
            height={215}
            priority
            style={{ display: "block", width: 180, height: "auto" }}
          />
          <h1 style={{ margin: "10px 0 0", color: "#111827", fontSize: 30, fontWeight: 900 }}>
            Create scope change request
          </h1>
          <p style={{ margin: "10px 0 0", color: "#4b5563", fontSize: 14, lineHeight: 1.55, maxWidth: 680 }}>
            Select the shutdown and request type. Once the shutdown start date is reached, new added work is submitted as Emergent.
          </p>

          <form method="GET" action="/requests/new" style={{ marginTop: 22, display: "flex", gap: 10, alignItems: "end", flexWrap: "wrap" }}>
            <label style={{ display: "grid", gap: 6, minWidth: 320 }}>
              <span style={{ color: "#111827", fontSize: 13, fontWeight: 900 }}>Shutdown</span>
              <select name="shutdown" defaultValue={shutdownId} style={selectStyle}>
                {loaded.shutdowns.length === 0 ? <option value="">No shutdowns found</option> : null}
                {loaded.shutdowns.map((shutdown) => (
                  <option key={shutdown.id} value={shutdown.id}>
                    {formatShutdownOption(shutdown)}
                  </option>
                ))}
              </select>
            </label>
            <button type="submit" style={applyButtonStyle}>
              Apply
            </button>
          </form>
        </section>

        <section style={cardGridStyle}>
          <RequestTypeCard
            title="Emergent"
            note="For work that emerges once the shutdown has started."
            href={emergentAvailable ? `/break-in/new?shutdown=${shutdownId}` : ""}
            disabled={!emergentAvailable}
            disabledReason={
              selectedShutdown
                ? "Available from the shutdown start date."
                : "Select a shutdown before creating an emergent request."
            }
            color="#16a34a"
          />
          <RequestTypeCard
            title="Late Work"
            note="For work that needs to be added before the shutdown has started."
            href={lateWorkAvailable ? `/late-work/new?shutdown=${shutdownId}` : ""}
            disabled={!lateWorkAvailable}
            disabledReason={
              shutdownStarted
                ? "Shutdown has started. Create an emergent request instead."
                : "Select a shutdown before creating late work."
            }
            color="#2563eb"
          />
          <RequestTypeCard
            title="Work Removal"
            note="For work that needs to be removed from the shutdown scope."
            href={shutdownId ? `/work-removal/new?shutdown=${shutdownId}` : ""}
            disabled={!shutdownId}
            disabledReason="Select a shutdown before creating work removal."
            color="#d97706"
          />
        </section>
      </main>
    </div>
  );
}

function RequestTypeCard({
  color,
  disabled,
  disabledReason,
  href,
  note,
  title,
}: {
  color: string;
  disabled: boolean;
  disabledReason: string;
  href: string;
  note: string;
  title: string;
}) {
  const content = (
    <>
      <div style={{ color, fontSize: 13, fontWeight: 900, textTransform: "uppercase" }}>
        Request type
      </div>
      <h2 style={{ margin: "8px 0 0", color: "#111827", fontSize: 24, fontWeight: 900 }}>
        {title}
      </h2>
      <p style={{ margin: "10px 0 0", color: "#4b5563", lineHeight: 1.5, fontWeight: 700 }}>
        {note}
      </p>
      <div style={{ marginTop: 18, color: disabled ? "#9ca3af" : color, fontWeight: 900 }}>
        {disabled ? disabledReason : "Select and continue"}
      </div>
    </>
  );

  if (disabled) {
    return <div style={{ ...requestCardStyle, opacity: 0.72 }}>{content}</div>;
  }

  return (
    <Link href={href} style={{ ...requestCardStyle, textDecoration: "none" }}>
      {content}
    </Link>
  );
}

function getSelectedShutdown(shutdowns: Shutdown[], requestedId?: string) {
  if (requestedId) {
    const requested = shutdowns.find((shutdown) => shutdown.id === requestedId);
    if (requested) return requested;
  }

  return shutdowns.find((shutdown) => shutdown.is_active) || shutdowns[0] || null;
}

function formatShutdownOption(shutdown: Shutdown) {
  const dates =
    shutdown.start_date && shutdown.end_date
      ? ` - ${shutdown.start_date} to ${shutdown.end_date}`
      : shutdown.start_date || shutdown.end_date
        ? ` - ${shutdown.start_date || shutdown.end_date}`
        : "";

  return `${shutdown.name}${shutdown.is_active ? " (Active)" : ""}${dates}`;
}

const panelStyle = {
  background: "#fff",
  border: "1px solid #e5e7eb",
  borderRadius: 12,
  padding: 28,
  boxShadow: "0 12px 30px rgba(15, 23, 42, 0.08)",
} as const;

const cardGridStyle = {
  marginTop: 18,
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
  gap: 16,
} as const;

const requestCardStyle = {
  display: "block",
  minHeight: 190,
  background: "#fff",
  border: "1px solid #e5e7eb",
  borderRadius: 10,
  padding: 22,
  boxShadow: "0 2px 8px rgba(15, 23, 42, 0.05)",
} as const;

const selectStyle = {
  height: 42,
  border: "1px solid #d1d5db",
  borderRadius: 8,
  background: "#fff",
  color: "#111827",
  padding: "0 12px",
  fontWeight: 800,
} as const;

const applyButtonStyle = {
  height: 42,
  border: "1px solid #ea580c",
  borderRadius: 8,
  background: "#f97316",
  color: "#fff",
  padding: "0 16px",
  fontWeight: 900,
  cursor: "pointer",
} as const;
