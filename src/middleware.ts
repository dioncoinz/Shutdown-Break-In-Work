import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const SESSION_COOKIE = "sibw_session";
const MAX_AGE_MS = 12 * 60 * 60 * 1000; // 12 hours

function hexFromBytes(bytes: ArrayBuffer) {
  return Array.from(new Uint8Array(bytes))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function hmacSha256(message: string, secret: string) {
  const enc = new TextEncoder();

  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return hexFromBytes(sig);
}

async function isValidSession(token: string | undefined) {
  if (!token) return false;

  const secret = process.env.AUTH_COOKIE_SECRET;
  if (!secret) return false;

  // token = email|timestamp|signature
  const parts = token.split("|");
  if (parts.length !== 3) return false;

  const [email, tsStr, sig] = parts;

  if (!email || !email.includes("@")) return false;
  const ts = Number(tsStr);
  if (!Number.isFinite(ts)) return false;

  // expire
  const ageMs = Date.now() - ts;
  if (ageMs < 0 || ageMs > MAX_AGE_MS) return false;

  const base = `${email}|${tsStr}`;
  const expected = await hmacSha256(base, secret);

  return expected === sig;
}

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // Allow public routes (no login needed)
  const isPublic =
    path === "/login" ||
    path.startsWith("/_next") ||
    path === "/favicon.ico" ||
    path.startsWith("/api/login"); // allow login API

  if (isPublic) return NextResponse.next();

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const ok = await isValidSession(token);

  if (!ok) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
