// Vigilant v3.2 Chrome Download Interceptor (Connected to 100.71.40.11:8090)
const DEFAULT_GATE_URL = "http://100.71.40.11:8090";
const MODEL_EXT_RE = /\.(pt|pth|bin|pkl|pickle|ckpt|keras|h5|hdf5|onnx|gguf|safetensors|pb|npz|zip)(\?.*)?$/i;

chrome.downloads.onCreated.addListener((item) => {
  const url = item.finalUrl || item.url || "";
  if (!url.includes("huggingface.co")) return;
  if (!MODEL_EXT_RE.test(url.split("?")[0])) return;
  if (url.includes("vigilant_verified=1") || url.includes(":8090")) return;

  // Immediately cancel the raw unverified download and redirect to Vigilant Gate Inspector
  chrome.downloads.cancel(item.id, () => {
    if (chrome.downloads.removeFile) {
      try { chrome.downloads.removeFile(item.id, () => {}); } catch (e) {}
    }
    chrome.storage.local.get(["gateUrl"], (res) => {
      const gateBase = res.gateUrl || DEFAULT_GATE_URL;
      const scanUrl = `${gateBase}/scan?target=${encodeURIComponent(url)}`;
      chrome.storage.local.set({
        lastIntercepted: {
          url,
          filename: item.filename || url.split("/").pop().split("?")[0],
          timestamp: new Date().toISOString(),
          scanUrl
        }
      });
      chrome.tabs.create({ url: scanUrl });
    });
  });
});
