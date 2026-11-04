import type { TopicSlug } from "./types";

export interface Topic {
  slug: TopicSlug;
  name: string;
  /** Page title for search engines. */
  title: string;
  description: string;
  /** Opening paragraph on the topic page. */
  intro: string;
  pattern: RegExp;
}

/**
 * Topics are assigned with keyword rules on the headline, summary and the feed's own categories.
 * The rules are deliberately narrow: a missed topic is better than a wrong one.
 */
export const TOPICS: Topic[] = [
  {
    slug: "models",
    name: "Models",
    title: "AI model releases and LLM news",
    description: "New and updated AI models from OpenAI, Google, Anthropic, Meta, Mistral, Qwen and others: launches, benchmarks and what changed.",
    intro:
      "Launches and updates of language, vision and multimodal models, from frontier labs to small open models. Benchmarks and evaluations are here too.",
    pattern:
      /\b(gpt-?\d[\w.]*|o\d-?(mini|pro)?|gemini|gemma|claude|llama|qwen|deepseek|mistral|mixtral|grok|phi-?\d|nemotron|granite|kimi|glm-?\d|(ai|new|open|small|base|frontier|foundation|language|reasoning|vision|world|speech|embedding) models?|models? (release|launch|update)\w*|llms?|vlms?|vision.language|multimodal|model weights|benchmarks?|evals?|moe|mixture.of.experts|fine-?tun\w*)\b/i,
  },
  {
    slug: "agents",
    name: "Agents",
    title: "AI agents news",
    description: "AI agents and agentic tools: coding agents, computer use, tool calling, MCP and the frameworks for building them.",
    intro:
      "Software that plans and acts on its own: coding agents, browser and computer use, tool calling, the Model Context Protocol and agent frameworks.",
    pattern:
      /\b(agents?|agentic|multi-agent|computer use|tool (use|calling)|function calling|mcp|model context protocol|agentcore|autonomous|harness|codex|claude code|cursor|devin|copilot agent)\b/i,
  },
  {
    slug: "open-source",
    name: "Open source",
    title: "Open-source AI news",
    description: "Open-weight models, open-source AI libraries and datasets: releases on Hugging Face and GitHub, licences and local AI.",
    intro:
      "Open-weight models, open datasets and open-source libraries, plus the tools for running models on your own machine.",
    pattern:
      /\b(open[- ]source|open[- ]weights?|open models?|apache[- ]2\.0|mit licen[cs]e|hugging ?face|github|ollama|llama\.cpp|vllm|transformers library|gguf|run(s|ning)? locally|on my laptop|weights released)\b/i,
  },
  {
    slug: "research",
    name: "Research",
    title: "AI research news and papers",
    description: "AI research explained: new papers, findings from labs and universities, and what they mean in practice.",
    intro:
      "Papers, experiments and findings from labs and universities: new methods, surprising results and the science behind the products.",
    pattern:
      /\b(research(ers)?|papers?|arxiv|study|studies|scientists?|conjecture|theorem|proofs?|dataset|interpretability|alignment research|continual learning|reinforcement learning|neurips|icml|iclr)\b/i,
  },
  {
    slug: "products",
    name: "Products",
    title: "AI products and app news",
    description: "AI features in the apps and devices people use: ChatGPT, Gemini, Siri, Copilot and new AI products.",
    intro:
      "AI arriving in apps and devices: assistants, search, phones, laptops and the features companies ship to everyday users.",
    pattern:
      /\b(chatgpt|gemini app|siri|alexa\+?|copilot|ai mode|assistants?|iphone|ipad|android|pixel|ios \d+(\.\d+)?|watchos|macos|smart glasses|wearables?|home robots?|third-party apps|consumer)\b/i,
  },
  {
    slug: "hardware",
    name: "Chips and compute",
    title: "AI chips, GPUs and data center news",
    description: "The hardware behind AI: GPUs, custom chips, data centers, power and the cost of compute.",
    intro:
      "GPUs, custom accelerators, data centers and the power grid that feeds them: the supply side of AI and what it costs.",
    pattern:
      /\b(gpus?|chips?|chipmakers?|semiconductors?|fabs?|tpus?|accelerators?|dgx|h100|h200|b200|blackwell|rubin|data ?cent(er|re)s?|compute|power grid|electricity|turbines?|inference costs?)\b/i,
  },
  {
    slug: "policy",
    name: "Policy and safety",
    title: "AI policy, regulation and safety news",
    description: "AI rules and risks: government policy, regulation, lawsuits, copyright, elections, security and AI safety research.",
    intro:
      "Governments, courts and the people who study AI risk: regulation, lawsuits, copyright, elections, security incidents and safety work.",
    pattern:
      /\b(regulat\w*|laws?|legislation|lawsuits?|sue[sd]?|court|judge|copyright|policy|policies|government|congress|senate|white house|president|trump|eu ai act|ban(s|ned)?|elections?|vote|voting|midterms|safety|alignment|misuse|deepfakes?|privacy|security|malware|backdoor\w*|hack\w*|cyber\w*|loyalty test)\b/i,
  },
  {
    slug: "business",
    name: "Business",
    title: "AI business, funding and startup news",
    description: "The money in AI: funding rounds, valuations, acquisitions, earnings, startups and executive moves.",
    intro:
      "Funding rounds, valuations, acquisitions and earnings: who is raising, who is buying and how the AI business is doing.",
    pattern:
      /(\b(funding|raises?|raised|valuations?|valued at|startups?|acquir(e|es|ed|ing)|acquisitions?|ipo|revenue|earnings|investors?|venture|funds?|bubble|margins?|layoffs?|appoints?|stock|shares)\b|\$\d[\d.,]*\s?(m|b|bn|million|billion)\b)/i,
  },
];

const BY_SLUG = new Map(TOPICS.map((topic) => [topic.slug, topic]));

export function topicBySlug(slug: string): Topic | undefined {
  return BY_SLUG.get(slug as TopicSlug);
}

/** Up to three topics, preferring matches in the headline over matches in the summary. */
export function topicsFor(title: string, summary: string, categories: string[]): TopicSlug[] {
  const body = `${summary} ${categories.join(" ")}`;
  const inTitle = TOPICS.filter((t) => t.pattern.test(title)).map((t) => t.slug);
  const inBody = TOPICS.filter((t) => !inTitle.includes(t.slug) && t.pattern.test(body)).map((t) => t.slug);
  return [...inTitle, ...inBody].slice(0, 3);
}
