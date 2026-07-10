const PERTH_TIME_ZONE = process.env.SHUTDOWN_TIME_ZONE || "Australia/Perth";

export function formatPerthDateTime(value: string | Date) {
  return new Intl.DateTimeFormat("en-AU", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
    timeZone: PERTH_TIME_ZONE,
    year: "numeric",
  }).format(new Date(value));
}

export function formatPerthActivityDate(value: string | Date) {
  return new Intl.DateTimeFormat("en-AU", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
    timeZone: PERTH_TIME_ZONE,
  }).format(new Date(value));
}
