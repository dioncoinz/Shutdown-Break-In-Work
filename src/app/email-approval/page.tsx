import Link from "next/link";
import { getBreakInRequestById } from "@/lib/break-in/server";
import { verifyApprovalToken } from "@/lib/email/approval-links";
import EmailApprovalForm from "./EmailApprovalForm";

export default async function EmailApprovalPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const sp = await searchParams;
  const token = sp.token;
  const parsed = verifyApprovalToken(token);

  if (!parsed.ok) {
    return <ApprovalShell title="Approval link unavailable" message={parsed.error} />;
  }

  const { request, error } = await getBreakInRequestById(parsed.data.requestId);
  if (!request) {
    return <ApprovalShell title="Request not found" message={error || "The request could not be loaded."} />;
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f4f6f8", padding: 28 }}>
      <div
        style={{
          maxWidth: 760,
          margin: "0 auto",
          background: "#fff",
          borderRadius: 18,
          boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
          padding: 28,
        }}
      >
        <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: 0.6, textTransform: "uppercase", color: "#6b7280" }}>
          Break-in workflow
        </div>
        <h1 style={{ margin: "8px 0 0", fontSize: 28, fontWeight: 800, color: "#111" }}>
          {parsed.data.decision === "APPROVE" ? "Approve request" : "Reject request"}
        </h1>
        <p style={{ margin: "10px 0 0", color: "#4b5563", lineHeight: 1.5 }}>
          This secure link is for {parsed.data.recipientEmail} and applies to the current review stage only.
        </p>

        <div
          style={{
            marginTop: 18,
            padding: 18,
            borderRadius: 14,
            background: "#f8fafc",
            border: "1px solid #e2e8f0",
          }}
        >
          <div style={{ fontWeight: 900, color: "#111", fontSize: 16 }}>
            {request.wo_number} - {request.wo_title || "Untitled"}
          </div>
          <div style={{ marginTop: 12, display: "grid", gap: 8, color: "#1f2937", fontSize: 14 }}>
            <div><b>Current stage:</b> {request.status || "-"}</div>
            <div><b>Area:</b> {request.area || "-"}</div>
            <div><b>Priority:</b> {request.priority || "-"}</div>
            <div><b>Requestor:</b> {request.requestor_name || "-"} ({request.requestor_email || "-"})</div>
            <div><b>Reason:</b> {request.reason || "-"}</div>
            <div><b>Consequence:</b> {request.consequence || "-"}</div>
          </div>
        </div>

        <EmailApprovalForm
          token={token || ""}
          requestId={request.id}
          currentStatus={request.status || ""}
          decision={parsed.data.decision}
          requireWorkgroup={parsed.data.stage === "COORD_REVIEW" && parsed.data.decision === "APPROVE"}
        />

        <div style={{ marginTop: 18 }}>
          <Link href={`/break-in/${request.id}`} style={{ color: "#0f172a", fontWeight: 700 }}>
            Open the request in the app
          </Link>
        </div>
      </div>
    </div>
  );
}

function ApprovalShell({ title, message }: { title: string; message: string }) {
  return (
    <div style={{ minHeight: "100vh", background: "#f4f6f8", padding: 28 }}>
      <div
        style={{
          maxWidth: 760,
          margin: "0 auto",
          background: "#fff",
          borderRadius: 18,
          boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
          padding: 28,
        }}
      >
        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 800, color: "#111" }}>{title}</h1>
        <p style={{ marginTop: 12, color: "#4b5563", lineHeight: 1.5 }}>{message}</p>
        <Link href="/break-in/dashboard" style={{ color: "#0f172a", fontWeight: 700 }}>
          Return to dashboard
        </Link>
      </div>
    </div>
  );
}
