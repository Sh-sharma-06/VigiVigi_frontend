// Injects "Scan with Vigilant" badges on Hugging Face file trees
const GATE_BASE = "http://100.71.40.11:8090";

function injectVigilantBadges() {
  const links = document.querySelectorAll('a[href*="/resolve/"], a[href*="/blob/"]');
  links.forEach((a) => {
    if (a.dataset.vigilantBound) return;
    const href = a.href || "";
    if (!/\.(pt|pth|bin|pkl|pickle|ckpt|keras|h5|hdf5|onnx|gguf|safetensors|pb|npz|py|json|jinja)(\?.*)?$/i.test(href)) return;
    a.dataset.vigilantBound = "1";

    const badge = document.createElement("a");
    badge.href = `${GATE_BASE}/scan?target=${encodeURIComponent(href)}`;
    badge.target = "_blank";
    badge.textContent = "🛡️ Vigilant Scan";
    badge.style.cssText = "margin-left:8px;padding:2px 7px;border-radius:6px;font-size:11px;font-weight:600;background:#1e1b4b;color:#a5b4fc;border:1px solid #4338ca;text-decoration:none;display:inline-flex;align-items:center;gap:4px;";
    if (a.parentElement) {
      a.parentElement.appendChild(badge);
    }
  });
}

injectVigilantBadges();
new MutationObserver(injectVigilantBadges).observe(document.body, { childList: true, subtree: true });
