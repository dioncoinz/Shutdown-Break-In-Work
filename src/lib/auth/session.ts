import crypto from "crypto";

export const SESSION_COOKIE = "sibw_session";
const SESSION_MAX_AGE_MS = 12 * 60 * 60 * 1000;

function sign(message: string, secret: string) {
  return crypto.createHmac("sha256", secret).update(message).digest("hex");
}

function safeEqual(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);

  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

export function getSessionSecret() {
  const secret =
    process.env.AUTH_SECRET ||
    process.env.SESSION_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE ||
    process.env.SUPABASE_SERVICE_KEY;

  if (!secret) {
    throw new Error("AUTH_SECRET missing. Set AUTH_SECRET in your environment.");
  }

  return secret;
}

export function getSessionTokenParts(token: string | undefined) {
  if (!token) return null;

  const parts = token.split("|");
  if (parts.length !== 3) return null;

  const [email, tsStr, sig] = parts;
  if (!email || !email.includes("@")) return null;

  const ts = Number(tsStr);
  if (!Number.isFinite(ts)) return null;

  const ageMs = Date.now() - ts;
  if (ageMs < 0 || ageMs > SESSION_MAX_AGE_MS) return null;

  return { email, tsStr, sig };
}

export function verifySessionToken(token: string | undefined, secret = getSessionSecret()) {
  const parts = getSessionTokenParts(token);
  if (!parts) return null;

  const expected = sign(`${parts.email}|${parts.tsStr}`, secret);
  if (!safeEqual(parts.sig, expected)) return null;

  return { email: parts.email };
}

export function inspectSessionToken(token: string | undefined) {
  if (!token) {
    return { hasCookie: false, hasValidParts: false, hasValidSignature: false, email: null };
  }

  const parts = getSessionTokenParts(token);
  if (!parts) {
    return { hasCookie: true, hasValidParts: false, hasValidSignature: false, email: null };
  }

  const expected = sign(`${parts.email}|${parts.tsStr}`, getSessionSecret());

  return {
    hasCookie: true,
    hasValidParts: true,
    hasValidSignature: safeEqual(parts.sig, expected),
    email: parts.email,
  };
}
