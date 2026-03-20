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
        aria-label={busy ? "Deleting request" : "Delete request"}
        title={busy ? "Deleting..." : "Delete request"}
        style={{
          width: 36,
          height: 36,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 10,
          border: "1px solid rgba(185,28,28,0.18)",
          color: "#b91c1c",
          background: "#fef2f2",
          cursor: busy ? "not-allowed" : "pointer",
        }}
      >
        {busy ? (
          "..."
        ) : (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M3 6h18" />
            <path d="M8 6V4h8v2" />
            <path d="M19 6l-1 14H6L5 6" />
            <path d="M10 11v6" />
            <path d="M14 11v6" />
          </svg>
        )}
      </button>

      {msg && (
        <div style={{ fontSize: 12, fontWeight: 900, color: "#111" }}>{msg}</div>
      )}
    </div>
  );
}
