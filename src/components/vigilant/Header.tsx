"use client";

import React, { useState } from "react";
import {
  Info, RefreshCw, Copy, Check, ChevronDown, EyeOff, Eye, Fingerprint, Boxes, FileDigit, Cpu, ShieldCheck, ShieldAlert, BadgeCheck, Loader2, Clock,
} from "lucide-react";
import { useVigilant, effectiveStatus } from "@/lib/vigilant/store";
import { COVERAGE_CHECKED, COVERAGE_NOT_CHECKED } from "@/lib/vigilant/data";
import { CONFIDENCE_COLOR, Donut, VERDICT_META, fmtSize, fmtTime } from "./bits";

export function VerdictHeader() {
  const id = useVigilant((s) => s.selectedId);
  const a = useVigilant((s) => s.artifacts.find((x) => x.id === id));
  const allow = useVigilant((s) => s.allowlisted);
  const policy = useVigilant((s) => s.policy);
  const run = useVigilant((s) => (id ? s.scanRuns[id] : undefined));
  const [covOpen, setCovOpen] = useState(false);
  const [shaCopied, setShaCopied] = useState(false);

  if (!a) {
    return (
      <section className="glass grid min-h-[160px] place-items-center" aria-label="Verdict">
        <div className="text-center">
          <p className="text-sm font-medium text-[#b9b5c6]">No artifact selected</p>
          <p className="mt-1.5 text-xs text-[#837f93]">Pick a file from the queue, drop one anywhere, or press <kbd className="glass-chip">⌘K</kbd></p>
        </div>
      </section>
    );
  }

  const st = effectiveStatus(a, allow);
  const scanning = st === "scanning";
  const meta = VERDICT_META[st];
  const overallProgress = run && run.total > 0 ? Math.min(1, run.elapsed / run.total) : 0;

  const verdictSegments =
    a.findings.length > 0
      ? [
          { value: a.findings.filter((f) => f.state === "BLOCKED").length || 0.001, color: "#ff5c8a" },
          { value: a.findings.filter((f) => f.state === "NEEDS REVIEW").length || 0.001, color: "#ffc46b" },
          { value: a.findings.filter((f) => f.state === "INFO").length || 0.001, color: "#8d8098" },
        ]
      : [{ value: 1, color: scanning ? "#ef95bb" : st === "error" ? "#f87171" : "#4ade80" }];

  const copySha = async () => {
    try { await navigator.clipboard.writeText(a.sha256); } catch { /* noop */ }
    setShaCopied(true);
    setTimeout(() => setShaCopied(false), 1500);
  };

  return (
    <section className="glass relative overflow-hidden p-5" aria-label="Verdict header">
      {/* scanning sheen */}
      {scanning && <div className="shimmer absolute inset-0 overflow-hidden rounded-2xl" />}

      <div className="relative flex flex-wrap items-center gap-5">
        {/* Two-axis donut — reference ring chart */}
        <div className="relative shrink-0">
          <Donut
            size={116}
            thickness={20}
            segments={verdictSegments}
            center={
              scanning ? (
                <div className="text-center">
                  <div className="text-sm font-bold text-white">{Math.round(overallProgress * 100)}%</div>
                  <div className="text-[7px] uppercase tracking-wider text-[#dba0b8]">scanning</div>
                </div>
              ) : st === "error" ? (
                <ShieldAlert size={22} className="text-[#f87171]" />
              ) : (
                <div className="grid place-items-center">
                  {st === "malicious" ? <ShieldAlert size={22} className="text-[#ff5c8a]" /> : st === "review" ? <Eye size={22} className="text-[#ffc46b]" /> : st === "allowlisted" ? <BadgeCheck size={22} className="text-[#7dd3fc]" /> : <ShieldCheck size={22} className="text-[#4ade80]" />}
                </div>
              )
            }
          />
        </div>

        <div className="min-w-[240px] flex-1">
          {/* Layer 1 — verdict */}
          <div className="flex flex-wrap items-center gap-2.5">
            <span
              className="latch-in inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-bold tracking-wide"
              style={{ color: meta.color, background: meta.bg, border: `1px solid ${meta.border}`, textShadow: `0 0 16px ${meta.color}66` }}
              key={st}
            >
              {scanning ? <Loader2 size={15} className="animate-spin" /> : <meta.icon size={15} />}
              {scanning ? `SCANNING · STAGE ${(run?.currentStage ?? 0) + 1}/5` : meta.label}
              {st === "allowlisted" && " · EXPIRES " + (allow[a.id]?.expiry ?? "90D").toUpperCase()}
            </span>
            {scanning ? (
              <span className="glass-chip">Confidence — pending</span>
            ) : (
              !a.errorState && (
                <span className="glass-chip">
                  Confidence <b style={{ color: CONFIDENCE_COLOR[a.confidence] }}>{a.confidence}</b>
                </span>
              )
            )}
            {!scanning && !a.errorState && (
              <span className="glass-chip">
                Decided by <b className="text-[#f0ebf2]">{a.decidedBy}</b>
              </span>
            )}
            <span className="glass-chip" title={`Active policy: ${policy}`}>
              Policy <b className="uppercase text-[#f0ebf2]">{policy}</b>
            </span>
          </div>

          {/* Layer 2 — orthogonal capability */}
          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 font-mono text-[11px] font-semibold ${
                a.containsExecutableCode
                  ? "border-amber-300/40 bg-amber-400/10 text-amber-200"
                  : "border-emerald-300/30 bg-emerald-400/[0.08] text-emerald-200"
              }`}
            >
              {a.containsExecutableCode ? <Eye size={12} /> : <EyeOff size={12} />}
              contains_executable_code: {a.containsExecutableCode ? "YES" : "NO"}
            </span>
            {a.classification && (
              <span className="rounded-md border border-fuchsia-300/30 bg-fuchsia-400/10 px-2 py-1 text-[10.5px] font-semibold text-fuchsia-200">
                Classification: {a.classification}
              </span>
            )}
            {st === "review" && !a.errorState && (
              <span className="text-[10.5px] text-[#a29fb1]">Verdict: NEEDS REVIEW — review burden, not a false block.</span>
            )}
          </div>

          {/* Layer 3 — root cause */}
          <p className="mt-2.5 text-[13px] leading-relaxed text-[#bcb8c8]">
            <span className="font-semibold text-[#f0ebf2]">Why: </span>
            {scanning ? "Static VM is walking the container — root cause will be pinned when the verdict latch engages." : a.errorState ? a.errorState.message : a.rootCause}
          </p>
        </div>
      </div>

      {/* Metadata & coverage strip */}
      {!scanning && (
        <div className="relative mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-white/[0.07] pt-4">
          <button className="group flex items-center gap-1.5 font-mono text-[11px] text-[#b9b5c6] hover:text-white" onClick={copySha} title="Copy full SHA-256">
            <Fingerprint size={13} className="text-[#dba0b8]" />
            <span className="hidden md:inline">{a.sha256.slice(0, 18)}…{a.sha256.slice(-8)}</span>
            <span className="md:hidden">{a.sha256.slice(0, 10)}…</span>
            {shaCopied ? <Check size={12} className="text-emerald-300" /> : <Copy size={12} className="opacity-60 group-hover:opacity-100" />}
            <span className={`text-[9.5px] font-semibold ${shaCopied ? "text-emerald-300" : "text-[#837f93]"}`}>{shaCopied ? "Copied!" : "Copy SHA-256"}</span>
          </button>

          <span className="hidden h-3 w-px bg-white/15 sm:block" />

          <span className="flex items-center gap-1.5 text-[11px] text-[#b3afbf]">
            <Boxes size={13} className="text-[#dba0b8]" />
            <b className="text-[#f0ebf2]">{a.format}</b> | Ext: <b className="text-[#f0ebf2]">{a.ext}</b> | {fmtSize(a.sizeMB)} | Ratio: <b className="text-[#f0ebf2]">{a.compressionRatio.toFixed(2)}x</b>
          </span>

          <span className="hidden h-3 w-px bg-white/15 sm:block" />

          <span className="flex items-center gap-1.5 text-[11px] text-[#b3afbf]">
            <Cpu size={13} className="text-[#dba0b8]" />
            Scanned with Ruleset <b className="text-[#f0ebf2]">{a.ruleset}</b> · Engine <b className="text-[#f0ebf2]">{a.engine}</b> on {fmtTime(a.scannedAt)}
          </span>

          <RescanButton id={a.id} />

          <span className="hidden h-3 w-px bg-white/15 sm:block" />

          <span className="flex items-center gap-1.5 text-[11px] text-[#b3afbf]">
            <FileDigit size={13} className="text-[#dba0b8]" />
            Latency <b className="text-[#f0ebf2]">{a.errorState ? "—" : `${(a.latencyMs / 1000).toFixed(1)}s`}</b>
            {a.cacheHit && <span className="glass-chip !text-emerald-200">cache HIT</span>}
          </span>

          {/* Coverage popover */}
          <div className="relative ml-auto">
            <button className={`btn-ghost ${covOpen ? "!border-fuchsia-300/50 !text-fuchsia-200" : ""}`} onClick={() => setCovOpen((o) => !o)}>
              <Info size={12} /> Coverage Matrix <ChevronDown size={11} className={`transition-transform ${covOpen ? "rotate-180" : ""}`} />
            </button>
            {covOpen && (
              <div className="glass-deep rise-in absolute right-0 top-9 z-40 w-[360px] p-4" role="dialog" aria-label="Coverage matrix">
                <p className="text-[11px] font-bold text-emerald-300">✓ Checked by this scan</p>
                <ul className="mt-1.5 space-y-1">
                  {COVERAGE_CHECKED.map((c) => (
                    <li key={c} className="flex items-center gap-2 text-[11px] text-[#b9b5c6]">
                      <ShieldCheck size={12} className="shrink-0 text-emerald-300" /> {c}
                    </li>
                  ))}
                </ul>
                <p className="mt-3 text-[11px] font-bold text-rose-300">✗ Out of scope</p>
                <ul className="mt-1.5 space-y-1">
                  {COVERAGE_NOT_CHECKED.map((c) => (
                    <li key={c} className="flex items-center gap-2 text-[11px] text-[#b3afbf]">
                      <EyeOff size={12} className="shrink-0 text-rose-300" /> {c}
                    </li>
                  ))}
                </ul>
                <p className="mt-3 border-t border-white/10 pt-2 text-[9.5px] leading-relaxed text-[#837f93]">
                  Scope honesty is a feature: Vigilant never claims coverage it does not have.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

function RescanButton({ id }: { id: string }) {
  const startScan = useVigilant((s) => s.startScan);
  const toast = useVigilant((s) => s.toast);
  const [busy, setBusy] = useState(false);
  return (
    <button
      className="btn-ghost"
      onClick={() => {
        setBusy(true);
        toast({ title: "Re-scan queued with latest rules", detail: "Ruleset v2.5.0-rc.3 · cache invalidated", kind: "info" });
        setTimeout(() => { startScan(id); setBusy(false); }, 500);
      }}
      disabled={busy}
    >
      <RefreshCw size={12} className={busy ? "animate-spin" : ""} /> Re-scan with latest rules
    </button>
  );
}
