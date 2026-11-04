import { XMLParser } from "fast-xml-parser";

import type { RawItem } from "./types";

export class FeedError extends Error {}

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  textNodeName: "#text",
  parseTagValue: false,
  parseAttributeValue: false,
  trimValues: true,
  processEntities: true,
  htmlEntities: true,
  isArray: (name) => name === "item" || name === "entry" || name === "category" || name === "link",
});

type Node = string | number | { [key: string]: unknown } | undefined | null | Node[];

/** The text inside an element, whatever shape the parser gave it. */
function text(node: Node): string {
  if (node === undefined || node === null) return "";
  if (typeof node === "string") return node;
  if (typeof node === "number") return String(node);
  if (Array.isArray(node)) return text(node[0]);
  const value = node["#text"];
  return typeof value === "string" || typeof value === "number" ? String(value) : "";
}

function attr(node: Node, name: string): string {
  if (!node || typeof node !== "object" || Array.isArray(node)) return "";
  const value = node[`@_${name}`];
  return typeof value === "string" ? value : "";
}

function first(obj: Record<string, unknown>, keys: string[]): Node {
  for (const key of keys) {
    const value = obj[key] as Node;
    if (text(value) || (value && typeof value === "object")) return value;
  }
  return undefined;
}

function date(obj: Record<string, unknown>): number | null {
  for (const key of ["pubDate", "dc:date", "published", "updated", "a10:updated", "issued", "modified"]) {
    const value = text(obj[key] as Node);
    if (!value) continue;
    const ms = Date.parse(value);
    if (!Number.isNaN(ms)) return ms;
  }
  return null;
}

function categories(obj: Record<string, unknown>): string[] {
  const list = (obj.category as Node[] | undefined) ?? [];
  return list.map((c) => text(c) || attr(c, "term") || attr(c, "label")).filter(Boolean);
}

/** RSS <link> is text; Atom <link> is an element with href, possibly several with rel values. */
function link(obj: Record<string, unknown>): string {
  const links = (obj.link as Node[] | undefined) ?? [];
  const plain = links.map(text).find(Boolean);
  if (plain) return plain;
  const withHref = links.filter((l) => attr(l, "href"));
  const alternate = withHref.find((l) => !attr(l, "rel") || attr(l, "rel") === "alternate");
  const href = attr(alternate ?? withHref[0], "href");
  if (href) return href;
  const guid = obj.guid as Node;
  const permalink = attr(guid, "isPermaLink");
  return permalink === "false" ? "" : text(guid);
}

function toItem(obj: Record<string, unknown>): RawItem {
  return {
    title: text(obj.title as Node),
    link: link(obj),
    date: date(obj),
    summary: text(first(obj, ["description", "summary", "content:encoded", "content"])),
    categories: categories(obj),
    comments: text(obj.comments as Node) || undefined,
  };
}

/** Items from an RSS 2.0, RSS 1.0 (RDF) or Atom document. Throws FeedError for anything else. */
export function parseFeed(xml: string): RawItem[] {
  if (!/<(rss|feed|rdf:RDF)\b/i.test(xml.slice(0, 4000))) throw new FeedError("Not an RSS or Atom feed");
  let doc: Record<string, unknown>;
  try {
    doc = parser.parse(xml) as Record<string, unknown>;
  } catch {
    throw new FeedError("The feed is not valid XML");
  }
  const rss = doc.rss as { channel?: { item?: unknown[] } | { item?: unknown[] }[] } | undefined;
  const channel = Array.isArray(rss?.channel) ? rss?.channel[0] : rss?.channel;
  const rdf = doc["rdf:RDF"] as { item?: unknown[] } | undefined;
  const atom = doc.feed as { entry?: unknown[] } | undefined;
  const nodes = channel?.item ?? rdf?.item ?? atom?.entry;
  if (!nodes) {
    if (channel || atom || rdf) return [];
    throw new FeedError("Not an RSS or Atom feed");
  }
  return nodes.filter((n): n is Record<string, unknown> => !!n && typeof n === "object").map(toItem);
}
