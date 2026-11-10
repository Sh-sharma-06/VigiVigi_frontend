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
import { Button } from "@/components/ui/button";
import { useCopy } from "./bits";
import { useVigilant } from "@/lib/vigilant/store";
import { fmtBytes, fmtDuration, fmtSize } from "@/lib/vigilant/format";
import type { Artifact } from "@/lib/vigilant/types";

/**
 * "Inspect Technical Evidence" — wide panel sliding in from the right,
 * tabbed for security engineers. Hidden from the default reading flow.
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
        className="flex w-full flex-col gap-0 p-0 sm:max-w-[560px]"
      >
        <SheetHeader className="border-b px-5 py-4">
          <SheetTitle className="flex items-center gap-2 text-base">
            <FileSearch size={16} className="text-muted-foreground" />
            Technical Evidence
          </SheetTitle>
          <SheetDescription className="truncate">
            {a.name} · {fmtSize(a.sizeMB)} · ruleset {a.ruleset}
          </SheetDescription>
        </SheetHeader>

        <Tabs defaultValue="pipeline" className="flex min-h-0 flex-1 flex-col">
          <TabsList className="mx-5 mt-4 grid h-9 grid-cols-4">
            <TabsTrigger value="pipeline" className="text-xs">Pipeline</TabsTrigger>
            <TabsTrigger value="manifest" className="text-xs">Manifest</TabsTrigger>
            <TabsTrigger value="opcodes" className="text-xs">Opcodes</TabsTrigger>
            <TabsTrigger value="json" className="text-xs">Raw JSON</TabsTrigger>
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
        <p className="text-xs text-muted-foreground">
          What the scanner did, step by step
        </p>
        <Button variant="outline" size="sm" onClick={replay} className="h-7 gap-1.5 rounded-lg px-2.5 text-xs">
          <RotateCcw size={12} />
          Replay trace
        </Button>
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
                  <span className="my-1 w-px flex-1 bg-border" />
                )}
              </div>
              {/* content */}
              <div className="pb-7">
                <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
                  <p
                    className={`text-[13.5px] leading-5 ${
                      state === "active" ? "font-semibold text-foreground" : "font-medium"
                    } ${state === "pending" ? "text-muted-foreground" : ""}`}
                  >
                    {st.title}
                  </p>
                  {skipped ? (
                    <span className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-[10.5px] text-muted-foreground">
                      Skipped · fast-path
                    </span>
                  ) : (
                    state !== "pending" && (
                      <span className="font-mono text-[11px] text-muted-foreground">
                        {fmtDuration(st.ms)}
                      </span>
                    )
                  )}
                </div>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  {stageBlurb[st.key]}
                </p>
                {state !== "pending" && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {st.metrics.map((m) => (
                      <span
                        key={m.label}
                        className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-[10.5px] text-muted-foreground"
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
        className={`grid h-7 w-7 shrink-0 place-items-center rounded-full border text-white transition-colors duration-300 ${
          skipped ? "border-zinc-200 bg-zinc-300" : "border-emerald-600 bg-emerald-500"
        }`}
      >
        <Check size={13} strokeWidth={3} />
      </span>
    );
  }
  if (state === "active") {
    return (
      <span className="relative grid h-7 w-7 shrink-0 place-items-center rounded-full border-2 border-amber-400 bg-amber-50">
        <span className="absolute h-2 w-2 animate-ping rounded-full bg-amber-400 [animation-duration:1.2s]" />
        <span className="relative h-2 w-2 rounded-full bg-amber-500" />
      </span>
    );
  }
  return (
    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full border bg-muted font-mono text-[11px] text-muted-foreground">
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
      <p className="mb-4 text-xs text-muted-foreground">
        {a.archive.length} entries inside the archive · uncompressed sizes
      </p>
      <div className="overflow-hidden rounded-xl border">
        {a.archive.map((m, i) => {
          const isDir = m.path.endsWith("/");
          return (
            <div
              key={m.path + i}
              className={`flex items-center gap-3 px-3.5 py-3 ${
                i % 2 === 1 ? "bg-muted/40" : "bg-white"
              }`}
            >
              {isDir ? (
                <Folder size={15} className="shrink-0 text-muted-foreground" />
              ) : (
                <FileCode2 size={15} className="shrink-0 text-muted-foreground" />
              )}
              <div className="min-w-0 flex-1">
                <p className="break-all font-mono text-[12.5px] leading-5">{m.path}</p>
                <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                  {m.subformat}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="font-mono text-xs">{m.size > 0 ? fmtBytes(m.size) : "—"}</p>
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
    BLOCKED: "text-red-600",
    "NEEDS REVIEW": "text-amber-600",
    INFO: "text-muted-foreground",
    OK: "text-emerald-600",
  };
  return (
    <p className={`mt-0.5 text-[10.5px] font-semibold ${map[v] ?? "text-muted-foreground"}`}>
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
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Dangerous symbols detected
        </p>
        <div className="flex flex-wrap gap-1.5">
          {dangerous.length === 0 && (
            <p className="text-[13px] text-muted-foreground">None — no executable symbols.</p>
          )}
          {dangerous.map((s) => (
            <span
              key={s.name}
              title={s.note}
              className="rounded-md border border-red-200 bg-red-50 px-2 py-1 font-mono text-[11.5px] font-medium text-red-700"
            >
              {s.name}
              {s.note && <span className="pl-1.5 font-sans font-normal opacity-70">{s.note}</span>}
            </span>
          ))}
        </div>
      </section>

      {safe.length > 0 && (
        <section>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Benign symbols
          </p>
          <div className="flex flex-wrap gap-1.5">
            {safe.map((s) => (
              <span
                key={s.name}
                title={s.note}
                className="rounded-md border bg-muted px-2 py-1 font-mono text-[11.5px] text-muted-foreground"
              >
                {s.name}
              </span>
            ))}
          </div>
        </section>
      )}

      {shellConsts.length > 0 && (
        <section>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Suspicious constants
          </p>
          <div className="flex flex-col gap-1.5">
            {shellConsts.map((c, i) => (
              <p
                key={i}
                className="break-all rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 font-mono text-[11.5px] text-red-700"
              >
                {c.value}
              </p>
            ))}
          </div>
        </section>
      )}

      <section>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Disassembly ({a.opcodes.length} opcodes)
        </p>
        <div className="overflow-hidden rounded-xl border">
          {a.opcodes.map((op, i) => (
            <div
              key={op.offset + i}
              className={`flex items-baseline gap-3 px-3.5 py-1 font-mono text-[11.5px] leading-6 ${
                op.flagged ? "bg-red-50 text-red-700" : i % 2 === 1 ? "bg-muted/40" : ""
              }`}
            >
              <span className={`w-14 shrink-0 ${op.flagged ? "" : "text-muted-foreground"}`}>
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
        <p className="text-xs text-muted-foreground">
          Raw telemetry payload · {json.split("\n").length} lines
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => copy(json)}
          className="h-7 gap-1.5 rounded-lg px-2.5 text-xs"
        >
          {copied ? (
            <Check size={12} className="text-emerald-600" />
          ) : (
            <Copy size={12} />
          )}
          {copied ? "Copied" : "Copy JSON"}
        </Button>
      </div>
      <pre className="nice-scroll max-h-[60vh] overflow-auto rounded-xl border bg-muted/40 p-4 font-mono text-[11.5px] leading-6">
        {json}
      </pre>
    </div>
  );
}
