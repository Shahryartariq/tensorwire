import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { Frame } from "@/components/Frame";
import { Pager } from "@/components/Pager";
import { StoryList } from "@/components/StoryList";
import { getWire, search, searchWords } from "@/lib/load";
import { pageCount, pageHref, paginate, readPage } from "@/lib/paging";
import { TOPICS } from "@/lib/topics";

export async function generateMetadata({ searchParams }: PageProps<"/search">): Promise<Metadata> {
  const query = readQuery((await searchParams).q);
  return {
    // The query in the title, so tabs and browser history say what was searched.
    title: query ? `“${query}”: search` : "Search",
    description: "Search the last three weeks of AI news on Tensorwire.",
    // Result pages are endless near-duplicates; let search engines follow the links instead.
    robots: { index: false, follow: true },
    alternates: { canonical: "/search" },
  };
}

function readQuery(value: string | string[] | undefined): string {
  const raw = Array.isArray(value) ? value[0] : value;
  return (raw ?? "").trim().slice(0, 80);
}

export default async function SearchPage({ searchParams }: PageProps<"/search">) {
  const params = await searchParams;
  const query = readQuery(params.q);
  const page = readPage(params.page);
  if (page === null) notFound();
  const wire = await getWire();
  const usable = searchWords(query).length > 0;
  const results = usable ? search(wire.clusters, query) : [];
  const paged = paginate(results, page);
  if (!paged) redirect(pageHref("/search", pageCount(results.length), { q: query }));
  return (
    <Frame query={query} sample={wire.sample}>
      <div className="band band-short">
        <div className="band-inner">
          <h1>{query ? `Results for “${query}”` : "Search"}</h1>
          <p className="status" role="status">
            {!query
              ? "Search headlines and summaries from the last three weeks."
              : !usable
                ? "Use at least two letters or digits."
                : results.length === 1
                  ? "1 story found."
                  : `${results.length} stories found${paged.pages > 1 ? `, page ${paged.page} of ${paged.pages}` : ""}.`}
          </p>
        </div>
      </div>
      <div className="page-body">
        <StoryList
          clusters={paged.items}
          now={wire.now}
          empty={
            query && usable ? (
              <>
                <p>Nothing matches every word of “{query}”. Try fewer or shorter words, or browse a topic:</p>
                <ul className="inline-links">
                  {TOPICS.map((t) => (
                    <li key={t.slug}>
                      <Link href={`/topic/${t.slug}`}>{t.name}</Link>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p>Type a model, company or idea in the search box above, for example “agents” or “Gemini”.</p>
            )
          }
        />
        <Pager path="/search" page={paged.page} pages={paged.pages} query={{ q: query }} />
      </div>
    </Frame>
  );
}
