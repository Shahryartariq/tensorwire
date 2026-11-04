import { excerpt, hashId, plainText, safeUrl, urlKey } from "./text";
import { topicsFor } from "./topics";
import type { RawItem, Source, Story } from "./types";

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

/** Stories older than this drop off the site. */
export const MAX_AGE = 21 * DAY;
/** At most this many stories per source, newest first. */
export const PER_SOURCE = 30;

function usefulSummary(summary: string, title: string, categories: string[]): boolean {
  if (summary.length < 40) return false;
  const lower = summary.toLowerCase();
  if (lower === title.toLowerCase()) return false;
  if (categories.some((c) => c.toLowerCase() === lower)) return false;
  return !/^(article url:|comments url:|the post .+ appeared first on)/i.test(summary);
}

/** Clean, filter and label one source's items. Pure: `now` is passed in so tests are repeatable. */
export function toStories(source: Source, items: RawItem[], now: number): Story[] {
  const stories: Story[] = [];
  const seen = new Set<string>();

  for (const item of items) {
    const title = plainText(item.title);
    const url = safeUrl(item.link, source.homepage);
    if (!title || !url || item.date === null) continue;

    // A date slightly in the future is clock skew; much later is a mistake in the feed.
    if (item.date > now + 6 * HOUR) continue;
    const publishedAt = Math.min(item.date, now);
    if (now - publishedAt > MAX_AGE) continue;

    const text = plainText(item.summary);
    const categories = item.categories.map(plainText).filter(Boolean);
    if (source.include && !source.include({ title, text, categories })) continue;

    const key = urlKey(url);
    if (seen.has(key)) continue;
    seen.add(key);

    const summary = source.summaries !== false && usefulSummary(text, title, categories) ? excerpt(text) : undefined;
    const discussion = safeUrl(item.comments) ?? undefined;

    stories.push({
      id: hashId(key),
      source: source.slug,
      title,
      url,
      publishedAt,
      ...(summary ? { summary } : {}),
      topics: topicsFor(title, source.summaries === false ? "" : text, categories),
      ...(discussion && discussion !== url ? { discussion } : {}),
    });
  }

  return stories.sort((a, b) => b.publishedAt - a.publishedAt).slice(0, PER_SOURCE);
}
