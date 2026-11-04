import Link from "next/link";

import { mostCovered } from "@/lib/cluster";
import { inTopic } from "@/lib/load";
import { sourceName } from "@/lib/sources";
import { TOPICS } from "@/lib/topics";
import type { Cluster } from "@/lib/types";

import { Coverage } from "./Coverage";

export function MostCovered({ clusters, now, title = "Most covered this week" }: { clusters: Cluster[]; now: number; title?: string }) {
  const top = mostCovered(clusters, now);
  if (top.length === 0) return null;
  return (
    <section className="panel" aria-labelledby="most-covered">
      <h2 id="most-covered" className="panel-title">
        {title}
      </h2>
      <ol className="ranked">
        {top.map((cluster) => (
          <li key={cluster.id}>
            <a href={cluster.lead.url}>{cluster.lead.title}</a>
            <span className="ranked-meta">
              <Coverage count={cluster.sources.length} />
              {cluster.sources.map(sourceName).join(", ")}
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function TopicIndex({ clusters, current }: { clusters: Cluster[]; current?: string }) {
  return (
    <section className="panel" aria-labelledby="topic-index">
      <h2 id="topic-index" className="panel-title">
        Browse by topic
      </h2>
      <ul className="counted">
        {TOPICS.map((topic) => (
          <li key={topic.slug}>
            <Link href={`/topic/${topic.slug}`} aria-current={current === topic.slug ? "page" : undefined}>
              <span>{topic.name}</span>
              <span className="count">{clusters.filter((c) => inTopic(c, topic.slug)).length}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function AboutPanel() {
  return (
    <section className="panel panel-quiet" aria-labelledby="about-panel">
      <h2 id="about-panel" className="panel-title">
        How this works
      </h2>
      <p>
        Tensorwire reads 18 AI news feeds every 15 minutes. When several outlets report the same news, you see it once,
        with every source listed. Lab and company posts are marked <span className="official">Official</span>.
      </p>
      <p>
        <Link href="/about">More about Tensorwire</Link> or <a href="/feed.xml">follow the RSS feed</a>.
      </p>
    </section>
  );
}
