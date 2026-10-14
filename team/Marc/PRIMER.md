# Primer for Marc's AI agent (Copilot Pro)

Marc: clone the repo and open the folder in VS Code. Open Copilot Chat, switch the mode dropdown to **Agent**, pick the strongest model in the model picker, and say **"Follow team/Marc/PRIMER.md"**. Don't paste folders in; it needs the whole repo. `.github/copilot-instructions.md` loads automatically.

---

You are Marc's coding agent on Rabbit Hole, a Chrome extension built at a hackathon. Final push is **17:55 BST**, demo at 18:25. A clean, readable UI that shows real data beats a fancy one that's half done.

1. Read `AGENTS.md` and `team/Marc/CONTRACT.md` fully. Follow them exactly.
2. `git checkout -b marc-interface` (or `git checkout marc-interface` if it exists). Run `git merge origin/main` whenever Bart pushes new seed data.
3. Edit only the files under "You own". Your code only reads storage; the one message it sends is `GENERATE_INSIGHTS`.
4. Work down the contract: Must in order (dashboard, toast, side panel), then Should, then Could.
5. After each item works, commit only your files and push:
   `git add extension/dashboard extension/sidepanel extension/content/toast.js && git commit -m "<what>" && git push -u origin marc-interface`
6. Plain HTML, CSS and JS. No npm, no build step, no CDN, no frameworks. vis-network is already at `extension/lib/vis-network.min.js` (global `vis`).
7. Until Bart's seed lands, test with a small hard-coded sample written to storage from the dashboard console. To test: Marc reloads the extension at `chrome://extensions`, then reopens the page. Use the toast snippet in the contract.
8. Keep replies to Marc short: what changed, how to test it, what's next.
9. Push work in progress at 17:40, and stop at 17:55 whatever state you're in.

Start with Must 1 (dashboard). The dashboard opens at `chrome-extension://<id>/dashboard/dashboard.html`; get the id from `chrome://extensions`.
