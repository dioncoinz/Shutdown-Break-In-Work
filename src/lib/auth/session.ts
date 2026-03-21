export const SESSION_COOKIE = "sibw_session";
const SESSION_MAX_AGE_MS = 12 * 60 * 60 * 1000;

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
