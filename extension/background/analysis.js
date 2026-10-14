// Owner: Bart (P2). Public interface: these three exports are frozen (see AGENTS.md).
// The worker calls them; each one reads and writes chrome.storage.local.
import { analyzePage, embedPage, cosine, nameThread, writeInsights } from "./ai.js";

const log = (...a) => console.log("[RH:P2]", ...a);
const round2 = (n) => Math.round(n * 100) / 100;

// onVisit and reindexAll both rewrite analyses/threads/hole, so they run one at a time.
let queue = Promise.resolve();
const serial = (fn) => {
  const run = queue.then(fn, fn);
  queue = run.catch(() => {});
  return run;
};

async function context() {
  const { settings = {} } = await chrome.storage.local.get("settings");
  const CFG = { ...RH_CONFIG, ...(settings.demoMode ? RH_DEMO : {}) };
  const key = settings.apiKey || "";
  return { key, CFG, mode: key ? "claude" : "mock" };
}

// Analyse + embed one visit. Labels from this mode are reused; seed labels without keywords get re-analysed.
async function analyse(key, mode, visit, existing) {
  const reuse = existing?.keywords?.length && existing.embedModel === mode;
  const labels = reuse ? existing : await analyzePage(key, visit);
  return {
    visitId: visit.id,
    topics: labels.topics, concepts: labels.concepts, keywords: labels.keywords, sourceType: labels.sourceType,
    level: labels.level, summary: labels.summary,
    embedding: embedPage(visit, labels), embedModel: mode,
    threadId: existing?.threadId ?? null
  };
}

function newThread(id, label, visit) {
  return { id, label, visitIds: [], minutes: 0, sourceMix: {}, centroid: [], firstSeen: visit.startedAt, lastSeen: visit.startedAt };
}

function addToThread(t, visit, a) {
  if (t.visitIds.includes(visit.id)) return;
  const n = t.visitIds.length;
  t.centroid = n && t.centroid.length === a.embedding.length
    ? t.centroid.map((c, i) => (c * n + a.embedding[i]) / (n + 1))
    : a.embedding.slice();
  t.visitIds.push(visit.id);
  t.minutes = round2(t.minutes + (visit.activeSecs || 0) / 60);
  t.sourceMix[a.sourceType] = (t.sourceMix[a.sourceType] || 0) + 1;
  t.firstSeen = Math.min(t.firstSeen, visit.startedAt);
  t.lastSeen = Math.max(t.lastSeen, visit.startedAt);
}

// Thread rule: join the closest centroid above the threshold, else start a new thread.
async function assignThread(threads, a, visit, key, CFG) {
  let best = null, bestSim = -1;
  for (const t of threads) {
    const s = cosine(a.embedding, t.centroid);
    if (s > bestSim) { best = t; bestSim = s; }
  }
  if (best && bestSim >= CFG.THREAD_JOIN_SIMILARITY) {
    addToThread(best, visit, a);
    log("joined thread", best.label, round2(bestSim));
    return best;
  }
  const label = await nameThread(key, a, visit);
  const slug = label.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 24) || "thread";
  const t = newThread(`t_${slug}_${Date.now().toString(36).slice(-4)}`, label, visit);
  threads.push(t);
  addToThread(t, visit, a);
  log("new thread", label, "best was", round2(bestSim));
  return t;
}

const hop = (visit, similarity) => ({ visitId: visit.id, title: visit.title, url: visit.url, similarity });

// Hole rule: extend when this visit came from the hole's last hop, otherwise start over.
function extendHole(hole, visit, a, analyses) {
  const last = hole?.hops?.at(-1);
  if (!last || visit.prevVisitId !== last.visitId) {
    return { startVisitId: visit.id, hops: [hop(visit, 1)], depth: 1, alerted: false, updatedAt: Date.now() };
  }
  const sim = round2(cosine(a.embedding, analyses[hole.startVisitId]?.embedding));
  const hops = [...hole.hops, hop(visit, sim)];
  return { ...hole, hops, depth: hops.length, updatedAt: Date.now() };
}

// The newest visit's chain, followed back through prevVisitId.
function holeFromNewestChain(visits, analyses) {
  if (!visits.length) return null;
  const byId = Object.fromEntries(visits.map((v) => [v.id, v]));
  const newest = visits.reduce((a, b) => (b.startedAt > a.startedAt ? b : a));
  const chain = [];
  for (let v = newest; v && chain.length < 50; v = byId[v.prevVisitId]) chain.unshift(v);
  const start = analyses[chain[0].id]?.embedding;
  const hops = chain.map((v, i) => hop(v, i === 0 ? 1 : round2(cosine(analyses[v.id]?.embedding, start))));
  return { startVisitId: chain[0].id, hops, depth: hops.length, alerted: true, updatedAt: newest.startedAt };
}

