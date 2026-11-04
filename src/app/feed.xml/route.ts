import { getWire } from "@/lib/load";
import { SITE_NAME, TAGLINE, absolute } from "@/lib/site";
import { sourceName } from "@/lib/sources";
import { topicBySlug } from "@/lib/topics";

/** Rebuilt at most every 15 minutes, the same rhythm as the source feeds. */
export const revalidate = 900;

function escape(value: string): string {
  return value.replace(/[<>&'"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[c]!);
}

/** Tensorwire's own RSS feed: the latest 50 stories, each once, with the other coverage named. */
export async function GET() {
  const wire = await getWire();
  const items = wire.clusters.slice(0, 50).map((cluster) => {
    const { lead } = cluster;
    const others = cluster.sources.slice(1).map(sourceName);
    const description = [lead.summary, others.length ? `Also reported by ${others.join(", ")}.` : ""]
      .filter(Boolean)
      .join(" ");
    return [
      "<item>",
      `<title>${escape(lead.title)}</title>`,
      `<link>${escape(lead.url)}</link>`,
      `<guid isPermaLink="false">tensorwire-${lead.id}</guid>`,
      `<pubDate>${new Date(cluster.latest).toUTCString()}</pubDate>`,
      `<source url="${escape(absolute(`/source/${lead.source}`))}">${escape(sourceName(lead.source))}</source>`,
      ...cluster.topics.map((t) => `<category>${escape(topicBySlug(t)?.name ?? t)}</category>`),
      description ? `<description>${escape(description)}</description>` : "",
      "</item>",
    ].join("");
  });

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
    "<channel>",
    `<title>${SITE_NAME}</title>`,
    `<link>${absolute("/")}</link>`,
    `<description>${escape(TAGLINE)}</description>`,
    "<language>en</language>",
    `<lastBuildDate>${new Date(wire.now).toUTCString()}</lastBuildDate>`,
    `<atom:link href="${absolute("/feed.xml")}" rel="self" type="application/rss+xml"/>`,
    "<ttl>15</ttl>",
    ...items,
    "</channel>",
    "</rss>",
  ].join("\n");

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=900, stale-while-revalidate=3600",
    },
  });
}
