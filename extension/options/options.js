const apiKey = document.getElementById("api-key");
const demoMode = document.getElementById("demo-mode");
const paused = document.getElementById("paused");

async function loadSettings() {
	const { settings = {} } = await chrome.storage.local.get("settings");
	apiKey.value = settings.apiKey || "";
	demoMode.checked = Boolean(settings.demoMode);
	paused.checked = Boolean(settings.paused);
}

document.getElementById("settings-form").addEventListener("submit", async (event) => {
	event.preventDefault();
	const current = (await chrome.storage.local.get("settings")).settings || {};
	await chrome.storage.local.set({ settings: { ...current, apiKey: apiKey.value, demoMode: demoMode.checked, paused: paused.checked } });
	document.getElementById("settings-status").textContent = "Saved";
});

document.querySelectorAll(".action").forEach((button) => {
	button.addEventListener("click", async () => {
		const type = button.dataset.message;
		const status = document.getElementById(`status-${type}`);
		status.textContent = "Working...";
		button.disabled = true;
		try {
			const reply = await chrome.runtime.sendMessage({ type });
			status.textContent = reply?.ok ? "ok: true" : `Error: ${reply?.error || "unknown error"}`;
		} catch (error) {
			status.textContent = `Error: ${error.message}`;
		} finally {
			button.disabled = false;
		}
	});
});

document.getElementById("open-dashboard").addEventListener("click", () => {
	chrome.tabs.create({ url: chrome.runtime.getURL("dashboard/dashboard.html") });
});

loadSettings();
console.log("[RH:P1] options loaded");
