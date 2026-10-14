// Owner: Luke (P1). Loaded by content scripts and imported by the worker.
// Values are starting points; Bart tunes them at assembly.
globalThis.RH_CONFIG = {
  MIN_ACTIVE_SECS: 30,          // active reading before a page counts
  MIN_SCROLL_DEPTH: 0.4,        // share of the page scrolled
  IDLE_AFTER_SECS: 15,          // no input this long = not reading
  EXCERPT_CHARS: 1500,          // all the model ever sees of a page
  CHAIN_GAP_MINS: 10,           // longer gap breaks the chain
  THREAD_JOIN_SIMILARITY: 0.45, // join the closest thread above this
  HOLE_ALERT_DEPTH: 6,          // hops before an alert can fire
  HOLE_ALERT_SIMILARITY: 0.35,  // and similarity to start below this
  EMBED_DIMENSIONS: 256,
  BLOCKLIST: ["mail.google.com", "outlook.live.com", "web.whatsapp.com",
              "google.com", "bing.com", "duckduckgo.com", "localhost"]
};

// Demo mode (toggle on the Options page) swaps in faster values
globalThis.RH_DEMO = {
  MIN_ACTIVE_SECS: 10,
  MIN_SCROLL_DEPTH: 0.2,
  HOLE_ALERT_DEPTH: 3,
  HOLE_ALERT_SIMILARITY: 0.5
};
