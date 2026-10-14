// Owner: Marc (P3). Runs in every tab. Classic script: no import/export.
// Renders HOLE_ALERT inside a Shadow DOM so the site's CSS can't touch it.
chrome.runtime.onMessage.addListener((msg) => {
  if (msg?.type !== "HOLE_ALERT") return;
  console.log("[RH:P3] HOLE_ALERT", msg.payload);
  // TODO(Marc): show the toast with "Back to start" (hops[0].url) and "Keep going"
});
