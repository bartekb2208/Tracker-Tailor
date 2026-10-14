# Rabbit Hole: team agreement

Every AI agent in this repo follows this file. Read all of it before writing code, then read your person's contract in `team/<Name>/CONTRACT.md`. If a contract disagrees with this file, this file wins.

## What we're building

A Chrome extension (Manifest V3) for the Tracker & Tailor hackathon.

- **Track:** in the background, notice which articles the user actually reads (active time + scroll), and which page led to which.
- **Aggregate:** OpenAI labels each page and embeds it; pages group into learning threads; similarity to the first page of a chain measures drift.
- **Tailor:** an in-page alert when the user is deep in a rabbit hole (with "Back to start"), plus gaps, a quiz and next reads on the dashboard.

## Deadlines (BST, today)

| Time | What |
|---|---|
| 17:30 | Skeleton and seed data pulled, your branch created, extension loads in Chrome |
| 17:40 | Push work in progress. Bart test-merges. |
| **17:55** | **Final push. Anything not pushed doesn't ship.** |
| 17:55–18:10 | Bart assembles on his machine. Owners hotfix only their own files. |
| 18:10–18:25 | Rehearse, record backup video |
| 18:25 | Demo |

## Who owns what

| Person | Role | AI tool | Branch | Owns (edit only these) |
|---|---|---|---|---|
| Luke | P1 Capture & core | Codex | `luke-capture` | `extension/manifest.json`, `extension/shared/`, `extension/content/capture.js`, `extension/background/worker.js`, `extension/options/`, `extension/lib/Readability.js` |
| Marc | P3 Interface | Copilot Pro | `marc-interface` | `extension/dashboard/`, `extension/sidepanel/`, `extension/content/toast.js`, `extension/lib/vis-network.min.js` |
| Bart | P2 Intelligence, seed data, assembly | Claude Code | `main` | `extension/background/ai.js`, `extension/background/analysis.js`, any new `extension/background/*.js` except `worker.js`, `extension/seed/`, `scripts/`, `AGENTS.md`, `team/`, `.github/` |
| Bart | P4 Demo, pitch & testing | Copilot Pro (when it arrives) | `rob-demo` | `pitch/` |

## Hard rules

1. **Edit only files you own.** Need a change somewhere else? Stop and tell your human. Never patch another person's file.
2. **No build step.** Plain JavaScript, HTML and CSS. Worker files are ES modules. Content scripts are classic scripts (no `import`/`export`). No npm, TypeScript, React, Tailwind or bundlers. `extension/` must load unpacked as-is.
3. **No remote code.** No CDN `<script>` tags. Libraries are files in `extension/lib/`.
4. **Names and shapes below are frozen.** You may add optional fields. Never rename or remove a key, field, message or export.
5. **OpenAI is called only from `extension/background/ai.js`.**
6. **Everything works with no API key** (mock mode). Only Bart's machine has the key.
7. **Never write an API key into a file or a commit.** It lives in `chrome.storage` via the Options page.
8. **Storage is the bus.** Components talk through `chrome.storage.local` and the messages below. Pages re-render on `chrome.storage.onChanged`. No polling.
9. **Extension pages (dashboard, side panel, options) never add a `chrome.runtime.onMessage` listener.** Only the worker answers messages; content scripts listen only for `HOLE_ALERT`.
10. **The service worker keeps no state in variables.** Chrome stops it after ~30 idle seconds. Read and write storage.
11. **Log with a prefix:** `console.log("[RH:P1]", ...)` (Luke P1, Bart P2, Marc P3, Rob P4).
12. **Demo-grade code.** Small and readable. No test frameworks, no refactors of working code.
13. **Git:** commit to your own branch and push often. Never push to `main` (except Bart). Never force-push.

## Storage keys (`chrome.storage.local`)

| Key | Holds | Written by | Read by |
|---|---|---|---|
| `settings` | `{ apiKey: string, demoMode: boolean, paused: boolean }` | Luke (Options) | everyone |
| `visits` | `PageVisit[]`, oldest first | Luke | Bart, Marc |
| `tabState` | `{ [tabId]: { visitId, at } }` last visit per tab | Luke | Luke |
| `analyses` | `{ [visitId]: PageAnalysis }` | Bart | Marc |
| `threads` | `Thread[]` | Bart | Marc |
| `hole` | `Hole` or `null`, the current chain | Bart | Marc, Luke (badge) |
| `insights` | `Insights` or `null` | Bart | Marc |

