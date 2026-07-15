// Every timestamp in this app is a lifecycle event tied to a specific physical site
// in India -- always render in IST regardless of the viewer's own timezone, rather than
// letting the browser's local timezone silently leak in via bare toLocaleString() calls.
const IST_TIME_ZONE = "Asia/Kolkata";

export function formatIST(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleString("en-IN", {
    timeZone: IST_TIME_ZONE,
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

export function formatISTTime(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleString("en-IN", {
    timeZone: IST_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}
