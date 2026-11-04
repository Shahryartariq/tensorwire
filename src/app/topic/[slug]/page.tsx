import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Section } from "@/components/Section";
import { getWire, inTopic } from "@/lib/load";
import { pageMeta } from "@/lib/site";
import { topicBySlug } from "@/lib/topics";

export async function generateMetadata({ params }: PageProps<"/topic/[slug]">): Promise<Metadata> {
  const topic = topicBySlug((await params).slug);
  if (!topic) return {};
  const path = `/topic/${topic.slug}`;
  return {
    title: topic.title,
    description: topic.description,
    ...pageMeta(path, topic.title, topic.description, `${path}/opengraph-image`),
  };
}

export default async function TopicPage({ params }: PageProps<"/topic/[slug]">) {
  const topic = topicBySlug((await params).slug);
  if (!topic) notFound();
  const wire = await getWire();
  return (
    <Section
      wire={wire}
      clusters={wire.clusters.filter((c) => inTopic(c, topic.slug))}
      active={topic.slug}
      path={`/topic/${topic.slug}`}
      name={topic.name}
      title={topic.title}
      intro={<p>{topic.intro}</p>}
      emptyText={`No ${topic.name.toLowerCase()} stories in the last three weeks.`}
    />
  );
}
