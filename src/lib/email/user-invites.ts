function getAppBaseUrl() {
  return (
    process.env.APP_BASE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL && `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`) ||
    (process.env.VERCEL_URL && `https://${process.env.VERCEL_URL}`) ||
    "http://localhost:3000"
  );
}

function escapeHtml(value: string | null | undefined) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export async function sendUserInviteEmail(input: {
  email: string;
  fullName?: string | null;
  token: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;

  if (!apiKey || !from) {
    throw new Error("Email provider not configured. Set RESEND_API_KEY and EMAIL_FROM.");
  }

  const baseUrl = getAppBaseUrl().replace(/\/+$/, "");
  const inviteUrl = `${baseUrl}/invite/${encodeURIComponent(input.token)}`;
  const name = input.fullName?.trim() || input.email;
  const subject = "You have been invited to Breakinz";
  const html = `
    <div style="font-family: Arial, Helvetica, sans-serif; color: #111; line-height: 1.5;">
      <p><strong>You have been invited to Breakinz</strong></p>
      <p>Hi ${escapeHtml(name)},</p>
      <p>An administrator has created an account for you. Use the link below to set your password and activate your access.</p>
      <p><a href="${inviteUrl}">Set your password</a></p>
      <p style="font-size: 12px; color: #64748b;">This invite expires in 7 days.</p>
    </div>
  `;
  const text = [
    "You have been invited to Breakinz",
    "",
    `Hi ${name},`,
    "An administrator has created an account for you.",
    `Set your password: ${inviteUrl}`,
    "",
    "This invite expires in 7 days.",
  ].join("\n");

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [input.email],
      subject,
      html,
      text,
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(body || `Email API failed with ${response.status}`);
  }
}