## Messages

Send with `chrome.runtime.sendMessage({ type, payload })`. The worker replies `{ ok: true, ...extra }` or `{ ok: false, error }`. `HOLE_ALERT` is the only message sent to a tab, with `chrome.tabs.sendMessage(tabId, ...)`.

| Type | From → to | Payload | Worker calls |
|---|---|---|---|
| `VISIT_CAPTURED` | capture.js → worker | `PageVisit` without `tabId` / `prevVisitId` | stores it, then Bart's `onVisit(visit)` |
| `VISIT_UPDATED` | capture.js → worker | `{ id, activeSecs, scrollDepth }` | patches the visit |
| `HOLE_ALERT` | Bart's code → that tab's toast.js | `Hole` | — |
| `GENERATE_INSIGHTS` | dashboard → worker | none | Bart's `generateInsights()` |
| `LOAD_SEED` | options → worker | none | Bart's `loadSeed()` |
| `REINDEX` | options → worker | none | Bart's `reindexAll()` |
| `CLEAR_DATA` | options → worker | none | removes every key except `settings` |

## Module interfaces (frozen)

- `extension/background/analysis.js` (Bart) exports `async onVisit(visit)`, `async reindexAll()`, `async generateInsights()`. Each writes storage and may return a small object.
- `extension/seed/load-seed.js` (Bart) exports `async loadSeed()`.
- `extension/shared/config.js` (Luke) defines globals `RH_CONFIG` and `RH_DEMO`. Effective config is `{ ...RH_CONFIG, ...(settings.demoMode ? RH_DEMO : {}) }`.

## Shapes

```js
// PageVisit (Luke)
{ id: "v_1760450000000_3f9a", url, domain, title,
  excerpt,            // first 1,500 chars of the article text
  startedAt,          // ms epoch
  activeSecs, scrollDepth,  // 0..1
  fromUrl,            // document.referrer or null
  tabId,              // added by the worker
  prevVisitId }       // added by the worker: previous visit in this tab or its opener tab, within CHAIN_GAP_MINS, else null

// PageAnalysis (Bart)
{ visitId, topics: [string], concepts: [string],
  sourceType: "docs"|"blog"|"paper"|"forum"|"video"|"news"|"reference"|"other",
  level: "intro"|"intermediate"|"advanced",
  summary,            // one sentence
  embedding: [number],// 256 numbers; [] in seed data until REINDEX
  threadId }

// Thread (Bart)
{ id: "t_react_effects", label: "React effects", visitIds: [string], minutes,
  sourceMix: { docs: 2, blog: 5 }, centroid: [number], firstSeen, lastSeen }

// Hole (Bart)
{ startVisitId,
  hops: [{ visitId, title, url, similarity }],  // similarity to hop 0, hop 0 = 1
  depth,              // hops.length
  alerted,            // true once HOLE_ALERT was sent for this hole
  updatedAt }

// Insights (Bart)
{ generatedAt, recap,
  gaps: [{ threadId, text, query }],
  quiz: [{ q, options: [string], answer /* index */, visitId }],
  nextReads: [{ threadId, why, query }] }   // queries only, never URLs
```

## Rules of the loop

- **Read rule (Luke):** a page counts when `activeSecs >= MIN_ACTIVE_SECS` and `scrollDepth >= MIN_SCROLL_DEPTH`. Active means the tab is visible and there was input within `IDLE_AFTER_SECS`.
- **Chain rule (Luke):** `prevVisitId` is the last visit in the same tab, else in the opener tab, if under `CHAIN_GAP_MINS` ago.
- **Thread rule (Bart):** join the thread whose centroid is most similar if above `THREAD_JOIN_SIMILARITY`, else create a new thread.
- **Hole rule (Bart):** a visit whose `prevVisitId` is the hole's last hop extends it; anything else starts a new hole. Send `HOLE_ALERT` once when `depth >= HOLE_ALERT_DEPTH` and the newest hop's similarity `< HOLE_ALERT_SIMILARITY`.

## Assembly (Bart's machine, 17:55)

```bash
git checkout main && git pull
git fetch origin
git merge --no-edit origin/luke-capture
git merge --no-edit origin/marc-interface
git merge --no-edit origin/rob-demo
```

Then: `chrome://extensions` → reload Rabbit Hole → Options: paste key, Demo mode on, **Clear data**, **Load demo data**, **Rebuild with AI** → open the dashboard → run the demo chain.
