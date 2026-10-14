# Copilot instructions for Rabbit Hole

Before writing any code, read `AGENTS.md` at the repo root (team agreement) and your person's contract in `team/<Name>/CONTRACT.md`. They're binding.

Short version:
- Edit only files your person owns (ownership table in `AGENTS.md`). Never touch anyone else's files.
- Plain JavaScript, HTML and CSS. No npm, no build step, no frameworks, no CDN scripts. `extension/` loads unpacked in Chrome as-is.
- Storage keys, message names, data shapes and exports in `AGENTS.md` are frozen.
- Components talk through `chrome.storage.local`. Extension pages never add `chrome.runtime.onMessage` listeners.
- Never write an API key into any file.
- Commit only your own files to your own branch, and push often. Final push is 17:55 BST.
