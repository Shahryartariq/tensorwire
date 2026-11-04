import "server-only";

import { unstable_cache } from "next/cache";

import { FeedError, parseFeed } from "./parse";
import { SAMPLE_NOW, sampleItems } from "./sample";
import { PRODUCTION_URL } from "./site";
import { SOURCES, sourceBySlug } from "./sources";
import { cleanArticle, readingMinutes, type ReaderText } from "./reader";
import { toStories } from "./stories";
import { safeUrl, urlKey } from "./text";
import type { FeedResult, RawItem } from "./types";

/** How often each feed is read again, in seconds. */
export const REFRESH_SECONDS = 15 * 60;

const MAX_BYTES = 5 * 1024 * 1024;
const TIMEOUT_MS = 10_000;
const USER_AGENT = `Tensorwire/1.0 (+${PRODUCTION_URL}/about)`;

/** The bundled snapshot instead of live feeds. Never in Vercel production. */
export function usingSampleData(): boolean {
  return process.env.NEWS_SAMPLE_DATA === "1" && process.env.VERCEL_ENV !== "production";
}

function reason(error: unknown): string {
  if (error instanceof FeedError) return error.message;
  if (error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError")) return "Timed out";
  if (error instanceof Error && /^HTTP \d{3}$/.test(error.message)) return error.message;
  return "Could not be read";
}

/** Downloads one feed's XML. Throws on network errors, HTTP errors and oversized feeds. */
async function fetchFeed(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: {
      "user-agent": USER_AGENT,
      accept: "application/rss+xml, application/atom+xml, application/xml;q=0.9, text/xml;q=0.8, */*;q=0.1",
    },
    signal: AbortSignal.timeout(TIMEOUT_MS),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  if (Number(response.headers.get("content-length") ?? 0) > MAX_BYTES) throw new FeedError("Feed is too large");
  const xml = await response.text();
  if (xml.length > MAX_BYTES) throw new FeedError("Feed is too large");
  return xml;
}

/** Reads and cleans one feed. Never throws: a failure is reported in the result. */
export async function readFeed(slug: string): Promise<FeedResult> {
  const source = sourceBySlug(slug);
  const fetchedAt = Date.now();
  if (!source) return { slug, ok: false, fetchedAt, stories: [], error: "Unknown source" };
  try {
    const xml = await fetchFeed(source.feed);
    return { slug, ok: true, fetchedAt, stories: toStories(source, parseFeed(xml), fetchedAt) };
  } catch (error) {
    console.error(`[feeds] ${slug}: ${reason(error)}`);
    return { slug, ok: false, fetchedAt, stories: [], error: reason(error) };
  }
}

/**
 * The text of one story for the reader view, from its source's feed. Null when the story is no
 * longer in the feed or the feed carries only a summary. Throws when the feed can't be read, so a
 * failure is never cached.
 */
async function readArticle(slug: string, url: string): Promise<ReaderText | null> {
  const source = sourceBySlug(slug);
  if (!source) return null;
  const items: RawItem[] = usingSampleData() ? sampleItems(slug) : parseFeed(await fetchFeed(source.feed));
  const key = urlKey(url);
  const item = items.find((i) => {
    const link = safeUrl(i.link, source.homepage);
    return link !== null && urlKey(link) === key;
  });
  if (!item?.body || !readingMinutes(item.body, url)) return null;
  return cleanArticle(item.body, url);
}

/** Articles are cached for an hour: a post's text rarely changes, and each one is a feed download. */
const cachedArticle = unstable_cache(readArticle, ["article", "v1"], { revalidate: 3600, tags: ["articles"] });

/** A story's text for the reader view, or null when there's nothing to show. Never throws. */
export async function getArticle(slug: string, url: string): Promise<ReaderText | null> {
  try {
    return await (usingSampleData() ? readArticle(slug, url) : cachedArticle(slug, url));
  } catch (error) {
    console.error(`[reader] ${slug}: ${reason(error)}`);
    return null;
  }
}

/**
 * Each feed's cleaned stories are cached on their own for 15 minutes, so one slow or broken
 * feed never holds up the others. The cached value is small; the raw XML (up to a few MB) isn't stored.
 */
const cachedFeed = unstable_cache(readFeed, ["feed", "v1"], { revalidate: REFRESH_SECONDS, tags: ["feeds"] });

/** Every source's latest stories, and the time they count as "now". */
export async function readAllFeeds(): Promise<{ now: number; sample: boolean; feeds: FeedResult[] }> {
  if (usingSampleData()) {
    const feeds = SOURCES.map((source) => ({
      slug: source.slug,
      ok: true,
      fetchedAt: SAMPLE_NOW,
      stories: toStories(source, sampleItems(source.slug), SAMPLE_NOW),
    }));
    return { now: SAMPLE_NOW, sample: true, feeds };
  }
  const feeds = await Promise.all(SOURCES.map((source) => cachedFeed(source.slug)));
  return { now: Date.now(), sample: false, feeds };
}
