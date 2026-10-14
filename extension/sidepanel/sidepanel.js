// Owner: Marc (P3). Reads `hole` from storage and re-renders on chrome.storage.onChanged.
let currentHole = null;
const threshold = Number(globalThis.RH_CONFIG?.HOLE_ALERT_SIMILARITY ?? 0.35);
function get(id) { return document.getElementById(id); }
async function loadHole() { const result = await chrome.storage.local.get("hole"); currentHole = result.hole || null; render(); }
function render() {
	const hole = currentHole; get("hole-view").hidden = !hole?.hops?.length; get("empty-state").hidden = Boolean(hole?.hops?.length); if (!hole?.hops?.length) return;
	get("hole-depth").textContent = `${hole.depth || hole.hops.length} hops`; get("hole-alert").textContent = hole.hops.some(hop => Number(hop.similarity) < threshold) ? "Drifting" : "On track";
	const list = get("hop-list"); list.replaceChildren(); hole.hops.forEach((hop, index) => { const item = document.createElement("li"); const similarity = Math.max(0, Math.min(1, Number(hop.similarity) || 0)); item.className = `hop${similarity < threshold ? " drift" : ""}`; item.innerHTML = `<span class="hop-number">${index + 1}</span><span class="hop-title"></span><div class="hop-meta"><div class="bar"><span></span></div><span class="similarity"></span></div>`; item.querySelector(".hop-title").textContent = hop.title || "Untitled page"; item.querySelector(".bar span").style.width = `${similarity * 100}%`; item.querySelector(".similarity").textContent = `${Math.round(similarity * 100)}%`; list.append(item); });
}
get("back-to-start").addEventListener("click", async () => { const [tab] = await chrome.tabs.query({ active: true, currentWindow: true }); const url = currentHole?.hops?.[0]?.url; if (tab?.id && url) chrome.tabs.update(tab.id, { url }); });
get("open-dashboard").addEventListener("click", () => chrome.tabs.create({ url: chrome.runtime.getURL("dashboard/dashboard.html") }));
chrome.storage.onChanged.addListener(loadHole); loadHole(); console.log("[RH:P3] side panel loaded");
