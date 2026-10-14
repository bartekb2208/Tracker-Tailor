# Contract: Marc, P3 Interface

Branch `marc-interface`. `AGENTS.md` wins any disagreement.

## You own
`extension/dashboard/`, `extension/sidepanel/`, `extension/content/toast.js`, `extension/lib/vis-network.min.js` (already downloaded, global `vis`)

## You receive
- Storage keys `visits`, `analyses`, `threads`, `hole`, `insights` (shapes in `AGENTS.md`). Seed data from Bart on `main`: `git merge origin/main` into your branch.
- `HOLE_ALERT` messages in `toast.js` with a `Hole` payload.

## You deliver

**Must**
1. **Dashboard** (`dashboard.html/js/css`). Read storage on load and re-render on `chrome.storage.onChanged`.
   - Header stats: pages read, active minutes, threads, current hole depth.
   - Topic map (vis-network): one large node per thread (label), one small node per visit (short title, colour by `analyses[id].sourceType`), edge visit → thread. Physics settles, then stays still.
   - Insights panel: `recap`; `gaps` and `nextReads` as links to `https://www.google.com/search?q=<query>`; quiz with clickable options that show right/wrong instantly.
   - **Generate insights** button: `chrome.runtime.sendMessage({ type: "GENERATE_INSIGHTS" })`, show "Thinking…" until the reply comes back.
   - Empty state when there's no data: "No reading yet. Open Options → Load demo data."
2. **Toast** (`toast.js`, classic script, no imports). On `HOLE_ALERT`, render inside a Shadow DOM, fixed top-right, max z-index:
   - Title: "You're {depth − 1} links away from {hops[0].title}"
   - Body: "You started {minutes} minutes ago. You're now reading {last hop title}."
   - Buttons: **Back to start** (`location.href = hops[0].url`) and **Keep going** (dismiss). It stays until clicked.
3. **Side panel** (`sidepanel.html/js/css`). Current hole as a vertical list of hops: number, title, similarity bar and value. Highlight hops below `HOLE_ALERT_SIMILARITY` (add `<script src="../shared/config.js">` for `RH_CONFIG`). Buttons: **Back to start** (`chrome.tabs.update({ url })`) and **Open dashboard** (`chrome.tabs.create`). Empty state when no hole.

**Should**
4. One visual system across all three: one accent colour, system font, works in dark mode (`prefers-color-scheme`).
5. Click a thread node to list its pages with links.

**Could**
6. Dashed edges between visits along the current hole's path on the map.

## Rules for you
- Pages never add `chrome.runtime.onMessage` listeners (only `toast.js` listens, for `HOLE_ALERT`).
- No CDN, no frameworks, no build step.

## Testing the toast without Bart's code
In the service worker console, with a Wikipedia tab active:
```js
chrome.tabs.query({ active: true, lastFocusedWindow: true }, ([t]) => chrome.tabs.sendMessage(t.id, { type: "HOLE_ALERT", payload: {
  startVisitId: "a", depth: 6, alerted: true, updatedAt: Date.now(),
  hops: [{ visitId: "a", title: "useEffect – React", url: "https://react.dev/reference/react/useEffect", similarity: 1 },
         { visitId: "b", title: "Mark Zuckerberg", url: "https://en.wikipedia.org/wiki/Mark_Zuckerberg", similarity: 0.31 }] } }))
```

## Done when (Bart checks at 17:55)
With seed loaded, the dashboard, side panel and toast all render real data, and the dashboard updates live when a new visit lands.
