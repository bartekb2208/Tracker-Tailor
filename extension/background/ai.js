// Owner: Rob (P2). The only file that calls OpenAI.
// With no apiKey, every function must return mock output instead (see team/Rob/CONTRACT.md).
const MODEL = "gpt-4o-mini"; // swap for the cheapest current mini model on the account

const PAGE_SCHEMA = {
  type: "object", additionalProperties: false,
  required: ["topics", "concepts", "sourceType", "level", "summary"],
  properties: {
    topics: { type: "array", items: { type: "string" } },
    concepts: { type: "array", items: { type: "string" } },
    sourceType: { type: "string", enum: ["docs", "blog", "paper", "forum", "video", "news", "reference", "other"] },
    level: { type: "string", enum: ["intro", "intermediate", "advanced"] },
    summary: { type: "string" }
  }
};

async function post(apiKey, path, body) {
  const res = await fetch(`https://api.openai.com/v1/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error(`OpenAI ${res.status}: ${await res.text()}`);
  return res.json();
}

export async function callJSON(apiKey, system, user, name, schema) {
  const data = await post(apiKey, "chat/completions", {
    model: MODEL,
    messages: [{ role: "system", content: system }, { role: "user", content: user }],
    response_format: { type: "json_schema", json_schema: { name, strict: true, schema } }
  });
  return JSON.parse(data.choices[0].message.content);
}

export const analyzePage = (apiKey, v) => callJSON(apiKey,
  "You label web pages a person has read. Be specific and brief.",
  `Title: ${v.title}\nURL: ${v.url}\n\n${v.excerpt}`,
  "page_analysis", PAGE_SCHEMA);

export async function embed(apiKey, text) {
  const data = await post(apiKey, "embeddings",
    { model: "text-embedding-3-small", input: text, dimensions: 256 });
  return data.data[0].embedding;
}

export function cosine(a, b) {
  if (!a?.length || !b?.length) return 0;
  let d = 0, x = 0, y = 0;
  for (let i = 0; i < a.length; i++) { d += a[i] * b[i]; x += a[i] * a[i]; y += b[i] * b[i]; }
  return x && y ? d / Math.sqrt(x * y) : 0;
}
