import crypto from "crypto";

function sign(message: string, secret: string) {
  return crypto.createHmac("sha256", secret).update(message).digest("hex");
}

export function createSessionToken(email: string, secret: string) {
  const cleaned = email.trim().toLowerCase();
  const ts = Date.now().toString();
  const base = `${cleaned}|${ts}`;
  const sig = sign(base, secret);
  return `${cleaned}|${ts}|${sig}`;
}
