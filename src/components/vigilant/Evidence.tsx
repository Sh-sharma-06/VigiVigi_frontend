"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronRight, ChevronDown, ShieldX, Eye, Info, FileJson, FileDown, Braces, Binary, FolderTree, Radar, ListChecks,
} from "lucide-react";
import type { Artifact, Finding } from "@/lib/vigilant/types";
import { useVigilant } from "@/lib/vigilant/store";
import { CopyButton, DownloadButton } from "./bits";

/* ------------------------------------------------------------------ */
/* Export helpers                                                      */
/* ------------------------------------------------------------------ */

function download(name: string, content: string, mime = "application/json") {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const aEl = document.createElement("a");
  aEl.href = url;
  aEl.download = name;
  aEl.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

function buildSarif(a: Artifact): string {
  const level = (s: Finding["state"]) => (s === "BLOCKED" ? "error" : s === "NEEDS REVIEW" ? "warning" : "note");
  return JSON.stringify(
    {
      $schema: "https://json.schemastore.org/sarif-2.1.0.json",
      version: "2.1.0",
      runs: [
        {
          tool: { driver: { name: "Vigilant", version: a.ruleset, informationUri: "https://vigilant.internal.acme-labs.com" } },
          results: a.findings.map((f) => ({
            ruleId: `VIL-${f.state.replace(/\s/g, "_")}`,
            level: level(f.state),
            message: { text: f.evidence },
            locations: [
              {
                physicalLocation: {
                  artifactLocation: { uri: f.location },
                  region: f.offset ? { byteOffset: f.offset } : undefined,
                },
              },
            ],
          })),
        },
      ],
    },
    null,
    2
  );
}

function rawTelemetry(a: Artifact): string {
  return JSON.stringify(
    {
      artifact: { id: a.id, name: a.name, format: a.format, size_mb: a.sizeMB, sha256: a.sha256, compression_ratio: a.compressionRatio },
      verdict: { state: a.verdict.toUpperCase(), confidence: a.confidence, decided_by: a.decidedBy, contains_executable_code: a.containsExecutableCode, classification: a.classification ?? null, root_cause: a.rootCause },
      scan: { ruleset: a.ruleset, engine: a.engine, scanned_at: a.scannedAt, latency_ms: a.latencyMs, cache_hit: a.cacheHit, lane: a.plan.lane, gvisor: a.plan.skipGvisor ? "SKIPPED (static proof sufficient)" : "EXECUTED" },
      findings: a.findings,
      static: { symbols: a.symbols, constants: a.consts, closures: a.closures, opcodes: a.opcodes },
      archive: a.archive,
      sandbox: { canaries: a.canaries, hooks: a.hooks, process_timeline: a.processTimeline },
    },
    null,
    2
  );
}

/* ------------------------------------------------------------------ */
/* Evidence workspace                                                  */
/* ------------------------------------------------------------------ */

const EVIDENCE_TABS = ["Findings & 5-Sec Inspector", "AST / Opcodes & Disassembly", "Container & Archive Manifest", "gVisor Sandbox & Canary Telemetry", "Raw Telemetry & SARIF Export"];
const EVIDENCE_ICONS = [ListChecks, Binary, FolderTree, Radar, FileJson];

export function Evidence({ a }: { a: Artifact }) {
  const tab = useVigilant((s) => s.evidenceTab);
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="no-scrollbar flex items-center gap-1 overflow-x-auto border-b border-white/[0.07] px-3 py-2">
        {EVIDENCE_TABS.map((t, i) => {
          const Icon = EVIDENCE_ICONS[i];
          return (
            <button
              key={t}
              onClick={() => useVigilant.setState({ evidenceTab: i })}
              className={`nav-tab flex items-center gap-1.5 !text-[11px] ${tab === i ? "nav-tab-active" : ""}`}
            >
              <Icon size={12} /> {t}
            </button>
          );
        })}
      </div>
      <div className="vil-scroll min-h-0 flex-1 overflow-y-auto p-3">
        {tab === 0 && <FindingsTab a={a} />}
        {tab === 1 && <OpcodesTab a={a} />}
        {tab === 2 && <ArchiveTab a={a} />}
        {tab === 3 && <SandboxTab a={a} />}
        {tab === 4 && <RawTab a={a} />}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Tab 1 — Findings & 5-second inspector                               */
/* ------------------------------------------------------------------ */

const SIGNAL_STYLE: Record<Finding["state"], { color: string; bg: string; border: string }> = {
  BLOCKED: { color: "#ff5c8a", bg: "rgba(255,60,120,0.12)", border: "rgba(255,92,138,0.45)" },
  "NEEDS REVIEW": { color: "#ffc46b", bg: "rgba(255,180,84,0.10)", border: "rgba(255,196,107,0.42)" },
  INFO: { color: "#a89bbf", bg: "rgba(255,255,255,0.05)", border: "rgba(255,255,255,0.16)" },
};

function FindingsTab({ a }: { a: Artifact }) {
  const focusOpcode = useVigilant((s) => s.focusOpcode);
  if (a.findings.length === 0) {
    return <p className="mt-10 text-center text-xs text-[#8d7fa8]">No findings recorded for this artifact.</p>;
  }
  return (
    <div className="space-y-3">
      {/* findings table */}
      <div className="inset-panel overflow-x-auto">
        <table className="w-full min-w-[640px] text-left">
          <thead>
            <tr className="border-b border-white/10 text-[9.5px] uppercase tracking-wider text-[#8d7fa8]">
              <th className="px-3 py-2 font-semibold">Signal State</th>
              <th className="px-3 py-2 font-semibold">Exact Location / Byte Offset</th>
              <th className="px-3 py-2 font-semibold">Technical Evidence</th>
              <th className="px-3 py-2 font-semibold"></th>
            </tr>
          </thead>
          <tbody>
            {a.findings.map((f) => {
              const s = SIGNAL_STYLE[f.state];
              return (
                <tr key={f.id} className="border-b border-white/[0.05] align-top transition-colors hover:bg-white/[0.03]">
                  <td className="px-3 py-2.5">
                    <span className="inline-block rounded px-1.5 py-0.5 text-[9px] font-extrabold tracking-wide" style={{ color: s.color, background: s.bg, border: `1px solid ${s.border}` }}>
                      {f.state}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 font-mono text-[10.5px] text-[#e2d5f2]">
                    {f.location}
                    {f.offset && f.offset !== "—" && <span className="ml-1 text-[#8d7fa8]">@ {f.offset}</span>}
                  </td>
                  <td className="px-3 py-2.5 text-[11px] leading-relaxed text-[#c3b4da]">{f.evidence}</td>
                  <td className="px-3 py-2.5">
                    {f.opcodeIndex !== undefined && (
                      <button className="btn-ghost !px-2 !py-0.5 !text-[10px]" onClick={() => focusOpcode(f.opcodeIndex!)} title="Open exact byte offset in disassembly">
                        → 0x
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 5-second evidence card */}
      <div>
        <p className="mb-1.5 flex items-center gap-2 text-[11px] font-bold text-[#e9d8f5]">
          <Braces size={13} className="text-[#dc9aee]" /> 5-Second Lambda / Bytecode Evidence Card
          <span className="font-normal text-[#8d7fa8]">— clear a NEEDS REVIEW without reading raw hex</span>
        </p>
        <div className="grid gap-2 lg:grid-cols-3">
          <EvidenceBox
            title="Referenced Symbols & Modules"
            sub="co_names / globals"
            items={(a.symbols.length ? a.symbols : [{ name: "— none extracted —", kind: "safe" as const }]).map((s) => ({
              key: s.name,
              body: s.name + (s.note ? ` · ${s.note}` : ""),
              flag: s.kind === "dangerous",
            }))}
            legend={{ good: "safe math / tensor ops", bad: "system / sink modules" }}
          />
          <EvidenceBox
            title="Extracted Constants & Literals"
            sub="co_consts"
            items={(a.consts.length ? a.consts : [{ value: "— none —", kind: "number" as const }]).map((c) => ({
              key: c.value,
              body: c.value,
              flag: c.kind === "shell" || c.kind === "url",
            }))}
            legend={{ good: "numeric / benign literals", bad: "shell strings / URLs" }}
          />
          <EvidenceBox
            title="Closures & External Bindings"
            sub="cell + free variables"
            items={a.closures.map((c) => ({
              key: c.name,
              body: c.name === "—" ? c.detail : `${c.name} — ${c.detail}`,
              flag: c.external,
            }))}
            legend={{ good: "self-contained", bad: "captures external scope" }}
          />
        </div>
      </div>
    </div>
  );
}

function EvidenceBox({
  title,
  sub,
  items,
  legend,
}: {
  title: string;
  sub: string;
  items: { key: string; body: string; flag: boolean }[];
  legend: { good: string; bad: string };
}) {
  return (
    <div className="inset-panel p-3">
      <p className="text-[10.5px] font-bold text-[#e9d8f5]">{title}</p>
      <p className="font-mono text-[9px] text-[#8d7fa8]">{sub}</p>
      <ul className="mt-2 space-y-1">
        {items.map((it) => (
          <li
            key={it.key}
            className={`flex items-start gap-1.5 rounded-md border px-2 py-1 font-mono text-[10px] leading-snug ${
              it.flag ? "border-rose-300/30 bg-rose-400/[0.08] text-rose-200" : "border-emerald-300/20 bg-emerald-400/[0.05] text-emerald-100/90"
            }`}
          >
            {it.flag ? <ShieldX size={11} className="mt-px shrink-0" /> : <Info size={11} className="mt-px shrink-0 text-emerald-300" />}
            <span className="break-all">{it.body}</span>
          </li>
        ))}
      </ul>
      <p className="mt-2 border-t border-white/[0.06] pt-1.5 text-[8.5px] text-[#8d7fa8]">
        <span className="text-emerald-300">■</span> {legend.good} · <span className="text-rose-300">■</span> {legend.bad}
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Tab 2 — AST / Opcodes disassembly                                   */
/* ------------------------------------------------------------------ */

function OpcodesTab({ a }: { a: Artifact }) {
  const focus = useVigilant((s) => s.opcodeFocus);
  const rowRefs = useRef<(HTMLDivElement | null)[]>([]);

  const flashIdx = focus ? (a.opcodes[focus.index] ? focus.index : a.opcodes.findIndex((o) => o.flagged)) : -1;
  const nonce = focus?.nonce ?? 0;

  useEffect(() => {
    if (!focus || flashIdx < 0) return;
    rowRefs.current[flashIdx]?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [focus]);

  if (a.opcodes.length === 0) {
    return <p className="mt-10 text-center text-xs text-[#8d7fa8]">No disassembly — format is declarative or scan did not reach the static VM.</p>;
  }

  return (
    <div className="code-pane vil-scroll max-h-full overflow-auto">
      <div className="sticky top-0 z-10 flex items-center gap-2 border-b border-white/10 bg-[#0d0a13]/95 px-3 py-1.5">
        <span className="text-[10px] font-bold text-[#c9a7e2]">{a.name} · symbolic VM disassembly</span>
        <span className="glass-chip ml-auto">{a.opcodes.length} rows · pickletools + marshal hybrid view</span>
      </div>
      <div className="p-1.5">
        {a.opcodes.map((o, i) => (
          <div
            key={`${o.offset}-${i}-${flashIdx === i ? nonce : 0}`}
            ref={(el) => { rowRefs.current[i] = el; }}
            className={`flex items-baseline gap-3 rounded px-2 py-[3px] font-mono text-[10.5px] ${flashIdx === i ? "flash-row" : ""} ${o.flagged ? "bg-rose-400/[0.07]" : ""}`}
          >
            <span className="w-6 shrink-0 text-right text-[#6d5f85]">{String(i + 1).padStart(2, "0")}</span>
            <span className="w-14 shrink-0 text-[#8d7fa8]">{o.offset}</span>
            <span className={`w-32 shrink-0 font-semibold ${o.flagged ? "text-[#ff8aa8]" : "text-[#e2d5f2]"}`}>{o.op}</span>
            <span className={`min-w-0 flex-1 break-all ${o.flagged ? "text-rose-200" : "text-[#a798c2]"}`}>{o.arg ?? "—"}</span>
            {o.flagged && <span className="shrink-0 rounded bg-rose-400/15 px-1 text-[8px] font-bold text-rose-300">FLAG</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Tab 3 — Archive manifest tree                                       */
/* ------------------------------------------------------------------ */

function ArchiveTab({ a }: { a: Artifact }) {
  const [open, setOpen] = useState<Record<string, boolean>>({});
  if (a.archive.length === 0) return <p className="mt-10 text-center text-xs text-[#8d7fa8]">No manifest (scan halted before demux).</p>;

  const verdictStyle = (v: string) =>
    v === "BLOCKED" ? "text-rose-300 bg-rose-400/10 border-rose-300/30"
    : v === "NEEDS REVIEW" ? "text-amber-300 bg-amber-400/10 border-amber-300/30"
    : v === "INFO" ? "text-fuchsia-200 bg-fuchsia-400/10 border-fuchsia-300/25"
    : "text-emerald-300 bg-emerald-400/[0.08] border-emerald-300/25";

  const fmtBytes = (b: number) => (b >= 1048576 ? `${(b / 1048576).toFixed(2)} MB` : b >= 1024 ? `${(b / 1024).toFixed(1)} KB` : `${b} B`);

  const Row = ({ m, depth }: { m: (typeof a.archive)[number]; depth: number }) => (
    <>
      <tr className="border-b border-white/[0.04] hover:bg-white/[0.03]">
        <td className="px-3 py-2 font-mono text-[10.5px] text-[#e2d5f2]" style={{ paddingLeft: 12 + depth * 18 }}>
          {m.path.endsWith("/") || m.path.includes("[") ? (
            <button className="flex items-center gap-1 text-left" onClick={() => setOpen((o) => ({ ...o, [m.path]: !o[m.path] }))}>
              {open[m.path] ? <ChevronDown size={11} className="text-[#c9a7e2]" /> : <ChevronRight size={11} className="text-[#c9a7e2]" />}
              {m.path}
            </button>
          ) : (
            <span className="pl-4">{m.path}</span>
          )}
        </td>
        <td className="px-3 py-2 text-[10px] text-[#a798c2]">{m.subformat ?? "—"}</td>
        <td className="px-3 py-2 text-right font-mono text-[10px] text-[#c3b4da]">{fmtBytes(m.size)}</td>
        <td className="px-3 py-2 text-right font-mono text-[10px] text-[#c3b4da]">{fmtBytes(m.csize)}</td>
        <td className="px-3 py-2 text-right font-mono text-[10px] text-[#c3b4da]">{m.size > 0 ? `${(m.size / Math.max(1, m.csize)).toFixed(2)}x` : "—"}</td>
        <td className="px-3 py-2 text-right">
          <span className={`inline-block rounded border px-1.5 py-px text-[8.5px] font-bold ${verdictStyle(m.verdict)}`}>{m.verdict}</span>
        </td>
      </tr>
    </>
  );

  return (
    <div className="inset-panel overflow-x-auto">
      <table className="w-full min-w-[680px] text-left">
        <thead>
          <tr className="border-b border-white/10 text-[9.5px] uppercase tracking-wider text-[#8d7fa8]">
            <th className="px-3 py-2 font-semibold">Member Path</th>
            <th className="px-3 py-2 font-semibold">Detected Sub-Format</th>
            <th className="px-3 py-2 text-right font-semibold">Uncompressed</th>
            <th className="px-3 py-2 text-right font-semibold">Compressed</th>
            <th className="px-3 py-2 text-right font-semibold">Ratio</th>
            <th className="px-3 py-2 text-right font-semibold">Member Verdict</th>
          </tr>
        </thead>
        <tbody>
          {a.archive.map((m) => (
            <Row key={m.path} m={m} depth={0} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Tab 4 — gVisor sandbox & canary telemetry                           */
/* ------------------------------------------------------------------ */

function SandboxTab({ a }: { a: Artifact }) {
  return (
    <div className="grid gap-3 lg:grid-cols-[1fr_340px]">
      <div className="space-y-3">
        <div className="inset-panel p-3">
          <p className="mb-2 text-[11px] font-bold text-[#e9d8f5]">Intercepted audit hooks</p>
          {a.hooks.length === 0 ? (
            <p className="text-[11px] text-[#8d7fa8]">Sandbox skipped — static proof sufficient. No syscalls executed.</p>
          ) : (
            <div className="space-y-1.5">
              {a.hooks.map((h) => (
                <div key={h.name} className="flex items-center gap-3 rounded-lg border border-white/[0.06] bg-black/25 px-2.5 py-1.5">
                  <span className="w-16 shrink-0 font-mono text-[10.5px] font-bold text-[#e2d5f2]">{h.name}</span>
                  <span className={`w-8 shrink-0 text-right font-mono text-[11px] font-bold ${h.count > 0 ? (h.name === "connect" || h.name === "execve" ? "text-rose-300" : "text-amber-300") : "text-emerald-300"}`}>
                    {h.count}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-[10px] text-[#a798c2]">{h.detail}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="inset-panel p-3">
          <p className="mb-2 text-[11px] font-bold text-[#e9d8f5]">Process tree timeline</p>
          {a.processTimeline.length === 0 ? (
            <p className="text-[11px] text-[#8d7fa8]">—</p>
          ) : (
            <div className="space-y-0">
              {a.processTimeline.map((p, i) => (
                <div key={i} className="relative flex gap-3 pb-2.5 pl-1">
                  <span className="absolute left-[3.5px] top-2 h-full w-px bg-white/10" style={{ display: i === a.processTimeline.length - 1 ? "none" : undefined }} />
                  <span className="relative mt-1 h-2 w-2 shrink-0 rounded-full" style={{ background: p.detail.startsWith("DENIED") || p.detail.startsWith("BLOCKED") ? "#ff5c8a" : "#dc9aee", boxShadow: "0 0 8px rgba(220,154,238,0.7)" }} />
                  <div className="min-w-0">
                    <p className="font-mono text-[10px] text-[#e2d5f2]">
                      <span className="text-[#8d7fa8]">{p.t}</span> {p.event}
                    </p>
                    <p className={`text-[10px] ${p.detail.startsWith("DENIED") || p.detail.startsWith("BLOCKED") ? "text-rose-300" : "text-[#a798c2]"}`}>{p.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="inset-panel p-3">
        <p className="mb-2 flex items-center justify-between text-[11px] font-bold text-[#e9d8f5]">
          <span>13 planted canary files</span>
          <span className="glass-chip">{a.canaries.filter((c) => c.status === "accessed").length} touched</span>
        </p>
        <div className="vil-scroll max-h-72 space-y-1 overflow-y-auto pr-1">
          {a.canaries.map((c) => (
            <div key={c.path} className={`flex items-center gap-2 rounded-md border px-2 py-1 font-mono text-[9.5px] ${c.status === "accessed" ? "border-rose-300/30 bg-rose-400/[0.08] text-rose-200" : "border-white/[0.06] bg-white/[0.02] text-[#a798c2]"}`}>
              {c.status === "accessed" ? <ShieldX size={10} className="shrink-0" /> : <Info size={10} className="shrink-0 text-[#6d5f85]" />}
              <span className="truncate">{c.path}</span>
              <span className="ml-auto shrink-0 text-[8px] font-bold uppercase">{c.status}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Tab 5 — Raw telemetry & SARIF                                       */
/* ------------------------------------------------------------------ */

function RawTab({ a }: { a: Artifact }) {
  const json = useMemo(() => rawTelemetry(a), [a]);
  const sarif = useMemo(() => buildSarif(a), [a]);
  return (
    <div className="space-y-2.5">
      <div className="flex flex-wrap items-center gap-2">
        <CopyButton text={json} label="Copy JSON" />
        <DownloadButton label="Download .jsonl" onClick={() => download(`${a.name}.telemetry.jsonl`, json.split("\n").join("\n") + "\n", "application/jsonl")} />
        <DownloadButton label="Export GitHub SARIF" onClick={() => download(`vigilant-${a.name}.sarif`, sarif)} />
        <span className="ml-auto text-[10px] text-[#8d7fa8]">SARIF 2.1.0 · ready for github/codeql-action/upload-sarif</span>
      </div>
      <pre className="code-pane vil-scroll max-h-[420px] overflow-auto p-3">{json}</pre>
    </div>
  );
}