// Called after Luke's worker stores a new visit.
export function onVisit(visit) {
  return serial(async () => {
    const { key, CFG, mode } = await context();
    const { analyses = {}, threads = [], hole = null } =
      await chrome.storage.local.get(["analyses", "threads", "hole"]);

    const a = await analyse(key, mode, visit, analyses[visit.id]);
    const t = await assignThread(threads, a, visit, key, CFG);
    a.threadId = t.id;
    analyses[visit.id] = a;

    const next = extendHole(hole, visit, a, analyses);
    const newest = next.hops.at(-1).similarity;
    const fire = !next.alerted && next.depth >= CFG.HOLE_ALERT_DEPTH && newest < CFG.HOLE_ALERT_SIMILARITY;
    if (fire) next.alerted = true;

    await chrome.storage.local.set({ analyses, threads, hole: next });
    log("visit", visit.title, "→", t.label, "| hole depth", next.depth, "sim", newest);

    if (fire && visit.tabId != null) {
      log("HOLE_ALERT →", visit.tabId);
      chrome.tabs.sendMessage(visit.tabId, { type: "HOLE_ALERT", payload: next })
        .catch((e) => log("alert not delivered:", e.message));
    }
    return { threadId: t.id, depth: next.depth };
  });
}

// Analyse + embed every visit that needs it, then rebuild threads and the hole.
export function reindexAll() {
  return serial(async () => {
    const { key, CFG, mode } = await context();
    const { visits = [], analyses = {}, threads: old = [] } =
      await chrome.storage.local.get(["visits", "analyses", "threads"]);
    const ordered = [...visits].sort((a, b) => a.startedAt - b.startedAt);

    const todo = ordered.filter((v) => !(analyses[v.id]?.embedding?.length && analyses[v.id].embedModel === mode));
    for (let i = 0; i < todo.length; i += 5) {
      await Promise.all(todo.slice(i, i + 5).map(async (v) => {
        analyses[v.id] = await analyse(key, mode, v, analyses[v.id]);
      }));
      log(`reindex ${Math.min(i + 5, todo.length)}/${todo.length}`);
    }

    // Keep existing thread ids and labels (seed threads stay as curated); cluster the rest.
    const labels = Object.fromEntries(old.map((t) => [t.id, t.label]));
    const threads = [];
    for (const v of ordered) {
      const a = analyses[v.id];
      if (a.threadId && labels[a.threadId]) {
        let t = threads.find((x) => x.id === a.threadId);
        if (!t) { t = newThread(a.threadId, labels[a.threadId], v); threads.push(t); }
        addToThread(t, v, a);
      } else {
        a.threadId = (await assignThread(threads, a, v, key, CFG)).id;
      }
    }

    const hole = holeFromNewestChain(ordered, analyses);
    await chrome.storage.local.set({ analyses, threads, hole });
    log("reindexed", visits.length, "visits into", threads.length, "threads, mode", mode);
    return { visits: visits.length, threads: threads.length, mode };
  });
}

// Write `insights`: recap, gaps, quiz, nextReads.
export async function generateInsights() {
  const { key } = await context();
  const { visits = [], analyses = {}, threads = [] } =
    await chrome.storage.local.get(["visits", "analyses", "threads"]);
  if (!visits.length) return { empty: true };

  const pages = [...visits].sort((a, b) => a.startedAt - b.startedAt).slice(-30).map((v) => {
    const a = analyses[v.id] || {};
    return { visitId: v.id, threadId: a.threadId, title: v.title, domain: v.domain, sourceType: a.sourceType,
             summary: a.summary, concepts: a.concepts, excerpt: (v.excerpt || "").slice(0, 400) };
  });
  const input = {
    threads: threads.map((t) => ({ id: t.id, label: t.label, minutes: Math.round(t.minutes), sourceMix: t.sourceMix })),
    pages
  };

  const out = await writeInsights(key, input);
  const ids = new Set(visits.map((v) => v.id));
  const insights = {
    generatedAt: Date.now(),
    recap: out.recap,
    gaps: out.gaps || [],
    quiz: (out.quiz || []).filter((q) => q.options?.length && q.answer >= 0 && q.answer < q.options.length)
      .map((q) => (ids.has(q.visitId) ? q : { ...q, visitId: pages.at(-1).visitId })),
    nextReads: out.nextReads || []
  };
  await chrome.storage.local.set({ insights });
  log("insights written, mode", key ? "claude" : "mock");
  return { quiz: insights.quiz.length };
}
