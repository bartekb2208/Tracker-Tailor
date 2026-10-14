# Contract: Luke, P1 Capture & core

Branch `luke-capture`. `AGENTS.md` wins any disagreement.

## You own
`extension/manifest.json`, `extension/shared/config.js`, `extension/content/capture.js`, `extension/background/worker.js`, `extension/options/`, `extension/lib/Readability.js`

Others ask you for manifest changes. Bart sets the similarity thresholds in `config.js` at assembly; leave those two numbers alone.

## Already in the skeleton
- `worker.js`: full message router, chain linking (`prevVisitId`), badge, clear data. Keep its behaviour; fix bugs only.
- `capture.js`: working first version of the read rule. Verify and harden it.

## You receive
- Real browsing in Chrome.
- From Bart: `onVisit`, `reindexAll`, `generateInsights` in `background/analysis.js` (stubs now; import, never edit).
- From Bart: `loadSeed` in `seed/load-seed.js`.

## You deliver

**Must**
1. Extension loads with zero errors in the service worker console and on a Wikipedia tab.
2. Options page (`options.html` + `options.js`), plain and clear:
   - API key (password input), Demo mode checkbox, Pause checkbox. Save into `settings` by merging with what's there (`{ apiKey, demoMode, paused }`). Load current values on open.
   - Buttons that send messages and show the worker's reply next to them: **Load demo data** (`LOAD_SEED`), **Rebuild with AI** (`REINDEX`), **Clear data** (`CLEAR_DATA`).
   - **Open dashboard** button: `chrome.tabs.create({ url: chrome.runtime.getURL("dashboard/dashboard.html") })`.
3. Prove capture: Demo mode on, read three Wikipedia articles by clicking links in one tab. Storage has three `visits`, each `prevVisitId` pointing at the one before. Check with `chrome.storage.local.get(null, console.log)` in the service worker console.

**Should**
4. `capture.js`: wrap every `chrome.runtime.sendMessage` in try/catch. Old tabs throw "Extension context invalidated" after a reload.
5. `worker.js`: ignore a `VISIT_CAPTURED` whose URL was captured in the last 2 minutes (page reloads).
6. Badge background colour that reads on light and dark toolbars.

**Could**
7. Walk Rob's demo chain (`pitch/demo-script.md`) on your machine and report any page that doesn't capture.

## Done when (Bart checks at 17:55)
Options saves settings and all four buttons reply `ok: true`. Three linked Wikipedia reads leave three chained visits. No red errors anywhere.
