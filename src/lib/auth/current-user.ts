import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { getActiveUserByEmail } from "@/lib/auth/users";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth/session";

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const session = verifySessionToken(cookieStore.get(SESSION_COOKIE)?.value);

  if (!session) return null;

  return getActiveUserByEmail(session.email);
}

export async function requireCurrentUser() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return user;
}

export function isAdminUser(user: { role: string } | null | undefined) {
  return user?.role === "admin" || user?.role === "coordinator";
}

export function canManageShutdowns(user: { role: string } | null | undefined) {
  return user?.role === "admin" || user?.role === "coordinator";
}

export async function requireAdminUser() {
  const user = await requireCurrentUser();

  if (!isAdminUser(user)) {
    redirect("/break-in/dashboard");
  }

  return user;
}

export async function requireApiUser() {
  const user = await getCurrentUser();

  if (!user) {
    return {
      user: null,
      response: NextResponse.json({ error: "Authentication required" }, { status: 401 }),
    };
  }

  return { user, response: null };
}

export async function requireApiAdminUser() {
  const auth = await requireApiUser();

  if (auth.response) {
    return auth;
  }

  if (!isAdminUser(auth.user)) {
    return {
      user: auth.user,
      response: NextResponse.json({ error: "Admin or coordinator access required" }, { status: 403 }),
    };
  }

  return auth;
}

export async function requireShutdownManagerUser() {
  const user = await requireCurrentUser();

  if (!canManageShutdowns(user)) {
    redirect("/break-in/dashboard");
  }

  return user;
}

export async function requireApiShutdownManagerUser() {
  const auth = await requireApiUser();

  if (auth.response) {
    return auth;
  }

  if (!canManageShutdowns(auth.user)) {
    return {
      user: auth.user,
      response: NextResponse.json({ error: "Admin or coordinator access required" }, { status: 403 }),
    };
  }

  return auth;
}
