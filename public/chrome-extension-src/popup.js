document.addEventListener("DOMContentLoaded", () => {
  const input = document.getElementById("gateUrl");
  const lastInfo = document.getElementById("lastInfo");
  chrome.storage.local.get(["gateUrl", "lastIntercepted"], (res) => {
    if (res.gateUrl) input.value = res.gateUrl;
    if (res.lastIntercepted) {
      lastInfo.innerHTML = `<strong>${res.lastIntercepted.filename}</strong><br/><a href="${res.lastIntercepted.scanUrl}" target="_blank" style="color:#818cf8;">Open Forensic Report →</a>`;
    }
  });
  document.getElementById("saveBtn").addEventListener("click", () => {
    chrome.storage.local.set({ gateUrl: input.value.trim() });
    document.getElementById("saveBtn").textContent = "✓ Saved!";
    setTimeout(() => (document.getElementById("saveBtn").textContent = "Save Gate Endpoint"), 1200);
  });
});
