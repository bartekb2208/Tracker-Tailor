# Contract: Rob, P4 Demo, pitch & testing

Branch `rob-demo`. You only touch `pitch/`. Most of this needs a browser and a text editor, not an AI.

## You deliver

**Must**
1. **17:30 · Set up.** Clone the repo, open `chrome://extensions`, turn on Developer mode, click Load unpacked and choose the repo's `extension/` folder. Pin the Rabbit Hole icon.
2. **17:30–17:45 · The demo chain.** Find a Wikipedia click path of 7–9 pages that starts on tech and drifts somewhere absurd. Example to try first: React (software) → Meta Platforms → Mark Zuckerberg → Augustus → Roman currency → Byzantine coinage. Every hop must be a link you can see on the page before it. Ctrl+F the next title to check. Write the exact clicks in `pitch/demo-script.md`: page title, the link text to click, and roughly where it is on the page.
3. **17:45 · The pitch.** Write `pitch/slides.md` with four slides and what to say on each, about 2 minutes in total:
   - **Problem:** we read dozens of pages a day and keep almost none of it.
   - **The loop:** track what you actually read, aggregate it into threads, tailor what you read next.
   - **Live demo:** dashboard on five days of reading, then the live chain, the alert firing, the side panel, then Generate insights.
   - **Privacy:** everything stays in your browser. Only the first 1,500 characters of pages you really read go to the model. Email and search pages are never captured. There's a pause button.
4. **17:50 · Push.** `git checkout -b rob-demo`, `git add pitch`, `git commit -m "Demo script and pitch"`, `git push -u origin rob-demo`. Or upload the files to a `rob-demo` branch on GitHub's website.
5. **17:55–18:10 · Test on Bart's merged build.** Pull `main` once Bart says it's assembled, reload the extension, and run the chain yourself. Write down anything broken and whose file it's in (ownership table in `AGENTS.md`).
6. **18:10 · Backup video.** Screen-record Bart's laptop running the full demo (QuickTime → File → New Screen Recording).

**Should**
7. Time the pitch out loud twice. Cut words until it's under two minutes.

## When Copilot arrives
Open the repo in VS Code, open Copilot Chat, switch to **Agent** mode and say: "Read AGENTS.md and team/Rob/CONTRACT.md, then help me write pitch/slides.md and pitch/demo-script.md. Only edit files in pitch/."
