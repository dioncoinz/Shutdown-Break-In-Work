import Link from "next/link";
import { getOutstandingApprovalCount } from "@/lib/approvals/inbox";

export async function ApprovalNotificationBell({ role }: { role: string }) {
  const count = await getOutstandingApprovalCount(role);
  const label = count === 1 ? "1 approval awaiting you" : `${count} approvals awaiting you`;

  return (
    <Link href="/approvals" aria-label={label} title={label} style={bellLinkStyle}>
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {count > 0 ? <span style={countStyle}>{count > 99 ? "99+" : count}</span> : null}
    </Link>
  );
}

const bellLinkStyle = {
  position: "fixed",
  top: 18,
  right: 22,
  zIndex: 900,
  width: 42,
  height: 42,
  display: "grid",
  placeItems: "center",
  borderRadius: 999,
  border: "1px solid #d1d5db",
  background: "#fff",
  color: "#334155",
  boxShadow: "0 5px 18px rgba(15,23,42,0.14)",
  textDecoration: "none",
} as const;

const countStyle = {
  position: "absolute",
  top: -6,
  right: -6,
  minWidth: 20,
  height: 20,
  padding: "0 5px",
  display: "grid",
  placeItems: "center",
  borderRadius: 999,
  border: "2px solid #fff",
  background: "#dc2626",
  color: "#fff",
  fontSize: 10,
  lineHeight: 1,
  fontWeight: 900,
} as const;
