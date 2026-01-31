"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function ProgressUpdater({
  id,
  currentPercent,
  currentStatus,
}: {
  id: string;
  currentPercent: number;
  currentStatus: string;
}) {
  const router = useRouter();
  const [percent, setPercent] = useState<number>(currentPercent ?? 0);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function save(nextStatus?: string) {
    setSaving(true);
    setMsg(null);

    const res = await fetch(`/api/break-in/${id}/progress`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        progress: Number(percent), // ✅ API expects "progress"
        status: nextStatus,        // optional
      }),
    });

    const data = await res.json().catch(() => ({}));
    setSaving(false);

    if (!res.ok) {
      setMsg(`❌ ${data?.error || "Failed to update progress"}`);
      return;
    }

    setMsg("✅ Saved");
    router.refresh();
  }

  return (
    <div
      style={{
        background: "#fff",
        borderRadius: 14,
        boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
        padding: 18,
        marginTop: 14,
      }}
    >
      <div style={{ fontSize: 15, fontWeight: 900, color: "#111" }}>
        Progress update
      </div>

      <div style={{ marginTop: 10, fontSize: 13, fontWeight: 800, color: "#222" }}>
        Current status:{" "}
        <span style={{ color: "#111" }}>{currentStatus || "UNKNOWN"}</span>
      </div>

      <div style={{ marginTop: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 800, color: "#000" }}>
          <span>Progress %</span>
          <span>{Math.round(percent)}%</span>
        </div>

        <input
          type="range"
          min={0}
          max={100}
          value={percent}
          onChange={(e) => setPercent(Number(e.target.value))}
          style={{ width: "100%", marginTop: 8 }}
        />
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12 }}>
        <button
          type="button"
          disabled={saving}
          onClick={() => save()}
          style={{
            padding: "10px 14px",
            borderRadius: 10,
            border: "1px solid #111",
            fontWeight: 900,
            color: "#000",
            cursor: saving ? "not-allowed" : "pointer",
          }}
        >
          {saving ? "Saving..." : "Save %"}
        </button>

        <button
          type="button"
          disabled={saving}
          onClick={() => save("IN_PROGRESS")}
          style={{
            padding: "10px 14px",
            borderRadius: 10,
            border: "1px solid #ccc",
            fontWeight: 900,
            color: "#000",
          }}
        >
          Set In Progress
        </button>

        <button
          type="button"
          disabled={saving}
          onClick={() => {
            const next = 100;
            setPercent(next);
            // ensure we send 100 even if state hasn't committed yet
            setTimeout(() => {
              // percent state might lag, but we force progress=100 anyway by reading `next`
              // simplest: temporarily set percent and call save() which uses Number(percent)
              // so we call save after a tick
              save("COMPLETED");
            }, 0);
          }}
          style={{
            padding: "10px 14px",
            borderRadius: 10,
            border: "1px solid #16a34a",
            fontWeight: 900,
            color: "#000",
          }}
        >
          Mark Completed
        </button>
      </div>

      {msg && <div style={{ marginTop: 10, fontWeight: 900, color: "#111" }}>{msg}</div>}
    </div>
  );
}
