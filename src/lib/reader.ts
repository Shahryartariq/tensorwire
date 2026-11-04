import sanitizeHtml from "sanitize-html";

import { plainText } from "./text";

/** Below this many words the feed carries a summary, not the post, so there's nothing to read here. */
export const READABLE_WORDS = 150;
const WORDS_PER_MINUTE = 230;

export function countWords(text: string): number {
  return text.split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
}

function minutesFor(words: number): number {
  return Math.max(1, Math.round(words / WORDS_PER_MINUTE));
}

/**
 * Feeds that carry only the start of a post end it with a link to the rest ("Read full article",
 * "Continue reading…") or an ellipsis, sometimes followed by a comments link or a WordPress trailer.
 * Those aren't offered in the reader view: it would look like the whole post.
 */
const CUT_OFF =
  /(read (the )?(full|rest|more)\b[^.]{0,80}|continue reading[^.]{0,80}|keep reading[^.]{0,80}|\[(…|\.\.\.)\]|…|\.\.\.)\s*(comments)?\s*(the post .{1,300} appeared first on .{1,100})?\s*$/i;

export function isCutOff(text: string): boolean {
  return CUT_OFF.test(text.slice(-400));
}

/** Feeds often end posts with a link back to themselves; the reader page has its own. */
const BOILERPLATE = /^(the post .+ appeared first on .+|continue reading.*|read more.*|read (the )?full (story|article|post).*|comments|\(?source\)?:?)$/i;

/** Screen-reader hints some sites put inside link text; the reader view's links don't open new tabs. */
const NEW_TAB = /\s*\(?\s*opens in (a )?new (tab|window)\s*\)?/gi;

const MEDIA = /<(img|picture|video|audio|iframe|embed|object|svg)\b/gi;

/**
 * The allowlist. Everything else goes: scripts, styles, event handlers, forms, iframes and images
 * (which would also load from third-party servers). Links become absolute, point only to http(s)
 * or mailto, and are marked nofollow.
 */
function allowlist(articleUrl: string): sanitizeHtml.IOptions {
  return {
    allowedTags: [
      "p", "h2", "h3", "h4", "h5", "h6", "ul", "ol", "li", "blockquote", "pre", "code", "kbd",
      "em", "strong", "del", "s", "sub", "sup", "a", "br", "hr",
      "table", "thead", "tbody", "tr", "th", "td", "dl", "dt", "dd",
    ],
    allowedAttributes: { a: ["href", "rel"], ol: ["start"], th: ["colspan", "rowspan"], td: ["colspan", "rowspan"] },
    allowedSchemes: ["http", "https", "mailto"],
    allowProtocolRelative: false,
    // Contents of these go too, not just the tags (a caption without its image reads oddly).
    nonTextTags: ["script", "style", "textarea", "option", "noscript", "iframe", "figcaption", "svg", "button", "form", "nav", "template"],
    textFilter: (text) => text.replace(NEW_TAB, ""),
    transformTags: {
      // The page title is the only h1.
      h1: "h2",
      b: "strong",
      i: "em",
      // The transform replaces a link's attributes entirely, so only these href and rel values survive.
      a: (tagName, attribs): sanitizeHtml.Tag => {
        let href: string | undefined;
        try {
          if (!attribs.href?.trim()) throw new Error("no link");
          const url = new URL(attribs.href.trim(), articleUrl);
          if (["http:", "https:", "mailto:"].includes(url.protocol)) href = url.toString();
        } catch {
          href = undefined;
        }
        // A link without a usable address keeps its text but no href, so it isn't a link at all.
        // (Renaming the tag here confuses sanitize-html's closing tags for later links.)
        return { tagName, attribs: href ? { href, rel: "nofollow noopener noreferrer" } : ({} as sanitizeHtml.Attributes) };
      },
    },
  };
}

/**
 * Minutes to read a feed item's body, or undefined when the feed doesn't carry the whole post:
 * too few words to be more than a summary, or cut off with a link to the rest. Judged on the text
 * the reader would see (captions and embeds removed), so a caption can't hide a cut-off ending.
 */
export function readingMinutes(html: string | undefined, articleUrl: string): number | undefined {
  if (!html) return undefined;
  const text = plainText(sanitizeHtml(html, allowlist(articleUrl)));
  const words = countWords(text);
  if (words < READABLE_WORDS || isCutOff(text)) return undefined;
  return minutesFor(words);
}

export interface ReaderText {
  /** Safe HTML: text, headings, lists, quotes, code, tables and links only. */
  html: string;
  words: number;
  minutes: number;
  /** Images, videos and embeds left out; the reader is pointed to the original for them. */
  media: number;
}

/** Cleans a feed item's HTML for the reader view, and drops empty paragraphs and feed boilerplate. */
export function cleanArticle(html: string, articleUrl: string): ReaderText {
  const media = (html.match(MEDIA) ?? []).length;
  const clean = sanitizeHtml(html, {
    ...allowlist(articleUrl),
    exclusiveFilter: (frame) => {
      if (frame.tag !== "p") return false;
      const text = frame.text.replace(NEW_TAB, "").replace(/\s+/g, " ").trim();
      return !text || BOILERPLATE.test(text);
    },
  });
  const words = countWords(plainText(clean));
  return { html: clean.trim(), words, minutes: minutesFor(words), media };
}
