// Owner: Luke (P1). Settings stay in chrome.storage, never in source files.
const el = (id) => document.getElementById(id);
function status(id, text, error = false) {
  el(id).textContent = text;
  el(id).dataset.error = String(error);
}
async function loadSettings() {
  try {
    const { settings = {} } = await chrome.storage.local.get("settings");
    el("api-key").value = settings.apiKey || "";
    el("demo-mode").checked = Boolean(settings.demoMode);
    el("paused").checked = Boolean(settings.paused);
  } catch (error) {
    status("save-status", String(error.message || error), true);
  }
}
el("settings-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  el("save").disabled = true;
  status("save-status", "Saving...");
  try {
    const { settings = {} } = await chrome.storage.local.get("settings");
    await chrome.storage.local.set({ settings: {
      ...settings,
      apiKey: el("api-key").value.trim(),
      demoMode: el("demo-mode").checked,
      paused: el("paused").checked
    }});
    status("save-status", "Saved.");
  } catch (error) {
    status("save-status", String(error.message || error), true);
  } finally {
    el("save").disabled = false;
  }
});
for (const [id, type] of [["load-seed", "LOAD_SEED"], ["reindex", "REINDEX"], ["clear-data", "CLEAR_DATA"]]) {
  el(id).addEventListener("click", async () => {
    el(id).disabled = true;
    status(`${id}-status`, "Working...");
    try {
      const reply = await chrome.runtime.sendMessage({ type });
      if (!reply) throw new Error("No reply from the service worker.");
      status(`${id}-status`, JSON.stringify(reply), !reply.ok);
    } catch (error) {
      status(`${id}-status`, String(error.message || error), true);
    } finally {
      el(id).disabled = false;
    }
  });
}
el("open-dashboard").addEventListener("click", async () => {
  try {
    await chrome.tabs.create({ url: chrome.runtime.getURL("dashboard/dashboard.html") });
    status("open-dashboard-status", JSON.stringify({ ok: true }));
  } catch (error) {
    status("open-dashboard-status", String(error.message || error), true);
  }
});
void loadSettings();
console.log("[RH:P1] options loaded");
