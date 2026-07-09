import { getCurrentUser } from "@/lib/auth/current-user";
import { redirect } from "next/navigation";

const inputStyle = {
  width: "100%",
  padding: "12px 14px",
  border: "1px solid #d1d5db",
  borderRadius: 8,
  fontSize: 14,
  color: "#111",
  background: "#fff",
} as const;

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await getCurrentUser();
  if (user) redirect("/break-in/dashboard");

  const sp = await searchParams;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f4f6f8",
        display: "grid",
        placeItems: "center",
        padding: 24,
      }}
    >
      <main
        style={{
          width: "100%",
          maxWidth: 420,
          background: "#fff",
          border: "1px solid rgba(0,0,0,0.08)",
          borderRadius: 8,
          boxShadow: "0 12px 30px rgba(15,23,42,0.08)",
          padding: 28,
        }}
      >
        <img src="/Breakinz_png.png" alt="Breakinz" style={{ height: 42, objectFit: "contain" }} />
        <h1 style={{ margin: "22px 0 0", color: "#111", fontSize: 24, fontWeight: 800 }}>
          Dashboard sign in
        </h1>
        <p style={{ margin: "8px 0 0", color: "#4b5563", lineHeight: 1.5 }}>
          Sign in to review shutdown requests, update progress, and manage users.
        </p>

        {sp?.error && (
          <div
            style={{
              marginTop: 18,
              padding: "10px 12px",
              borderRadius: 8,
              border: "1px solid #fecaca",
              background: "#fef2f2",
              color: "#991b1b",
              fontWeight: 700,
              fontSize: 13,
            }}
          >
            {sp.error}
          </div>
        )}

        <form action="/api/login" method="post" style={{ marginTop: 20, display: "grid", gap: 14 }}>
          <label>
            <span style={{ display: "block", marginBottom: 6, color: "#111", fontWeight: 800 }}>
              Email
            </span>
            <input name="email" type="email" autoComplete="email" required style={inputStyle} />
          </label>

          <label>
            <span style={{ display: "block", marginBottom: 6, color: "#111", fontWeight: 800 }}>
              Password
            </span>
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              required
              style={inputStyle}
            />
          </label>

          <button
            type="submit"
            style={{
              marginTop: 4,
              padding: "12px 14px",
              borderRadius: 8,
              border: "1px solid #ea580c",
              background: "#f97316",
              color: "#fff",
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            Sign in
          </button>
        </form>
      </main>
    </div>
  );
}
