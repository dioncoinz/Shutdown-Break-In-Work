import crypto from "crypto";
import type { ReviewStage, Decision } from "@/lib/break-in/decision";

const APPROVAL_TOKEN_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

function sign(message: string, secret: string) {
  return crypto.createHmac("sha256", secret).update(message).digest("hex");
}

export function createApprovalToken({
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
  const secret = process.env.AUTH_COOKIE_SECRET;
  if (!secret) {
    throw new Error("AUTH_COOKIE_SECRET missing in env");
  }

  const email = recipientEmail.trim().toLowerCase();
  const ts = Date.now().toString();
  const base = `${requestId}|${stage}|${decision}|${email}|${ts}`;
  const sig = sign(base, secret);
  return `${base}|${sig}`;
}

export function verifyApprovalToken(token: string | undefined) {
  if (!token) {
    return { ok: false as const, error: "Approval token is missing." };
  }

  const secret = process.env.AUTH_COOKIE_SECRET;
  if (!secret) {
    return { ok: false as const, error: "AUTH_COOKIE_SECRET missing in env." };
  }

  const parts = token.split("|");
  if (parts.length !== 6) {
    return { ok: false as const, error: "Approval token is invalid." };
  }

  const [requestId, stage, decision, email, tsStr, sig] = parts;
  const ts = Number(tsStr);
  if (!Number.isFinite(ts)) {
    return { ok: false as const, error: "Approval token is invalid." };
  }

  const ageMs = Date.now() - ts;
  if (ageMs < 0 || ageMs > APPROVAL_TOKEN_MAX_AGE_MS) {
    return { ok: false as const, error: "This approval link has expired." };
  }

  const base = `${requestId}|${stage}|${decision}|${email}|${tsStr}`;
  const expected = sign(base, secret);
  if (expected !== sig) {
    return { ok: false as const, error: "Approval token signature is invalid." };
  }

  if (!["SUBMITTED", "COORD_REVIEW", "SUPER_REVIEW", "MANAGER_REVIEW"].includes(stage)) {
    return { ok: false as const, error: "Approval stage is invalid." };
  }

  if (decision !== "APPROVE" && decision !== "REJECT") {
    return { ok: false as const, error: "Approval decision is invalid." };
  }

  return {
    ok: true as const,
    data: {
      requestId,
      stage: stage as ReviewStage,
      decision: decision as Decision,
      recipientEmail: email,
    },
  };
}
