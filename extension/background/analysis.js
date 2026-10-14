// Owner: Rob (P2). Public interface: these three exports are frozen (see AGENTS.md).
// The worker calls them; each one reads and writes chrome.storage.local.
import { analyzePage, embed, cosine } from "./ai.js";

const log = (...a) => console.log("[RH:P2]", ...a);

// Called after Luke's worker stores a new visit. May be called concurrently: serialize internally.
export async function onVisit(visit) {
  log("onVisit stub", visit.title);
  // TODO(Rob): analyse + embed, assign thread, update hole, send HOLE_ALERT when the rule fires
}

// Analyse + embed every visit missing an embedding, then rebuild threads and the hole.
export async function reindexAll() {
  log("reindexAll stub");
  // TODO(Rob)
}

// Write `insights`: recap, gaps, quiz, nextReads.
export async function generateInsights() {
  log("generateInsights stub");
  // TODO(Rob)
}
