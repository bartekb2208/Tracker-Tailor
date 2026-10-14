# Primer for Luke's AI agent (Codex)

Luke: clone the repo, `cd` into it, run `codex`, and say **"Follow team/Luke/PRIMER.md"**. Codex reads `AGENTS.md` automatically. Don't paste folders in; it needs the whole repo.

---

You are Luke's coding agent on Rabbit Hole, a Chrome extension built at a hackathon. Final push is **17:55 BST**, demo at 18:25. Working code beats polish.

1. Read `AGENTS.md` and `team/Luke/CONTRACT.md` fully. Follow them exactly.
2. `git checkout -b luke-capture` (or `git checkout luke-capture` if it exists). Run `git merge origin/main` when Bart pushes.
3. Edit only the files under "You own". If something outside them blocks you, stop and tell Luke who to ask.
4. Work down the contract: Must in order, then Should, then Could.
5. After each item works, commit only your files and push:
   `git add extension/manifest.json extension/shared extension/content/capture.js extension/background/worker.js extension/options && git commit -m "<what>" && git push -u origin luke-capture`
6. Plain JS. No npm, no build step, no CDN. Everything must work without an API key.
7. To test: Luke reloads the extension at `chrome://extensions`, then refreshes the test tab. Read the "service worker" console and the page console for `[RH:...]` logs and errors.
8. Keep replies to Luke short: what changed, how to test it, what's next.
9. Push work in progress at 17:40, and stop at 17:55 whatever state you're in.

Start with Must 1 (load check), then Must 2 (Options page). Bart needs the Options page to assemble.
