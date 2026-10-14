// Owner: Bart (P2). The only file that calls OpenAI. No chrome.* calls here.
// Every function takes apiKey first; with no key it returns mock output and makes no network calls.
const MODEL = "gpt-4o-mini"; // swap for the cheapest current mini model on the account
const DIMENSIONS = 256;

const log = (...a) => console.log("[RH:P2]", ...a);

// ---------- OpenAI plumbing ----------

async function post(apiKey, path, body) {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(`https://api.openai.com/v1/${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify(body)
    });
    if (res.ok) return res.json();
    const retryable = res.status === 429 || res.status >= 500;
    if (!retryable || attempt >= 1) throw new Error(`OpenAI ${res.status}: ${await res.text()}`);
    await new Promise((r) => setTimeout(r, 1500));
  }
}

export async function callJSON(apiKey, system, user, name, schema) {
  const data = await post(apiKey, "chat/completions", {
    model: MODEL,
    messages: [{ role: "system", content: system }, { role: "user", content: user }],
    response_format: { type: "json_schema", json_schema: { name, strict: true, schema } }
  });
  return JSON.parse(data.choices[0].message.content);
}

const str = { type: "string" };
const strArr = { type: "array", items: str };
const obj = (properties) => ({ type: "object", additionalProperties: false, required: Object.keys(properties), properties });

const PAGE_SCHEMA = obj({
  topics: strArr,
  concepts: strArr,
  sourceType: { type: "string", enum: ["docs", "blog", "paper", "forum", "video", "news", "reference", "other"] },
  level: { type: "string", enum: ["intro", "intermediate", "advanced"] },
  summary: str
});

const LABEL_SCHEMA = obj({ label: str });

const INSIGHTS_SCHEMA = obj({
  recap: str,
  gaps: { type: "array", items: obj({ threadId: str, text: str, query: str }) },
  quiz: { type: "array", items: obj({ q: str, options: strArr, answer: { type: "integer" }, visitId: str }) },
  nextReads: { type: "array", items: obj({ threadId: str, why: str, query: str }) }
});

// ---------- Public API ----------

export async function analyzePage(apiKey, v) {
  if (!apiKey) return mockAnalyze(v);
  return callJSON(apiKey,
    "You label a web page a person has just read. topics: 1-3 short topic names. concepts: 2-4 specific ideas from the page. summary: one plain sentence. Be specific and brief.",
    `Title: ${v.title}\nURL: ${v.url}\n\n${v.excerpt}`,
    "page_analysis", PAGE_SCHEMA);
}

export async function embed(apiKey, text) {
  if (!apiKey) return mockEmbed(text);
  const data = await post(apiKey, "embeddings",
    { model: "text-embedding-3-small", input: text.slice(0, 4000), dimensions: DIMENSIONS });
  return data.data[0].embedding;
}

export async function nameThread(apiKey, analysis, visit) {
  if (!apiKey) return mockLabel(analysis, visit);
  const out = await callJSON(apiKey,
    "Name a reading thread that starts with this page. 2-4 words, Title Case, no punctuation, describe the subject not the website.",
    `Title: ${visit.title}\nTopics: ${analysis.topics.join(", ")}\nSummary: ${analysis.summary}`,
    "thread_label", LABEL_SCHEMA);
  return out.label || mockLabel(analysis, visit);
}

export async function writeInsights(apiKey, input) {
  if (!apiKey) return mockInsights(input);
  return callJSON(apiKey,
    [
      "You are Rabbit Hole, a reading coach. You get the threads a person has been reading and their recent pages.",
      "Write, in second person, specific to their actual pages:",
      "- recap: 2 sentences on what they read this week and how (time spent, kinds of sources).",
      "- gaps: 2 important things they skipped, such as official docs or a foundational concept. Each has a web search query.",
      "- quiz: 3 multiple-choice questions answerable from the pages listed, 4 options each, answer = index of the correct option, visitId = the page the question comes from.",
      "- nextReads: 2 suggestions with a one-line why and a web search query.",
      "Use the given threadId and visitId values exactly. Never output URLs."
    ].join("\n"),
    JSON.stringify(input),
    "insights", INSIGHTS_SCHEMA);
}

export function cosine(a, b) {
  if (!a?.length || !b?.length || a.length !== b.length) return 0;
  let d = 0, x = 0, y = 0;
  for (let i = 0; i < a.length; i++) { d += a[i] * b[i]; x += a[i] * a[i]; y += b[i] * b[i]; }
  return x && y ? d / Math.sqrt(x * y) : 0;
}

// ---------- Mock mode ----------

const STOP = new Set(("the and for with from that this what your you how why are was were has have its into about " +
  "when which their they them than then also more most some such only over just like can will not but all any one two " +
  "his her him she who our its wikipedia blog guide com www http https org html react's").split(" "));

const words = (text) => (text.toLowerCase().match(/[a-z][a-z0-9]{2,}/g) || []).filter((w) => !STOP.has(w));

function mockEmbed(text) {
  const v = new Array(DIMENSIONS).fill(0);
  for (const w of words(text)) {
    let h = 2166136261;
    for (let i = 0; i < w.length; i++) h = Math.imul(h ^ w.charCodeAt(i), 16777619);
    v[(h >>> 0) % DIMENSIONS] += 1;
  }
  return v;
}

function guessSource(domain = "") {
  if (/wikipedia|britannica/.test(domain)) return "reference";
  if (/^docs\.|^developer\.|react\.dev|mdn|readthedocs/.test(domain)) return "docs";
  if (/stackoverflow|stackexchange|reddit|forum|home-barista|news\.ycombinator/.test(domain)) return "forum";
  if (/youtube|vimeo/.test(domain)) return "video";
  if (/arxiv|acm\.org|ieee|nature\.com/.test(domain)) return "paper";
  if (/bbc|guardian|nytimes|reuters|cnn/.test(domain)) return "news";
  return "blog";
}

const cleanTitle = (t = "") => t.split(/\s[-–|]\s/)[0].trim();

function mockAnalyze(v) {
  const title = cleanTitle(v.title);
  const titleWords = (title.match(/[A-Za-z][A-Za-z0-9']{2,}/g) || []).filter((w) => !STOP.has(w.toLowerCase()));
  const counts = {};
  for (const w of words(v.excerpt || "")) counts[w] = (counts[w] || 0) + 1;
  const concepts = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([w]) => w);
  return {
    topics: titleWords.length ? [...new Set(titleWords)].slice(0, 2) : ["General"],
    concepts,
    sourceType: guessSource(v.domain),
    level: "intermediate",
    summary: `Reading about ${title}.`
  };
}

function mockLabel(analysis, visit) {
  // 2-4 words: title words first, then concepts as filler.
  const cap = (w) => w[0].toUpperCase() + w.slice(1);
  const ok = (w) => !STOP.has(w.toLowerCase());
  const fromTitle = (cleanTitle(visit.title).match(/[A-Za-z][A-Za-z0-9']{2,}/g) || []).filter(ok).map(cap).slice(0, 3);
  const label = [...new Set([...fromTitle, ...(analysis.concepts || []).filter(ok).map(cap)])].slice(0, Math.max(2, fromTitle.length));
  return label.length >= 2 ? label.join(" ") : `${label[0] || "New"} Reading`;
}

function mockInsights({ threads, pages }) {
  const top = [...threads].sort((a, b) => b.minutes - a.minutes);
  const main = (mix = {}) => Object.entries(mix).sort((a, b) => b[1] - a[1])[0]?.[0] || "mixed";
  const quizPages = pages.slice(-3);
  return {
    recap: top.length
      ? `You spent the most time on ${top[0].label} (${top[0].minutes} min, mostly ${main(top[0].sourceMix)} pages)` +
        (top[1] ? ` and kept coming back to ${top[1].label}.` : ".")
      : "No reading yet.",
    gaps: top.slice(0, 2).map((t) => ({
      threadId: t.id,
      text: `Most of your ${t.label} reading came from ${main(t.sourceMix)} pages. A primary source would fill in the basics.`,
      query: `${t.label} official documentation`
    })),
    quiz: quizPages.map((p, i) => {
      const others = pages.filter((o) => o.visitId !== p.visitId).slice(-3).map((o) => o.title);
      const options = [...others];
      const answer = i % (others.length + 1);
      options.splice(answer, 0, p.title);
      return { q: `Which page covered "${p.concepts?.[0] || p.title}"?`, options, answer, visitId: p.visitId };
    }),
    nextReads: top.slice(0, 2).map((t) => ({
      threadId: t.id, why: `Go one level deeper on ${t.label}.`, query: `${t.label} in depth`
    }))
  };
}

log("ai.js loaded, model", MODEL);
