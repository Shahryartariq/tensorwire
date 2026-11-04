import "server-only";

import { unstable_cache } from "next/cache";

import { FeedError, parseFeed } from "./parse";
import { SAMPLE_NOW, sampleItems } from "./sample";
import { PRODUCTION_URL } from "./site";
import { SOURCES, sourceBySlug } from "./sources";
import { toStories } from "./stories";
import type { FeedResult } from "./types";

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

/** Reads and cleans one feed. Never throws: a failure is reported in the result. */
export async function readFeed(slug: string): Promise<FeedResult> {
  const source = sourceBySlug(slug);
  const fetchedAt = Date.now();
  if (!source) return { slug, ok: false, fetchedAt, stories: [], error: "Unknown source" };
  try {
    const response = await fetch(source.feed, {
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
    return { slug, ok: true, fetchedAt, stories: toStories(source, parseFeed(xml), fetchedAt) };
  } catch (error) {
    console.error(`[feeds] ${slug}: ${reason(error)}`);
    return { slug, ok: false, fetchedAt, stories: [], error: reason(error) };
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
