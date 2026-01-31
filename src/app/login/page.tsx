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

    // go to dashboard after cookie is set
    window.location.href = "/break-in/dashboard";
  }

  return (
    <div style={{ padding: 24, maxWidth: 420 }}>
      <h1 style={{ fontSize: 24, fontWeight: 800 }}>Enter your email</h1>
      <p style={{ marginTop: 8 }}>No magic link. Just email → access.</p>

      <form onSubmit={submit} style={{ marginTop: 16, display: "grid", gap: 12 }}>
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@yourcompany.com"
          style={{ padding: 10, border: "1px solid #ccc", borderRadius: 8 }}
          required
        />

        <button
          type="submit"
          disabled={loading}
          style={{ padding: 10, borderRadius: 8, border: "1px solid #000", fontWeight: 700 }}
        >
          {loading ? "Signing in..." : "Continue"}
        </button>
      </form>

      {error && <p style={{ marginTop: 12, color: "red" }}>❌ {error}</p>}
    </div>
  );
}
