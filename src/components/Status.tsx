import Link from "next/link";

import { SOURCES } from "@/lib/sources";
import { agoLong } from "@/lib/time";
import type { Wire } from "@/lib/types";

/** "18 sources, newest story 12 minutes ago." Mentions sources that failed to load. */
export function Status({ wire }: { wire: Wire }) {
  const working = wire.feeds.filter((f) => f.ok).length;
  const newest = wire.stories[0]?.publishedAt;
  return (
    <p className="status">
      <Link href="/sources">
        {working === SOURCES.length ? `${SOURCES.length} sources` : `${working} of ${SOURCES.length} sources`}
      </Link>
      {newest ? `, newest story ${agoLong(newest, wire.now)}.` : "."}
    </p>
  );
}

/** Shown in place of the wire when no feed could be read at all. */
export function Outage() {
  return (
    <div className="notice">
      <h2>The feeds didn&apos;t load</h2>
      <p>None of the news sources answered just now. This is usually brief; try again in a minute.</p>
    </div>
  );
}
