# Contract: Bart, P2 Intelligence, seed data & assembly

Work on `main`. You're the only one who pushes to it. `AGENTS.md` wins any disagreement. Your machine is the only one with the Anthropic API key.

## You own
`extension/background/ai.js`, `extension/background/analysis.js`, any new `extension/background/*.js` except `worker.js`, `extension/seed/`, `AGENTS.md`, `team/`, `.github/`. At assembly you also set the two similarity thresholds in `extension/shared/config.js`.

## You receive
- `onVisit(visit)` calls from Luke's worker after each visit is stored (`visit.tabId`, `visit.prevVisitId` are set).
- `REINDEX` → `reindexAll()` and `GENERATE_INSIGHTS` → `generateInsights()` from the worker.
- `settings.apiKey` and `settings.demoMode` from storage. Config is `{ ...RH_CONFIG, ...(settings.demoMode ? RH_DEMO : {}) }` (globals imported by the worker).

## You deliver

**Must**
1. **Seed data** (`extension/seed/seed.json`), pushed with the skeleton: ~25 visits over 9–13 Oct 2026 in three threads (React effects, Espresso, Roman history), every storage key filled, `embedding: []` and `centroid: []`, one finished hole with `alerted: true`.
2. **Mock mode** in `ai.js`. With no `apiKey`, no network calls:
   - `analyzePage`: topics from title words; `sourceType` from the domain; a summary from the title.
   - `embed`: 256-number hashed bag-of-words vector, so similar text gives similar vectors.
   - Insights: template text from thread labels.
3. **`onVisit(visit)`**, serialized with a promise queue:
   - Analyse and embed `title + excerpt` into `analyses[visit.id]`.
   - **Thread rule:** join the most similar centroid if `>= THREAD_JOIN_SIMILARITY`, else create a thread with a 2–4 word label. Update `visitIds`, `minutes`, `sourceMix`, `centroid` (running mean), `lastSeen`.
   - **Hole rule:** extend the hole when `visit.prevVisitId` is its last hop, else start a new one. Similarity is cosine with hop 0.
   - **Alert:** send `HOLE_ALERT` to `visit.tabId` once, when `depth >= HOLE_ALERT_DEPTH` and the newest similarity `< HOLE_ALERT_SIMILARITY`.
4. **`reindexAll()`**: embed every visit that's missing one (five at a time), rebuild threads in time order, and rebuild the hole from the newest chain with `alerted: true`.
5. **`generateInsights()`**: one strict-schema call returning recap, gaps, a 3-question quiz and next reads. Use search queries, never URLs.

**Assembly**
6. **17:40:** test-merge `luke-capture`, `marc-interface` and `rob-demo` locally. Don't push. Tell the owners about any breakage.
7. **17:55:** assemble (steps in `AGENTS.md`), paste the key, tune the thresholds on Rob's demo chain.
8. **18:20:** in Options, Clear data, then Load demo data, then Rebuild with AI.
