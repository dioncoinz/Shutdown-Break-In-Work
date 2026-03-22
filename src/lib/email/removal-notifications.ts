import { createApprovalToken } from "@/lib/email/approval-links";
import {
  parseEmailList as parseBreakInEmailList,
} from "@/lib/break-in/workflow";
import type { Decision, ReviewStage } from "@/lib/break-in/decision";
import {
  WorkRemovalRequestRecord,
  WorkRemovalStatus,
  getStageConfig,
  parseEmailList,
} from "@/lib/work-removal/workflow";

type NotificationResult = {
  attempted: boolean;
  sent: boolean;
  reason?: string;
  providerId?: string;
};

function getAppBaseUrl() {
  return (
    process.env.APP_BASE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL && `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`) ||
    (process.env.VERCEL_URL && `https://${process.env.VERCEL_URL}`) ||
    "http://localhost:3000"
  );
}

function buildRequestUrl(requestId: string) {
  const baseUrl = getAppBaseUrl().replace(/\/+$/, "");
  return `${baseUrl}/work-removal/${requestId}`;
}

function buildEmailApprovalUrl({
  requestId,
  stage,
  decision,
  recipientEmail,
}: {
  requestId: string;
  stage: ReviewStage;
  decision: Decision;
  recipientEmail: string;
}) {
  const baseUrl = getAppBaseUrl().replace(/\/+$/, "");
  const token = createApprovalToken({ requestId, stage, decision, recipientEmail });
  return `${baseUrl}/email-approval/removal?token=${encodeURIComponent(token)}`;
}

async function sendEmail({
  to,
  subject,
  html,
  text,
}: {
  to: string[];
  subject: string;
  html: string;
  text: string;
}): Promise<NotificationResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;

  if (!apiKey || !from) {
    return {
      attempted: false,
      sent: false,
      reason: "Email provider not configured. Set RESEND_API_KEY and EMAIL_FROM.",
    };
  }

  console.log("Attempting Resend email", {
    from,
    to,
    subject,
    apiKeyPrefix: apiKey.slice(0, 8),
  });

  let response: Response;
  try {
    response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, to, subject, html, text }),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown fetch error";
    console.error("Resend fetch threw before response", {
      from,
      to,
      subject,
      message,
    });
    return {
      attempted: true,
      sent: false,
      reason: `Resend fetch failed: ${message}`,
    };
  }

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    console.error("Resend responded with error", {
      status: response.status,
      body,
      from,
      to,
      subject,
    });
    return {
      attempted: true,
      sent: false,
      reason: body || `Email API failed with ${response.status}`,
    };
  }

  const body = (await response.json().catch(() => ({}))) as { id?: string };
  if (!body?.id) {
    return {
      attempted: true,
      sent: false,
      reason: "Resend accepted the request but did not return an email id.",
    };
  }

  console.log("Resend accepted email", {
    id: body.id,
    to,
    subject,
  });

  return { attempted: true, sent: true, providerId: body.id };
}

function escapeHtml(value: string | null | undefined) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatRequestSummary(request: WorkRemovalRequestRecord) {
  return `
    <p><strong>WO:</strong> ${escapeHtml(request.wo_number)} - ${escapeHtml(request.wo_title || "Untitled")}</p>
    <p><strong>Area:</strong> ${escapeHtml(request.area || "-")}</p>
    <p><strong>Priority:</strong> ${escapeHtml(request.priority || "-")}</p>
    <p><strong>Requestor:</strong> ${escapeHtml(request.requestor_name || "-")}</p>
  `;
}

function formatRequestSummaryText(request: WorkRemovalRequestRecord) {
  return [
    `WO: ${request.wo_number} - ${request.wo_title || "Untitled"}`,
    `Area: ${request.area || "-"}`,
    `Priority: ${request.priority || "-"}`,
    `Requestor: ${request.requestor_name || "-"} (${request.requestor_email || "-"})`,
    `Reason: ${request.reason || "-"}`,
    `Consequence: ${request.consequence || "-"}`,
  ].join("\n");
}

