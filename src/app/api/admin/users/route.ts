import { NextResponse } from "next/server";
import { requireApiAdminUser } from "@/lib/auth/current-user";
import { deleteAppUser, inviteAppUser, resendUserInvite, updateAppUser } from "@/lib/auth/users";

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

  try {
    if (action === "delete") {
      const id = String(input.id || "");

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
      const user = await resendUserInvite(String(input.id || ""));

      if (isFormPost) {
        return NextResponse.redirect(new URL("/admin/users?invited=1", req.url), { status: 303 });
      }

      return NextResponse.json({ ok: true, user });
    }

    const user =
      action === "update"
        ? await updateAppUser({
            id: String(input.id || ""),
            email: String(input.email || ""),
            full_name: String(input.full_name || ""),
            role: String(input.role || "admin"),
            password: String(input.password || ""),
            is_active: input.is_active === "on" || input.is_active === true,
          })
        : await inviteAppUser({
            email: String(input.email || ""),
            full_name: String(input.full_name || ""),
            role: String(input.role || "admin"),
          });

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
