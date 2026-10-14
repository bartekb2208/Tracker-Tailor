// Owner: Luke (P1). Runs in every tab. Classic script: no import/export.
// Starting implementation; verify and harden it (see team/Luke/CONTRACT.md).
(async () => {
  const { settings = {} } = await chrome.storage.local.get("settings");
  if (settings.paused) return;
  const CFG = { ...RH_CONFIG, ...(settings.demoMode ? RH_DEMO : {}) };
  if (CFG.BLOCKLIST.some((d) => location.hostname === d || location.hostname.endsWith("." + d))) return;

  // Readability edits what it parses, so give it a copy
  const article = new Readability(document.cloneNode(true)).parse();
  if (!article || article.textContent.trim().length < 500) return;

  const startedAt = Date.now();
  const id = `v_${startedAt}_${Math.random().toString(16).slice(2, 6)}`;
  let active = 0, maxDepth = 0, lastInput = Date.now(), sent = false;
  for (const e of ["scroll", "mousemove", "keydown"])
    addEventListener(e, () => (lastInput = Date.now()), { passive: true });

  setInterval(() => {
    const idle = (Date.now() - lastInput) / 1000 > CFG.IDLE_AFTER_SECS;
    if (document.visibilityState === "visible" && !idle) active++;
    const h = document.documentElement.scrollHeight;
    maxDepth = Math.max(maxDepth, Math.min(1, (scrollY + innerHeight) / h));
    if (!sent && active >= CFG.MIN_ACTIVE_SECS && maxDepth >= CFG.MIN_SCROLL_DEPTH) {
      sent = true;
      console.log("[RH:P1] read rule passed", article.title);
      chrome.runtime.sendMessage({ type: "VISIT_CAPTURED", payload: {
        id, url: location.href, domain: location.hostname,
        title: article.title || document.title,
        excerpt: article.textContent.trim().replace(/\s+/g, " ").slice(0, CFG.EXCERPT_CHARS),
        startedAt, activeSecs: active,
        scrollDepth: Math.round(maxDepth * 100) / 100,
        fromUrl: document.referrer || null
      }});
    }
  }, 1000);

  addEventListener("pagehide", () => {
    if (sent) chrome.runtime.sendMessage({ type: "VISIT_UPDATED",
      payload: { id, activeSecs: active, scrollDepth: maxDepth } });
  });
})();
