import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getActiveUserByEmail } from "@/lib/auth/users";
import { inspectSessionToken, SESSION_COOKIE } from "@/lib/auth/session";

export async function GET() {
  const cookieStore = await cookies();
  const inspected = inspectSessionToken(cookieStore.get(SESSION_COOKIE)?.value);
  const testCookie = cookieStore.get("breakinz_cookie_test")?.value || null;
  const user =
    inspected.hasValidSignature && inspected.email
      ? await getActiveUserByEmail(inspected.email)
      : null;

  return NextResponse.json({
    cookieName: SESSION_COOKIE,
    hasTestCookie: testCookie === "ok",
    hasCookie: inspected.hasCookie,
    hasValidParts: inspected.hasValidParts,
    hasValidSignature: inspected.hasValidSignature,
    userFound: Boolean(user),
    userRole: user?.role || null,
    email: inspected.email ? maskEmail(inspected.email) : null,
  });
}

function maskEmail(email: string) {
  const [name, domain] = email.split("@");
  const safeName = name.length <= 2 ? `${name[0] || ""}*` : `${name.slice(0, 2)}***`;
  return `${safeName}@${domain || "***"}`;
}
