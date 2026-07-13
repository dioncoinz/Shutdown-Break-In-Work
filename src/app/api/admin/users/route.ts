import { NextResponse } from "next/server";
import { isPrimaryAdminUser, requireApiAdminUser } from "@/lib/auth/current-user";
import {
  deleteAppUser,
  getAppUserById,
  inviteAppUser,
  resendUserInvite,
  updateAppUser,
} from "@/lib/auth/users";

export async function POST(req: Request) {
  const auth = await requireApiAdminUser();
  if (auth.response) return auth.response;

  const contentType = req.headers.get("content-type") || "";
  const isFormPost =
    contentType.includes("application/x-www-form-urlencoded") ||
    contentType.includes("multipart/form-data");
  const input = isFormPost
    ? Object.fromEntries((await req.formData()).entries())
    : ((await req.json().catch(() => ({}))) as Record<string, unknown>);
  const action = String(input._action || "create");
  const canManageAdmins = isPrimaryAdminUser(auth.user);

  try {
    if (action === "delete") {
      const id = String(input.id || "");
      const targetUser = await getAppUserById(id);

      if (!targetUser) {
        throw new Error("User not found.");
      }

      if (targetUser.role === "admin" && !canManageAdmins) {
        throw new Error("Only the primary administrator can manage admin accounts.");
      }

      if (id === auth.user?.id) {
        throw new Error("You cannot delete your own signed-in user.");
      }

      await deleteAppUser(id);

      if (isFormPost) {
        return NextResponse.redirect(new URL("/admin/users?deleted=1", req.url), { status: 303 });
      }

      return NextResponse.json({ ok: true });
    }

    if (action === "resend-invite") {
      const id = String(input.id || "");
      const targetUser = await getAppUserById(id);

      if (!targetUser) {
        throw new Error("User not found.");
      }

      if (targetUser.role === "admin" && !canManageAdmins) {
        throw new Error("Only the primary administrator can manage admin accounts.");
      }

      const user = await resendUserInvite(id);

      if (isFormPost) {
        return NextResponse.redirect(new URL("/admin/users?invited=1", req.url), { status: 303 });
      }

      return NextResponse.json({ ok: true, user });
    }

    const role = String(input.role || "planner").trim().toLowerCase();

    if (role === "admin" && !canManageAdmins) {
      throw new Error("Only the primary administrator can create or promote an admin.");
    }

    let user;

    if (action === "update") {
      const id = String(input.id || "");
      const targetUser = await getAppUserById(id);

      if (!targetUser) {
        throw new Error("User not found.");
      }

      if (targetUser.role === "admin" && !canManageAdmins) {
        throw new Error("Only the primary administrator can manage admin accounts.");
      }

      user = await updateAppUser({
            id,
            email: String(input.email || ""),
            full_name: String(input.full_name || ""),
            role,
            password: String(input.password || ""),
            is_active: input.is_active === "on" || input.is_active === true,
          });
    } else {
      user = await inviteAppUser({
            email: String(input.email || ""),
            full_name: String(input.full_name || ""),
            role,
          });
    }

    if (isFormPost) {
      const flag = action === "update" ? "updated=1" : "invited=1";
      return NextResponse.redirect(new URL(`/admin/users?${flag}`, req.url), { status: 303 });
    }

    return NextResponse.json({ ok: true, user });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create user";

    if (isFormPost) {
      return NextResponse.redirect(
        new URL(`/admin/users?error=${encodeURIComponent(message)}`, req.url),
        { status: 303 }
      );
    }

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
