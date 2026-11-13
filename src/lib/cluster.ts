import { tokens } from "./text";
import type { Cluster, Source, Story, TopicSlug } from "./types";

const HOUR = 3_600_000;

/** Stories further apart than this are never the same news. */
const WINDOW = 72 * HOUR;

interface Prepared {
  story: Story;
  title: Set<string>;
  all: Set<string>;
  digest: boolean;
  lab: boolean;
}

function shared(a: Set<string>, b: Set<string>): string[] {
  const out: string[] = [];
  for (const word of a) if (b.has(word)) out.push(word);
  return out;
}

/** What the wire knows about how common each word is. */
export interface WordStats {
  /** A word only these two stories use: it appears in exactly two stories on the whole wire. */
  exclusive: (word: string) => boolean;
  /** A word few headlines use ("Hydrogen", "healthcare"), unlike "Google", "Gemini" or "launches". */
  distinctive: (word: string) => boolean;
}

/**
 * Two stories report the same news when:
 * - their headlines share at least two words and at least one of them is distinctive, and the
 *   shared words make up enough of the headlines ("Gemini 4 Hydrogen" in both); or
 * - they share at least two words that no other story on the wire uses ("Pando", "FlashProve").
 *   A shared word counts 2 when it is in both headlines, 1 when it is in one, and 0.5 when it is
 *   only in the summaries; the total must reach 2.
 * Common words alone never match: "Google launches Gemini …" twice can be two different launches.
 */
export function sameNews(a: Prepared, b: Prepared, words: WordStats): boolean {
  if (a.story.source === b.story.source) return false;
  if (a.digest || b.digest) return false;
  if (Math.abs(a.story.publishedAt - b.story.publishedAt) > WINDOW) return false;

  const inTitles = shared(a.title, b.title);
  const rare = inTitles.filter(words.distinctive);
  const union = new Set([...a.title, ...b.title]).size;
  if (rare.length >= 1 && inTitles.length >= 2 && inTitles.length / union >= 0.2) return true;
  if (rare.length >= 2) return true;

  const only = shared(a.all, b.all).filter(words.exclusive);
  if (only.length < 2) return false;
  const score = only.reduce((sum, word) => {
    const titles = Number(a.title.has(word)) + Number(b.title.has(word));
    return sum + (titles === 2 ? 2 : titles === 1 ? 1 : 0.5);
  }, 0);
  return score >= 2;
}

function prepare(story: Story, source: Source | undefined): Prepared {
  const title = new Set(tokens(story.title));
  return {
    story,
    title,
    all: new Set([...title, ...tokens(story.summary ?? "")]),
    digest: source?.digest === true,
    lab: source?.kind === "lab",
  };
}

/** Groups stories about the same news. Newest groups first. */
export function clusterStories(stories: Story[], sources: Map<string, Source>): Cluster[] {
  const items = stories.map((s) => prepare(s, sources.get(s.source)));

  const df = new Map<string, number>();
  const titleDf = new Map<string, number>();
  for (const item of items) {
    for (const word of item.all) df.set(word, (df.get(word) ?? 0) + 1);
    for (const word of item.title) titleDf.set(word, (titleDf.get(word) ?? 0) + 1);
  }
  // On a full wire (about a thousand stories) "Google" or "Gemini" sit in dozens of headlines, while a
  // story's own name ("Hydrogen") sits in one per outlet covering it: about 1% of headlines or fewer.
  const rareLimit = Math.max(3, Math.round(items.length * 0.01));
  const words: WordStats = {
    exclusive: (word) => df.get(word) === 2 && word.length >= 3,
    distinctive: (word) => (titleDf.get(word) ?? 0) <= rareLimit && word.length >= 3,
  };

  const pairs: [number, number][] = [];
  const match = new Set<number>();
  const key = (i: number, j: number) => (i < j ? i * items.length + j : j * items.length + i);
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      if (sameNews(items[i], items[j], words)) {
        pairs.push([i, j]);
        match.add(key(i, j));
      }
    }
  }

  // Join groups only when most of their stories match each other. A plain union of every
  // matching pair chains A–B–C into one group even when A and C have nothing in common.
  const parent = items.map((_, i) => i);
  const members = items.map((_, i) => [i]);
  const find = (i: number): number => (parent[i] === i ? i : (parent[i] = find(parent[i])));
  for (const [i, j] of pairs) {
    const a = find(i);
    const b = find(j);
    if (a === b) continue;
    let links = 0;
    for (const x of members[a]) for (const y of members[b]) if (match.has(key(x, y))) links++;
    if (links * 2 < members[a].length * members[b].length) continue;
    parent[a] = b;
    members[b].push(...members[a]);
    members[a] = [];
  }

  const groups = new Map<number, Prepared[]>();
  items.forEach((item, i) => {
    const root = find(i);
    groups.set(root, [...(groups.get(root) ?? []), item]);
  });

  const clusters: Cluster[] = [];
  for (const group of groups.values()) {
    // The original announcement leads when a lab published it; otherwise the first report does.
    const ordered = [...group].sort(
      (a, b) => Number(b.lab) - Number(a.lab) || a.story.publishedAt - b.story.publishedAt,
    );
    const lead = ordered[0].story;
    const rest = ordered
      .slice(1)
      .map((p) => p.story)
      .sort((a, b) => a.publishedAt - b.publishedAt);
    const all = [lead, ...rest];
    const topics: TopicSlug[] = [];
    for (const story of all) for (const topic of story.topics) if (!topics.includes(topic)) topics.push(topic);

    clusters.push({
      id: lead.id,
      lead,
      stories: all,
      sources: [...new Set(all.map((s) => s.source))],
      latest: Math.max(...all.map((s) => s.publishedAt)),
      topics: topics.slice(0, 3),
    });
  }

  return clusters.sort((a, b) => b.latest - a.latest);
}

/** The story most sources picked up recently, or the newest one if nothing was widely covered. */
export function leadCluster(clusters: Cluster[], now: number): Cluster | undefined {
  const recent = clusters.filter((c) => now - c.latest <= 36 * HOUR);
  const covered = [...recent].sort((a, b) => b.sources.length - a.sources.length || b.latest - a.latest)[0];
  if (covered && covered.sources.length > 1) return covered;
  return clusters.find((c) => c.lead.summary) ?? clusters[0];
}

/** Groups covered by the most sources in the last week. */
export function mostCovered(clusters: Cluster[], now: number, count = 5): Cluster[] {
  return clusters
    .filter((c) => c.sources.length > 1 && now - c.latest <= 7 * 24 * HOUR)
    .sort((a, b) => b.sources.length - a.sources.length || b.latest - a.latest)
    .slice(0, count);
}
