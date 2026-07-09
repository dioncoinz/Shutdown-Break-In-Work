import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getInviteUserByToken } from "@/lib/auth/users";

const inputStyle = {
  width: "100%",
  padding: "12px 14px",
  border: "1px solid #d1d5db",
  borderRadius: 8,
  fontSize: 14,
  color: "#111",
  background: "#fff",
} as const;

export default async function InvitePage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const currentUser = await getCurrentUser();
  if (currentUser) redirect("/break-in/dashboard");

  const { token } = await params;
  const sp = await searchParams;
  const invitedUser = await getInviteUserByToken(token);

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
          maxWidth: 430,
          background: "#fff",
          border: "1px solid rgba(0,0,0,0.08)",
          borderRadius: 8,
          boxShadow: "0 12px 30px rgba(15,23,42,0.08)",
          padding: 28,
        }}
      >
        <img src="/Breakinz_png.png" alt="Breakinz" style={{ height: 42, objectFit: "contain" }} />
        <h1 style={{ margin: "22px 0 0", color: "#111", fontSize: 24, fontWeight: 900 }}>
          Set your password
        </h1>

        {!invitedUser ? (
          <div
            style={{
              marginTop: 18,
              padding: "12px 14px",
              borderRadius: 8,
              border: "1px solid #fecaca",
              background: "#fef2f2",
              color: "#991b1b",
              fontWeight: 800,
            }}
          >
            This invite link is invalid or has expired.
          </div>
        ) : (
          <>
            <p style={{ margin: "8px 0 0", color: "#4b5563", lineHeight: 1.5 }}>
              Welcome {invitedUser.full_name || invitedUser.email}. Create your password to activate your account.
            </p>

            {sp.error ? (
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
            ) : null}

            <form action="/api/invite/accept" method="post" style={{ marginTop: 20, display: "grid", gap: 14 }}>
              <input type="hidden" name="token" value={token} />
              <label>
                <span style={{ display: "block", marginBottom: 6, color: "#111", fontWeight: 800 }}>
                  Password
                </span>
                <input name="password" type="password" minLength={8} required style={inputStyle} />
              </label>

              <label>
                <span style={{ display: "block", marginBottom: 6, color: "#111", fontWeight: 800 }}>
                  Confirm password
                </span>
                <input name="confirm_password" type="password" minLength={8} required style={inputStyle} />
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
                  fontWeight: 900,
                  cursor: "pointer",
                }}
              >
                Activate account
              </button>
            </form>
          </>
        )}
      </main>
    </div>
  );
}
