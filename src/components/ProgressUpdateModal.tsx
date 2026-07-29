"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";

export function ProgressUpdateModal({
  id,
  workOrder,
  title,
  initialPercent,
  status,
  area,
  priority,
  workgroup,
  requestor,
  reason,
  consequence,
  plannedHours,
  canEdit,
}: {
  id: string;
  workOrder: string;
  title: string | null;
  initialPercent: number;
  status: string | null;
  area: string | null;
  priority: string | null;
  workgroup: string | null;
  requestor: string | null;
  reason: string | null;
  consequence: string | null;
  plannedHours: number;
  canEdit: boolean;
}) {
  const router = useRouter();
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [percent, setPercent] = useState(clampPercent(initialPercent));
  const [savedPercent, setSavedPercent] = useState(clampPercent(initialPercent));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [photo, setPhoto] = useState<{ name: string | null; dataUrl: string } | null | undefined>(undefined);
  const [photoLoading, setPhotoLoading] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    closeButtonRef.current?.focus();
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !saving) {
        setIsOpen(false);
        setError(null);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, saving]);

  function open() {
    setPercent(savedPercent);
    setError(null);
    setIsOpen(true);
    if (photo === undefined && !photoLoading) void loadPhoto();
  }

  async function loadPhoto() {
    setPhotoLoading(true);
    setPhotoError(null);
    try {
      const response = await fetch(`/api/break-in/${id}/attachment`);
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setPhotoError(data?.error || "Unable to load the request photo.");
        return;
      }
      setPhoto(data?.dataUrl ? { name: data.name ?? null, dataUrl: data.dataUrl } : null);
    } catch {
      setPhotoError("Unable to load the request photo.");
    } finally {
      setPhotoLoading(false);
    }
  }

  function close() {
    if (saving) return;
    setIsOpen(false);
    setError(null);
  }

  async function save() {
    setSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/break-in/${id}/progress`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ progress: percent }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(data?.error || "Failed to update progress.");
        return;
      }

      setSavedPercent(percent);
      setIsOpen(false);
      router.refresh();
    } catch {
      setError("Unable to update progress. Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <button type="button" onClick={open} style={openButtonStyle} aria-label={`Open work order ${workOrder}`}>
        Open
      </button>

      {isOpen ? (
        <div
          role="presentation"
          style={backdropStyle}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) close();
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby={`progress-title-${id}`}
            style={modalStyle}
          >
            <div style={headerStyle}>
              <div>
                <div style={eyebrowStyle}>Emergent request · WO {workOrder}</div>
                <h2 id={`progress-title-${id}`} style={titleStyle}>{title || "Untitled"}</h2>
              </div>
              <button
                ref={closeButtonRef}
                type="button"
                onClick={close}
                disabled={saving}
                aria-label="Close progress update"
                style={closeButtonStyle}
              >
                ×
              </button>
            </div>

            <div style={summaryGridStyle}>
              <SummaryItem label="Status" value={status || "UNKNOWN"} />
              <SummaryItem label="Area" value={area || "-"} />
              <SummaryItem label="Priority" value={priority || "-"} />
              <SummaryItem label="Workgroup" value={workgroup || "-"} />
              <SummaryItem label="Planned hours" value={plannedHours.toFixed(1)} />
              <SummaryItem label="Requested by" value={requestor || "-"} />
            </div>

            {reason ? <SummaryText label="Reason" value={reason} /> : null}
            {consequence ? <SummaryText label="Consequence" value={consequence} /> : null}

            {photoLoading ? <div style={photoMessageStyle}>Loading attached photo...</div> : null}
            {photo ? (
              <div style={{ marginTop: 18 }}>
                <div style={summaryLabelStyle}>Attached photo{photo.name ? ` · ${photo.name}` : ""}</div>
                <div style={photoFrameStyle}>
                  <Image
                    src={photo.dataUrl}
                    alt={photo.name || `Photo attached to work order ${workOrder}`}
                    fill
                    unoptimized
                    sizes="(max-width: 720px) 100vw, 640px"
                    style={{ objectFit: "contain" }}
                  />
                </div>
              </div>
            ) : null}
            {photo === null && !photoLoading ? <div style={photoMessageStyle}>No photo attached to this request.</div> : null}
            {photoError ? (
              <div style={photoErrorStyle}>
                {photoError}{" "}
                <button type="button" onClick={() => void loadPhoto()} style={retryButtonStyle}>Try again</button>
              </div>
            ) : null}

            <div style={progressPanelStyle}>
              <div style={percentHeaderStyle}>
                <label htmlFor={`progress-range-${id}`} style={{ fontWeight: 800 }}>Progress</label>
                <span style={percentValueStyle}>{percent}%</span>
              </div>
              <input
                id={`progress-range-${id}`}
                type="range"
                min={0}
                max={100}
                step={1}
                value={percent}
                onChange={(event) => setPercent(clampPercent(Number(event.target.value)))}
                disabled={!canEdit}
                style={{ width: "100%", accentColor: "#f97316" }}
              />
              {canEdit ? (
                <div style={numberRowStyle}>
                  <input
                    aria-label="Progress percentage"
                    type="number"
                    min={0}
                    max={100}
                    value={percent}
                    onChange={(event) => setPercent(clampPercent(Number(event.target.value)))}
                    style={numberInputStyle}
                  />
                  <span style={{ color: "#64748b", fontWeight: 700 }}>% complete</span>
                </div>
              ) : null}
            </div>

            {error ? <div role="alert" style={errorStyle}>{error}</div> : null}

            <div style={footerStyle}>
              <Link href={`/break-in/${id}`} style={detailsLinkStyle}>Full request details</Link>
              <div style={{ display: "flex", gap: 10 }}>
                <button type="button" onClick={close} disabled={saving} style={cancelButtonStyle}>
                  {canEdit ? "Cancel" : "Close"}
                </button>
                {canEdit ? (
                  <button type="button" onClick={save} disabled={saving} style={saveButtonStyle}>
                    {saving ? "Saving..." : "Save progress"}
                  </button>
                ) : null}
              </div>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={summaryLabelStyle}>{label}</div>
      <div style={summaryValueStyle}>{value}</div>
    </div>
  );
}

function SummaryText({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ marginTop: 16 }}>
      <div style={summaryLabelStyle}>{label}</div>
      <div style={{ ...summaryValueStyle, marginTop: 4, lineHeight: 1.45 }}>{value}</div>
    </div>
  );
}

function clampPercent(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

const openButtonStyle = {
  padding: "8px 12px",
  borderRadius: 10,
  border: "1px solid #cbd5e1",
  background: "#f8fafc",
  color: "#0f172a",
  fontWeight: 700,
  cursor: "pointer",
} as const;
const backdropStyle = {
  position: "fixed",
  inset: 0,
  zIndex: 2000,
  display: "grid",
  placeItems: "center",
  padding: 20,
  background: "rgba(15, 23, 42, 0.52)",
} as const;
const modalStyle = {
  width: "min(100%, 680px)",
  maxHeight: "calc(100vh - 40px)",
  overflowY: "auto",
  borderRadius: 16,
  background: "#fff",
  padding: 22,
  boxShadow: "0 24px 70px rgba(15, 23, 42, 0.3)",
  color: "#0f172a",
} as const;
const headerStyle = { display: "flex", justifyContent: "space-between", gap: 20, alignItems: "flex-start" } as const;
const eyebrowStyle = { color: "#c2410c", fontSize: 12, fontWeight: 900, letterSpacing: "0.05em", textTransform: "uppercase" } as const;
const titleStyle = { margin: "4px 0 0", fontSize: 22, lineHeight: 1.2 } as const;
const closeButtonStyle = {
  width: 34,
  height: 34,
  border: "1px solid #e2e8f0",
  borderRadius: 9,
  background: "#f8fafc",
  color: "#334155",
  fontSize: 24,
  lineHeight: 1,
  cursor: "pointer",
} as const;
const summaryGridStyle = { marginTop: 22, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 16, padding: 16, borderRadius: 12, background: "#f8fafc" } as const;
const summaryLabelStyle = { color: "#64748b", fontSize: 11, fontWeight: 900, letterSpacing: "0.04em", textTransform: "uppercase" } as const;
const summaryValueStyle = { marginTop: 3, color: "#0f172a", fontSize: 14, fontWeight: 700, whiteSpace: "pre-wrap" } as const;
const progressPanelStyle = { marginTop: 20, paddingTop: 18, borderTop: "1px solid #e2e8f0" } as const;
const photoFrameStyle = { position: "relative", height: 320, marginTop: 7, overflow: "hidden", border: "1px solid #e2e8f0", borderRadius: 12, background: "#f8fafc" } as const;
const photoMessageStyle = { marginTop: 16, color: "#64748b", fontSize: 13, fontWeight: 700 } as const;
const photoErrorStyle = { marginTop: 16, color: "#b91c1c", fontSize: 13, fontWeight: 700 } as const;
const retryButtonStyle = { border: 0, background: "transparent", color: "#b91c1c", fontWeight: 900, textDecoration: "underline", cursor: "pointer" } as const;
const percentHeaderStyle = { display: "flex", justifyContent: "space-between", alignItems: "center" } as const;
const percentValueStyle = { color: "#ea580c", fontSize: 26, fontWeight: 900 } as const;
const numberRowStyle = { display: "flex", alignItems: "center", gap: 10, marginTop: 16 } as const;
const numberInputStyle = {
  width: 88,
  height: 42,
  border: "1px solid #cbd5e1",
  borderRadius: 9,
  padding: "0 10px",
  color: "#0f172a",
  fontSize: 16,
  fontWeight: 800,
} as const;
const errorStyle = {
  marginTop: 16,
  padding: 11,
  borderRadius: 9,
  background: "#fef2f2",
  color: "#b91c1c",
  fontSize: 13,
  fontWeight: 700,
} as const;
const footerStyle = { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 14, marginTop: 24, flexWrap: "wrap" } as const;
const detailsLinkStyle = { color: "#475569", fontSize: 13, fontWeight: 800, textDecoration: "underline" } as const;
const cancelButtonStyle = {
  padding: "10px 15px",
  border: "1px solid #cbd5e1",
  borderRadius: 9,
  background: "#fff",
  color: "#334155",
  fontWeight: 800,
  cursor: "pointer",
} as const;
const saveButtonStyle = {
  padding: "10px 16px",
  border: "1px solid #ea580c",
  borderRadius: 9,
  background: "#f97316",
  color: "#fff",
  fontWeight: 900,
  cursor: "pointer",
} as const;
