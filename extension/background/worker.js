// Owner: Luke (P1). Message router and storage writes.
// Chrome can stop this worker at any time, so it keeps no state in variables.
import "../shared/config.js";
import { onVisit, reindexAll, generateInsights } from "./analysis.js"; // Rob (P2)
import { loadSeed } from "../seed/load-seed.js";                       // Bart (P4)

const log = (...a) => console.log("[RH:P1]", ...a);
const DATA_KEYS = ["visits", "tabState", "analyses", "threads", "hole", "insights"];

chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(console.error);
  chrome.action.setBadgeBackgroundColor({ color: "#d85d35" });
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  handle(msg, sender).then(
    (result) => sendResponse({ ok: true, ...(result || {}) }),
    (err) => {
      console.error("[RH:P1]", msg?.type, err);
      sendResponse({ ok: false, error: String(err?.message || err) });
    }
  );
  return true; // keep the channel open for the async reply
});

async function handle(msg, sender) {
  switch (msg?.type) {
    case "VISIT_CAPTURED": return captured(msg.payload, sender.tab);
    case "VISIT_UPDATED": return updated(msg.payload);
    case "GENERATE_INSIGHTS": return generateInsights();
    case "LOAD_SEED": return loadSeed();
    case "REINDEX": return reindexAll();
    case "CLEAR_DATA": await chrome.storage.local.remove(DATA_KEYS); return {};
    default: return {};
  }
}

async function config() {
  const { settings = {} } = await chrome.storage.local.get("settings");
  return { ...RH_CONFIG, ...(settings.demoMode ? RH_DEMO : {}) };
}

async function captured(visit, tab) {
  const CFG = await config();
  const { visits = [], tabState = {} } = await chrome.storage.local.get(["visits", "tabState"]);
  if (visits.some((v) => v.id === visit.id)) return {};

  const now = Date.now();
  if (visits.some((v) => v.url === visit.url && now - Number(v.startedAt || 0) < 120000)) return {};
  const recent = (s) => (s && now - s.at < CFG.CHAIN_GAP_MINS * 60000 ? s.visitId : null);
  visit.tabId = tab?.id ?? null;
  visit.prevVisitId = recent(tabState[visit.tabId]) ?? recent(tabState[tab?.openerTabId]) ?? null;

  visits.push(visit);
  tabState[visit.tabId] = { visitId: visit.id, at: now };
  await chrome.storage.local.set({ visits, tabState });
  log("captured", visit.title, "prev:", visit.prevVisitId);

  await onVisit(visit);
  return { id: visit.id };
}

async function updated({ id, activeSecs, scrollDepth }) {
  const { visits = [], tabState = {} } = await chrome.storage.local.get(["visits", "tabState"]);
  const v = visits.find((x) => x.id === id);
  if (!v) return {};
  v.activeSecs = activeSecs;
  v.scrollDepth = Math.round(scrollDepth * 100) / 100;
  const s = tabState[v.tabId];
  if (s && s.visitId === id) s.at = Date.now(); // leaving the page counts as recent activity
  await chrome.storage.local.set({ visits, tabState });
  return {};
}

// Toolbar badge shows the current hole depth
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local" || !("hole" in changes)) return;
  const depth = changes.hole.newValue?.depth ?? 0;
  chrome.action.setBadgeText({ text: depth >= 2 ? String(depth) : "" });
  chrome.action.setBadgeBackgroundColor({ color: "#d85d35" });
});
