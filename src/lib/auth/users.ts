import crypto from "crypto";
import { createSupabaseDb } from "@/lib/supabase/db";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { sendUserInviteEmail } from "@/lib/email/user-invites";

export type AppUser = {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  is_active: boolean;
  created_at: string;
  invited_at: string | null;
  invite_expires_at: string | null;
  invite_accepted_at: string | null;
};

type AppUserWithPassword = AppUser & {
  password_hash: string | null;
};

const USER_SELECT = "id, email, full_name, role, is_active, created_at, invited_at, invite_expires_at, invite_accepted_at";
const USER_WITH_PASSWORD_SELECT = `${USER_SELECT}, password_hash`;
const USER_ROLES = new Set(["admin", "user", "planner", "coordinator", "superintendent", "manager"]);

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function normalizeRole(role?: string) {
  const normalizedRole = role?.trim().toLowerCase() || "planner";

  if (!USER_ROLES.has(normalizedRole)) {
    throw new Error("Select a valid user role.");
  }

  return normalizedRole;
}

function hashInviteToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function ensureBootstrapUser() {
  const email = normalizeEmail(process.env.ADMIN_EMAIL || "");
  const password = process.env.ADMIN_PASSWORD || "";

  if (!email || !password) return;

  const supabase = createSupabaseDb();
  const { data } = await supabase
    .from("app_users")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  if (data?.id) return;

  await supabase.from("app_users").insert({
    email,
    full_name: process.env.ADMIN_NAME || "Administrator",
    role: "admin",
    password_hash: hashPassword(password),
    is_active: true,
  });
}

export async function authenticateAppUser(email: string, password: string) {
  await ensureBootstrapUser();

  const supabase = createSupabaseDb();
  const { data, error } = await supabase
    .from("app_users")
    .select(USER_WITH_PASSWORD_SELECT)
    .eq("email", normalizeEmail(email))
    .eq("is_active", true)
    .maybeSingle();

  if (error || !data) return null;

  const user = data as AppUserWithPassword;
  if (!verifyPassword(password, user.password_hash)) return null;

  return stripPassword(user);
}

export async function getActiveUserByEmail(email: string) {
  const supabase = createSupabaseDb();
  const { data, error } = await supabase
    .from("app_users")
    .select(USER_SELECT)
    .eq("email", normalizeEmail(email))
    .eq("is_active", true)
    .maybeSingle();

  if (error || !data) return null;
  return data as AppUser;
}

export async function listAppUsers() {
  await ensureBootstrapUser();

  const supabase = createSupabaseDb();
  const { data, error } = await supabase
    .from("app_users")
    .select(USER_SELECT)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as AppUser[];
}

export async function getAppUserById(id: string) {
  const userId = id.trim();
  if (!userId) return null;

  const supabase = createSupabaseDb();
  const { data, error } = await supabase
    .from("app_users")
    .select(USER_SELECT)
    .eq("id", userId)
    .maybeSingle();

  if (error || !data) return null;
  return data as AppUser;
}

export async function createAppUser(input: {
  email: string;
  full_name?: string;
  role?: string;
  password: string;
}) {
  const email = normalizeEmail(input.email);
  const role = normalizeRole(input.role);

  if (!email.includes("@")) {
    throw new Error("Enter a valid email address.");
  }

  if (input.password.length < 8) {
    throw new Error("Password must be at least 8 characters.");
  }

  const supabase = createSupabaseDb();
  const { data, error } = await supabase
    .from("app_users")
    .insert({
      email,
      full_name: input.full_name?.trim() || null,
      role,
      password_hash: hashPassword(input.password),
      is_active: true,
    })
    .select(USER_SELECT)
    .single();

  if (error) {
    if (error.message.toLowerCase().includes("duplicate")) {
      throw new Error("A user with that email already exists.");
    }

    throw new Error(error.message);
  }

  return data as AppUser;
}

export async function inviteAppUser(input: {
  appBaseUrl?: string;
  email: string;
  full_name?: string;
  role?: string;
}) {
  const email = normalizeEmail(input.email);
  const role = normalizeRole(input.role);

  if (!email.includes("@")) {
    throw new Error("Enter a valid email address.");
  }

  const token = crypto.randomBytes(32).toString("base64url");
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const inviteFields = {
    invite_token_hash: hashInviteToken(token),
    invite_expires_at: expiresAt.toISOString(),
    invited_at: now.toISOString(),
    invite_accepted_at: null,
  };

  const supabase = createSupabaseDb();
  const { data, error } = await supabase
    .from("app_users")
    .insert({
      email,
      full_name: input.full_name?.trim() || null,
      role,
      password_hash: hashPassword(crypto.randomBytes(32).toString("hex")),
      is_active: true,
      ...inviteFields,
    })
    .select(USER_SELECT)
    .single();

  if (error) {
    if (error.message.toLowerCase().includes("duplicate")) {
      throw new Error("A user with that email already exists.");
    }

    throw new Error(error.message);
  }

  await sendUserInviteEmail({
    appBaseUrl: input.appBaseUrl,
    email,
    fullName: input.full_name,
    token,
  });

  return data as AppUser;
}

