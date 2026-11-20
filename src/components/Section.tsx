import Link from "next/link";
import { redirect } from "next/navigation";

import { Frame } from "@/components/Frame";
import { NewSince } from "@/components/NewSince";
import { Pager } from "@/components/Pager";
import { AboutPanel, MostCovered, TopicIndex } from "@/components/Rail";
import { Outage } from "@/components/Status";
import { StoryList } from "@/components/StoryList";
import { pageCount, pageHref, paginate } from "@/lib/paging";
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
  page = 1,
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
  /** Which page of the list, from `?page=`. */
  page?: number;
}) {
  const paged = paginate(clusters, page);
  // News moves on: an old link to page 6 goes to the last page there is now.
  if (!paged) redirect(pageHref(path, pageCount(clusters.length)));

  const structured = [
    {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: title,
      url: absolute(path),
      isPartOf: { "@type": "WebSite", name: SITE_NAME, url: absolute("/") },
      mainEntity: {
        "@type": "ItemList",
        itemListElement: paged.items
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
            {clusters.length === 1 ? "1 story" : `${clusters.length} stories`} in the last three weeks
            {paged.pages > 1 && `, page ${paged.page} of ${paged.pages}`}.
          </p>
          <NewSince newest={clusters[0]?.latest ?? 0} />
        </div>
      </div>
      <div className="columns">
        <div className="column-main">
          {wire.stories.length === 0 ? (
            <Outage />
          ) : (
            <>
              <StoryList clusters={paged.items} now={wire.now} empty={<p>{emptyText}</p>} />
              <Pager path={path} page={paged.page} pages={paged.pages} />
            </>
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
