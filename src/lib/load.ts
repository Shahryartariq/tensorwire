import "server-only";

import { cache } from "react";

import { clusterStories } from "./cluster";
import { readAllFeeds } from "./feeds";
import { SOURCES } from "./sources";
import { urlKey } from "./text";
import type { Cluster, Story, TopicSlug, Wire } from "./types";

const SOURCE_MAP = new Map(SOURCES.map((s) => [s.slug, s]));

/** All stories, grouped, once per request. */
export const getWire = cache(async (): Promise<Wire> => {
  const { now, sample, feeds } = await readAllFeeds();

  // The same URL from two feeds (a lab post that also hit Hacker News) is shown once, under the first source.
  const seen = new Set<string>();
  const stories: Story[] = [];
  for (const feed of feeds) {
    for (const story of feed.stories) {
      const key = urlKey(story.url);
      if (seen.has(key)) continue;
      seen.add(key);
      stories.push(story);
    }
  }
  stories.sort((a, b) => b.publishedAt - a.publishedAt);

  return { now, sample, stories, clusters: clusterStories(stories, SOURCE_MAP), feeds };
});

export function inTopic(cluster: Cluster, topic: TopicSlug): boolean {
  return cluster.stories.some((story) => story.topics.includes(topic));
}

export function fromSource(cluster: Cluster, slug: string): boolean {
  return cluster.sources.includes(slug);
}

/** Lab and company posts only. */
export function official(cluster: Cluster): boolean {
  return cluster.stories.some((story) => SOURCE_MAP.get(story.source)?.kind === "lab");
}

/** Simple full-text search over headlines and summaries. Every word must appear. */
export function search(clusters: Cluster[], query: string): Cluster[] {
  const words = query
    .toLowerCase()
    .split(/\s+/)
    .map((w) => w.replace(/[^\p{L}\p{N}.+#-]/gu, ""))
    .filter((w) => w.length > 1)
    .slice(0, 8);
  if (words.length === 0) return [];
  return clusters.filter((cluster) =>
    cluster.stories.some((story) => {
      const haystack = `${story.title} ${story.summary ?? ""}`.toLowerCase();
      return words.every((word) => haystack.includes(word));
    }),
  );
}