export async function resendUserInvite(id: string, appBaseUrl?: string) {
  const userId = id.trim();

  if (!userId) {
    throw new Error("User is required.");
  }

  const token = crypto.randomBytes(32).toString("base64url");
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const supabase = createSupabaseDb();
  const { data, error } = await supabase
    .from("app_users")
    .update({
      invite_token_hash: hashInviteToken(token),
      invite_expires_at: expiresAt.toISOString(),
      invited_at: now.toISOString(),
      invite_accepted_at: null,
      is_active: true,
      updated_at: now.toISOString(),
    })
    .eq("id", userId)
    .select(USER_SELECT)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  const user = data as AppUser;
  await sendUserInviteEmail({
    appBaseUrl,
    email: user.email,
    fullName: user.full_name,
    token,
  });

  return user;
}

export async function getInviteUserByToken(token: string) {
  const tokenHash = hashInviteToken(token.trim());
  if (!tokenHash) return null;

  const supabase = createSupabaseDb();
  const { data, error } = await supabase
    .from("app_users")
    .select(USER_SELECT)
    .eq("invite_token_hash", tokenHash)
    .eq("is_active", true)
    .gt("invite_expires_at", new Date().toISOString())
    .maybeSingle();

  if (error || !data) return null;
  return data as AppUser;
}

export async function acceptUserInvite(input: {
  token: string;
  password: string;
}) {
  if (input.password.length < 8) {
    throw new Error("Password must be at least 8 characters.");
  }

  const tokenHash = hashInviteToken(input.token.trim());
  const supabase = createSupabaseDb();
  const { data: invite, error: inviteError } = await supabase
    .from("app_users")
    .select("id")
    .eq("invite_token_hash", tokenHash)
    .eq("is_active", true)
    .gt("invite_expires_at", new Date().toISOString())
    .maybeSingle();

  if (inviteError || !invite?.id) {
    throw new Error("Invite link is invalid or has expired.");
  }

  const { data, error } = await supabase
    .from("app_users")
    .update({
      password_hash: hashPassword(input.password),
      invite_token_hash: null,
      invite_expires_at: null,
      invite_accepted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", invite.id)
    .select(USER_SELECT)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as AppUser;
}

export async function updateAppUser(input: {
  id: string;
  email: string;
  full_name?: string;
  role?: string;
  password?: string;
  is_active?: boolean;
}) {
  const id = input.id.trim();
  const email = normalizeEmail(input.email);
  const role = normalizeRole(input.role);

  if (!id) {
    throw new Error("User is required.");
  }

  if (!email.includes("@")) {
    throw new Error("Enter a valid email address.");
  }

  if (input.password && input.password.length < 8) {
    throw new Error("Password must be at least 8 characters.");
  }

  const update: Record<string, string | boolean | null> = {
    email,
    full_name: input.full_name?.trim() || null,
    role,
    is_active: input.is_active ?? false,
    updated_at: new Date().toISOString(),
  };

  if (input.password) {
    update.password_hash = hashPassword(input.password);
    update.invite_accepted_at = new Date().toISOString();
    update.invite_token_hash = null;
    update.invite_expires_at = null;
  }

  const supabase = createSupabaseDb();
  const { data, error } = await supabase
    .from("app_users")
    .update(update)
    .eq("id", id)
    .select(USER_SELECT)
    .single();

  if (error) {
    if (error.message.toLowerCase().includes("duplicate")) {
      throw new Error("A user with that email already exists.");
    }

    throw new Error(error.message);
  }

  return data as AppUser;
}

export async function deleteAppUser(id: string) {
  const userId = id.trim();

  if (!userId) {
    throw new Error("User is required.");
  }

  const supabase = createSupabaseDb();
  const { error } = await supabase.from("app_users").delete().eq("id", userId);

  if (error) {
    throw new Error(error.message);
  }
}

function stripPassword(user: AppUserWithPassword): AppUser {
  return {
    id: user.id,
    email: user.email,
    full_name: user.full_name,
    role: user.role,
    is_active: user.is_active,
    created_at: user.created_at,
    invited_at: user.invited_at,
    invite_expires_at: user.invite_expires_at,
    invite_accepted_at: user.invite_accepted_at,
  };
}
