import fs from "node:fs";
// Owner: Bart (P2). Runs the AI layer against seed data outside Chrome.
// Mock:  node scripts/try-ai.mjs
// Real:  ANTHROPIC_API_KEY=sk-... node scripts/try-ai.mjs
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const R = pathToFileURL(ROOT).href;
const store = {};
const sent = [];
globalThis.chrome = {
  storage: { local: {
    get: async (k) => { const keys = typeof k === "string" ? [k] : k; const o = {}; for (const x of keys) if (x in store) o[x] = structuredClone(store[x]); return o; },
    set: async (o) => { Object.assign(store, structuredClone(o)); }
  } },
  tabs: { sendMessage: async (tabId, msg) => { sent.push([tabId, msg.type, msg.payload.depth]); } }
};
await import(R + "/extension/shared/config.js");
const { onVisit, reindexAll, generateInsights } = await import(R + "/extension/background/analysis.js");
const seed = JSON.parse(fs.readFileSync(path.join(ROOT, "extension/seed/seed.json"), "utf8"));
Object.assign(store, { settings: { demoMode: true, apiKey: process.env.ANTHROPIC_API_KEY || "" }, ...structuredClone(seed), tabState: {} });

console.log("reindex:", await reindexAll());
console.log("threads:", store.threads.map(t => `${t.label} ${t.visitIds.length}p ${t.minutes}m c${t.centroid.length}`));
console.log("hole:", store.hole.depth, store.hole.hops.map(h => h.similarity));

// live chain in a new tab: React docs -> drift into Roman history
const chain = [
  ["https://react.dev/learn/you-might-not-need-an-effect", "You Might Not Need an Effect – React", "Effects are an escape hatch from the React paradigm. They let you step outside of React and synchronize your components with some external system. If there is no external system involved, you shouldn't need an Effect."],
  ["https://en.wikipedia.org/wiki/React_(software)", "React (software) - Wikipedia", "React is a free and open-source front-end JavaScript library for building user interfaces based on components, maintained by Meta and a community of developers."],
  ["https://en.wikipedia.org/wiki/Meta_Platforms", "Meta Platforms - Wikipedia", "Meta Platforms is an American multinational technology conglomerate headquartered in Menlo Park, California, which owns Facebook, Instagram and WhatsApp."],
  ["https://en.wikipedia.org/wiki/Mark_Zuckerberg", "Mark Zuckerberg - Wikipedia", "Mark Zuckerberg is an American businessman who co-founded Facebook. He studied classics and has spoken of his admiration for the Roman emperor Augustus."],
  ["https://en.wikipedia.org/wiki/Augustus", "Augustus - Wikipedia", "Augustus was the first Roman emperor, reigning from 27 BC until his death in AD 14. His reign initiated the Pax Romana."],
  ["https://en.wikipedia.org/wiki/Roman_currency", "Roman currency - Wikipedia", "Roman currency consisted of gold, silver, bronze and copper coinage that changed in denomination and composition over centuries."]
];
let prev = null, t = Date.now();
for (const [url, title, excerpt] of chain) {
  const v = { id: `v_${t}_x`, url, domain: url.split("/")[2], title, excerpt, startedAt: t, activeSecs: 40, scrollDepth: 0.5, fromUrl: null, tabId: 999, prevVisitId: prev };
  store.visits.push(v);
  const r = await onVisit(v);
  console.log("onVisit", title.slice(0, 28).padEnd(28), JSON.stringify(r), "sim", store.hole.hops.at(-1).similarity);
  prev = v.id; t += 60000;
}
console.log("alerts sent:", sent);
console.log("insights:", await generateInsights());
console.log(JSON.stringify(store.insights).slice(0, 600));
