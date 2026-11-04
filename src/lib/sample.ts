import articles from "./fixtures/articles.json";
import snapshot from "./fixtures/snapshot.json";
import type { RawItem } from "./types";

/** "Now" for the sample data, so relative times and the lead story are the same on every run. */
export const SAMPLE_NOW = Date.parse(snapshot.capturedAt);

type Row = [string, string, string, string, string[], string?];

/** One source's items from the bundled snapshot of real feeds. */
export function sampleItems(slug: string): RawItem[] {
  const rows = (snapshot.sources as unknown as Record<string, Row[]>)[slug] ?? [];
  return rows.map(([title, link, date, summary, categories, comments]) => ({
    title,
    link,
    date: Number.isNaN(Date.parse(date)) ? null : Date.parse(date),
    summary,
    // A few stories carry sample full text, so the reader view can be developed and tested offline.
    body: (articles.articles as Record<string, string>)[link] ?? summary,
    categories,
    comments,
  }));
}
