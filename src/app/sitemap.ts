import type { MetadataRoute } from "next";

import { fromSource, getWire, inTopic, official } from "@/lib/load";
import { absolute } from "@/lib/site";
import { SOURCES } from "@/lib/sources";
import { TOPICS } from "@/lib/topics";
import type { Cluster } from "@/lib/types";

export const revalidate = 900;

const newest = (clusters: Cluster[]) => (clusters[0] ? new Date(clusters[0].latest) : undefined);

/** Every page worth indexing, with the time of its newest story. Search results are left out. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const wire = await getWire();
  const all = wire.clusters;
  return [
    { url: absolute("/"), lastModified: newest(all), changeFrequency: "hourly", priority: 1 },
    { url: absolute("/labs"), lastModified: newest(all.filter(official)), changeFrequency: "hourly", priority: 0.8 },
    ...TOPICS.map((topic) => ({
      url: absolute(`/topic/${topic.slug}`),
      lastModified: newest(all.filter((c) => inTopic(c, topic.slug))),
      changeFrequency: "hourly" as const,
      priority: 0.8,
    })),
    ...SOURCES.map((source) => ({
      url: absolute(`/source/${source.slug}`),
      lastModified: newest(all.filter((c) => fromSource(c, source.slug))),
      changeFrequency: "daily" as const,
      priority: 0.5,
    })),
    { url: absolute("/sources"), changeFrequency: "weekly", priority: 0.4 },
    { url: absolute("/about"), changeFrequency: "monthly", priority: 0.3 },
  ];
}
