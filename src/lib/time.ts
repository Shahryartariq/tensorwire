const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Compact age for the time column: "now", "12m", "3h", "4d", then a date. */
export function ago(time: number, now: number): string {
  const diff = Math.max(0, now - time);
  if (diff < MINUTE) return "now";
  if (diff < HOUR) return `${Math.floor(diff / MINUTE)}m`;
  if (diff < DAY) return `${Math.floor(diff / HOUR)}h`;
  if (diff < 7 * DAY) return `${Math.floor(diff / DAY)}d`;
  const d = new Date(time);
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`;
}

/** The same age in words, for screen readers and tooltips. */
export function agoLong(time: number, now: number): string {
  const diff = Math.max(0, now - time);
  const plural = (n: number, unit: string) => `${n} ${unit}${n === 1 ? "" : "s"} ago`;
  if (diff < MINUTE) return "just now";
  if (diff < HOUR) return plural(Math.floor(diff / MINUTE), "minute");
  if (diff < DAY) return plural(Math.floor(diff / HOUR), "hour");
  if (diff < 7 * DAY) return plural(Math.floor(diff / DAY), "day");
  return `on ${formatDate(time)}`;
}

/** "3 Nov 2026, 14:05 UTC". The site never guesses the reader's time zone on the server. */
export function formatDate(time: number): string {
  const d = new Date(time);
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mm = String(d.getUTCMinutes()).padStart(2, "0");
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}, ${hh}:${mm} UTC`;
}

export const BUCKETS = [
  { label: "Past 6 hours", max: 6 * HOUR },
  { label: "Earlier today", max: DAY },
  { label: "Yesterday", max: 2 * DAY },
  { label: "This week", max: 7 * DAY },
  { label: "Older", max: Infinity },
] as const;

/** Splits items (newest first) into age groups, skipping empty ones. */
export function bucketize<T>(items: T[], time: (item: T) => number, now: number): { label: string; items: T[] }[] {
  const groups = BUCKETS.map((b) => ({ label: b.label as string, max: b.max, items: [] as T[] }));
  for (const item of items) {
    const age = now - time(item);
    groups.find((g) => age < g.max)!.items.push(item);
  }
  return groups.filter((g) => g.items.length > 0).map(({ label, items }) => ({ label, items }));
}
