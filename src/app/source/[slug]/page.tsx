import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Section } from "@/components/Section";
import { fromSource, getWire } from "@/lib/load";
import { pageMeta } from "@/lib/site";
import { sourceBySlug } from "@/lib/sources";
import { agoLong } from "@/lib/time";
import type { Cluster } from "@/lib/types";

export async function generateMetadata({ params }: PageProps<"/source/[slug]">): Promise<Metadata> {
  const source = sourceBySlug((await params).slug);
  if (!source) return {};
  const path = `/source/${source.slug}`;
  const title = `Latest AI news from ${source.name}`;
  const description = `${source.about} The latest posts, updated every 15 minutes.`;
  return {
    title,
    description,
    ...pageMeta(path, title, description),
  };
}

/** On a source's page each row shows that source's own headline, with the rest of the coverage under it. */
function asSeenFrom(cluster: Cluster, slug: string): Cluster {
  const own = cluster.stories.find((story) => story.source === slug);
  if (!own || own === cluster.lead) return cluster;
  return { ...cluster, lead: own, stories: [own, ...cluster.stories.filter((story) => story !== own)] };
}

export default async function SourcePage({ params }: PageProps<"/source/[slug]">) {
  const source = sourceBySlug((await params).slug);
  if (!source) notFound();
  const wire = await getWire();
  const feed = wire.feeds.find((f) => f.slug === source.slug);
  return (
    <Section
      wire={wire}
      clusters={wire.clusters.filter((c) => fromSource(c, source.slug)).map((c) => asSeenFrom(c, source.slug))}
      path={`/source/${source.slug}`}
      name={source.name}
      title={`Latest AI news from ${source.name}`}
      intro={<p>{source.about}</p>}
      extra={
        <p className="band-links">
          <a href={source.homepage} rel="noopener">
            Visit {source.name}
          </a>
          {feed && !feed.ok && <span className="warn">The feed didn&apos;t load {agoLong(feed.fetchedAt, wire.now)}.</span>}
        </p>
      }
      emptyText={`Nothing from ${source.name} in the last three weeks.`}
    />
  );
}
