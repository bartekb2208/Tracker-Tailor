// Owner: Luke (P1). Classic content script; no imports or exports.
(async () => {
  let timer, invalidated = false;
  const log = (...args) => console.log("[RH:P1]", ...args);
  async function send(message) {
    if (invalidated) return null;
    try {
      const reply = await chrome.runtime.sendMessage(message);
      if (!reply?.ok) log("worker reply", reply?.error || "No reply");
      return reply;
    } catch (error) {
      if (String(error?.message || error).includes("Extension context invalidated")) {
        invalidated = true;
        clearInterval(timer);
        log("extension reloaded; refresh this tab to resume capture");
      } else {
        log("message failed", String(error?.message || error));
      }
      return null;
    }
  }
  try {
    let { settings = {} } = await chrome.storage.local.get("settings");
    let CFG = { ...RH_CONFIG, ...(settings.demoMode ? RH_DEMO : {}) };
    if (CFG.BLOCKLIST.some((d) => location.hostname === d || location.hostname.endsWith("." + d))) return;

    // Readability mutates its input, so parse a copy.
    const article = new Readability(document.cloneNode(true)).parse();
    if (!article || article.textContent.trim().length < 500) return;
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== "local" || !changes.settings) return;
      settings = changes.settings.newValue || {};
      CFG = { ...RH_CONFIG, ...(settings.demoMode ? RH_DEMO : {}) };
    });
    const startedAt = Date.now();
    const id = `v_${startedAt}_${Math.random().toString(16).slice(2, 6)}`;
    let active = 0, maxDepth = 0, lastInput = Date.now(), sent = false, sending = false, stored = false;
    for (const event of ["scroll", "mousemove", "keydown", "pointerdown", "touchstart"])
      addEventListener(event, () => (lastInput = Date.now()), { passive: true });

    timer = setInterval(async () => {
      if (settings.paused || invalidated) return;
      const idle = (Date.now() - lastInput) / 1000 > CFG.IDLE_AFTER_SECS;
      if (document.visibilityState === "visible" && !idle) {
        active++;
        const height = Math.max(1, document.documentElement.scrollHeight);
        maxDepth = Math.max(maxDepth, Math.min(1, (scrollY + innerHeight) / height));
      }
      if (!sent && !sending && active >= CFG.MIN_ACTIVE_SECS && maxDepth >= CFG.MIN_SCROLL_DEPTH) {
        sending = true;
        log("read rule passed", article.title);
        const reply = await send({ type: "VISIT_CAPTURED", payload: {
          id, url: location.href, domain: location.hostname,
          title: article.title || document.title,
          excerpt: article.textContent.trim().replace(/\s+/g, " ").slice(0, CFG.EXCERPT_CHARS),
          startedAt, activeSecs: active,
          scrollDepth: Math.round(maxDepth * 100) / 100,
          fromUrl: document.referrer || null
        }});
        sent = Boolean(reply?.ok);
        stored = sent && !reply.ignored;
        sending = false;
      }
    }, 1000);
    addEventListener("pagehide", () => {
      if (stored && !settings.paused) void send({ type: "VISIT_UPDATED",
        payload: { id, activeSecs: active, scrollDepth: maxDepth } });
    });
  } catch (error) {
    log("capture unavailable", String(error?.message || error));
  }
})();
