import type { Metadata } from "next";

import { Frame } from "@/components/Frame";
import { Lead } from "@/components/Lead";
import { NewSince } from "@/components/NewSince";
import { AboutPanel, MostCovered, TopicIndex } from "@/components/Rail";
import { Outage, Status } from "@/components/Status";
import { StoryList } from "@/components/StoryList";
import { leadCluster } from "@/lib/cluster";
import { getWire } from "@/lib/load";
import { SITE_DESCRIPTION, SITE_NAME, absolute, jsonLd, pageMeta } from "@/lib/site";

export const metadata: Metadata = {
  title: { absolute: `${SITE_NAME}: today's AI news from the labs and the press` },
  description: SITE_DESCRIPTION,
  ...pageMeta("/", `${SITE_NAME}: today's AI news`, SITE_DESCRIPTION),
};

/** Stories shown on the home page; older ones live on the topic and source pages. */
const HOME_LIMIT = 50;

export default async function HomePage() {
  const wire = await getWire();
  const lead = leadCluster(wire.clusters, wire.now);
  const rest = wire.clusters.filter((c) => c.id !== lead?.id).slice(0, HOME_LIMIT);

  const structured = [
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: SITE_NAME,
      url: absolute("/"),
      description: SITE_DESCRIPTION,
      potentialAction: {
        "@type": "SearchAction",
        target: { "@type": "EntryPoint", urlTemplate: `${absolute("/search")}?q={search_term_string}` },
        "query-input": "required name=search_term_string",
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: "Latest AI news",
      itemListElement: [lead, ...rest]
        .filter((c) => c !== undefined)
        .slice(0, 10)
        .map((c, i) => ({ "@type": "ListItem", position: i + 1, url: c.lead.url, name: c.lead.title })),
    },
  ];

  return (
    <Frame active="home" sample={wire.sample}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(structured) }} />
      <div className="band">
        <div className="band-inner">
          <div className="band-heading">
            <h1>Today in AI</h1>
            <Status wire={wire} />
            <NewSince newest={wire.clusters[0]?.latest ?? 0} />
          </div>
          {lead && <Lead cluster={lead} now={wire.now} />}
        </div>
      </div>
      <div className="columns">
        <div className="column-main">
          {wire.stories.length === 0 ? (
            <Outage />
          ) : (
            <StoryList clusters={rest} now={wire.now} empty={<p>No other stories yet.</p>} />
          )}
        </div>
        <aside className="column-side" aria-label="More ways in">
          <MostCovered clusters={wire.clusters} now={wire.now} />
          <TopicIndex clusters={wire.clusters} />
          <AboutPanel />
        </aside>
      </div>
    </Frame>
  );
}
