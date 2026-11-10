"use client";

import React, { useMemo, useState } from "react";
import {
  ArrowUpDown, ArrowDown, ArrowUp, FileDown, GitCompareArrows, Puzzle, Download, ShieldAlert, ShieldCheck, Eye,
  Ban, CheckCircle2, Webhook, Server, Lock, Globe, Send, Copy, Loader2, CircleX, CircleCheck, History as HistoryIcon,
} from "lucide-react";
import { useVigilant } from "@/lib/vigilant/store";
import { historyFromQueue, GH_ACTIONS_YAML, SSRF_ALLOWLIST, API_REQUEST_EXAMPLE, API_RESPONSE_EXAMPLE, GATE_COMMIT, HF_REPO } from "@/lib/vigilant/data";
import type { HistoryRow } from "@/lib/vigilant/types";
import { CopyButton, DownloadButton, fmtSize, fmtTime, VERDICT_META } from "./bits";

/* ================================================================== */
/* History / Corpus                                                    */
/* ================================================================== */

type SortKey = "latencyMs" | "sizeMB" | "scannedAt" | "verdict";

const VERDICT_ORDER = { malicious: 0, review: 1, clean: 2, error: 3 };

function SortHeaderIcon({ k, sort }: { k: SortKey; sort: { key: SortKey; dir: 1 | -1 } }) {
  if (sort.key !== k) return <ArrowUpDown size={11} className="opacity-40" />;
  return sort.dir === 1 ? <ArrowUp size={11} /> : <ArrowDown size={11} />;
}

