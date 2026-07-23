import Link from "next/link";
import { AppSidebar } from "@/components/AppSidebar";
import { listOutstandingApprovals, getApprovalStagesForRole } from "@/lib/approvals/inbox";
import { requireCurrentUser } from "@/lib/auth/current-user";
import { formatPerthDateTime } from "@/lib/time/format";

export default async function MyApprovalsPage() {
  const currentUser = await requireCurrentUser();
  const approvals = await listOutstandingApprovals(currentUser.role);
  const stages = getApprovalStagesForRole(currentUser.role);

  return (
    <div style={pageStyle}>
      <AppSidebar user={currentUser} />
      <main style={{ minWidth: 0, padding: 28 }}>
        <div style={{ paddingRight: 56 }}>
          <div style={{ color: "#ea580c", fontSize: 13, fontWeight: 900 }}>My work queue</div>
          <h1 style={{ margin: "3px 0 0", color: "#111827", fontSize: 26, fontWeight: 900 }}>Outstanding Approvals</h1>
          <p style={{ margin: "8px 0 0", color: "#64748b", fontSize: 14, fontWeight: 600 }}>
            {approvals.length === 1 ? "1 request is" : `${approvals.length} requests are`} waiting for your {formatRole(currentUser.role)} approval.
          </p>
        </div>

        {stages.length === 0 ? (
          <div style={emptyStyle}>
            Your current role ({formatRole(currentUser.role)}) does not have an approval stage assigned.
          </div>
        ) : approvals.length === 0 ? (
          <div style={emptyStyle}>You are all caught up. There are no requests waiting for your approval.</div>
        ) : (
          <div style={tableWrapStyle}>
            <table style={{ width: "100%", minWidth: 900, borderCollapse: "collapse" }}>
              <thead style={{ background: "#f1f3f5" }}>
                <tr><Th>Request type</Th><Th>WO</Th><Th>Title</Th><Th>Area</Th><Th>Approval required</Th><Th>Waiting since</Th><Th>Requestor</Th><Th /></tr>
              </thead>
              <tbody>
                {approvals.map((approval, index) => (
                  <tr key={`${approval.requestType}-${approval.id}`} style={{ borderTop: "1px solid #e5e7eb", background: index % 2 ? "#fafafa" : "#fff" }}>
                    <Td><span style={typeBadgeStyle(approval.requestType)}>{approval.requestTypeLabel}</span></Td>
                    <Td>{approval.woNumber}</Td>
                    <Td>{approval.woTitle || "Untitled"}</Td>
                    <Td>{approval.area || "-"}</Td>
                    <Td><span style={statusBadgeStyle}>{formatStatus(approval.status)}</span></Td>
                    <Td>{formatPerthDateTime(approval.createdAt)}</Td>
                    <Td>{approval.requestorName || "-"}</Td>
                    <Td><Link href={`${approval.href}?returnTo=${encodeURIComponent("/approvals")}`} style={openButtonStyle}>Review</Link></Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}

function formatRole(role: string) {
  return role.charAt(0).toUpperCase() + role.slice(1).toLowerCase();
}

function formatStatus(status: string) {
  const labels: Record<string, string> = {
    SUBMITTED: "Planner Review",
    COORD_REVIEW: "Coordinator Review",
    SUPER_REVIEW: "Superintendent Review",
    MANAGER_REVIEW: "Manager Review",
  };
  return labels[status] || status;
}

function Th({ children }: { children?: React.ReactNode }) {
  return <th style={{ padding: 14, textAlign: "left", color: "#1f2937", fontSize: 13, fontWeight: 900, whiteSpace: "nowrap" }}>{children}</th>;
}

function Td({ children }: { children: React.ReactNode }) {
  return <td style={{ padding: 14, color: "#111827", fontSize: 14, fontWeight: 600, verticalAlign: "top" }}>{children}</td>;
}

function typeBadgeStyle(type: "emergent" | "late_work" | "work_removal") {
  const color = type === "emergent" ? "#2563eb" : type === "late_work" ? "#7c3aed" : "#b45309";
  return { display: "inline-flex", padding: "4px 9px", borderRadius: 999, background: `${color}18`, color, fontSize: 12, fontWeight: 900, whiteSpace: "nowrap" } as const;
}

const pageStyle = { minHeight: "100vh", background: "#f4f6f8", display: "grid", gridTemplateColumns: "176px minmax(0, 1fr)" } as const;
const tableWrapStyle = { marginTop: 22, background: "#fff", borderRadius: 14, border: "1px solid rgba(0,0,0,0.06)", boxShadow: "0 2px 8px rgba(0,0,0,0.05)", overflowX: "auto" } as const;
const emptyStyle = { marginTop: 22, padding: 24, borderRadius: 14, border: "1px dashed #cbd5e1", background: "#fff", color: "#475569", fontWeight: 700 } as const;
const statusBadgeStyle = { display: "inline-flex", padding: "4px 9px", borderRadius: 999, background: "#fff7ed", color: "#c2410c", fontSize: 12, fontWeight: 900, whiteSpace: "nowrap" } as const;
const openButtonStyle = { display: "inline-flex", padding: "8px 12px", borderRadius: 9, border: "1px solid #ea580c", background: "#f97316", color: "#fff", fontWeight: 900, textDecoration: "none" } as const;
