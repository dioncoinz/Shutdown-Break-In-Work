"use client";

import { useState } from "react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data?.error || "Login failed");
      return;
    }

    window.location.href = "/break-in/dashboard";
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f4f6f8",
        padding: 24,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 460,
          background: "#fff",
          borderRadius: 18,
          boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
          padding: 28,
          border: "1px solid rgba(0,0,0,0.06)",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div>
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
              Breakinz - built by Valeron
            </p>
            <h1
              style={{
                margin: "4px 0 0",
                fontSize: 28,
                fontWeight: 700,
                color: "#111",
              }}
            >
              Sign in
            </h1>
          </div>
        </div>

        <p style={{ margin: "14px 0 0", color: "#4b5563", lineHeight: 1.5 }}>
          Enter your work email to continue to the dashboard.
        </p>

        <form onSubmit={submit} style={{ marginTop: 20, display: "grid", gap: 14 }}>
          <label
            htmlFor="email"
            style={{ fontSize: 13, fontWeight: 800, color: "#222" }}
          >
            Email address
          </label>

          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@yourcompany.com"
            style={{
              padding: "12px 14px",
              border: "1px solid #d1d5db",
              borderRadius: 10,
              fontSize: 14,
              color: "#111",
              background: "#fff",
            }}
            required
          />

          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: 4,
              padding: "12px 16px",
              borderRadius: 10,
              border: "1px solid #111",
              background: loading ? "#e5e7eb" : "#111",
              color: loading ? "#374151" : "#fff",
              fontWeight: 700,
              fontSize: 14,
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            {loading ? "Signing in..." : "Continue"}
          </button>
        </form>

        {error && (
          <p
            style={{
              marginTop: 14,
              color: "#dc2626",
              background: "#fef2f2",
              border: "1px solid #fecaca",
              borderRadius: 10,
              padding: "10px 12px",
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
