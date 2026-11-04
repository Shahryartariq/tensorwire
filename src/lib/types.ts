/** Who publishes a feed: an AI lab or company blog, a newsroom, or an independent builder. */
export type SourceKind = "lab" | "press" | "builder";

export type TopicSlug =
  | "models"
  | "agents"
  | "open-source"
  | "research"
  | "products"
  | "hardware"
  | "policy"
  | "business";

/** One item as it comes out of an RSS or Atom feed, before cleaning. */
export interface RawItem {
  title: string;
  link: string;
  /** Milliseconds since the epoch, or null when the feed gave no usable date. */
  date: number | null;
  /** Description, summary or content. May contain HTML. */
  summary: string;
  /** The fullest text in the item (content:encoded, Atom content, or the description), as HTML. */
  body?: string;
  categories: string[];
  /** A discussion page, when the feed has one (Hacker News). */
  comments?: string;
}

/** Cleaned text the source filters look at. */
export interface ItemText {
  title: string;
  text: string;
  categories: string[];
}

export interface Source {
  slug: string;
  name: string;
  homepage: string;
  feed: string;
  kind: SourceKind;
  /** One or two sentences for the source page. */
  about: string;
  /** False when the feed's summaries are image captions or boilerplate rather than text. */
  summaries?: boolean;
  /** Keeps only the items worth showing (for feeds that also cover gaming, podcasts, ads…). */
  include?: (item: ItemText) => boolean;
  /** Round-up newsletters cover many stories at once, so they never join a story group. */
  digest?: boolean;
}

export interface Story {
  /** Stable id derived from the article URL. */
  id: string;
  source: string;
  title: string;
  url: string;
  publishedAt: number;
  summary?: string;
  topics: TopicSlug[];
  discussion?: string;
  /** Minutes to read, when the feed carries enough of the post to read here (the reader view). */
  read?: number;
}

/** One news event: the main story and any other coverage of it. */
export interface Cluster {
  id: string;
  lead: Story;
  /** Every story in the group, lead first, then by time. */
  stories: Story[];
  /** Distinct sources in the group. */
  sources: string[];
  latest: number;
  topics: TopicSlug[];
}

export interface FeedResult {
  slug: string;
  ok: boolean;
  fetchedAt: number;
  stories: Story[];
  error?: string;
}

export interface Wire {
  now: number;
  sample: boolean;
  stories: Story[];
  clusters: Cluster[];
  feeds: FeedResult[];
}