export async function notifyRemovalStageApprovers(
  request: WorkRemovalRequestRecord,
  status: Extract<WorkRemovalStatus, "SUBMITTED" | "COORD_REVIEW" | "SUPER_REVIEW" | "MANAGER_REVIEW">,
  triggeredBy: string,
) {
  const stage = getStageConfig(status);
  const recipients = parseEmailList(stage.envKey ? process.env[stage.envKey] : "");

  if (recipients.length === 0) {
    return {
      attempted: false,
      sent: false,
      reason: `No recipients configured for ${stage.label}.`,
    } satisfies NotificationResult;
  }

  const approvalRows = recipients
    .map((recipient) => {
      const approveUrl = buildEmailApprovalUrl({
        requestId: request.id,
        stage: status as ReviewStage,
        decision: "APPROVE",
        recipientEmail: recipient,
      });
      const rejectUrl = buildEmailApprovalUrl({
        requestId: request.id,
        stage: status as ReviewStage,
        decision: "REJECT",
        recipientEmail: recipient,
      });

      return `
        <tr>
          <td style="padding: 8px 0; border-top: 1px solid #e5e7eb; vertical-align: top;">${escapeHtml(recipient)}</td>
          <td style="padding: 8px 0; border-top: 1px solid #e5e7eb;">
            <div><a href="${approveUrl}">Approve removal</a></div>
            <div style="margin-top: 6px;"><a href="${rejectUrl}">Reject removal</a></div>
          </td>
        </tr>
      `;
    })
    .join("");

  return sendEmail({
    to: recipients,
    subject: `Work removal approval required: ${request.wo_number}`,
    html: `
      <div style="font-family: Arial, Helvetica, sans-serif; color: #111; line-height: 1.5;">
        <p><strong>Work removal approval required</strong></p>
        <p>Review stage: ${escapeHtml(stage.label)}</p>
        <p>Submitted by: ${escapeHtml(triggeredBy)}</p>
        ${formatRequestSummary(request)}
        <p><strong>Action</strong></p>
        <table style="width: 100%; border-collapse: collapse;">
          <tbody>${approvalRows}</tbody>
        </table>
      </div>
    `,
    text: [
      "Work removal approval required",
      "",
      `Review stage: ${stage.label}`,
      `Submitted by: ${triggeredBy}`,
      "",
      formatRequestSummaryText(request),
      "",
      "Action links:",
      ...recipients.flatMap((recipient) => {
        const approveUrl = buildEmailApprovalUrl({
          requestId: request.id,
          stage: status as ReviewStage,
          decision: "APPROVE",
          recipientEmail: recipient,
        });
        const rejectUrl = buildEmailApprovalUrl({
          requestId: request.id,
          stage: status as ReviewStage,
          decision: "REJECT",
          recipientEmail: recipient,
        });
        return [`${recipient} approve: ${approveUrl}`, `${recipient} reject: ${rejectUrl}`];
      }),
    ].join("\n"),
  });
}

export async function notifyRemovalRequestorOutcome(
  request: WorkRemovalRequestRecord,
  outcome: "APPROVED" | "REJECTED",
  comment: string,
  decidedBy: string,
) {
  const requestorEmail = request.requestor_email?.trim().toLowerCase();
  if (!requestorEmail || !requestorEmail.includes("@")) {
    return {
      attempted: false,
      sent: false,
      reason: "Requestor email is missing.",
    } satisfies NotificationResult;
  }

  const requestUrl = buildRequestUrl(request.id);
  const title = outcome === "APPROVED" ? "approved" : "rejected";

  return sendEmail({
    to: [requestorEmail],
    subject: `Work removal request ${title}: ${request.wo_number}`,
    html: `
      <div style="font-family: Arial, Helvetica, sans-serif; color: #111; line-height: 1.5;">
        <p><strong>Work removal request ${escapeHtml(title)}</strong></p>
        <p>${escapeHtml(decidedBy)} marked this request as ${escapeHtml(outcome)}.</p>
        ${comment ? `<p><strong>Comment:</strong><br/>${escapeHtml(comment)}</p>` : ""}
        ${formatRequestSummary(request)}
        <p style="margin-top: 14px;">Open request: <a href="${requestUrl}">${requestUrl}</a></p>
      </div>
    `,
    text: [
      `Work removal request ${title}`,
      "",
      `${decidedBy} marked this request as ${outcome}.`,
      ...(comment ? ["", `Comment: ${comment}`] : []),
      "",
      formatRequestSummaryText(request),
      "",
      `Open request: ${requestUrl}`,
    ].join("\n"),
  });
}

export async function notifyRemovalApprovedDistribution(
  request: WorkRemovalRequestRecord,
  approvedBy: string,
  comment: string,
) {
  const recipients = parseBreakInEmailList(process.env.APPROVED_NOTIFICATION_EMAILS || "");
  console.log("Removal approved distribution recipients resolved", {
    requestId: request.id,
    woNumber: request.wo_number,
    recipientCount: recipients.length,
  });

  if (recipients.length === 0) {
    console.warn("Removal approved distribution skipped because no recipients are configured", {
      requestId: request.id,
      woNumber: request.wo_number,
      envPresent: Boolean(process.env.APPROVED_NOTIFICATION_EMAILS),
    });
    return {
      attempted: false,
      sent: false,
      reason: "No recipients configured for approved work notification.",
    } satisfies NotificationResult;
  }

  const requestUrl = buildRequestUrl(request.id);
  console.log("Sending removal approved distribution email", {
    requestId: request.id,
    woNumber: request.wo_number,
    recipients,
    approvedBy,
  });

  return sendEmail({
    to: recipients,
    subject: `Work removal approved: ${request.wo_number}`,
    html: `
      <div style="font-family: Arial, Helvetica, sans-serif; color: #111; line-height: 1.5;">
        <p><strong>Work removal approved</strong></p>
        <p>${escapeHtml(approvedBy)} approved this work removal request.</p>
        ${comment ? `<p><strong>Manager comment:</strong><br/>${escapeHtml(comment)}</p>` : ""}
        ${formatRequestSummary(request)}
        <p style="margin-top: 14px;">Open request: <a href="${requestUrl}">${requestUrl}</a></p>
      </div>
    `,
    text: [
      "Work removal approved",
      "",
      `${approvedBy} approved this work removal request.`,
      ...(comment ? ["", `Manager comment: ${comment}`] : []),
      "",
      formatRequestSummaryText(request),
      "",
      `Open request: ${requestUrl}`,
    ].join("\n"),
  });
}