export function HistoryView() {
  const artifacts = useVigilant((s) => s.artifacts);
  const select = useVigilant((s) => s.select);
  const setView = useVigilant((s) => s.setView);
  const toast = useVigilant((s) => s.toast);

  const rows = useMemo(() => historyFromQueue(artifacts), [artifacts]);
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "scannedAt", dir: -1 });
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [cmp, setCmp] = useState<[string | null, string | null]>([null, null]);
  const [showCmp, setShowCmp] = useState(false);

  const sorted = useMemo(() => {
    const arr = [...rows];
    arr.sort((a, b) => {
      const k = sort.key;
      const va = k === "verdict" ? VERDICT_ORDER[a.verdict] : a[k === "latencyMs" ? "latencyMs" : k === "sizeMB" ? "sizeMB" : "scannedAt"];
      const vb = k === "verdict" ? VERDICT_ORDER[b.verdict] : b[k === "latencyMs" ? "latencyMs" : k === "sizeMB" ? "sizeMB" : "scannedAt"];
      if (typeof va === "string" && typeof vb === "string") return va.localeCompare(vb) * sort.dir;
      return ((va as number) - (vb as number)) * sort.dir;
    });
    return arr;
  }, [rows, sort]);

  const clickSort = (key: SortKey) =>
    setSort((s) => (s.key === key ? { key, dir: s.dir === 1 ? -1 : 1 } : { key, dir: key === "verdict" ? 1 : -1 }));

  const toggleSel = (id: string) =>
    setSel((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const selRows = sorted.filter((r) => sel.has(r.id));
  const sarifOf = (rs: HistoryRow[]) =>
    JSON.stringify(
      {
        version: "2.1.0",
        tool: { driver: { name: "Vigilant", version: "v2.4.0" } },
        results: rs.map((r) => ({
          ruleId: `VIL_${r.verdict.toUpperCase()}`,
          level: r.verdict === "malicious" ? "error" : r.verdict === "review" ? "warning" : "note",
          message: { text: `${r.name} — ${r.verdict}` },
          locations: [{ physicalLocation: { artifactLocation: { uri: r.name } } }],
        })),
      },
      null,
      2
    );

  const cmpRows: (HistoryRow | null)[] = [rows.find((r) => r.id === cmp[0]) ?? null, rows.find((r) => r.id === cmp[1]) ?? null];

  return (
    <div className="glass flex min-h-0 flex-col overflow-hidden p-4">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="glass-pill"><HistoryIcon size={11} /> History / Corpus</span>
        <span className="text-[11px] text-[#8d7fa8]">{rows.length} scans · multi-column sort · bulk export · version diff</span>
        <div className="ml-auto flex flex-wrap items-center gap-1.5">
          <button className="btn-ghost" disabled={sel.size === 0} onClick={() => { download(`vigilant-bulk-${sel.size}.sarif`, sarifOf(selRows)); toast({ title: `Exported ${sel.size} scan(s) as SARIF`, kind: "ok" }); }}>
            <FileDown size={12} /> Bulk SARIF ({sel.size})
          </button>
          <button className="btn-ghost" disabled={sel.size === 0} onClick={() => { download(`vigilant-bulk-${sel.size}.json`, JSON.stringify(selRows, null, 2)); toast({ title: `Exported ${sel.size} scan(s) as JSON`, kind: "ok" }); }}>
            <FileDown size={12} /> Bulk JSON ({sel.size})
          </button>
          <div className="inset-panel flex items-center gap-1.5 px-2 py-1">
            <GitCompareArrows size={13} className="text-[#dc9aee]" />
            {[0, 1].map((i) => (
              <select
                key={i}
                value={cmp[i] ?? ""}
                onChange={(e) => setCmp((c) => { const n: [string | null, string | null] = [...c]; n[i] = e.target.value || null; return n; })}
                className="max-w-44 rounded-md bg-black/40 px-1.5 py-1 text-[10.5px] text-[#e2d5f2] outline-none"
              >
                <option value="">model {i === 0 ? "A" : "B"}…</option>
                {rows.map((r) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            ))}
            <button className="btn-gloss !py-1" disabled={!cmp[0] || !cmp[1] || cmp[0] === cmp[1]} onClick={() => setShowCmp(true)}>Compare</button>
          </div>
        </div>
      </div>

      {showCmp && cmpRows[0] && cmpRows[1] && <ComparePanel a={cmpRows[0]!} b={cmpRows[1]!} onClose={() => setShowCmp(false)} />}

      <div className="inset-panel vil-scroll min-h-0 flex-1 overflow-auto">
        <table className="w-full min-w-[860px] text-left">
          <thead className="sticky top-0 z-10 bg-[#120e1a]/95 backdrop-blur">
            <tr className="border-b border-white/10 text-[9.5px] uppercase tracking-wider text-[#8d7fa8]">
              <th className="px-3 py-2.5 w-8"></th>
              <th className="px-3 py-2.5 font-semibold">Artifact</th>
              <th className="px-3 py-2.5 font-semibold">Format</th>
              <th className="cursor-pointer px-3 py-2.5 font-semibold" onClick={() => clickSort("sizeMB")}><span className="inline-flex items-center gap-1">Size <SortHeaderIcon k="sizeMB" sort={sort} /></span></th>
              <th className="cursor-pointer px-3 py-2.5 font-semibold" onClick={() => clickSort("verdict")}><span className="inline-flex items-center gap-1">Verdict <SortHeaderIcon k="verdict" sort={sort} /></span></th>
              <th className="px-3 py-2.5 font-semibold">Confidence</th>
              <th className="cursor-pointer px-3 py-2.5 font-semibold" onClick={() => clickSort("latencyMs")}><span className="inline-flex items-center gap-1">Latency <SortHeaderIcon k="latencyMs" sort={sort} /></span></th>
              <th className="cursor-pointer px-3 py-2.5 font-semibold" onClick={() => clickSort("scannedAt")}><span className="inline-flex items-center gap-1">Date <SortHeaderIcon k="scannedAt" sort={sort} /></span></th>
              <th className="px-3 py-2.5 font-semibold">SHA-256</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((r) => {
              const meta = VERDICT_META[r.verdict === "error" ? "error" : r.verdict];
              return (
                <tr key={r.id} className="border-b border-white/[0.04] transition-colors hover:bg-white/[0.03]">
                  <td className="px-3 py-2">
                    <input type="checkbox" checked={sel.has(r.id)} onChange={() => toggleSel(r.id)} className="h-3.5 w-3.5 accent-[#c963e0]" aria-label={`select ${r.name}`} />
                  </td>
                  <td className="px-3 py-2">
                    <button
                      className={`text-[11.5px] font-semibold ${r.queue ? "text-[#e9d8f5] underline decoration-fuchsia-400/60 underline-offset-4" : "text-[#c3b4da] hover:text-white"}`}
                      onClick={() => { if (r.queue) { select(r.id); setView(r.verdict === "review" ? "review" : "investigate"); } else { toast({ title: "Archived scan", detail: `${r.name} is in long-term corpus storage (not in the live queue).`, kind: "info" }); } }}
                    >
                      {r.name}
                    </button>
                    {r.queue && <span className="ml-1.5 rounded bg-fuchsia-400/15 px-1 py-px text-[8px] font-bold text-fuchsia-200">LIVE</span>}
                  </td>
                  <td className="px-3 py-2 text-[10px] text-[#a798c2]">{r.format}</td>
                  <td className="px-3 py-2 font-mono text-[10px] text-[#c3b4da]">{fmtSize(r.sizeMB)}</td>
                  <td className="px-3 py-2">
                    <span className="inline-block rounded px-1.5 py-0.5 text-[9px] font-extrabold" style={{ color: meta.color, background: meta.bg, border: `1px solid ${meta.border}` }}>
                      {r.verdict === "error" ? "SCAN ERROR" : meta.short.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-[10px] text-[#c3b4da]">{r.confidence}</td>
                  <td className="px-3 py-2 font-mono text-[10px] text-[#c3b4da]">{r.latencyMs ? `${(r.latencyMs / 1000).toFixed(1)}s` : "—"}</td>
                  <td className="px-3 py-2 font-mono text-[10px] text-[#a798c2]">{fmtTime(r.scannedAt)}</td>
                  <td className="px-3 py-2 font-mono text-[9.5px] text-[#8d7fa8]">{r.sha256.slice(0, 12)}…</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ComparePanel({ a, b, onClose }: { a: HistoryRow; b: HistoryRow; onClose: () => void }) {
  const rows: { label: string; va: string; vb: string; diff: boolean }[] = [
    { label: "Verdict", va: a.verdict.toUpperCase(), vb: b.verdict.toUpperCase(), diff: a.verdict !== b.verdict },
    { label: "Format", va: a.format, vb: b.format, diff: a.format !== b.format },
    { label: "Size", va: fmtSize(a.sizeMB), vb: fmtSize(b.sizeMB), diff: Math.abs(a.sizeMB - b.sizeMB) > 1 },
    { label: "Latency", va: `${(a.latencyMs / 1000).toFixed(1)}s`, vb: `${(b.latencyMs / 1000).toFixed(1)}s`, diff: Math.abs(a.latencyMs - b.latencyMs) > 500 },
    { label: "Scanned", va: fmtTime(a.scannedAt), vb: fmtTime(b.scannedAt), diff: a.scannedAt !== b.scannedAt },
    { label: "SHA-256", va: a.sha256.slice(0, 16) + "…", vb: b.sha256.slice(0, 16) + "…", diff: a.sha256 !== b.sha256 },
  ];
  return (
    <div className="rise-in mb-3 rounded-xl border border-fuchsia-300/25 bg-fuchsia-500/[0.06] p-3">
      <div className="mb-2 flex items-center gap-2">
        <GitCompareArrows size={14} className="text-[#dc9aee]" />
        <span className="text-[11.5px] font-bold text-[#f0e2fa]">Model Version Diff</span>
        <button className="btn-ghost ml-auto !px-2 !py-0.5" onClick={onClose}>✕</button>
      </div>
      <div className="grid gap-2 md:grid-cols-2">
        {[a, b].map((r, i) => (
          <div key={i} className="inset-panel p-2.5">
            <p className="mb-1 truncate text-[11px] font-bold text-[#e9d8f5]">{r.name}</p>
            {rows.map((row) => (
              <div key={row.label} className="flex justify-between gap-2 border-b border-white/[0.04] py-0.5 text-[10px] last:border-0">
                <span className="text-[#8d7fa8]">{row.label}</span>
                <span className="font-mono text-[#d9cdeb]">{i === 0 ? row.va : row.vb}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function download(name: string, content: string, mime = "application/json") {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/* ================================================================== */
/* Browser Extension simulator                                         */
/* ================================================================== */

export function ExtensionView() {
  const policy = useVigilant((s) => s.policy);
  const toast = useVigilant((s) => s.toast);
  const [popup, setPopup] = useState<{ name: string; oid: string; verdict: "safe" | "review" | "malicious"; phase: "check" | "result" } | null>(null);
  const [quarantined, setQuarantined] = useState<Set<string>>(new Set());

  const files = HF_REPO.files;
  const org = HF_REPO.org;
  const repo = HF_REPO.repo;

  const decision = (precheck: string): "allowed" | "confirm" | "blocked" => {
    if (precheck === "safe") return "allowed";
    if (precheck === "malicious") return policy === "audit" ? "allowed" : "blocked";
    if (precheck === "review") return policy === "enforce" ? "blocked" : policy === "warn" ? "confirm" : "allowed";
    return "allowed";
  };

  const startCheck = (f: { name: string; lfsOid: string; precheck: string }) => {
    setPopup({ name: f.name, oid: f.lfsOid, verdict: f.precheck as "safe" | "review" | "malicious", phase: "check" });
    setTimeout(() => setPopup((p) => (p && p.name === f.name ? { ...p, phase: "result" } : p)), 1400);
  };

  return (
    <div className="glass p-4">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="glass-pill"><Puzzle size={11} /> Browser Extension · Live Simulator</span>
        <span className="text-[10.5px] text-[#8d7fa8]">
          huggingface.co badge injection → pre-download <b className="text-[#c3b4da]">lfs.oid</b> SHA-256 check → 3-state popup → <b className="text-[#c3b4da]">chrome.downloads.cancel</b> + quarantine
        </span>
        <span className="glass-chip ml-auto">policy: <b className="uppercase text-[#e9d8f5]">{policy}</b></span>
      </div>

      <div className="grid gap-3 lg:grid-cols-[1fr_380px]">
        {/* fake browser */}
        <div className="overflow-hidden rounded-xl border border-white/10">
          <div className="flex items-center gap-2 bg-[#17121f]/90 px-3 py-2">
            <span className="flex gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
            </span>
            <span className="ml-2 flex flex-1 items-center gap-1.5 rounded-full bg-black/50 px-3 py-1 font-mono text-[10px] text-[#b9a8d4]">
              <Lock size={9} className="text-emerald-300" /> huggingface.co/{org}/{repo}/tree/main
            </span>
            <span className="glass-chip !text-[#e05ab8]">Vigilant extension: ON</span>
          </div>
          <div className="space-y-1 bg-[#0d0a13]/80 p-2.5">
            <p className="px-1 pb-1 text-[10px] font-semibold text-[#8d7fa8]">Files & versions · main</p>
            {files.map((f) => {
              const q = quarantined.has(f.name);
              return (
                <div key={f.path} className={`flex items-center gap-2 rounded-lg px-2 py-1.5 ${q ? "opacity-40" : ""}`}>
                  <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-[#e2d5f2]">{f.path}</span>
                  <span className="font-mono text-[9px] text-[#8d7fa8]">lfs.oid {f.lfsOid.slice(0, 10)}…</span>
                  <span className="text-[9.5px] text-[#a798c2]">{f.sizeMB >= 1024 ? `${(f.sizeMB / 1024).toFixed(2)} GB` : `${f.sizeMB} MB`}</span>
                  {f.precheck === "safe" && <Badge tone="ok" icon={<ShieldCheck size={10} />}>SAFE</Badge>}
                  {f.precheck === "review" && <Badge tone="warn" icon={<Eye size={10} />}>REVIEW</Badge>}
                  {f.precheck === "malicious" && <Badge tone="bad" icon={<ShieldAlert size={10} />}>MALICIOUS</Badge>}
                  <button className="btn-ghost !px-2 !py-0.5 !text-[10px]" onClick={() => startCheck(f)} disabled={q}>
                    <Download size={10} /> download
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* popup + flow */}
        <div className="space-y-3">
          {popup ? (
            <div className="glass-deep rise-in p-3.5" key={popup.name + popup.phase}>
              <p className="flex items-center gap-2 text-[11px] font-bold text-[#f0e2fa]">
                {popup.phase === "check" ? <Loader2 size={13} className="animate-spin text-[#dc9aee]" /> : popup.verdict === "malicious" ? <CircleX size={13} className="text-[#ff5c8a]" /> : popup.verdict === "review" ? <Eye size={13} className="text-[#ffc46b]" /> : <CircleCheck size={13} className="text-[#4ade80]" />}
                Vigilant — pre-download interceptor
              </p>
              <p className="mt-1 font-mono text-[9.5px] text-[#8d7fa8]">sha256(lfs.oid) = {popup.oid.slice(0, 24)}…</p>
              {popup.phase === "check" ? (
                <div className="mt-3 space-y-1.5">
                  {["Querying org hash allowlist…", "Matching ruleset v2.4.0 verdict cache…", "Evaluating policy " + policy.toUpperCase() + "…"].map((l, i) => (
                    <p key={l} className="ticker-line font-mono text-[10px] text-[#c9b8e2]" style={{ animationDelay: `${i * 0.3}s` }}>{l}</p>
                  ))}
                </div>
              ) : popup.verdict === "safe" ? (
                <div className="mt-3">
                  <p className="text-[11px] text-emerald-300">✓ No threats detected — download allowed to proceed.</p>
                  <button className="btn-gloss mt-2 w-full" onClick={() => { toast({ title: "Download started", detail: `${popup.name} · extension stayed silent for safe files`, kind: "ok" }); setPopup(null); }}>Continue download</button>
                </div>
              ) : decision(popup.verdict) === "blocked" ? (
                <div className="mt-3">
                  <p className="text-[11px] font-bold text-rose-300">✗ {popup.verdict === "malicious" ? "MALICIOUS" : "NEEDS REVIEW (un-allowlisted)"} — blocked under {policy.toUpperCase()}</p>
                  <div className="mt-2 rounded-lg border border-rose-300/25 bg-rose-400/[0.07] p-2 font-mono text-[9.5px] leading-relaxed text-rose-200">
                    chrome.downloads.cancel(downloadId)<br />chrome.downloads.removeFile(downloadId)<br />→ moved to quarantine/
                  </div>
                  <button className="btn-gloss mt-2 w-full !border-rose-300/40 !bg-rose-500/20" onClick={() => { setQuarantined((q) => new Set(q).add(popup.name)); toast({ title: "Download cancelled & quarantined", detail: `${popup.name} never touched disk`, kind: "err" }); setPopup(null); }}>
                    <Ban size={12} /> Cancel + quarantine
                  </button>
                </div>
              ) : (
                <div className="mt-3">
                  <p className="text-[11px] font-bold text-amber-300">⚠ NEEDS REVIEW — contains executable code</p>
                  <p className="mt-1 text-[10px] text-[#c3b4da]">Policy {policy.toUpperCase()} requires explicit confirmation to proceed.</p>
                  <div className="mt-2 flex gap-1.5">
                    <button className="btn-gloss flex-1" onClick={() => { toast({ title: "Download allowed (justified)", detail: "User accepted review burden under Warn policy", kind: "warn" }); setPopup(null); }}>Proceed anyway</button>
                    <button className="btn-ghost flex-1" onClick={() => { setQuarantined((q) => new Set(q).add(popup.name)); setPopup(null); }}>Block</button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="glass-deep grid place-items-center p-6 text-center">
              <p className="text-[11px] text-[#8d7fa8]">Click a <b className="text-[#c3b4da]">download</b> button to trigger the interceptor popup.</p>
            </div>
          )}

          <div className="inset-panel p-3">
            <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-[#8d7fa8]">Interceptor pipeline</p>
            {[
              ["content-script.js", "injects ✓/⚠/✗ badges into the HF file tree"],
              ["background.js", "pre-download check of lfs.oid SHA-256 vs cache + allowlist"],
              ["popup.js", "3-state popup: check → verdict → action"],
              ["downloads API", "chrome.downloads.cancel + removeFile → quarantine/"],
            ].map(([k, v]) => (
              <div key={k} className="flex items-baseline gap-2 border-b border-white/[0.05] py-1 last:border-0">
                <span className="w-28 shrink-0 font-mono text-[9.5px] font-bold text-[#c9a7e2]">{k}</span>
                <span className="text-[9.5px] text-[#a798c2]">{v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function Badge({ tone, icon, children }: { tone: "ok" | "warn" | "bad"; icon: React.ReactNode; children: React.ReactNode }) {
  const cls = tone === "ok" ? "border-emerald-300/30 bg-emerald-400/10 text-emerald-300" : tone === "warn" ? "border-amber-300/30 bg-amber-400/10 text-amber-300" : "border-rose-300/30 bg-rose-400/10 text-rose-300";
  return <span className={`inline-flex shrink-0 items-center gap-1 rounded border px-1.5 py-px text-[8px] font-extrabold tracking-wide ${cls}`}>{icon}{children}</span>;
}

/* ================================================================== */
/* HF Pre-Upload Gate (pre-receive webhook)                            */
/* ================================================================== */

export function GateView() {
  const policy = useVigilant((s) => s.policy);
  const toast = useVigilant((s) => s.toast);
  const [override, setOverride] = useState<"approved" | "blocked" | null>(null);

  const anyBlocked = GATE_COMMIT.files.some((f) => f.outcome === "blocked");
  const anyReview = GATE_COMMIT.files.some((f) => f.outcome === "review");
  const autoDecision =
    policy === "audit" ? "approved" : policy === "enforce" ? (anyBlocked || anyReview ? "blocked" : "approved") : anyBlocked ? "blocked" : anyReview ? "review" : "approved";
  const decision = override ?? autoDecision;

  return (
    <div className="glass p-4">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="glass-pill"><UploadGateIcon /> HF Pre-Upload Gate [SIMULATED]</span>
        <span className="text-[10.5px] text-[#8d7fa8]">Git-LFS pre-receive webhook · multi-file commit gate</span>
        <span className="glass-chip ml-auto">policy: <b className="uppercase text-[#e9d8f5]">{policy}</b></span>
      </div>

      {/* commit header */}
      <div className="inset-panel mb-3 p-3">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[10.5px]">
          <span className="text-[#e2d5f2]">commit <b className="text-[#c9a7e2]">{GATE_COMMIT.sha}</b></span>
          <span className="text-[#a798c2]">branch <b>{GATE_COMMIT.branch}</b></span>
          <span className="text-[#a798c2]">author <b>{GATE_COMMIT.author}</b></span>
          <span className="text-[#8d7fa8]">“{GATE_COMMIT.message}”</span>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <span className="glass-chip">webhook: POST /pre-receive</span>
          <span className={`glass-chip ${decision === "approved" ? "!text-emerald-300" : decision === "blocked" ? "!text-rose-300" : "!text-amber-300"}`}>
            gate decision: <b className="uppercase">{decision}</b>
          </span>
          <span className="text-[9.5px] text-[#8d7fa8]">
            {policy === "audit" ? "Audit mode: everything passes, findings logged silently." : policy === "enforce" ? "Enforce mode: MALICIOUS + un-allowlisted review files block the commit." : "Warn mode: MALICIOUS blocks; review files require justification."}
          </span>
        </div>
      </div>

      {/* per-file gate statuses */}
      <div className="grid gap-2 md:grid-cols-2">
        {GATE_COMMIT.files.map((f) => (
          <div key={f.name} className={`inset-panel p-3 ${f.outcome === "blocked" ? "!border-rose-300/30" : f.outcome === "review" ? "!border-amber-300/30" : ""}`}>
            <div className="flex items-center gap-2">
              <span className="min-w-0 flex-1 truncate font-mono text-[11px] font-bold text-[#e2d5f2]">{f.name}</span>
              <span className="text-[9.5px] text-[#8d7fa8]">{fmtSize(f.sizeMB)}</span>
              <span className={`rounded px-1.5 py-px text-[8.5px] font-extrabold uppercase ${f.outcome === "blocked" ? "bg-rose-400/15 text-rose-300" : f.outcome === "review" ? "bg-amber-400/15 text-amber-300" : "bg-emerald-400/15 text-emerald-300"}`}>
                {f.outcome}
              </span>
            </div>
            <div className="mt-1.5 space-y-1">
              {f.checks.map((c) => (
                <div key={c.label} className="flex items-center gap-2 text-[10px]">
                  {c.state === "pass" ? <CheckCircle2 size={11} className="shrink-0 text-emerald-300" /> : c.state === "flag" ? <Eye size={11} className="shrink-0 text-amber-300" /> : <Ban size={11} className="shrink-0 text-rose-300" />}
                  <span className="text-[#c3b4da]">{c.label}</span>
                  <span className={`ml-auto font-mono text-[8.5px] ${c.state === "pass" ? "text-emerald-300" : c.state === "flag" ? "text-amber-300" : "text-rose-300"}`}>{c.state.toUpperCase()}</span>
                </div>
              ))}
            </div>
            <p className="mt-1.5 font-mono text-[9px] text-[#8d7fa8]">sha256 {f.sha}</p>
          </div>
        ))}
      </div>

      {/* actions */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          className="btn-gloss"
          onClick={() => { setOverride("approved"); toast({ title: "Commit approved (admin override)", detail: `${GATE_COMMIT.sha} pushed to ${GATE_COMMIT.branch}`, kind: "warn" }); }}
        >
          <CheckCircle2 size={12} /> Approve commit
        </button>
        <button
          className="btn-ghost !border-rose-300/40 !text-rose-200"
          onClick={() => { setOverride("blocked"); toast({ title: "Commit blocked", detail: "pre-receive hook exited 1 — push rejected", kind: "err" }); }}
        >
          <Ban size={12} /> Block commit
        </button>
        <button className="btn-ghost" onClick={() => setOverride(null)}>Reset to policy decision</button>
        <span className="ml-auto text-[9.5px] text-[#8d7fa8]">Auto decision from {policy.toUpperCase()} policy: <b className="uppercase text-[#c3b4da]">{autoDecision}</b></span>
      </div>
    </div>
  );
}

function UploadGateIcon() {
  return <Globe size={11} />;
}

/* ================================================================== */
/* Enterprise API console                                              */
/* ================================================================== */

export function ApiView() {
  const policy = useVigilant((s) => s.policy);
  const webhookLog = useVigilant((s) => s.webhookLog);
  const pushWebhook = useVigilant((s) => s.pushWebhook);
  const toast = useVigilant((s) => s.toast);
  const [sending, setSending] = useState(false);
  const [response, setResponse] = useState<string | null>(null);

  const send = async () => {
    setSending(true);
    setResponse(null);
    try {
      const res = await fetch("/api/v1/enterprise/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ artifact_url: "https://huggingface.co/acme-labs/invoice-parser-v4/resolve/main/model.safetensors", sha256: "a1c3e5f7b9d0246813579acfbd0e2468a1c3e5f7b9d0246813579acfbd0e2468", policy, callback_url: "https://hooks.internal.acme-labs.com/vigilant/verdicts" }),
      });
      const body = await res.json();
      setResponse(`HTTP/1.1 ${res.status} ${res.statusText}\n\n` + JSON.stringify(body, null, 2));
      pushWebhook({ ts: new Date().toISOString(), event: "scan.queued", status: res.status, detail: `${body.scan_id} accepted · policy=${body.policy} · est ${body.est_latency_ms}ms` });
      toast({ title: "Scan accepted", detail: `${body.scan_id} → 202 Accepted`, kind: "ok" });
      setTimeout(() => {
        pushWebhook({ ts: new Date().toISOString(), event: "scan.completed", status: 200, detail: `${body.scan_id} → verdict NO_THREATS_DETECTED delivered to hooks.internal.acme-labs.com` });
      }, 2600);
    } catch {
      setResponse("HTTP/1.1 502 Bad Gateway\n\n{ \"error\": \"scan orchestrator unreachable\" }");
      toast({ title: "Scan request failed", kind: "err" });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="glass p-4">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="glass-pill"><Webhook size={11} /> Enterprise API [SIMULATED]</span>
        <span className="text-[10.5px] text-[#8d7fa8]">CI/CD integration console</span>
        <span className="glass-chip ml-auto">policy: <b className="uppercase text-[#e9d8f5]">{policy}</b></span>
      </div>

      <div className="grid gap-3 xl:grid-cols-[1.25fr_1fr]">
        <div className="space-y-3">
          {/* endpoint */}
          <div className="inset-panel p-3">
            <p className="mb-2 flex items-center gap-2 font-mono text-[11.5px]">
              <Server size={13} className="text-[#dc9aee]" />
              <span className="rounded bg-emerald-400/15 px-1.5 py-0.5 text-[10px] font-bold text-emerald-300">POST</span>
              <span className="text-[#e2d5f2]">/api/v1/enterprise/scan</span>
              <CopyButton text={API_REQUEST_EXAMPLE} label="Copy request" className="btn-ghost ml-auto !px-2 !py-0.5 !text-[10px]" />
            </p>
            <div className="grid gap-2 md:grid-cols-2">
              <CodePane code={API_REQUEST_EXAMPLE} title="Request" />
              <CodePane code={response ?? API_RESPONSE_EXAMPLE} title={response ? "Live response" : "Example response"} live={!!response} />
            </div>
            <button className="btn-gloss mt-2" onClick={send} disabled={sending}>
              {sending ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />} Send test request
            </button>
          </div>

          {/* GH actions */}
          <div className="inset-panel p-3">
            <p className="mb-2 flex items-center gap-2 text-[11px] font-bold text-[#e9d8f5]">
              <Copy size={13} className="text-[#dc9aee]" /> Copyable GitHub Actions workflow
              <CopyButton text={GH_ACTIONS_YAML} label="Copy YAML" className="btn-ghost ml-auto !px-2 !py-0.5 !text-[10px]" />
              <DownloadButton label=".yml" onClick={() => download("vigilant-model-scan.yml", GH_ACTIONS_YAML, "text/yaml")} />
            </p>
            <pre className="code-pane vil-scroll max-h-56 overflow-auto p-2.5">{GH_ACTIONS_YAML}</pre>
          </div>
        </div>

        <div className="space-y-3">
          {/* SSRF allowlist */}
          <div className="inset-panel p-3">
            <p className="mb-2 flex items-center gap-2 text-[11px] font-bold text-[#e9d8f5]">
              <Globe size={13} className="text-[#dc9aee]" /> SSRF host-allowlist status
            </p>
            <div className="space-y-1">
              {SSRF_ALLOWLIST.map((h) => (
                <div key={h.host} className="flex items-center gap-2 rounded-md border border-white/[0.06] bg-black/25 px-2 py-1 font-mono text-[10px]">
                  {h.state === "allowed" ? <CheckCircle2 size={10} className="shrink-0 text-emerald-300" /> : <Ban size={10} className="shrink-0 text-rose-300" />}
                  <span className="min-w-0 flex-1 truncate text-[#d9cdeb]">{h.host}</span>
                  <span className={`shrink-0 text-[8.5px] font-bold uppercase ${h.state === "allowed" ? "text-emerald-300" : "text-rose-300"}`}>{h.state}</span>
                </div>
              ))}
            </div>
            <p className="mt-2 text-[9px] leading-relaxed text-[#8d7fa8]">Callback URLs are validated against this allowlist before any webhook delivery — SSRF attempts fail closed.</p>
          </div>

          {/* webhook delivery log */}
          <div className="inset-panel p-3">
            <p className="mb-2 flex items-center gap-2 text-[11px] font-bold text-[#e9d8f5]">
              <Webhook size={13} className="text-[#dc9aee]" /> Live webhook delivery log
              <span className="glass-chip ml-auto">{webhookLog.length} events</span>
            </p>
            <div className="vil-scroll max-h-72 space-y-1 overflow-y-auto pr-1">
              {webhookLog.map((w) => (
                <div key={w.id} className="rise-in rounded-md border border-white/[0.06] bg-black/25 px-2 py-1.5">
                  <p className="flex items-center gap-2 font-mono text-[9.5px]">
                    <span className={w.status >= 400 ? "text-rose-300" : "text-emerald-300"}>{w.status}</span>
                    <span className="font-bold text-[#e2d5f2]">{w.event}</span>
                    <span className="ml-auto text-[#8d7fa8]">{fmtTime(w.ts)}</span>
                  </p>
                  <p className="mt-0.5 text-[9.5px] leading-snug text-[#a798c2]">{w.detail}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CodePane({ code, title, live }: { code: string; title: string; live?: boolean }) {
  return (
    <div>
      <p className={`mb-1 text-[9px] font-bold uppercase tracking-wider ${live ? "text-emerald-300" : "text-[#8d7fa8]"}`}>{title}</p>
      <pre className="code-pane vil-scroll max-h-44 overflow-auto p-2">{code}</pre>
    </div>
  );
}
