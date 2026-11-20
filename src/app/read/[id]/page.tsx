
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { Mark } from "@/components/Mark";
import { ReaderControls } from "@/components/ReaderControls";
import { serif } from "@/lib/serif";
import { getArticle } from "@/lib/feeds";
import { getWire } from "@/lib/load";
import { SITE_NAME } from "@/lib/site";
import { sourceBySlug, sourceName } from "@/lib/sources";
import { formatDate } from "@/lib/time";

async function findStory(id: string) {
  if (!/^[a-z0-9]{1,8}$/.test(id)) return null;
  const wire = await getWire();
  return wire.stories.find((story) => story.id === id) ?? null;
}

export async function generateMetadata({ params }: PageProps<"/read/[id]">): Promise<Metadata> {
  const story = await findStory((await params).id);
  // Decided here, before anything streams, so the 404 page is in the HTML and not only in the script.
  if (!story) notFound();
  return {
    title: story.title,
    description: story.summary ?? `${story.title}, from ${sourceName(story.source)}.`,
    // The text belongs to the publisher: search engines should find it there, not here.
    robots: { index: false, follow: true },
    alternates: { canonical: story.url },
  };
}

/**
 * Reader view: one post's text from its source's feed, set for reading, with nothing else on the
 * page but a way back, reading settings and a link to the original.
 */
export default async function ReaderPage({ params }: PageProps<"/read/[id]">) {
  const story = await findStory((await params).id);
  if (!story) notFound();
  const article = await getArticle(story.source, story.url);
  // The feed changed or didn't load since the list was built: the original is the next best thing.
  if (!article) redirect(story.url);
  const source = sourceBySlug(story.source);
  const name = sourceName(story.source);
  const iso = new Date(story.publishedAt).toISOString();

  return (
    <div className={`reader ${serif.variable}`}>
      <a className="skip-link" href="#main">
        Skip to the article
      </a>
      <div className="reader-progress" aria-hidden="true" />
      <header className="reader-bar">
        <Link href="/" className="reader-home">
          <Mark size={18} />
          <span>
            <span className="visually-hidden">Back to </span>
            {SITE_NAME}
          </span>
        </Link>
        <ReaderControls />
      </header>

      <main id="main" tabIndex={-1}>
        <article className="reader-article" aria-labelledby="reader-title">
          <header className="reader-head">
            <p className="reader-source">
              <a href={`/source/${story.source}`}>{name}</a>
              {source?.kind === "lab" && <span className="official">Official</span>}
            </p>
            <h1 id="reader-title">{story.title}</h1>
            <p className="reader-meta">
              <time dateTime={iso}>{formatDate(story.publishedAt)}</time>
              <span aria-hidden="true"> · </span>
              <span>{article.minutes} min read</span>
            </p>
          </header>

          <div className="reader-body" dangerouslySetInnerHTML={{ __html: article.html }} />

          <footer className="reader-end">
            <p className="reader-note">
              This text comes from {name}&apos;s feed.
              {article.media > 0 && " Images, videos and embeds are on the original post."}
            </p>
            <p className="reader-actions">
              <a href={story.url} className="button">
                Read it on {name}
              </a>
              <Link href="/" className="button button-quiet">
                Back to the news
              </Link>
            </p>
          </footer>
        </article>
      </main>
    </div>
  );
}
