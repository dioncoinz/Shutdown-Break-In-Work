import { createSupabaseDb } from "@/lib/supabase/db";

export type Shutdown = {
  id: string;
  created_at: string;
  name: string;
  start_date: string | null;
  end_date: string | null;
  description: string | null;
  is_active: boolean;
  break_in_requires_planner: boolean;
  break_in_requires_coordinator: boolean;
  break_in_requires_superintendent: boolean;
  break_in_requires_manager: boolean;
  late_work_requires_planner: boolean;
  late_work_requires_coordinator: boolean;
  late_work_requires_superintendent: boolean;
  late_work_requires_manager: boolean;
  work_removal_requires_planner: boolean;
  work_removal_requires_coordinator: boolean;
  work_removal_requires_superintendent: boolean;
  work_removal_requires_manager: boolean;
};

export type ShutdownRequestType = "break_in" | "late_work" | "work_removal";

const SHUTDOWN_SELECT = [
  "id",
  "created_at",
  "name",
  "start_date",
  "end_date",
  "description",
  "is_active",
  "break_in_requires_planner",
  "break_in_requires_coordinator",
  "break_in_requires_superintendent",
  "break_in_requires_manager",
  "late_work_requires_planner",
  "late_work_requires_coordinator",
  "late_work_requires_superintendent",
  "late_work_requires_manager",
  "work_removal_requires_planner",
  "work_removal_requires_coordinator",
  "work_removal_requires_superintendent",
  "work_removal_requires_manager",
].join(", ");

const ALL_APPROVAL_STAGES = ["Planner", "Coord", "Super", "Manager"] as const;

