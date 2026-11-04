import type { Metadata } from "next";
import Link from "next/link";

import { Coverage } from "@/components/Coverage";
import { Frame } from "@/components/Frame";
import { SOURCE_URL, pageMeta } from "@/lib/site";
import { SOURCES } from "@/lib/sources";
import { TOPICS } from "@/lib/topics";

const description =
  "What Tensorwire is, where its AI news comes from, how stories are grouped and labelled, and how to get a story corrected or removed.";

export const metadata: Metadata = {
  title: "About",
  description,
  ...pageMeta("/about", "About Tensorwire", description),
};

export default function AboutPage() {
  return (
    <Frame>
      <div className="band band-short">
        <div className="band-inner">
          <h1>About Tensorwire</h1>
          <div className="band-intro">
            <p>One page for the day&apos;s AI news, so you can see what happened without opening eighteen tabs.</p>
          </div>
        </div>
      </div>
      <div className="page-body prose">
        <h2>Where the news comes from</h2>
        <p>
          Tensorwire reads the public RSS and Atom feeds of {SOURCES.length} <Link href="/sources">sources</Link>: lab
          and company blogs such as OpenAI, Google DeepMind and Hugging Face, newsrooms such as TechCrunch, The Verge and
          MIT Technology Review, and independent builders such as Simon Willison and Latent Space. Each feed is read again
          every 15 minutes.
        </p>
        <p>
          For each story you see the headline, a short excerpt when the feed provides one, the source and the time. The
          headline links to the original article. Tensorwire never copies full articles.
        </p>

        <h2>How stories are grouped</h2>
        <p>
          When several sources report the same news, it appears once. The original announcement leads when a lab
          published it; otherwise the first report does. The other coverage is listed under it, and the cells show how
          many sources picked it up:
        </p>
        <ul className="legend">
          <li>
            <Coverage count={1} /> one source
          </li>
          <li>
            <Coverage count={3} /> three sources
          </li>
        </ul>
        <p>
          Grouping is automatic: two stories go together when their headlines share most of their words, or when both
          use names no other story uses. It sometimes misses a match; it rarely makes a wrong one.
        </p>

        <h2>Labels</h2>
        <p>
          <span className="official">Official</span> marks a post the company published itself. Topics (
          {TOPICS.map((t) => t.name.toLowerCase()).join(", ")}) come from keyword rules on the headline and summary.
        </p>

        <h2>Privacy</h2>
        <p>
          There are no accounts and no cookies of its own. To mark new stories, your browser remembers the time of the
          newest story you saw; it stays on your device. If analytics is switched on, visits are counted with Google
          Analytics.
        </p>

        <h2>Corrections and removal</h2>
        <p>
          If you publish one of these feeds and want it removed, or a story is labelled or grouped wrongly, please{" "}
          <a href={`${SOURCE_URL}/issues`} rel="noopener">
            open an issue on GitHub
          </a>
          .
        </p>

        <h2>Who made this</h2>
        <p>
          Tensorwire is built by{" "}
          <a href="https://github.com/Shahryartariq" rel="noopener">
            Muhammad Shehryar
          </a>
          , a full-stack developer, with Next.js and TypeScript. The <a href={SOURCE_URL}>source code</a> is open.
        </p>
      </div>
    </Frame>
  );
}
