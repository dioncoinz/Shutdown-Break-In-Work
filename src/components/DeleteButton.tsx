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

      const raw = await res.text();
      let data: { error?: string } = {};

      try {
        data = raw ? JSON.parse(raw) : {};
      } catch {
        data = {};
      }

      if (!res.ok) {
        const fallback = raw?.trim()
          ? raw.trim().slice(0, 160)
          : `Delete failed (${res.status})`;
        setMsg(`Error: ${data.error || fallback}`);
        setBusy(false);
        return;
      }

      setMsg("Deleted");
      setBusy(false);
      router.refresh();
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Delete failed";
      setBusy(false);
      setMsg(`Error: ${message}`);
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
        <div style={{ fontSize: 12, fontWeight: 900, color: "#111", maxWidth: 220 }}>
          {msg}
        </div>
      )}
    </div>
  );
}
