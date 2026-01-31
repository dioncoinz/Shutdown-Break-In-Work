"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function DecisionForm({
  title,
  endpoint,
  approveLabel = "Approve",
  rejectLabel = "Reject",
  requireWorkgroup = false,
}: {
  title: string;
  endpoint: string;
  approveLabel?: string;
  rejectLabel?: string;
  requireWorkgroup?: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState<null | "approve" | "reject">(null);
  const [msg, setMsg] = useState<string | null>(null);

  async function submit(decision: "APPROVE" | "REJECT") {
    setLoading(decision === "APPROVE" ? "approve" : "reject");
    setMsg(null);

    // Read values safely (no namedItem issues)
    const commentEl = document.getElementById(`${title}-comment`) as HTMLTextAreaElement | null;
    const workgroupEl = document.getElementById(`${title}-workgroup`) as HTMLInputElement | null;

    const comment = (commentEl?.value ?? "").trim();
    const workgroup = (workgroupEl?.value ?? "").trim();

    if (requireWorkgroup && decision === "APPROVE" && !workgroup) {
      setLoading(null);
      setMsg("❌ Please enter a Workgroup before approving.");
      return;
    }

    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        decision,          // "APPROVE" | "REJECT"
        comment,           // free text
        workgroup,         // free text (coordinator only)
      }),
    });

    const data = await res.json().catch(() => ({}));

    setLoading(null);

    if (!res.ok) {
      setMsg(`❌ ${data?.error || "Decision failed"}`);
      return;
    }

    setMsg("✅ Saved");
    router.refresh();
  }

  return (
    <div style={{ marginTop: 10 }}>
      {requireWorkgroup && (
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontWeight: 800, display: "block", marginBottom: 6, color: "#111" }}>
            Allocate Workgroup
          </label>
          <input
            id={`${title}-workgroup`}
            placeholder="e.g. Mill Shutdown Crew / CV031 Team / Contractor XYZ"
            style={{
              width: "100%",
              padding: 10,
              border: "1px solid #ccc",
              borderRadius: 8,
            }}
          />
        </div>
      )}

      <div style={{ marginBottom: 12 }}>
        <label style={{ fontWeight: 800, display: "block", marginBottom: 6, color: "#111" }}>
          Comments
        </label>
        <textarea
          id={`${title}-comment`}
          placeholder="Add any notes for the next approver..."
          style={{
            width: "100%",
            padding: 10,
            border: "1px solid #ccc",
            borderRadius: 8,
            minHeight: 90,
          }}
        />
      </div>

      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <button
          type="button"
          onClick={() => submit("APPROVE")}
          disabled={loading !== null}
          style={{
            padding: "10px 14px",
            borderRadius: 10,
            border: "1px solid #111",
            fontWeight: 900,
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          {loading === "approve" ? "Saving..." : approveLabel}
        </button>

        <button
          type="button"
          onClick={() => submit("REJECT")}
          disabled={loading !== null}
          style={{
            padding: "10px 14px",
            borderRadius: 10,
            border: "1px solid #ccc",
            fontWeight: 900,
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          {loading === "reject" ? "Saving..." : rejectLabel}
        </button>

        {msg && <span style={{ marginLeft: 10, fontWeight: 800, color: "#111" }}>{msg}</span>}
      </div>
    </div>
  );
}
