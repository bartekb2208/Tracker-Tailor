// Owner: Bart (P4). Writes seed.json into storage. Keeps `settings` untouched.
export async function loadSeed() {
  const res = await fetch(chrome.runtime.getURL("seed/seed.json"));
  const seed = await res.json();
  await chrome.storage.local.set({
    visits: seed.visits ?? [],
    analyses: seed.analyses ?? {},
    threads: seed.threads ?? [],
    hole: seed.hole ?? null,
    insights: seed.insights ?? null,
    tabState: {}
  });
  console.log("[RH:P4] seed loaded", (seed.visits ?? []).length, "visits");
  return { visits: (seed.visits ?? []).length };
}
