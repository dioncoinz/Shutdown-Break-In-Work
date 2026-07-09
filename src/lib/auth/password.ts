import crypto from "crypto";

const KEY_LENGTH = 64;

export function hashPassword(password: string) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, KEY_LENGTH).toString("hex");

  return `scrypt$${salt}$${hash}`;
}

export function verifyPassword(password: string, storedHash: string | null | undefined) {
  if (!storedHash) return false;

  const [method, salt, hash] = storedHash.split("$");
  if (method !== "scrypt" || !salt || !hash) return false;

  const candidate = crypto.scryptSync(password, salt, KEY_LENGTH);
  const expected = Buffer.from(hash, "hex");

  return candidate.length === expected.length && crypto.timingSafeEqual(candidate, expected);
}
