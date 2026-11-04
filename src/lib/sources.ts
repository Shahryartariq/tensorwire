import type { ItemText, Source, SourceKind } from "./types";

const AI = /\b(ai|a\.i\.|artificial intelligence|machine learning|deep learning|neural|llms?|gpt|genai|generative|models?|agents?|agentic|chatbots?|copilot|transformers?|inference|training)\b/i;

const mentionsAi = (item: ItemText) => AI.test(`${item.title} ${item.text}`) || item.categories.some((c) => AI.test(c));
const hasCategory = (item: ItemText, pattern: RegExp) => item.categories.some((c) => pattern.test(c));

/** Every feed Tensorwire reads. Lab blogs come first: when two sources link the same URL, the first one keeps it. */
export const SOURCES: Source[] = [
  {
    slug: "openai",
    name: "OpenAI",
    homepage: "https://openai.com/news/",
    feed: "https://openai.com/news/rss.xml",
    kind: "lab",
    about: "Announcements, research and customer stories from the company behind ChatGPT, Codex and the GPT models.",
  },
  {
    slug: "google-deepmind",
    name: "Google DeepMind",
    homepage: "https://deepmind.google/discover/blog/",
    feed: "https://deepmind.google/blog/rss.xml",
    kind: "lab",
    about: "Model launches and research from Google DeepMind, the lab behind Gemini, Genie and AlphaFold.",
  },
  {
    slug: "google-ai",
    name: "Google AI blog",
    homepage: "https://blog.google/technology/ai/",
    feed: "https://blog.google/innovation-and-ai/technology/ai/rss/",
    kind: "lab",
    about: "AI product news from Google: Gemini in Search, Android, Workspace and the company's monthly AI round-ups.",
    summaries: false,
  },
  {
    slug: "google-research",
    name: "Google Research",
    homepage: "https://research.google/blog/",
    feed: "https://research.google/blog/rss/",
    kind: "lab",
    about: "Papers and research write-ups from Google Research, from language models to health and science.",
    summaries: false,
  },
  {
    slug: "hugging-face",
    name: "Hugging Face",
    homepage: "https://huggingface.co/blog",
    feed: "https://huggingface.co/blog/feed.xml",
    kind: "lab",
    about: "The Hugging Face blog: open models, datasets, benchmarks and libraries from Hugging Face and the teams that publish there.",
  },
  {
    slug: "microsoft-research",
    name: "Microsoft Research",
    homepage: "https://www.microsoft.com/en-us/research/blog/",
    feed: "https://www.microsoft.com/en-us/research/feed/",
    kind: "lab",
    about: "Research blog and podcast from Microsoft Research. Tensorwire keeps the posts about AI.",
    include: mentionsAi,
  },
  {
    slug: "nvidia",
    name: "NVIDIA",
    homepage: "https://blogs.nvidia.com/",
    feed: "https://blogs.nvidia.com/feed/",
    kind: "lab",
    about: "NVIDIA's blog on GPUs, AI infrastructure, robotics and simulation. Gaming posts are left out.",
    include: (item) => !hasCategory(item, /gaming|geforce/i) && mentionsAi(item),
  },
  {
    slug: "aws-machine-learning",
    name: "AWS Machine Learning",
    homepage: "https://aws.amazon.com/blogs/machine-learning/",
    feed: "https://aws.amazon.com/blogs/machine-learning/feed/",
    kind: "lab",
    about: "How-to guides and customer case studies for Amazon Bedrock, SageMaker and other AWS AI services.",
  },
  {
    slug: "techcrunch",
    name: "TechCrunch",
    homepage: "https://techcrunch.com/category/artificial-intelligence/",
    feed: "https://techcrunch.com/category/artificial-intelligence/feed/",
    kind: "press",
    about: "TechCrunch's AI desk: funding rounds, startups, product launches and the business of AI.",
  },
  {
    slug: "the-verge",
    name: "The Verge",
    homepage: "https://www.theverge.com/ai-artificial-intelligence",
    feed: "https://www.theverge.com/rss/ai-artificial-intelligence/index.xml",
    kind: "press",
    about: "The Verge on AI in consumer tech: assistants, apps, devices and the companies that make them.",
  },
  {
    slug: "mit-technology-review",
    name: "MIT Technology Review",
    homepage: "https://www.technologyreview.com/topic/artificial-intelligence/",
    feed: "https://www.technologyreview.com/topic/artificial-intelligence/feed",
    kind: "press",
    about: "Reporting and analysis on AI research, policy and its effects on society. Sponsored posts are left out.",
    include: (item) => !hasCategory(item, /sponsored/i),
  },
  {
    slug: "ars-technica",
    name: "Ars Technica",
    homepage: "https://arstechnica.com/ai/",
    feed: "https://arstechnica.com/ai/feed/",
    kind: "press",
    about: "Ars Technica's AI coverage: in-depth, technical and often skeptical.",
  },
  {
    slug: "wired",
    name: "Wired",
    homepage: "https://www.wired.com/tag/ai/",
    feed: "https://www.wired.com/feed/tag/ai/latest/rss",
    kind: "press",
    about: "Wired's AI stories: features, investigations and how AI changes work, politics and culture.",
  },
  {
    slug: "marktechpost",
    name: "MarkTechPost",
    homepage: "https://www.marktechpost.com/",
    feed: "https://www.marktechpost.com/feed/",
    kind: "press",
    about: "Short technical summaries of new models, papers and AI tools, often within hours of release.",
  },
  {
    slug: "simon-willison",
    name: "Simon Willison",
    homepage: "https://simonwillison.net/",
    feed: "https://simonwillison.net/atom/everything/",
    kind: "builder",
    about: "Notes and experiments with LLMs from the creator of Datasette and the llm CLI. Tensorwire keeps his AI posts.",
    include: (item) => hasCategory(item, /^(ai|llms?|generative-ai|machine-learning|ai-agents|prompt-engineering)$/i),
  },
  {
    slug: "latent-space",
    name: "Latent Space",
    homepage: "https://www.latent.space/",
    feed: "https://www.latent.space/feed",
    kind: "builder",
    about: "The AI engineer's newsletter and podcast: interviews with builders and the daily AINews round-up.",
    digest: true,
  },
  {
    slug: "import-ai",
    name: "Import AI",
    homepage: "https://importai.substack.com/",
    feed: "https://importai.substack.com/feed",
    kind: "builder",
    about: "Jack Clark's weekly newsletter on AI research and what it means.",
    digest: true,
  },
  {
    slug: "hacker-news",
    name: "Hacker News",
    homepage: "https://news.ycombinator.com/",
    feed: "https://hnrss.org/newest?q=LLM&points=100",
    kind: "builder",
    about: "Posts about LLMs that reached 100 points on Hacker News, with a link to the discussion.",
    summaries: false,
  },
];

const BY_SLUG = new Map(SOURCES.map((source) => [source.slug, source]));

export function sourceBySlug(slug: string): Source | undefined {
  return BY_SLUG.get(slug);
}

export function sourceName(slug: string): string {
  return BY_SLUG.get(slug)?.name ?? slug;
}

export const KIND_LABEL: Record<SourceKind, string> = {
  lab: "Labs and companies",
  press: "Newsrooms",
  builder: "Builders and newsletters",
};
