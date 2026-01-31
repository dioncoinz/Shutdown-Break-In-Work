"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function DeleteButton({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function onDelete() {
    const ok = window.confirm("Delete this request? This cannot be undone.");
    if (!ok) return;

    setBusy(true);
    setMsg(null);

    try {
      const res = await fetch(`/api/break-in/${id}/delete`, {
        method: "DELETE",
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setMsg(`❌ ${data?.error || "Delete failed"}`);
        setBusy(false);
        return;
      }

      setMsg("✅ Deleted");
      setBusy(false);
      router.refresh();
    } catch (e: any) {
      setBusy(false);
      setMsg(`❌ ${e?.message || "Delete failed"}`);
    }
  }

  return (
    <div
      style={{
        display: "inline-flex",
        flexDirection: "column",
        alignItems: "flex-end",
        gap: 6,
      }}
    >
      <button
        type="button"
        onClick={onDelete}
        disabled={busy}
        style={{
          padding: "6px 10px",
          borderRadius: 10,
          border: "1px solid #b91c1c",
          color: "#7f1d1d",
          fontWeight: 900,
          background: "#fff5f5",
          cursor: busy ? "not-allowed" : "pointer",
        }}
      >
        {busy ? "Deleting..." : "Delete"}
      </button>

      {msg && (
        <div style={{ fontSize: 12, fontWeight: 900, color: "#111" }}>{msg}</div>
      )}
    </div>
  );
}
