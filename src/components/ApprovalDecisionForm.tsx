"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import type { ApprovalStage } from "@/lib/auth/approval-permissions";

export function ApprovalDecisionForm({
  stage,
  savePath,
  workgroup,
  fallbackHref,
  returnTo,
}: {
  stage: ApprovalStage;
  savePath: string;
  workgroup: string | null;
  fallbackHref: string;
  returnTo?: string;
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const needsWorkgroup = stage === "COORD_REVIEW";

  async function submitDecision(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;

    const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    const formData = new FormData(event.currentTarget);
    formData.set("decision", submitter?.value || "");
    setSubmitting(true);
    setError("");

    try {
      const response = await fetch(savePath, { method: "POST", body: formData });
      const resultUrl = new URL(response.url);
      const approvalError = resultUrl.searchParams.get("approvalError");

      if (approvalError) {
        setError(approvalError);
        return;
      }

      if (!response.ok || resultUrl.searchParams.get("approvalSaved") !== "1") {
        setError("The approval could not be saved. Please try again.");
        return;
      }

      const emailWarning = resultUrl.searchParams.get("emailWarning");
      if (emailWarning) window.alert(`Decision saved, but the notification email was not sent: ${emailWarning}`);

      if (returnTo?.startsWith("/") && !returnTo.startsWith("//")) window.location.assign(returnTo);
      else if (window.history.length > 1) router.back();
      else window.location.assign(fallbackHref);
    } catch {
      setError("The approval could not be saved. Check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form action={savePath} method="post" onSubmit={submitDecision} style={{ marginTop: 12, display: "grid", gap: 10 }}>
      <input type="hidden" name="stage" value={stage} />
      {needsWorkgroup ? (
        <label>
          <div style={fieldLabelStyle}>Workgroup</div>
          <input name="workgroup" defaultValue={workgroup || ""} required disabled={submitting} style={inputStyle} />
        </label>
      ) : null}
      <label>
        <div style={fieldLabelStyle}>Comment</div>
        <textarea name="comment" rows={3} disabled={submitting} style={textareaStyle} />
      </label>
      {error ? <div role="alert" style={errorStyle}>{error}</div> : null}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button type="submit" name="decision" value="APPROVE" disabled={submitting} style={buttonStyle("approve", submitting)}>
          {submitting ? "Saving..." : "Approve"}
        </button>
        <button type="submit" name="decision" value="REJECT" disabled={submitting} style={buttonStyle("reject", submitting)}>
          {submitting ? "Saving..." : "Reject"}
        </button>
      </div>
    </form>
  );
}

function buttonStyle(kind: "approve" | "reject", disabled: boolean) {
  const color = kind === "approve" ? "#166534" : "#b91c1c";
  const background = kind === "approve" ? "#dcfce7" : "#fee2e2";
  const border = kind === "approve" ? "#86efac" : "#fecaca";
  return { padding: "9px 14px", borderRadius: 8, border: `1px solid ${border}`, background, color, fontWeight: 900, cursor: disabled ? "wait" : "pointer", opacity: disabled ? 0.65 : 1 } as const;
}

const fieldLabelStyle = { fontSize: 12, color: "#111", fontWeight: 800, marginBottom: 6 } as const;
const inputStyle = { width: "100%", padding: "10px 12px", border: "1px solid #d1d5db", borderRadius: 8, color: "#111", background: "#fff", fontWeight: 700 } as const;
const textareaStyle = { ...inputStyle, minHeight: 82, resize: "vertical" } as const;
const errorStyle = { padding: "9px 11px", borderRadius: 8, border: "1px solid #fecaca", background: "#fef2f2", color: "#991b1b", fontSize: 12, fontWeight: 800 } as const;
