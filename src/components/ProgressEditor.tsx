"use client";

import { useState } from "react";

export default function ProgressEditor({ id, initial }: { id: string; initial: number }) {
  const [val, setVal] = useState<number>(initial);
  const [saving, setSaving] = useState(false);

  return (
    <div style={{ border: "1px solid #ddd", borderRadius: 12, padding: 10 }}>
      <div style={{ fontWeight: 900, marginBottom: 6 }}>Progress %</div>

      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <input
          type="number"
          min={0}
          max={100}
          value={val}
          onChange={(e) => setVal(Number(e.target.value))}
          style={{
            width: 90,
            padding: 10,
            border: "1px solid #ccc",
            borderRadius: 8,
          }}
        />

        <input
          type="range"
          min={0}
          max={100}
          value={val}
          onChange={(e) => setVal(Number(e.target.value))}
        />

        <button
          disabled={saving}
          onClick={async () => {
            setSaving(true);
            const res = await fetch(`/api/break-in/${id}/progress`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ progress_percent: val }),
            });
            setSaving(false);

            if (!res.ok) {
              const data = await res.json().catch(() => ({}));
              alert(data?.error || "Progress update failed");
              return;
            }

            location.reload();
          }}
          style={{
            padding: 10,
            borderRadius: 8,
            border: "1px solid #000",
            fontWeight: 900,
          }}
        >
          {saving ? "Saving..." : "Update"}
        </button>
      </div>
    </div>
  );
}
