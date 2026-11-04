import type { Metadata } from "next";
import Link from "next/link";

import { Frame } from "@/components/Frame";
import { getWire } from "@/lib/load";
import { pageMeta } from "@/lib/site";
import { KIND_LABEL, SOURCES } from "@/lib/sources";
import { agoLong } from "@/lib/time";
import type { SourceKind } from "@/lib/types";

const description =
  "The 18 AI news sources Tensorwire reads every 15 minutes: lab blogs, newsrooms and independent builders, with the latest status of each feed.";

export const metadata: Metadata = {
  title: "Sources",
  description,
  ...pageMeta("/sources", "Tensorwire sources", description),
};

const KINDS: SourceKind[] = ["lab", "press", "builder"];

export default async function SourcesPage() {
  const wire = await getWire();
  return (
    <Frame sample={wire.sample}>
      <div className="band band-short">
        <div className="band-inner">
          <h1>Sources</h1>
          <div className="band-intro">
            <p>
              Tensorwire reads these feeds every 15 minutes. It shows each story&apos;s headline, a short excerpt where the
              feed provides one, and a link to the original. Some feeds also cover other subjects; for those, only the AI
              posts are kept.
            </p>
          </div>
        </div>
      </div>
      <div className="page-body">
        {KINDS.map((kind) => (
          <section key={kind} className="source-group" aria-labelledby={`kind-${kind}`}>
            <h2 id={`kind-${kind}`}>{KIND_LABEL[kind]}</h2>
            <ul className="source-list">
              {SOURCES.filter((s) => s.kind === kind).map((source) => {
                const feed = wire.feeds.find((f) => f.slug === source.slug);
                const count = feed?.stories.length ?? 0;
                return (
                  <li key={source.slug}>
                    <h3>
                      <Link href={`/source/${source.slug}`}>{source.name}</Link>
                    </h3>
                    <p>{source.about}</p>
                    <p className="source-status">
                      {feed?.ok ? (
                        <span className="ok">
                          {count === 1 ? "1 story" : `${count} stories`} in the last three weeks, checked{" "}
                          {agoLong(feed.fetchedAt, wire.now)}
                        </span>
                      ) : (
                        <span className="warn">Didn&apos;t load on the last check ({feed?.error ?? "unknown error"})</span>
                      )}
                      <a href={source.homepage} rel="noopener">
                        Website
                      </a>
                    </p>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </Frame>
  );
}
