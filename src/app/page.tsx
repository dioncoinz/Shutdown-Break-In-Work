import Link from "next/link";

export default function HomePage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f4f6f8",
        padding: 28,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 760,
          background: "#fff",
          borderRadius: 18,
          boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
          padding: 32,
          border: "1px solid rgba(0,0,0,0.06)",
        }}
      >
        <p
          style={{
            margin: 0,
            fontSize: 12,
            fontWeight: 800,
            letterSpacing: 0.6,
            textTransform: "uppercase",
            color: "#6b7280",
          }}
        >
          Break-in workflow
        </p>

        <h1 style={{ margin: "8px 0 0", fontSize: 32, fontWeight: 800, color: "#111" }}>
          Shutdown Break-in Work
        </h1>

        <p style={{ margin: "12px 0 0", color: "#4b5563", lineHeight: 1.6, maxWidth: 560 }}>
          Create, track, and review shutdown break-in requests from one place. Use the
          dashboard to view active work and open a request to see current progress and
          approval status.
        </p>

        <div style={{ marginTop: 24, display: "flex", gap: 12, flexWrap: "wrap" }}>
          <Link
            href="/break-in/new"
            style={{
              fontWeight: 700,
              color: "#fff",
              textDecoration: "none",
              padding: "12px 16px",
              borderRadius: 10,
              border: "1px solid #15803d",
              background: "#16a34a",
            }}
          >
            Create Request
          </Link>
          <Link
            href="/work-removal/new"
            style={{
              fontWeight: 700,
              color: "#fff",
              textDecoration: "none",
              padding: "12px 16px",
              borderRadius: 10,
              border: "1px solid #b45309",
              background: "#d97706",
            }}
          >
            Remove Work
          </Link>
          <Link
            href="/break-in/dashboard"
            style={{
              fontWeight: 700,
              color: "#111",
              textDecoration: "none",
              padding: "12px 16px",
              borderRadius: 10,
              border: "1px solid rgba(0,0,0,0.12)",
              background: "#fff",
            }}
          >
            Dashboard
          </Link>
        </div>

        <div
          style={{
            marginTop: 28,
            paddingTop: 18,
            borderTop: "1px solid #e5e7eb",
            fontSize: 14,
            color: "#444",
            fontWeight: 600,
          }}
        >
          Breakinz - built by Valeron
        </div>
      </div>
    </div>
  );
}
