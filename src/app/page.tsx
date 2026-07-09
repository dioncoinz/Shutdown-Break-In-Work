import Link from "next/link";
import Image from "next/image";

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
        <Image
          src="/Breakinz_png.png"
          alt="Breakinz"
          width={526}
          height={215}
          priority
          style={{ display: "block", width: 180, height: "auto" }}
        />

        <h1 style={{ margin: "8px 0 0", fontSize: 32, fontWeight: 800, color: "#111" }}>
          Shutdown scope change
        </h1>

        <p style={{ margin: "12px 0 0", color: "#4b5563", lineHeight: 1.6, maxWidth: 560 }}>
          Submit shutdown work requests without signing in, or log in to access the
          dashboard and admin tools.
        </p>

        <div
          style={{
            marginTop: 24,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 14,
          }}
        >
          <Link
            href="/requests/new"
            style={{
              display: "block",
              fontWeight: 700,
              color: "#fff",
              textDecoration: "none",
              padding: 18,
              borderRadius: 8,
              border: "1px solid #15803d",
              background: "#16a34a",
            }}
          >
            <span style={{ display: "block", fontSize: 16 }}>Create Request</span>
            <span style={{ display: "block", marginTop: 6, fontSize: 13, opacity: 0.92 }}>
              No login required
            </span>
          </Link>

          <Link
            href="/login"
            style={{
              display: "block",
              fontWeight: 700,
              color: "#fff",
              textDecoration: "none",
              padding: 18,
              borderRadius: 8,
              border: "1px solid #111827",
              background: "#111827",
            }}
          >
            <span style={{ display: "block", fontSize: 16 }}>Log In</span>
            <span style={{ display: "block", marginTop: 6, fontSize: 13, opacity: 0.82 }}>
              Dashboard and admin access
            </span>
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
