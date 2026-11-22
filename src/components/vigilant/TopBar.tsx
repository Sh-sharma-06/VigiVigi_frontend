"use client";

import { useEffect, useState } from "react";
import {
  BadgeCheck,
  Check,
  Copy,
  Download,
  Eye,
  EyeOff,
  FileJson2,
  HardDrive,
  KeyRound,
  Trash2,
  Loader2,
  Puzzle,
  ShieldAlert,
  ShieldCheck,
  Webhook,
  X,
} from "lucide-react";
import * as SelectPrimitive from "@radix-ui/react-select";
import {
  Select,
  SelectContent,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useVigilant } from "@/lib/vigilant/store";
import type { PolicyMode } from "@/lib/vigilant/types";

const POLICY_ITEMS: { value: PolicyMode; label: string; hint: string }[] = [
  { value: "audit", label: "Audit", hint: "Log findings only — nothing is blocked" },
  { value: "warn", label: "Warn", hint: "Block malicious, flag the rest for review" },
  { value: "enforce", label: "Enforce", hint: "Hard-block everything risky" },
];

export function TopBar() {
  const policy = useVigilant((s) => s.policy);
  const setPolicy = useVigilant((s) => s.setPolicy);
  const extOpen = useVigilant((s) => s.extensionOpen);
  const setExtOpen = useVigilant((s) => s.setExtensionOpen);
  const apiOpen = useVigilant((s) => s.apiKeyOpen);
  const setApiOpen = useVigilant((s) => s.setApiKeyOpen);
  const toast = useVigilant((s) => s.toast);
  const [disk, setDisk] = useState<{ freeGB: number; totalGB?: number; usedGB?: number; usedPct: number; tmpFreeGB?: number; quarantineMB: number } | null>(null);
  const [purging, setPurging] = useState(false);

  useEffect(() => {
    const loadDisk = () =>
      fetch("/api/v1/workstation/system").then((r) => r.json()).then((d) => d?.ok && setDisk(d)).catch(() => null);
    void loadDisk();
    const iv = setInterval(loadDisk, 15000);
    return () => clearInterval(iv);
  }, []);

  const purgeQuarantine = async () => {
    setPurging(true);
    try {
      const r = await fetch("/api/v1/workstation/system", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "purge_quarantine" }),
      });
      const d = await r.json();
      if (d?.ok) setDisk(d);
      toast({ title: "Quarantine cache purged", detail: `${d?.freeGB ?? "?"} GB free on root volume`, kind: "ok" });
    } finally {
      setPurging(false);
    }
  };

  return (
    <>
    <header className="sticky top-0 z-40 border-b border-white/[0.08] glass-deep backdrop-blur-2xl backdrop-saturate-150 shadow-[inset_0_1px_0_rgba(255,255,255,0.07),0_10px_30px_-20px_rgba(0,0,0,0.9)]">
      <div className="mx-auto flex h-14 w-full max-w-[1400px] items-center gap-2.5 px-4 lg:px-6">
        <div className="btn-liquid grid h-7 w-7 shrink-0 place-items-center rounded-lg">
          <ShieldCheck size={15} strokeWidth={2.2} />
        </div>
        <span className="font-display text-[15px] font-semibold tracking-tight text-[#eef0f3]">
          Vigilant
        </span>
        <span className="hidden text-sm text-[#eef0f3]/45 sm:inline">
          · AI Model Security
        </span>

        <div className="ml-auto flex items-center gap-2">
          {/* Disk & Quarantine Auto-Guard */}
          {disk && (
            <button
              onClick={purgeQuarantine}
              disabled={purging}
              title={`Live Server Storage: ${disk.freeGB} GB free of ${disk.totalGB ?? "?"} GB (${disk.usedPct}% used) · /tmp: ${disk.tmpFreeGB ?? "?"} GB free · Quarantine: ${disk.quarantineMB} MB — Click to purge`}
              className={`btn-glass inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium ${
                disk.usedPct >= 90 ? "border-amber-300/35 text-amber-200" : "text-[#eef0f3]/75"
              }`}
            >
              <HardDrive size={13} className={disk.usedPct >= 90 ? "text-amber-300" : "text-[#9ba0f5]"} />
              <span className="hidden md:inline">{disk.freeGB} GB free · {disk.usedPct}%</span>
              <Trash2 size={11.5} className="opacity-70" />
            </button>
          )}

          {/* Browser extension */}
          <button
            onClick={() => setExtOpen(true)}
            className="btn-glass inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium text-[#eef0f3]/85"
            aria-haspopup="dialog"
            aria-label="Get the browser extension"
          >
            <Puzzle size={13.5} className="text-[#9ba0f5]" />
            <span className="hidden sm:inline">Extension</span>
          </button>

          {/* Company API key */}
          <button
            onClick={() => setApiOpen(true)}
            className="btn-glass inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium text-[#eef0f3]/85"
            aria-haspopup="dialog"
            aria-label="Set up the company API key"
          >
            <KeyRound size={13.5} className="text-[#9ba0f5]" />
            <span className="hidden sm:inline">Company API</span>
          </button>

          <div className="mx-1 hidden h-5 w-px bg-white/[0.1] md:block" aria-hidden />

          <span className="hidden text-xs text-[#eef0f3]/45 md:inline">Policy</span>
          <Select value={policy} onValueChange={(v) => setPolicy(v as PolicyMode)}>
            <SelectTrigger
              size="sm"
              className="btn-glass h-8 w-[112px] rounded-lg text-xs font-medium text-[#eef0f3] data-[placeholder]:text-[#eef0f3]/60 [&_svg]:text-[#eef0f3]/50"
              aria-label="Security policy mode"
            >
              <SelectValue />
            </SelectTrigger>
            {/* Liquid-glass dropdown menu */}
            <SelectContent
              align="end"
              className="menu-liquid rounded-xl border-white/[0.14] p-1.5"
              sideOffset={8}
            >
              {POLICY_ITEMS.map((p) => (
                <SelectPrimitive.Item
                  key={p.value}
                  value={p.value}
                  className="relative flex w-full cursor-default select-none items-start gap-2 rounded-lg px-2.5 py-2 text-[13px] text-[#eef0f3]/85 outline-none transition-colors duration-150 focus:bg-white/[0.12] focus:text-[#eef0f3] data-[state=checked]:text-[#eef0f3] [&_svg]:pointer-events-none [&_svg]:shrink-0"
                >
                  <SelectPrimitive.ItemText className="font-semibold leading-5">
                    {p.label}
                  </SelectPrimitive.ItemText>
                  <SelectPrimitive.ItemIndicator className="mt-0.5 text-[#9ba0f5]">
                    <ShieldCheck size={13} />
                  </SelectPrimitive.ItemIndicator>
                  {/* hint lives outside ItemText → never leaks into the trigger */}
                  <span className="block w-full pt-0.5 text-[11px] font-normal leading-4 text-[#eef0f3]/45">
                    {p.hint}
                  </span>
                </SelectPrimitive.Item>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </header>

    {/* portals live outside <header> — its backdrop-blur would otherwise
        become the containing block for position:fixed overlays */}
    <ExtensionModal open={extOpen} onClose={() => setExtOpen(false)} />
    <ApiKeyModal open={apiOpen} onClose={() => setApiOpen(false)} />
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Shared liquid-glass modal shell (same language as the intake modal) */
/* ------------------------------------------------------------------ */

function GlassModal({
  open,
  onClose,
  label,
  children,
}: {
  open: boolean;
  onClose: () => void;
  label: string;
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[100] grid place-items-center bg-black/45 backdrop-blur-md p-4"
      onMouseDown={onClose}
    >
      <div
        className="glass-deep animate-pop w-[min(560px,94vw)] overflow-hidden rounded-3xl text-[#eef0f3]"
        onMouseDown={(e) => e.stopPropagation()}
        role="dialog"
        aria-label={label}
      >
        {children}
      </div>
    </div>
  );
}

function ModalHeader({
  icon,
  title,
  onClose,
}: {
  icon: React.ReactNode;
  title: string;
  onClose: () => void;
}) {
  return (
    <div className="flex items-center gap-2.5 border-b border-white/[0.08] bg-white/[0.03] px-5 py-4">
      <div className="btn-liquid grid h-7 w-7 place-items-center rounded-lg">{icon}</div>
      <span className="font-display text-[15px] font-semibold tracking-tight text-[#eef0f3]">
        {title}
      </span>
      <button
        className="ml-auto rounded-md p-1.5 text-[#eef0f3]/45 transition-colors duration-200 hover:bg-white/[0.08] hover:text-[#eef0f3]"
        onClick={onClose}
        aria-label="Close"
      >
        <X size={15} />
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Browser-extension modal                                             */
/* ------------------------------------------------------------------ */

const BROWSERS = ["Chrome", "Firefox", "Edge"] as const;
const EXT_FEATURES = [
  {
    icon: ShieldCheck,
    title: "One-click scan",
    detail: "A Scan button appears on every model page you visit.",
  },
  {
    icon: BadgeCheck,
    title: "Verdict badge",
    detail: "Safe or unsafe, right next to the download button.",
  },
  {
    icon: ShieldAlert,
    title: "Early warning",
    detail: "You hear about risky files before they reach your machine.",
  },
];

function ExtensionModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const toast = useVigilant((s) => s.toast);
  const [added, setAdded] = useState<string | null>(null);

  const add = (browser: string) => {
    setAdded(browser);
    // Trigger real download of the packaged Chrome Extension (.zip)
    const a = document.createElement("a");
    a.href = "/vigilant-chrome-extension.zip";
    a.download = "vigilant-chrome-extension.zip";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    try {
      void navigator.clipboard?.writeText("chrome://extensions");
    } catch {}
    toast({
      title: `Downloaded Vigilant ${browser} Extension`,
      detail: "Copied chrome://extensions to clipboard — drag the zip into Chrome Extensions (Dev mode ON)!",
      kind: "ok",
    });
  };

  return (
    <GlassModal open={open} onClose={onClose} label="Vigilant browser extension">
      <ModalHeader
        icon={<Puzzle size={15} strokeWidth={2.1} />}
        title="Vigilant Browser Extension"
        onClose={onClose}
      />
      <div className="p-5">
        <p className="text-[15px] font-semibold leading-6 text-[#eef0f3]">
          Scan models right where you find them.
        </p>
        <p className="mt-1.5 text-[13px] leading-6 text-[#eef0f3]/60">
          The extension adds Vigilant to your browser, so model pages on sites like
          Hugging Face show a verdict before you download anything.
        </p>

        <div className="mt-4 flex flex-col gap-2">
          {EXT_FEATURES.map((f) => (
            <div key={f.title} className="glass-soft flex items-start gap-3 rounded-xl px-3.5 py-3">
              <span className="btn-glass mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg">
                <f.icon size={14} className="text-[#9ba0f5]" />
              </span>
              <div className="min-w-0">
                <p className="text-[13px] font-semibold text-[#eef0f3]/90">{f.title}</p>
                <p className="mt-0.5 text-xs leading-5 text-[#eef0f3]/55">{f.detail}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-2.5">
          {BROWSERS.map((b) => (
            <button
              key={b}
              onClick={() => add(b)}
              className={
                added === b
                  ? "btn-glass inline-flex h-9 items-center gap-1.5 rounded-xl border-emerald-300/40 bg-emerald-400/15 px-4 text-[13px] font-semibold text-emerald-100"
                  : "btn-liquid inline-flex h-9 items-center gap-1.5 rounded-xl px-4 text-[13px] font-semibold"
              }
            >
              {added === b ? <Check size={14} /> : <Download size={14} />}
              {added === b ? `Added to ${b}` : `Add to ${b}`}
            </button>
          ))}
        </div>

        {added && (
          <div className="mt-4 rounded-xl border border-emerald-300/25 bg-emerald-400/10 p-3 text-xs leading-5 text-emerald-100">
            <p className="font-semibold">Quick 3-Step Chrome Activation (No Web Store Wait):</p>
            <ol className="mt-1 list-decimal space-y-0.5 pl-4 text-[11.5px] text-emerald-100/85">
              <li>Unzip <code>vigilant-chrome-extension.zip</code> (just downloaded).</li>
              <li>Paste <code>chrome://extensions</code> in your address bar (already copied!) &amp; enable <b>Developer mode</b>.</li>
              <li>Click <b>Load unpacked</b> and select the folder — pre-connected to <code>http://100.71.40.11:8090</code>!</li>
            </ol>
            <div className="mt-2">
              <a
                href="http://100.71.40.11:8090"
                target="_blank"
                rel="noreferrer"
                className="underline font-semibold text-emerald-200 hover:text-white"
              >
                Open Live Pre-Download Gate Daemon (:8090) ↗
              </a>
            </div>
          </div>
        )}
        <p className="mt-4 text-[11.5px] leading-5 text-[#eef0f3]/40">
          Connected live to Vigilant Pre-Download Gate (<code>100.71.40.11:8090</code>) · Free for personal &amp; org use.
        </p>
      </div>
    </GlassModal>
  );
}

/* ------------------------------------------------------------------ */
/* Company API key modal                                               */
/* ------------------------------------------------------------------ */

function newKey() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `vgl_live_${hex}`;
}

const CURL_SNIPPET = `curl -s https://api.vigilant.dev/v1/scan \\
  -H "Authorization: Bearer vgl_live_…" \\
  -F "model=@weights.pkl"

# → { "verdict": "NEEDS_REVIEW", "confidence": "HIGH", … }`;

function ApiKeyModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const toast = useVigilant((s) => s.toast);
  const [key, setKey] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [creating, setCreating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showCurl, setShowCurl] = useState(false);

  const create = async () => {
    setCreating(true);
    await new Promise((r) => setTimeout(r, 600));
    const generated = newKey();
    setKey(generated);
    fetch("/api/v1/enterprise/scan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "register_key", key: generated }),
    }).catch(() => null);
    setRevealed(false);
    setShowCurl(false);
    setCreating(false);
    toast({ title: "Company API key created", detail: "Copy it now — it stays in this browser only.", kind: "ok" });
  };

  const copyKey = () => {
    if (!key) return;
    void navigator.clipboard?.writeText(key).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  const revoke = () => {
    setKey(null);
    setShowCurl(false);
    toast({ title: "API key revoked", detail: "CI jobs using it will get a 401 immediately.", kind: "info" });
  };

  const masked = key ? `${key.slice(0, 13)}${"•".repeat(18)}${key.slice(-4)}` : "";

  return (
    <GlassModal open={open} onClose={onClose} label="Company API access">
      <ModalHeader
        icon={<KeyRound size={15} strokeWidth={2.1} />}
        title="Company API Access"
        onClose={onClose}
      />
      <div className="p-5">
        <p className="text-[15px] font-semibold leading-6 text-[#eef0f3]">
          Plug Vigilant into your build pipeline.
        </p>
        <p className="mt-1.5 text-[13px] leading-6 text-[#eef0f3]/60">
          Made for companies: create a key, call the scan API from CI or internal
          tools, and get the same plain-English verdict back as JSON.
        </p>

        {!key ? (
          <div className="mt-4">
            <div className="glass-soft flex flex-col gap-2.5 rounded-2xl p-4">
              {[
                { icon: FileJson2, text: "JSON verdicts for every scan — blocked, review, or safe" },
                { icon: Webhook, text: "Webhook callbacks when a scan finishes" },
                { icon: BadgeCheck, text: "Shared allowlist for your whole org · 600 scans/min" },
              ].map((r) => (
                <p key={r.text} className="flex items-start gap-2.5 text-[13px] leading-5 text-[#eef0f3]/80">
                  <r.icon size={14.5} className="mt-0.5 shrink-0 text-[#9ba0f5]" />
                  {r.text}
                </p>
              ))}
            </div>
            <button
              onClick={create}
              disabled={creating}
              className="btn-liquid mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold disabled:opacity-60"
            >
              {creating ? <Loader2 size={15} className="animate-spin" /> : <KeyRound size={15} />}
              {creating ? "Creating key…" : "Generate API key"}
            </button>
            <p className="mt-3 text-center text-[11.5px] text-[#eef0f3]/40">
              Keys are shown once and stored only in this browser (demo).
            </p>
          </div>
        ) : (
          <div className="mt-4 flex flex-col gap-3.5">
            {/* key row */}
            <div className="glass-soft flex items-center gap-2.5 rounded-xl px-3.5 py-3">
              <span className="min-w-0 flex-1 truncate font-mono text-[12.5px] text-[#eef0f3]/90">
                {revealed ? key : masked}
              </span>
              <button
                onClick={() => setRevealed((v) => !v)}
                className="rounded-md p-1.5 text-[#eef0f3]/45 transition-colors duration-200 hover:bg-white/[0.09] hover:text-[#eef0f3]"
                aria-label={revealed ? "Hide key" : "Reveal key"}
              >
                {revealed ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
              <button
                onClick={copyKey}
                className="btn-glass inline-flex h-7 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium text-[#eef0f3]/85"
                aria-label="Copy API key"
              >
                {copied ? (
                  <Check size={12.5} className="text-emerald-300" />
                ) : (
                  <Copy size={12.5} className="text-[#eef0f3]/50" />
                )}
                {copied ? "Copied" : "Copy"}
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {["Created just now", "scan:write", "verdicts:read", "allowlist:manage"].map((c) => (
                <span
                  key={c}
                  className="glass-soft rounded-full px-2.5 py-1 text-[11px] font-medium text-[#eef0f3]/65"
                >
                  {c}
                </span>
              ))}
            </div>

            {/* example request — hidden until asked for, like everything technical here */}
            <div>
              <button
                onClick={() => setShowCurl((v) => !v)}
                className="btn-glass inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-medium text-[#eef0f3]/80"
                aria-expanded={showCurl}
              >
                <FileJson2 size={13} className="text-[#9ba0f5]" />
                {showCurl ? "Hide example request" : "Show example request"}
              </button>
              {showCurl && (
                <pre className="nice-scroll animate-fade-in mt-2.5 overflow-x-auto rounded-2xl border border-white/[0.1] bg-black/35 p-4 font-mono text-[11.5px] leading-5 text-[#e6e8ee] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
                  {CURL_SNIPPET}
                </pre>
              )}
            </div>

            <div className="flex items-center justify-between gap-2 border-t border-white/[0.08] pt-3.5">
              <p className="text-[11.5px] text-[#eef0f3]/40">
                Treat this key like a password — anyone holding it can scan as your org.
              </p>
              <button
                onClick={revoke}
                className="shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-medium text-[#d4969e]/80 transition-colors duration-200 hover:bg-[#c87a86]/12 hover:text-[#d4969e]"
              >
                Revoke key
              </button>
            </div>
          </div>
        )}
      </div>
    </GlassModal>
  );
}
