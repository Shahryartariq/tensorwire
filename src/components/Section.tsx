import Link from "next/link";

import { Frame } from "@/components/Frame";
import { NewSince } from "@/components/NewSince";
import { AboutPanel, MostCovered, TopicIndex } from "@/components/Rail";
import { Outage } from "@/components/Status";
import { StoryList } from "@/components/StoryList";
import { SITE_NAME, absolute, jsonLd } from "@/lib/site";
import type { Cluster, Wire } from "@/lib/types";

/** A filtered view of the wire: a topic, a source or the lab posts. */
export function Section({
  wire,
  clusters,
  active,
  path,
  name,
  title,
  intro,
  extra,
  emptyText,
}: {
  wire: Wire;
  clusters: Cluster[];
  active?: string;
  path: string;
  name: string;
  title: string;
  intro: React.ReactNode;
  extra?: React.ReactNode;
  emptyText: string;
}) {
  const structured = [
    {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: title,
      url: absolute(path),
      isPartOf: { "@type": "WebSite", name: SITE_NAME, url: absolute("/") },
      mainEntity: {
        "@type": "ItemList",
        itemListElement: clusters
          .slice(0, 10)
          .map((c, i) => ({ "@type": "ListItem", position: i + 1, url: c.lead.url, name: c.lead.title })),
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: SITE_NAME, item: absolute("/") },
        { "@type": "ListItem", position: 2, name, item: absolute(path) },
      ],
    },
  ];

  return (
    <Frame active={active} sample={wire.sample}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(structured) }} />
      <div className="band band-short">
        <div className="band-inner">
          <nav aria-label="Breadcrumb" className="crumbs">
            <ol>
              <li>
                <Link href="/">All news</Link>
              </li>
              <li aria-current="page">{name}</li>
            </ol>
          </nav>
          <h1>{name}</h1>
          <div className="band-intro">{intro}</div>
          {extra}
          <p className="status">
            {clusters.length === 1 ? "1 story" : `${clusters.length} stories`} in the last three weeks.
          </p>
          <NewSince newest={clusters[0]?.latest ?? 0} />
        </div>
      </div>
      <div className="columns">
        <div className="column-main">
          {wire.stories.length === 0 ? (
            <Outage />
          ) : (
            <StoryList clusters={clusters} now={wire.now} empty={<p>{emptyText}</p>} />
          )}
        </div>
        <aside className="column-side" aria-label="More ways in">
          <MostCovered clusters={clusters} now={wire.now} title={`Most covered in ${name}`} />
          <TopicIndex clusters={wire.clusters} current={active} />
          <AboutPanel />
        </aside>
      </div>
    </Frame>
  );
}