export async function listShutdowns() {
  const supabase = createSupabaseDb();
  const { data, error } = await supabase
    .from("shutdowns")
    .select(SHUTDOWN_SELECT)
    .order("start_date", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (error) {
    if (isMissingShutdownsTableError(error.message)) {
      return { ok: true as const, shutdowns: [] as Shutdown[], needsSetup: true };
    }

    throw new Error(error.message);
  }

  return { ok: true as const, shutdowns: (data ?? []) as unknown as Shutdown[], needsSetup: false };
}

export async function getDefaultShutdownId() {
  const supabase = createSupabaseDb();
  const { data, error } = await supabase
    .from("shutdowns")
    .select("id")
    .eq("is_active", true)
    .order("start_date", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data?.id) {
    return null;
  }

  return String(data.id);
}

export async function getShutdownById(id: string) {
  const shutdownId = id.trim();

  if (!shutdownId) {
    return { shutdown: null, error: "Shutdown is required." };
  }

  const supabase = createSupabaseDb();
  const { data, error } = await supabase
    .from("shutdowns")
    .select(SHUTDOWN_SELECT)
    .eq("id", shutdownId)
    .maybeSingle();

  if (error || !data) {
    return { shutdown: null, error: error?.message || "Shutdown not found." };
  }

  return { shutdown: data as unknown as Shutdown, error: null };
}

export async function createShutdown(input: {
  name: string;
  start_date?: string;
  end_date?: string;
  description?: string;
  is_active?: boolean;
  break_in_requires_planner?: boolean;
  break_in_requires_coordinator?: boolean;
  break_in_requires_superintendent?: boolean;
  break_in_requires_manager?: boolean;
  late_work_requires_planner?: boolean;
  late_work_requires_coordinator?: boolean;
  late_work_requires_superintendent?: boolean;
  late_work_requires_manager?: boolean;
  work_removal_requires_planner?: boolean;
  work_removal_requires_coordinator?: boolean;
  work_removal_requires_superintendent?: boolean;
  work_removal_requires_manager?: boolean;
}) {
  const name = input.name.trim();

  if (!name) {
    throw new Error("Enter a shutdown name.");
  }

  if (input.start_date && input.end_date && input.start_date > input.end_date) {
    throw new Error("End date must be on or after the start date.");
  }

  const supabase = createSupabaseDb();
  const { data, error } = await supabase
    .from("shutdowns")
    .insert({
      name,
      start_date: input.start_date || null,
      end_date: input.end_date || null,
      description: input.description?.trim() || null,
      is_active: input.is_active ?? true,
      break_in_requires_planner: input.break_in_requires_planner ?? true,
      break_in_requires_coordinator: input.break_in_requires_coordinator ?? true,
      break_in_requires_superintendent: input.break_in_requires_superintendent ?? true,
      break_in_requires_manager: input.break_in_requires_manager ?? true,
      late_work_requires_planner: input.late_work_requires_planner ?? true,
      late_work_requires_coordinator: input.late_work_requires_coordinator ?? true,
      late_work_requires_superintendent: input.late_work_requires_superintendent ?? true,
      late_work_requires_manager: input.late_work_requires_manager ?? false,
      work_removal_requires_planner: input.work_removal_requires_planner ?? true,
      work_removal_requires_coordinator: input.work_removal_requires_coordinator ?? true,
      work_removal_requires_superintendent: input.work_removal_requires_superintendent ?? true,
      work_removal_requires_manager: input.work_removal_requires_manager ?? true,
    })
    .select(SHUTDOWN_SELECT)
    .single();

  if (error) {
    if (error.message.toLowerCase().includes("duplicate")) {
      throw new Error("A shutdown with that name already exists.");
    }

    throw new Error(error.message);
  }

  const shutdown = data as unknown as Shutdown;
  await assignUnassignedRequestsToShutdown(shutdown.id);

  return shutdown;
}

export async function assignUnassignedRequestsToShutdown(shutdownId: string) {
  const id = shutdownId.trim();

  if (!id) {
    throw new Error("Shutdown is required.");
  }

  const supabase = createSupabaseDb();
  const updates = await Promise.all([
    supabase
      .from("break_in_requests")
      .update({ shutdown_id: id })
      .is("shutdown_id", null)
      .select("id"),
    supabase
      .from("late_work_requests")
      .update({ shutdown_id: id })
      .is("shutdown_id", null)
      .select("id"),
    supabase
      .from("work_removal_requests")
      .update({ shutdown_id: id })
      .is("shutdown_id", null)
      .select("id"),
  ]);

  const firstError = updates.find((result) => result.error)?.error;
  if (firstError) {
    throw new Error(firstError.message);
  }

  return {
    emergent: updates[0].data?.length ?? 0,
    lateWork: updates[1].data?.length ?? 0,
    workRemoval: updates[2].data?.length ?? 0,
  };
}

export async function updateShutdownActive(shutdownId: string, isActive: boolean) {
  const id = shutdownId.trim();

  if (!id) {
    throw new Error("Shutdown is required.");
  }

  const supabase = createSupabaseDb();
  const { data, error } = await supabase
    .from("shutdowns")
    .update({
      is_active: isActive,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select(SHUTDOWN_SELECT)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as unknown as Shutdown;
}

export async function updateShutdown(input: {
  id: string;
  name: string;
  start_date?: string;
  end_date?: string;
  description?: string;
  is_active?: boolean;
  break_in_requires_planner?: boolean;
  break_in_requires_coordinator?: boolean;
  break_in_requires_superintendent?: boolean;
  break_in_requires_manager?: boolean;
  late_work_requires_planner?: boolean;
  late_work_requires_coordinator?: boolean;
  late_work_requires_superintendent?: boolean;
  late_work_requires_manager?: boolean;
  work_removal_requires_planner?: boolean;
  work_removal_requires_coordinator?: boolean;
  work_removal_requires_superintendent?: boolean;
  work_removal_requires_manager?: boolean;
}) {
  const id = input.id.trim();
  const name = input.name.trim();

  if (!id) {
    throw new Error("Shutdown is required.");
  }

  if (!name) {
    throw new Error("Enter a shutdown name.");
  }

  if (input.start_date && input.end_date && input.start_date > input.end_date) {
    throw new Error("End date must be on or after the start date.");
  }

  const supabase = createSupabaseDb();
  const { data, error } = await supabase
    .from("shutdowns")
    .update({
      name,
      start_date: input.start_date || null,
      end_date: input.end_date || null,
      description: input.description?.trim() || null,
      is_active: input.is_active ?? false,
      break_in_requires_planner: input.break_in_requires_planner ?? false,
      break_in_requires_coordinator: input.break_in_requires_coordinator ?? false,
      break_in_requires_superintendent: input.break_in_requires_superintendent ?? false,
      break_in_requires_manager: input.break_in_requires_manager ?? false,
      late_work_requires_planner: input.late_work_requires_planner ?? false,
      late_work_requires_coordinator: input.late_work_requires_coordinator ?? false,
      late_work_requires_superintendent: input.late_work_requires_superintendent ?? false,
      late_work_requires_manager: input.late_work_requires_manager ?? false,
      work_removal_requires_planner: input.work_removal_requires_planner ?? false,
      work_removal_requires_coordinator: input.work_removal_requires_coordinator ?? false,
      work_removal_requires_superintendent: input.work_removal_requires_superintendent ?? false,
      work_removal_requires_manager: input.work_removal_requires_manager ?? false,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select(SHUTDOWN_SELECT)
    .single();

  if (error) {
    if (error.message.toLowerCase().includes("duplicate")) {
      throw new Error("A shutdown with that name already exists.");
    }

    throw new Error(error.message);
  }

  return data as unknown as Shutdown;
}

export function hasShutdownStarted(shutdown: Pick<Shutdown, "start_date">) {
  if (!shutdown.start_date) {
    return false;
  }

  return shutdown.start_date <= getTodayDateKey();
}

export function getEffectiveApprovalStages(
  shutdown: Shutdown,
  requestType: ShutdownRequestType
) {
  if (hasShutdownStarted(shutdown)) {
    return [...ALL_APPROVAL_STAGES];
  }

  if (requestType === "break_in") {
    return compactStages([
      shutdown.break_in_requires_planner ? "Planner" : null,
      shutdown.break_in_requires_coordinator ? "Coord" : null,
      shutdown.break_in_requires_superintendent ? "Super" : null,
      shutdown.break_in_requires_manager ? "Manager" : null,
    ]);
  }

  if (requestType === "late_work") {
    return compactStages([
      shutdown.late_work_requires_planner ? "Planner" : null,
      shutdown.late_work_requires_coordinator ? "Coord" : null,
      shutdown.late_work_requires_superintendent ? "Super" : null,
      shutdown.late_work_requires_manager ? "Manager" : null,
    ]);
  }

  return compactStages([
    shutdown.work_removal_requires_planner ? "Planner" : null,
    shutdown.work_removal_requires_coordinator ? "Coord" : null,
    shutdown.work_removal_requires_superintendent ? "Super" : null,
    shutdown.work_removal_requires_manager ? "Manager" : null,
  ]);
}

function compactStages(stages: (typeof ALL_APPROVAL_STAGES[number] | null)[]) {
  return stages.filter((stage): stage is typeof ALL_APPROVAL_STAGES[number] => Boolean(stage));
}

function getTodayDateKey() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: process.env.SHUTDOWN_TIME_ZONE || "Australia/Perth",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  return `${year}-${month}-${day}`;
}

function isMissingShutdownsTableError(message: string) {
  return (
    message.includes("Could not find the table") ||
    (message.includes("relation") && message.includes("does not exist"))
  );
}
