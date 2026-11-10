"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Check,
  Copy,
  FileCode2,
  FileSearch,
  Folder,
  RotateCcw,
} from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCopy } from "./bits";
import { useVigilant } from "@/lib/vigilant/store";
import { fmtBytes, fmtDuration, fmtSize } from "@/lib/vigilant/format";
import type { Artifact } from "@/lib/vigilant/types";

/**
 * "Inspect Technical Evidence" — wide liquid-glass panel sliding in from
 * the right, tabbed for security engineers. Hidden from the default flow.
 */
export function EvidenceDrawer({
  open,
  onOpenChange,
  a,
}: {
  open: boolean;
  onOpenChange: (b: boolean) => void;
  a: Artifact;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="glass-deep flex w-full flex-col gap-0 rounded-l-none border-white/[0.12] p-0 text-[#f3effc] sm:max-w-[560px]"
      >
        <SheetHeader className="border-b border-white/[0.08] bg-white/[0.03] px-5 py-4">
          <SheetTitle className="flex items-center gap-2 text-base text-[#f3effc]">
            <FileSearch size={16} className="text-[#c4b5fd]" />
            Technical Evidence
          </SheetTitle>
          <SheetDescription className="truncate text-[#f3effc]/50">
            {a.name} · {fmtSize(a.sizeMB)} · ruleset {a.ruleset}
          </SheetDescription>
        </SheetHeader>

        <Tabs defaultValue="pipeline" className="flex min-h-0 flex-1 flex-col">
          <TabsList className="glass-soft mx-5 mt-4 grid h-10 grid-cols-4 rounded-xl border-white/[0.1]">
            <TabsTrigger
              value="pipeline"
              className="rounded-lg text-xs text-[#f3effc]/55 data-[state=active]:bg-white/[0.13] data-[state=active]:text-[#f3effc] data-[state=active]:shadow-[inset_0_1px_0_rgba(255,255,255,0.14)]"
            >
              Pipeline
            </TabsTrigger>
            <TabsTrigger
              value="manifest"
              className="rounded-lg text-xs text-[#f3effc]/55 data-[state=active]:bg-white/[0.13] data-[state=active]:text-[#f3effc] data-[state=active]:shadow-[inset_0_1px_0_rgba(255,255,255,0.14)]"
            >
              Manifest
            </TabsTrigger>
            <TabsTrigger
              value="opcodes"
              className="rounded-lg text-xs text-[#f3effc]/55 data-[state=active]:bg-white/[0.13] data-[state=active]:text-[#f3effc] data-[state=active]:shadow-[inset_0_1px_0_rgba(255,255,255,0.14)]"
            >
              Opcodes
            </TabsTrigger>
            <TabsTrigger
              value="json"
              className="rounded-lg text-xs text-[#f3effc]/55 data-[state=active]:bg-white/[0.13] data-[state=active]:text-[#f3effc] data-[state=active]:shadow-[inset_0_1px_0_rgba(255,255,255,0.14)]"
            >
              Raw JSON
            </TabsTrigger>
          </TabsList>

          <div className="nice-scroll min-h-0 flex-1 overflow-y-auto px-5 pb-6 pt-4">
            <TabsContent value="pipeline" className="mt-0">
              <PipelineTab a={a} />
            </TabsContent>
            <TabsContent value="manifest" className="mt-0">
              <ManifestTab a={a} />
            </TabsContent>
            <TabsContent value="opcodes" className="mt-0">
              <OpcodesTab a={a} />
            </TabsContent>
            <TabsContent value="json" className="mt-0">
              <RawJsonTab a={a} />
            </TabsContent>
          </div>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}

/* ------------------------------------------------------------------ */
/* Tab 1 — 5-Stage Live Pipeline (animated vertical flowchart)         */
/* ------------------------------------------------------------------ */

const stageBlurb: Record<string, string> = {
  intake: "Hashed the file and checked verdict caches.",
  demux: "Verified the container's structure and size limits.",
  static: "Disassembled embedded code and matched sink signatures.",
  sandbox: "Ran the loader in a sealed gVisor jail with canaries armed.",
  verdict: "Weighed all findings and latched the final verdict.",
};

function PipelineTab({ a }: { a: Artifact }) {
  const run = useVigilant((s) => s.scanRuns[a.id]);
  const live = a.status === "scanning" || a.status === "queued";

  const [nonce, setNonce] = useState(0);
  const [playIdx, setPlayIdx] = useState(a.plan.stages.length);

  useEffect(() => {
    if (nonce === 0) return;
    const iv = setInterval(() => {
      setPlayIdx((i) => {
        if (i >= a.plan.stages.length) {
          clearInterval(iv);
          return i;
        }
        return i + 1;
      });
    }, 620);
    return () => clearInterval(iv);
  }, [nonce, a.plan.stages.length]);

  const replay = () => {
    setPlayIdx(0);
    setNonce((n) => n + 1);
  };

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <p className="text-xs text-[#f3effc]/50">
          What the scanner did, step by step
        </p>
        <button
          onClick={replay}
          className="btn-glass inline-flex h-7 items-center gap-1.5 rounded-lg px-2.5 text-xs text-[#f3effc]/80"
        >
          <RotateCcw size={12} />
          Replay trace
        </button>
      </div>

      <ol className="flex flex-col" key={nonce}>
        {a.plan.stages.map((st, i) => {
          const state = stepState(i, a.plan.stages.length, run, live, playIdx);
          const skipped = st.key === "sandbox" && a.plan.skipGvisor;
          return (
            <li key={`${st.key}-${i}`} className="stagger-in flex gap-3.5" style={{ animationDelay: `${i * 90}ms` }}>
              {/* rail */}
              <div className="flex flex-col items-center">
                <StepCircle state={state} index={i} skipped={skipped} />
                {i < a.plan.stages.length - 1 && (
                  <span className="my-1 w-px flex-1 bg-white/[0.12]" />
                )}
              </div>
              {/* content */}
              <div className="pb-7">
                <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
                  <p
                    className={`text-[13.5px] leading-5 ${
                      state === "active"
                        ? "font-semibold text-[#f3effc]"
                        : state === "pending"
                          ? "font-medium text-[#f3effc]/45"
                          : "font-medium text-[#f3effc]/85"
                    }`}
                  >
                    {st.title}
                  </p>
                  {skipped ? (
                    <span className="glass-soft rounded-md px-1.5 py-0.5 font-mono text-[10.5px] text-[#f3effc]/50">
                      Skipped · fast-path
                    </span>
                  ) : (
                    state !== "pending" && (
                      <span className="font-mono text-[11px] text-[#f3effc]/40">
                        {fmtDuration(st.ms)}
                      </span>
                    )
                  )}
                </div>
                <p className="mt-1 text-xs leading-5 text-[#f3effc]/50">
                  {stageBlurb[st.key]}
                </p>
                {state !== "pending" && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {st.metrics.map((m) => (
                      <span
                        key={m.label}
                        className="glass-soft rounded-md px-1.5 py-0.5 font-mono text-[10.5px] text-[#f3effc]/60"
                      >
                        {m.label}:{" "}
                        {m.count
                          ? `${m.count.to.toLocaleString("en-US")}${m.count.suffix ?? ""}`
                          : m.value}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function stepState(
  i: number,
  total: number,
  run: { currentStage: number } | undefined,
  live: boolean,
  playIdx: number
): "done" | "active" | "pending" {
  if (live) {
    const cur = run?.currentStage ?? 0;
    if (i < cur) return "done";
    if (i === cur) return "active";
    return "pending";
  }
  if (playIdx < total) {
    if (i < playIdx) return "done";
    if (i === playIdx) return "active";
    return "pending";
  }
  return "done";
}

function StepCircle({
  state,
  index,
  skipped,
}: {
  state: "done" | "active" | "pending";
  index: number;
  skipped: boolean;
}) {
  if (state === "done") {
    return (
      <span
        className={`grid h-7 w-7 shrink-0 place-items-center rounded-full border text-[#0c2b1a] transition-colors duration-300 ${
          skipped
            ? "border-white/20 bg-white/25 text-[#f3effc]/80"
            : "border-emerald-300/50 bg-emerald-400 shadow-[0_0_14px_rgba(52,211,153,0.5)]"
        }`}
      >
        <Check size={13} strokeWidth={3} />
      </span>
    );
  }
  if (state === "active") {
    return (
      <span className="relative grid h-7 w-7 shrink-0 place-items-center rounded-full border-2 border-[#a78bfa]/70 bg-[#a78bfa]/15 shadow-[0_0_16px_rgba(167,139,250,0.5)]">
        <span className="absolute h-2 w-2 animate-ping rounded-full bg-[#a78bfa] [animation-duration:1.2s]" />
        <span className="relative h-2 w-2 rounded-full bg-[#a78bfa] shadow-[0_0_8px_rgba(167,139,250,0.9)]" />
      </span>
    );
  }
  return (
    <span className="glass-soft grid h-7 w-7 shrink-0 place-items-center rounded-full font-mono text-[11px] text-[#f3effc]/45">
      {index + 1}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Tab 2 — Archive Manifest                                            */
/* ------------------------------------------------------------------ */

function ManifestTab({ a }: { a: Artifact }) {
  return (
    <div>
      <p className="mb-4 text-xs text-[#f3effc]/50">
        {a.archive.length} entries inside the archive · uncompressed sizes
      </p>
      <div className="overflow-hidden rounded-2xl border border-white/[0.1] bg-white/[0.03] shadow-[inset_0_1px_0_rgba(255,255,255,0.07)]">
        {a.archive.map((m, i) => {
          const isDir = m.path.endsWith("/");
          return (
            <div
              key={m.path + i}
              className={`flex items-center gap-3 px-3.5 py-3 ${
                i % 2 === 1 ? "bg-white/[0.04]" : "bg-transparent"
              }`}
            >
              {isDir ? (
                <Folder size={15} className="shrink-0 text-[#c4b5fd]/70" />
              ) : (
                <FileCode2 size={15} className="shrink-0 text-[#c4b5fd]/70" />
              )}
              <div className="min-w-0 flex-1">
                <p className="break-all font-mono text-[12.5px] leading-5 text-[#f3effc]/90">
                  {m.path}
                </p>
                <p className="mt-0.5 truncate text-[11px] text-[#f3effc]/40">
                  {m.subformat}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="font-mono text-xs text-[#f3effc]/75">
                  {m.size > 0 ? fmtBytes(m.size) : "—"}
                </p>
                <VerdictChip v={m.verdict} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function VerdictChip({ v }: { v: string }) {
  const map: Record<string, string> = {
    BLOCKED: "text-[#ffa1b0]",
    "NEEDS REVIEW": "text-amber-300",
    INFO: "text-[#f3effc]/45",
    OK: "text-emerald-300",
  };
  return (
    <p className={`mt-0.5 text-[10.5px] font-semibold ${map[v] ?? "text-[#f3effc]/45"}`}>
      {v}
    </p>
  );
}

/* ------------------------------------------------------------------ */
/* Tab 3 — Opcodes & Symbols                                           */
/* ------------------------------------------------------------------ */

function OpcodesTab({ a }: { a: Artifact }) {
  const dangerous = a.symbols.filter((s) => s.kind === "dangerous");
  const safe = a.symbols.filter((s) => s.kind !== "dangerous");
  const shellConsts = a.consts.filter((c) => c.kind === "shell" || c.kind === "url");

  return (
    <div className="flex flex-col gap-5">
      <section>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#f3effc]/50">
          Dangerous symbols detected
        </p>
        <div className="flex flex-wrap gap-1.5">
          {dangerous.length === 0 && (
            <p className="text-[13px] text-[#f3effc]/50">None — no executable symbols.</p>
          )}
          {dangerous.map((s) => (
            <span
              key={s.name}
              title={s.note}
              className="rounded-md border border-[#fb5069]/30 bg-[#fb5069]/10 px-2 py-1 font-mono text-[11.5px] font-medium text-[#ffa1b0]"
            >
              {s.name}
              {s.note && <span className="pl-1.5 font-sans font-normal opacity-70">{s.note}</span>}
            </span>
          ))}
        </div>
      </section>

      {safe.length > 0 && (
        <section>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#f3effc]/50">
            Benign symbols
          </p>
          <div className="flex flex-wrap gap-1.5">
            {safe.map((s) => (
              <span
                key={s.name}
                title={s.note}
                className="glass-soft rounded-md px-2 py-1 font-mono text-[11.5px] text-[#f3effc]/65"
              >
                {s.name}
              </span>
            ))}
          </div>
        </section>
      )}

      {shellConsts.length > 0 && (
        <section>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#f3effc]/50">
            Suspicious constants
          </p>
          <div className="flex flex-col gap-1.5">
            {shellConsts.map((c, i) => (
              <p
                key={i}
                className="break-all rounded-lg border border-[#fb5069]/30 bg-[#fb5069]/10 px-2.5 py-1.5 font-mono text-[11.5px] text-[#ffa1b0]"
              >
                {c.value}
              </p>
            ))}
          </div>
        </section>
      )}

      <section>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#f3effc]/50">
          Disassembly ({a.opcodes.length} opcodes)
        </p>
        <div className="overflow-hidden rounded-2xl border border-white/[0.1] bg-black/25 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
          {a.opcodes.map((op, i) => (
            <div
              key={op.offset + i}
              className={`flex items-baseline gap-3 px-3.5 py-1 font-mono text-[11.5px] leading-6 ${
                op.flagged
                  ? "bg-[#fb5069]/12 text-[#ffa1b0]"
                  : i % 2 === 1
                    ? "bg-white/[0.04] text-[#f3effc]/80"
                    : "text-[#f3effc]/70"
              }`}
            >
              <span className={`w-14 shrink-0 ${op.flagged ? "" : "text-[#f3effc]/40"}`}>
                {op.offset}
              </span>
              <span className="w-36 shrink-0 font-semibold">{op.op}</span>
              <span className="min-w-0 flex-1 break-all">{op.arg}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Tab 4 — Raw JSON telemetry                                          */
/* ------------------------------------------------------------------ */

function RawJsonTab({ a }: { a: Artifact }) {
  const [copied, copy] = useCopy();

  const payload = useMemo(
    () => ({
      sample_id: a.id,
      name: a.name,
      format: a.format,
      size_mb: a.sizeMB,
      sha256: a.sha256,
      verdict: a.verdict.toUpperCase(),
      confidence: a.confidence,
      decided_by: a.decidedBy,
      contains_executable_code: a.containsExecutableCode,
      ruleset: a.ruleset,
      engine: a.engine,
      latency_ms: a.latencyMs,
      cache_hit: a.cacheHit,
      findings: a.findings.map((f) => ({
        state: f.state,
        location: f.location,
        offset: f.offset,
        evidence: f.evidence,
      })),
      archive: a.archive.map((m) => ({
        path: m.path,
        subformat: m.subformat,
        size_uncompressed: m.size,
        verdict: m.verdict,
      })),
      sandbox: {
        skipped: a.plan.skipGvisor,
        canaries: a.canaries,
        syscall_hooks: a.hooks,
        process_timeline: a.processTimeline,
      },
      remediation: { title: a.remediation.title },
    }),
    [a]
  );

  const json = useMemo(() => JSON.stringify(payload, null, 2), [payload]);

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs text-[#f3effc]/50">
          Raw telemetry payload · {json.split("\n").length} lines
        </p>
        <button
          onClick={() => copy(json)}
          className="btn-glass inline-flex h-7 items-center gap-1.5 rounded-lg px-2.5 text-xs text-[#f3effc]/80"
        >
          {copied ? (
            <Check size={12} className="text-emerald-300" />
          ) : (
            <Copy size={12} />
          )}
          {copied ? "Copied" : "Copy JSON"}
        </button>
      </div>
      <pre className="nice-scroll max-h-[60vh] overflow-auto rounded-2xl border border-white/[0.1] bg-black/30 p-4 font-mono text-[11.5px] leading-6 text-[#ece5fb] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
        {json}
      </pre>
    </div>
  );
}
