"use client";

import { useState } from "react";

export default function EmailApprovalForm({
  token,
  requestId,
  currentStatus,
  decision,
  requireWorkgroup,
}: {
  token: string;
  requestId: string;
  currentStatus: string;
  decision: "APPROVE" | "REJECT";
  requireWorkgroup: boolean;
}) {
  const [comment, setComment] = useState("");
  const [workgroup, setWorkgroup] = useState("");
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<null | { ok: boolean; message: string }>(null);

  async function submit() {
    if (requireWorkgroup && !workgroup.trim()) {
      setResult({ ok: false, message: "Workgroup is required before approving this request." });
      return;
    }

    setSaving(true);
    setResult(null);

    const res = await fetch("/api/email-approval/execute", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token,
        comment,
        workgroup,
      }),
    });

    const data = await res.json().catch(() => ({}));
    setSaving(false);

    if (!res.ok) {
      setResult({ ok: false, message: data?.error || "This approval could not be completed." });
      return;
    }

    const suffix = data?.emailWarning ? ` Email warning: ${data.emailWarning}` : "";
    setResult({
      ok: true,
      message: `${decision === "APPROVE" ? "Approval" : "Rejection"} saved for request ${requestId}. Current status: ${data?.nextStatus || currentStatus}.${suffix}`,
    });
  }

  return (
    <div style={{ marginTop: 22 }}>
      {requireWorkgroup && (
        <div style={{ marginBottom: 14 }}>
          <label style={{ display: "block", marginBottom: 6, fontSize: 13, fontWeight: 800, color: "#222" }}>
            Workgroup
          </label>
          <input
            value={workgroup}
            onChange={(e) => setWorkgroup(e.target.value)}
            placeholder="e.g. Mill Shutdown Crew / Contractor XYZ"
            style={{
              width: "100%",
              padding: "12px 14px",
              border: "1px solid #d1d5db",
              borderRadius: 10,
              fontSize: 14,
              color: "#111",
              background: "#fff",
            }}
          />
        </div>
      )}

      <div style={{ marginBottom: 14 }}>
        <label style={{ display: "block", marginBottom: 6, fontSize: 13, fontWeight: 800, color: "#222" }}>
          Comment
        </label>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Optional comment"
          style={{
            width: "100%",
            padding: "12px 14px",
            border: "1px solid #d1d5db",
            borderRadius: 10,
            fontSize: 14,
            minHeight: 110,
            color: "#111",
            background: "#fff",
          }}
        />
      </div>

      <button
        type="button"
        disabled={saving}
        onClick={submit}
        style={{
          padding: "12px 18px",
          borderRadius: 10,
          border: decision === "APPROVE" ? "1px solid #15803d" : "1px solid #b91c1c",
          background: decision === "APPROVE" ? "#16a34a" : "#dc2626",
          color: "#fff",
          fontWeight: 800,
          cursor: saving ? "not-allowed" : "pointer",
        }}
      >
        {saving ? "Saving..." : decision === "APPROVE" ? "Confirm Approve" : "Confirm Reject"}
      </button>

      {result && (
        <div
          style={{
            marginTop: 14,
            padding: "12px 14px",
            borderRadius: 12,
            background: result.ok ? "#f0fdf4" : "#fef2f2",
            border: result.ok ? "1px solid #bbf7d0" : "1px solid #fecaca",
            color: result.ok ? "#166534" : "#b91c1c",
            fontWeight: 700,
            lineHeight: 1.5,
          }}
        >
          {result.message}
        </div>
      )}
    </div>
  );
}
