import { readingMinutes } from "./reader";
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

/**
 * Headlines that aren't news: tutorials, listicles, explainers, event promotions and talks. They
 * crowd out the day's news, so they are dropped from every source except the labs' own blogs.
 * Each rule is narrow on purpose; "How Netflix runs agents" stays, "How to use …" goes.
 */
const NOT_NEWS = [
  // "7 FREE Books to …", "5 Techniques for …", "Top 10 …"
  /^(the )?(top |best )?\d+\s+(free|best|top|ways?|tips|tricks|techniques|tools|books|courses|apps|things|reasons|lessons|insights|key|essential|must|steps|signs|prompts|mistakes|myths|questions|examples|projects|libraries|alternatives|underrated|powerful|practical|simple)\b/i,
  /^(the )?(top|best) \d+\b/i,
  // "How to …", "A Practical Blueprint for …", "… Explained in 5 Minutes", "… From Scratch"
  /^how (to|i)\b/i,
  /^(a|an|the|your) (practical|beginner'?s|complete|ultimate|step-by-step|hands-on|quick|coding|gentle|visual|developer'?s) (guide|blueprint|introduction|intro|tutorial|implementation|walkthrough|primer|handbook)\b/i,
  /\b(cheat ?sheet|explained in \d+ minutes|from scratch|for beginners|step[- ]by[- ]step|tutorial|crash course)\b/i,
  /^(what|who) (is|are) (a |an |the )?[\w.-]+( [\w.-]+)?\?/i,
  // "Presentation: …", "Podcast: …", "What to expect during SC26: Join theCUBE"
  /^(presentation|podcast|webinar|sponsored|partner content|video|live|watch|listen):/i,
  /\bwhat to expect (at|during|from) /i,
  /\bjoin thecube\b/i,
  /\b(webinar|livestream|on-demand session)\b/i,
  /\b(black friday|cyber monday|prime day|\d+% off|best deals?)\b/i,
];

export function isNews(title: string): boolean {
  return !NOT_NEWS.some((rule) => rule.test(title));
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
    if (source.kind !== "lab" && !isNews(title)) continue;

    const key = urlKey(url);
    if (seen.has(key)) continue;
    seen.add(key);

    const summary = source.summaries !== false && usefulSummary(text, title, categories) ? excerpt(text) : undefined;
    const discussion = safeUrl(item.comments) ?? undefined;
    const read = readingMinutes(item.body, url);

    stories.push({
      id: hashId(key),
      source: source.slug,
      title,
      url,
      publishedAt,
      ...(summary ? { summary } : {}),
      topics: topicsFor(title, source.summaries === false ? "" : text, categories),
      ...(discussion && discussion !== url ? { discussion } : {}),
      ...(read ? { read } : {}),
    });
  }

  return stories.sort((a, b) => b.publishedAt - a.publishedAt).slice(0, PER_SOURCE);
}
