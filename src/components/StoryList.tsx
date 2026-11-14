import { sourceBySlug, sourceName } from "@/lib/sources";
import { ago, agoLong, bucketize, formatDate } from "@/lib/time";
import { topicBySlug } from "@/lib/topics";
import type { Cluster, Story } from "@/lib/types";

import { Coverage } from "./Coverage";

/** "A", "A and B", "A, B and C" */
export function listNames(names: string[]): string {
  if (names.length <= 1) return names.join("");
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

/**
 * One story. Links inside rows are plain anchors rather than next/link: a page holds dozens of
 * rows, and each client-side link would add hydration and prefetch work for little gain.
 */
export function StoryRow({ cluster, now }: { cluster: Cluster; now: number }) {
  const { lead } = cluster;
  const source = sourceBySlug(lead.source);
  const others = cluster.stories.slice(1);
  // The time column shows the latest report, which is also how the wire is ordered.
  const iso = new Date(cluster.latest).toISOString();
  return (
    <li className="story" data-ts={cluster.latest}>
      <time className="story-age" dateTime={iso} title={formatDate(cluster.latest)}>
        <span aria-hidden="true">{ago(cluster.latest, now)}</span>
        <span className="visually-hidden">{agoLong(cluster.latest, now)}</span>
      </time>
      <div className="story-body">
        <h3 className="story-title">
          <a href={lead.url}>{lead.title}</a>
        </h3>
        <div className="story-meta">
          <Coverage count={cluster.sources.length} />
          <a href={`/source/${lead.source}`} className="story-source">
            {sourceName(lead.source)}
          </a>
          {source?.kind === "lab" && <span className="official">Official</span>}
          {others.length > 0 && (
            <span className="also">
              Also in{" "}
              {others.map((story, i) => (
                <span key={story.id}>
                  {i > 0 && (i === others.length - 1 ? " and " : ", ")}
                  <a href={story.url}>{sourceName(story.source)}</a>
                </span>
              ))}
            </span>
          )}
          {lead.discussion && (
            <a href={lead.discussion} className="discussion">
              Discussion
            </a>
          )}
          {cluster.topics.length > 0 && (
            <span className="tags">
              <span className="visually-hidden">Topics: </span>
              {cluster.topics.map((slug) => (
                <a key={slug} href={`/topic/${slug}`} className="tag">
                  {topicBySlug(slug)?.name}
                </a>
              ))}
            </span>
          )}
        </div>
        {lead.summary && <p className="story-summary">{lead.summary}</p>}
        <StoryActions cluster={cluster} />
      </div>
    </li>
  );
}

/**
 * The two ways to read a story, as buttons under its summary: here in the reader view (only when a
 * feed carries the post's text, the lead's or another report's) and on the publisher's site.
 */
export function StoryActions({ cluster }: { cluster: Cluster }) {
  const { lead } = cluster;
  const readable = cluster.stories.find((story) => story.read);
  return (
    <div className="story-actions">
      {readable && <ReaderLink story={readable} showSource={readable !== lead} />}
      <a href={lead.url} className="original-link">
        Read on {sourceName(lead.source)}
        <span aria-hidden="true"> ↗</span>
      </a>
    </div>
  );
}

/** "Read here · 4 min": opens the reader view with the text from the feed. */
export function ReaderLink({ story, showSource = false }: { story: Story; showSource?: boolean }) {
  return (
    <a href={`/read/${story.id}`} className="reader-link">
      <BookIcon />
      Read here
      {showSource && <> from {sourceName(story.source)}</>}
      <span aria-hidden="true"> · </span>
      <span className="visually-hidden">, </span>
      {story.read} min
    </a>
  );
}

/** An open book, drawn in the text colour. */
function BookIcon() {
  return (
    <svg
      className="reader-link-icon"
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M2 5.5C4.5 4 8.5 4 12 6c3.5-2 7.5-2 10-.5V19c-2.5-1.5-6.5-1.5-10 .5-3.5-2-7.5-2-10-.5Z" />
      <path d="M12 6v13.5" />
    </svg>
  );
}

/** Stories grouped by age: past 6 hours, earlier today, yesterday… */
export function StoryList({
  clusters,
  now,
  empty,
  headingLevel = 2,
}: {
  clusters: Cluster[];
  now: number;
  empty: React.ReactNode;
  headingLevel?: 2 | 3;
}) {
  if (clusters.length === 0) return <div className="empty">{empty}</div>;
  const Heading = `h${headingLevel}` as const;
  return (
    <div className="wire">
      {bucketize(clusters, (c) => c.latest, now).map((group) => (
        <section key={group.label} className="wire-group" aria-label={group.label}>
          <Heading className="wire-heading">{group.label}</Heading>
          <ol className="stories">
            {group.items.map((cluster) => (
              <StoryRow key={cluster.id} cluster={cluster} now={now} />
            ))}
          </ol>
        </section>
      ))}
    </div>
  );
}
