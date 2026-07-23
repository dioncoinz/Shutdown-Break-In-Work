"use client";

import { useEffect, useRef, useState } from "react";

type Position = { top: number; left: number };

export function StatusColumnFilter({
  statuses,
  selectedStatuses,
}: {
  statuses: string[];
  selectedStatuses: string[];
}) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(() => new Set(selectedStatuses.length ? selectedStatuses : statuses));
  const [position, setPosition] = useState<Position>({ top: 0, left: 0 });

  useEffect(() => {
    if (!open) return;

    const closeOnOutsideClick = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!buttonRef.current?.contains(target) && !panelRef.current?.contains(target)) setOpen(false);
    };
    const close = () => setOpen(false);

    document.addEventListener("mousedown", closeOnOutsideClick);
    window.addEventListener("resize", close);
    window.addEventListener("scroll", close, true);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      window.removeEventListener("resize", close);
      window.removeEventListener("scroll", close, true);
    };
  }, [open]);

  function toggleMenu() {
    if (!open && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const panelWidth = 268;
      setPosition({
        top: rect.bottom + 8,
        left: Math.max(12, Math.min(rect.left, window.innerWidth - panelWidth - 12)),
      });
      setDraft(new Set(selectedStatuses.length ? selectedStatuses : statuses));
    }
    setOpen((value) => !value);
  }

  function toggleStatus(status: string) {
    setDraft((current) => {
      const next = new Set(current);
      if (next.has(status)) next.delete(status);
      else next.add(status);
      return next;
    });
  }

  function navigateWithStatuses(nextStatuses: string[]) {
    const params = new URLSearchParams(window.location.search);
    params.delete("status");
    for (const status of nextStatuses) params.append("status", status);
    const query = params.toString();
    window.location.assign(query ? `/break-in/list?${query}` : "/break-in/list");
  }

  const allSelected = statuses.length > 0 && statuses.every((status) => draft.has(status));
  const filterCount = selectedStatuses.length;

  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>
      <span>Status</span>
      <button
        ref={buttonRef}
        type="button"
        aria-label="Filter by status"
        aria-expanded={open}
        onClick={toggleMenu}
        style={{
          width: 28,
          height: 28,
          display: "inline-grid",
          placeItems: "center",
          border: filterCount ? "1px solid #2563eb" : "1px solid #cbd5e1",
          borderRadius: 7,
          background: filterCount ? "#eff6ff" : "#fff",
          color: filterCount ? "#1d4ed8" : "#475569",
          cursor: "pointer",
          position: "relative",
        }}
      >
        <span aria-hidden="true" style={{ fontSize: 13 }}>▼</span>
        {filterCount ? (
          <span style={{ position: "absolute", top: -7, right: -7, minWidth: 17, height: 17, padding: "0 4px", borderRadius: 999, background: "#2563eb", color: "#fff", fontSize: 10, lineHeight: "17px", fontWeight: 900 }}>
            {filterCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div ref={panelRef} role="dialog" aria-label="Status filter" style={{ position: "fixed", top: position.top, left: position.left, zIndex: 1000, width: 268, background: "#fff", border: "1px solid #cbd5e1", borderRadius: 10, boxShadow: "0 12px 32px rgba(15,23,42,0.22)", color: "#0f172a", whiteSpace: "normal" }}>
          <div style={{ padding: "12px 14px", borderBottom: "1px solid #e2e8f0", fontSize: 13, fontWeight: 900 }}>Filter by status</div>
          <div style={{ maxHeight: 280, overflowY: "auto", padding: "8px 10px" }}>
            <label style={optionStyle}>
              <input
                type="checkbox"
                checked={allSelected}
                onChange={() => setDraft(allSelected ? new Set() : new Set(statuses))}
              />
              <span>(Select all)</span>
            </label>
            <div style={{ height: 1, background: "#e2e8f0", margin: "6px 2px" }} />
            {statuses.map((status) => (
              <label key={status} style={optionStyle}>
                <input type="checkbox" checked={draft.has(status)} onChange={() => toggleStatus(status)} />
                <span>{formatStatus(status)}</span>
              </label>
            ))}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8, padding: 10, borderTop: "1px solid #e2e8f0" }}>
            <button type="button" onClick={() => navigateWithStatuses([])} style={clearButtonStyle}>Clear filter</button>
            <button
              type="button"
              disabled={draft.size === 0}
              onClick={() => {
                const checkedStatuses = statuses.filter((status) => draft.has(status));
                navigateWithStatuses(checkedStatuses.length === statuses.length ? [] : checkedStatuses);
              }}
              style={{ ...applyButtonStyle, opacity: draft.size === 0 ? 0.5 : 1, cursor: draft.size === 0 ? "not-allowed" : "pointer" }}
            >
              Apply
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function formatStatus(status: string) {
  return status.toLowerCase().replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

const optionStyle = { display: "flex", alignItems: "center", gap: 9, padding: "7px 4px", fontSize: 13, fontWeight: 700, cursor: "pointer" } as const;
const clearButtonStyle = { border: 0, background: "transparent", color: "#475569", padding: "7px 8px", fontWeight: 800, cursor: "pointer" } as const;
const applyButtonStyle = { border: "1px solid #1d4ed8", borderRadius: 7, background: "#2563eb", color: "#fff", padding: "7px 14px", fontWeight: 900 } as const;
