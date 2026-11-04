import Link from "next/link";

import { sourceBySlug, sourceName } from "@/lib/sources";
import { agoLong } from "@/lib/time";
import type { Cluster } from "@/lib/types";

import { Coverage } from "./Coverage";

/** The story most outlets are reporting right now, set large in the masthead band. */
export function Lead({ cluster, now }: { cluster: Cluster; now: number }) {
  const { lead } = cluster;
  const widely = cluster.sources.length > 1;
  const official = sourceBySlug(lead.source)?.kind === "lab";
  return (
    <article className="lead" aria-labelledby="lead-title">
      <p className="lead-why">
        <Coverage count={cluster.sources.length} />
        {widely ? `Reported by ${cluster.sources.length} sources` : "Latest story"}
      </p>
      <h2 id="lead-title" className={lead.title.length > 72 ? "lead-title is-long" : "lead-title"}>
        <a href={lead.url}>{lead.title}</a>
      </h2>
      {lead.summary && <p className="lead-summary">{lead.summary}</p>}
      <p className="lead-meta">
        <Link href={`/source/${lead.source}`}>{sourceName(lead.source)}</Link>
        {official && <span className="official">Official</span>}
        <span>{agoLong(lead.publishedAt, now)}</span>
      </p>
      {cluster.stories.length > 1 && (
        <div className="lead-coverage">
          <h3 className="lead-coverage-label">Also reported by</h3>
          <ul className="lead-coverage-list">
            {cluster.stories.slice(1).map((story) => (
              <li key={story.id}>
                <a href={story.url}>
                  <span className="lead-coverage-source">{sourceName(story.source)}</span>
                  <span className="lead-coverage-title">{story.title}</span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </article>
  );
}
