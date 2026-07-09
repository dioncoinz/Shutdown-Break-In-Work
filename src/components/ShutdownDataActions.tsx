"use client";

import { useState } from "react";

const confirmationText = "NEXT SHUTDOWN";

export function ShutdownDataActions() {
  const [resetting, setResetting] = useState(false);

  async function resetShutdownData() {
    const confirmation = window.prompt(
      `This permanently clears all emergent and work removal data. Type ${confirmationText} to continue.`
    );

    if (confirmation !== confirmationText) return;

    setResetting(true);
    try {
      const response = await fetch("/api/shutdown/reset", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmation }),
      });
      const data = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;

      if (!response.ok) {
        throw new Error(data?.error || "Reset failed");
      }

      window.location.reload();
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Reset failed");
      setResetting(false);
    }
  }

  return (
    <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
      <a href="/api/shutdown/export" style={secondaryButtonStyle}>
        Export Excel
      </a>
      <button
        type="button"
        onClick={resetShutdownData}
        disabled={resetting}
        style={{
          ...dangerButtonStyle,
          opacity: resetting ? 0.65 : 1,
          cursor: resetting ? "wait" : "pointer",
        }}
      >
        {resetting ? "Clearing..." : "Clear for Next Shutdown"}
      </button>
    </div>
  );
}

const secondaryButtonStyle = {
  fontWeight: 600,
  color: "#111",
  textDecoration: "none",
  padding: "10px 14px",
  borderRadius: 10,
  border: "1px solid rgba(0,0,0,0.12)",
  background: "#fff",
};

const dangerButtonStyle = {
  font: "inherit",
  fontWeight: 700,
  color: "#fff",
  padding: "10px 14px",
  borderRadius: 10,
  border: "1px solid #991b1b",
  background: "#dc2626",
};
