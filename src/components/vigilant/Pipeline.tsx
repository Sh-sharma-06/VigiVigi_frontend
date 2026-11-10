"use client";

import React, { useState } from "react";
import {
  Fingerprint, Boxes, Braces, ShieldAlert, Lock, Unlock, Play, Square, Gauge, ChevronDown, RotateCcw, AlertTriangle, Timer,
} from "lucide-react";
import { useVigilant } from "@/lib/vigilant/store";
import type { Artifact, ScanRun } from "@/lib/vigilant/types";
import { VERDICT_META } from "./bits";
import { Evidence } from "./Evidence";

type StageStatus = "queued" | "active" | "done" | "skipped";

const NODE_ICONS = [Fingerprint, Boxes, Braces, ShieldAlert, Lock];

const TABS = [
  "Live Pipeline Flowchart",
  "Findings & 5-Sec Inspector",
  "AST & Opcodes",
  "Archive Tree",
  "Sandbox Syscalls",
  "Raw JSON",
];

export function ForensicCanvas() {
  const id = useVigilant((s) => s.selectedId);
  const a = useVigilant((s) => s.artifacts.find((x) => x.id === id));
  const mode = useVigilant((s) => s.pipelineMode);
  const setMode = useVigilant((s) => s.setPipelineMode);
  const tab = useVigilant((s) => s.evidenceTab);
  const setTab = useVigilant((s) => s.setEvidenceTab);

  if (!a) {
    return (
      <section className="glass grid min-h-[320px] place-items-center p-6" aria-label="Forensic canvas">
        <p className="text-xs text-[#8d7fa8]">Select an artifact to open the forensic canvas.</p>
      </section>
    );
  }

  return (
    <section className="glass flex min-h-0 flex-col overflow-hidden" aria-label="Forensic canvas">
      {/* Mode tabs */}
      <div className="no-scrollbar flex items-center gap-1 overflow-x-auto border-b border-white/[0.07] px-3 py-2">
        {TABS.map((t, i) => (
          <button
            key={t}
            onClick={() => (i === 0 ? setMode("flow") : setTab(i - 1))}
            className={`nav-tab !text-[11px] ${
              i === 0
                ? mode === "flow"
                  ? "nav-tab-active"
                  : ""
                : mode === "evidence" && tab === i - 1
                  ? "nav-tab-active"
                  : ""
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {a.errorState && a.status === "error" ? (
        <ErrorPanel a={a} />
      ) : mode === "flow" ? (
        <Pipeline a={a} />
      ) : (
        <Evidence a={a} />
      )}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Error / timeout state                                               */
/* ------------------------------------------------------------------ */

function ErrorPanel({ a }: { a: Artifact }) {
  const retryExtended = useVigilant((s) => s.retryExtended);
  return (
    <div className="rise-in flex min-h-0 flex-1 flex-col items-center justify-center gap-3 overflow-y-auto p-6 text-center vil-scroll">
      <span className="grid h-14 w-14 place-items-center rounded-full border border-rose-300/40 bg-rose-400/10">
        <AlertTriangle size={26} className="text-[#f87171]" />
      </span>
      <p className="text-sm font-bold text-[#fca5a5]">Parser halted · {a.errorState!.stage}</p>
      <p className="max-w-xl text-[12px] leading-relaxed text-[#c3b4da]">{a.errorState!.message}</p>
      <pre className="code-pane w-full max-w-2xl overflow-auto p-3 text-left">{a.errorState!.stack}</pre>
      <button className="btn-gloss" onClick={() => retryExtended(a.id)}>
        <Timer size={13} /> Retry with Extended Sandbox Timeout
      </button>
      <p className="text-[10px] text-[#8d7fa8]">Re-enters at the failed stage and preserves earlier stage telemetry.</p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Live pipeline flowchart (Mode A)                                    */
/* ------------------------------------------------------------------ */

function Pipeline({ a }: { a: Artifact }) {
  const run = useVigilant((s) => s.scanRuns[a.id]);
  const startScan = useVigilant((s) => s.startScan);
  const speed = useVigilant((s) => s.replaySpeed);
  const setSpeed = useVigilant((s) => s.setReplaySpeed);
  const drawer = useVigilant((s) => s.pipelineDrawer);
  const setDrawer = useVigilant((s) => s.setPipelineDrawer);
  const toast = useVigilant((s) => s.toast);

  const running = run?.status === "running";
  const stages = a.plan.stages;

  const statusOf = (i: number): StageStatus => {
    if (!run) return "queued";
    if (i === 3 && a.plan.skipGvisor && run.elapsed > stages[0].ms + stages[1].ms + stages[2].ms * 0.4) return "skipped";
    if (run.status === "done") return i === 3 && a.plan.skipGvisor ? "skipped" : "done";
    const cur = run.currentStage;
    if (cur === -1) return i === 3 && a.plan.skipGvisor ? "skipped" : "done";
    if (i < cur) return i === 3 && a.plan.skipGvisor ? "skipped" : "done";
    if (i === cur) return i === 3 && a.plan.skipGvisor ? "skipped" : "active";
    return "queued";
  };

  const stopScan = () => {
    useVigilant.getState().cancelScan(a.id);
    useVigilant.setState((s) => ({
      scanRuns: { ...s.scanRuns, [a.id]: { ...s.scanRuns[a.id], status: "done", currentStage: -1 } },
      artifacts: s.artifacts.map((x) => (x.id === a.id ? { ...x, status: "done" } : x)),
    }));
    toast({ title: "Scan stopped", detail: `${a.name} — pipeline halted by analyst`, kind: "warn" });
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-2 border-b border-white/[0.07] px-3 py-2">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-[#8d7fa8]">
          5-Stage DAG · lane <b className="text-[#e9d8f5]">{a.plan.lane}</b>
        </span>
        <div className="ml-auto flex items-center gap-1.5">
          <span className="glass-chip"><Gauge size={10} /> replay speed</span>
          {[1, 0.5].map((sp) => (
            <button
              key={sp}
              onClick={() => setSpeed(sp as 1 | 0.5)}
              className={`rounded-full px-2 py-0.5 text-[10px] font-bold transition ${
                speed === sp ? "bg-fuchsia-500/25 text-[#f8e6fc] ring-1 ring-fuchsia-300/40" : "text-[#a798c2] hover:text-white"
              }`}
            >
              {sp}x
            </button>
          ))}
          {running ? (
            <button className="btn-ghost !border-rose-300/40 !text-rose-200" onClick={stopScan}>
              <Square size={11} /> Stop
            </button>
          ) : (
            <button className="btn-gloss !py-1" onClick={() => startScan(a.id)}>
              <Play size={11} /> {a.status === "queued" ? "Start Live Scan" : "Replay Live Scan Simulation"}
            </button>
          )}
          {a.status === "done" && (
            <button className="btn-ghost" onClick={() => startScan(a.id)} title="Instant re-scan">
              <RotateCcw size={11} />
            </button>
          )}
        </div>
      </div>

      {/* Graph */}
      <div className="relative min-h-0 flex-1 overflow-y-auto vil-scroll p-3">
        {/* bypass arc overlay */}
        {statusOf(2) === "done" && a.plan.skipGvisor && (
          <svg className="pointer-events-none absolute hidden lg:block" style={{ left: "41%", right: "21%", top: 10, width: "38%", height: 26 }} viewBox="0 0 100 26" preserveAspectRatio="none">
            <path d="M2,24 C30,2 70,2 98,24" fill="none" stroke="#4ade80" strokeWidth="1.6" strokeDasharray="5 4" opacity="0.85" />
          </svg>
        )}
        <div className="flex flex-col gap-1 md:flex-row md:items-stretch">
          {stages.map((st, i) => (
            <React.Fragment key={st.key}>
              {i > 0 && <Connector state={edgeState(statusOf(i - 1), statusOf(i), run, a, i)} bypass={i === 3 && a.plan.skipGvisor} />}
              <NodeCard a={a} i={i} status={statusOf(i)} run={run} />
            </React.Fragment>
          ))}
        </div>

        {/* Lane branch strip */}
        <div className="mt-3 flex flex-wrap items-center gap-1.5 rounded-xl border border-white/[0.06] bg-black/25 px-3 py-2">
          <span className="text-[9.5px] font-semibold uppercase tracking-wider text-[#8d7fa8]">Format demux lanes:</span>
          {["PICKLE VM", "KERAS / HDF5 AST", "GGUF HEADER", "ONNX GRAPH", "SAFETENSORS BOUNDS"].map((lane) => (
            <span
              key={lane}
              className={`rounded-md px-2 py-0.5 font-mono text-[10px] transition-all ${
                run?.lane === lane
                  ? "bg-fuchsia-500/25 text-[#fbeaff] ring-1 ring-fuchsia-300/50 shadow-[0_0_16px_rgba(201,99,224,0.55)]"
                  : "bg-white/[0.04] text-[#7d6f96]"
              }`}
            >
              {lane}
            </span>
          ))}
          {run?.lane && <span className="ml-1 text-[9.5px] text-[#dc9aee]">← routed</span>}
        </div>

        {/* Node inspector drawer */}
        {drawer !== null && (
          <NodeDrawer a={a} i={drawer} run={run} onClose={() => setDrawer(null)} />
        )}
      </div>
    </div>
  );
}

function edgeState(from: StageStatus, to: StageStatus, run: ScanRun | undefined, a: Artifact, edgeIdx: number): "idle" | "flow" | "done" | "bypass" {
  if (edgeIdx === 3 && a.plan.skipGvisor) return "bypass";
  if (!run) return "idle";
  if (from === "done" && to === "active") return "flow";
  if (from === "active") return "flow";
  if (from === "done" && (to === "done" || to === "skipped")) return "done";
  return "idle";
}

/* ------------------------------------------------------------------ */
/* Node card                                                           */
/* ------------------------------------------------------------------ */

function NodeCard({ a, i, status, run }: { a: Artifact; i: number; status: StageStatus; run: ScanRun | undefined }) {
  const drawer = useVigilant((s) => s.pipelineDrawer);
  const setDrawer = useVigilant((s) => s.setPipelineDrawer);
  const st = a.plan.stages[i];
  const Icon = NODE_ICONS[i];
  const p =
    !run || status === "queued" ? 0 : status === "done" ? 1 : status === "skipped" ? 1 : Math.min(1, (run.stageElapsed[i] ?? 0) / st.ms);
  const revealed = status === "active" ? st.tickers.filter((t) => t.at <= p).length : status === "queued" ? 0 : st.tickers.length;
  const shown = st.tickers.slice(Math.max(0, revealed - 3), revealed);

  const badge =
    status === "done" ? { t: "DONE", c: "#4ade80" }
    : status === "active" ? { t: "ACTIVE", c: "#dc9aee" }
    : status === "skipped" ? { t: "SKIPPED", c: "#7dd3fc" }
    : { t: "QUEUED", c: "#8d7fa8" };

  const accent =
    status === "active" ? "border-fuchsia-300/45 node-active" :
    status === "done" ? "border-emerald-300/25" :
    status === "skipped" ? "border-sky-300/20 opacity-75" :
    "border-white/[0.08] opacity-80";

  return (
    <button
      onClick={() => setDrawer(drawer === i ? null : i)}
      className={`glass relative min-w-0 flex-1 cursor-pointer p-2.5 text-left transition-all md:max-w-[19%] ${accent}`}
      aria-label={`Stage ${i}: ${st.title}`}
    >
      <div className="flex items-center gap-1.5">
        <span className="grid h-5 w-5 shrink-0 place-items-center rounded-md bg-white/[0.07] font-mono text-[9px] font-bold text-[#e9d8f5]">{i}</span>
        <Icon size={14} className={`shrink-0 ${status === "active" ? "text-[#f0b6f8]" : status === "done" ? "text-emerald-300" : status === "skipped" ? "text-sky-300" : "text-[#8d7fa8]"}`} />
        <span className={`ml-auto shrink-0 rounded px-1 py-px text-[8px] font-bold tracking-wider ${status === "active" ? "bg-fuchsia-400/20 text-fuchsia-200" : ""}`} style={{ color: status === "active" ? undefined : badge.c }}>
          {badge.t}
        </span>
      </div>
      <p className="mt-1.5 line-clamp-2 min-h-[26px] text-[10.5px] font-semibold leading-tight text-[#efe5fa]">{st.title}</p>

      {i === 4 && status === "done" && (
        <div className="latch-in mt-1.5 flex items-center gap-1.5 rounded-lg px-2 py-1.5" style={{ background: VERDICT_META[a.verdict === "malicious" ? "malicious" : a.verdict === "review" ? "review" : "clean"].bg, border: `1px solid ${VERDICT_META[a.verdict === "malicious" ? "malicious" : a.verdict === "review" ? "review" : "clean"].border}` }}>
          <Lock size={12} style={{ color: VERDICT_META[a.verdict === "malicious" ? "malicious" : a.verdict === "review" ? "review" : "clean"].color }} />
          <span className="text-[9px] font-extrabold tracking-wide" style={{ color: VERDICT_META[a.verdict === "malicious" ? "malicious" : a.verdict === "review" ? "review" : "clean"].color }}>
            {VERDICT_META[a.verdict === "malicious" ? "malicious" : a.verdict === "review" ? "review" : "clean"].label}
          </span>
        </div>
      )}
      {i === 4 && status === "active" && (
        <div className="mt-1.5 flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/[0.05] px-2 py-1.5">
          <Unlock size={12} className="animate-pulse text-[#dc9aee]" />
          <span className="text-[9px] font-bold tracking-wide text-[#dc9aee]">ENGAGING LATCH…</span>
        </div>
      )}
      {i === 3 && status === "skipped" && (
        <p className="mt-1 text-[9px] font-semibold text-sky-300/90">Skipped · Static Proof Sufficient</p>
      )}

      {/* micro-metrics */}
      <div className="mt-1.5 space-y-0.5">
        {st.metrics.slice(0, 4).map((m) => (
          <div key={m.label} className="flex items-baseline justify-between gap-1.5">
            <span className="truncate text-[8.5px] text-[#9d8fb8]">{m.label}</span>
            <span className={`shrink-0 font-mono text-[9px] font-semibold ${status === "queued" ? "text-[#6d5f85]" : "text-[#e9d8f5]"}`}>
              {metricLive(m, p, status)}
            </span>
          </div>
        ))}
      </div>

      {/* ticker */}
      <div className="mt-1.5 h-[52px] overflow-hidden rounded-lg border border-white/[0.06] bg-black/35 px-1.5 py-1">
        {shown.length === 0 ? (
          <span className="font-mono text-[8.5px] text-[#6d5f85]">{status === "active" ? "…" : "awaiting"}</span>
        ) : (
          shown.map((t, k) => (
            <p key={`${t.at}-${k}`} className="ticker-line truncate font-mono text-[8.5px] leading-[1.6] text-[#c9b8e2]">
              {t.text}
              {k === shown.length - 1 && status === "active" && <span className="caret-blink text-[#f0b6f8]">▍</span>}
            </p>
          ))
        )}
      </div>
    </button>
  );
}

function metricLive(
  m: { label: string; value: string; count?: { from: number; to: number; decimals?: number; suffix?: string } },
  p: number,
  status: StageStatus
): string {
  if (status === "queued") return m.count ? `${m.count.from}${m.count.suffix ?? ""}` : "—";
  if (!m.count) return m.value;
  const eased = 1 - Math.pow(1 - Math.min(1, p), 2);
  const v = m.count.from + (m.count.to - m.count.from) * eased;
  return `${v.toFixed(m.count.decimals ?? 0)}${m.count.suffix ?? ""}`;
}

/* ------------------------------------------------------------------ */
/* Connector                                                           */
/* ------------------------------------------------------------------ */

function Connector({ state, bypass }: { state: "idle" | "flow" | "done" | "bypass"; bypass: boolean }) {
  const stroke =
    state === "flow" ? "#e79bf5" : state === "done" ? (bypass ? "#4ade80" : "#7ee2a8") : state === "bypass" ? "#4ade80" : "#4a3d5c";
  return (
    <div className="relative hidden shrink-0 self-center md:block" style={{ width: 40 }}>
      <svg width={40} height={44} viewBox="0 0 40 44">
        <path
          d="M2,22 H38"
          stroke={stroke}
          strokeWidth={state === "flow" ? 2.2 : 1.6}
          fill="none"
          className={state === "flow" ? "edge-flow" : ""}
          strokeDasharray={state === "idle" ? "4 5" : undefined}
          opacity={state === "idle" ? 0.55 : 1}
          style={state === "flow" ? { filter: "drop-shadow(0 0 6px rgba(231,155,245,0.8))" } : undefined}
        />
        {state === "flow" && (
          <circle r={3} fill="#fbeaff" style={{ filter: "drop-shadow(0 0 6px #e79bf5)" }}>
            <animateMotion dur="0.85s" repeatCount="indefinite" path="M2,22 H38" />
          </circle>
        )}
      </svg>
      {state === "bypass" && (
        <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border border-emerald-300/40 bg-emerald-400/15 px-1.5 py-px text-[7.5px] font-bold text-emerald-200">
          FAST-PATH BYPASS
        </span>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Node inspector drawer                                               */
/* ------------------------------------------------------------------ */

function NodeDrawer({ a, i, run, onClose }: { a: Artifact; i: number; run: ScanRun | undefined; onClose: () => void }) {
  const st = a.plan.stages[i];
  const doneMs = run?.status === "done" ? st.ms : (run?.stageElapsed[i] ?? 0);
  return (
    <div className="rise-in mt-3 rounded-xl border border-fuchsia-300/20 bg-black/35 p-3">
      <div className="flex items-center gap-2">
        <span className="text-[11px] font-bold text-[#f0e2fa]">Stage {i} inspector — {st.title}</span>
        <span className="glass-chip"><Timer size={10} /> {doneMs.toFixed(0)} ms @1x</span>
        <span className="glass-chip">{run?.status === "done" ? "completed" : run?.currentStage === i ? "running" : "idle"}</span>
        <button className="btn-ghost ml-auto !px-2 !py-0.5" onClick={onClose} aria-label="Close drawer"><ChevronDown size={12} /></button>
      </div>
      <div className="mt-2 grid gap-2 md:grid-cols-2">
        <div>
          <p className="mb-1 text-[9px] font-bold uppercase tracking-wider text-[#8d7fa8]">Input state</p>
          <pre className="code-pane p-2">{st.io.input}</pre>
        </div>
        <div>
          <p className="mb-1 text-[9px] font-bold uppercase tracking-wider text-[#8d7fa8]">Output state</p>
          <pre className="code-pane p-2">{st.io.output}</pre>
        </div>
      </div>
      <p className="mb-1 mt-2 text-[9px] font-bold uppercase tracking-wider text-[#8d7fa8]">Raw log lines</p>
      <pre className="code-pane vil-scroll max-h-28 overflow-auto p-2">{st.tickers.map((t) => `[+${(t.at * st.ms).toFixed(0)}ms] ${t.text}`).join("\n")}</pre>
    </div>
  );
}
