import { OG_SIZE, ogImage } from "@/lib/og";
import { TOPICS, topicBySlug } from "@/lib/topics";

export const alt = "Tensorwire topic page";
export const size = OG_SIZE;
export const contentType = "image/png";

export function generateStaticParams() {
  return TOPICS.map((topic) => ({ slug: topic.slug }));
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const topic = topicBySlug((await params).slug);
  return ogImage(topic ? `${topic.name} news` : "AI news", topic ? `AI ${topic.name.toLowerCase()} from 18 sources` : "18 sources");
}
