"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BadgeCheck,
  Copy,
  FileSearch,
  Hash,
  HardDrive,
  Loader2,
  Lock,
  RefreshCw,
  ScanSearch,
  ShieldAlert,
  ShieldCheck,
  ShieldX,
  Timer,
  UploadCloud,
  Code2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useCopy } from "./bits";
import { SafeLoaderModal } from "./SafeLoaderModal";
import { EvidenceDrawer } from "./EvidenceDrawer";
import { AllowlistPopover } from "./AllowlistPopover";
import {
  useVigilant,
  effectiveStatus,
  type EffectiveStatus,
} from "@/lib/vigilant/store";
import { fmtDuration, fmtSize, shortSha } from "@/lib/vigilant/format";
import { plainSummary, summaryFootnote, verdictMeta, type Tone } from "@/lib/vigilant/plain";
import type { Artifact } from "@/lib/vigilant/types";

/* ------------------------------------------------------------------ */
/* Canvas — routes between empty / scanning / verdict states           */
/* ------------------------------------------------------------------ */

export function Canvas() {
  const artifacts = useVigilant((s) => s.artifacts);
  const selectedId = useVigilant((s) => s.selectedId);
  const allow = useVigilant((s) => s.allowlisted);
  const scanRuns = useVigilant((s) => s.scanRuns);
  const setIntakeOpen = useVigilant((s) => s.setIntakeOpen);

  const a = useMemo(
    () => artifacts.find((x) => x.id === selectedId) ?? null,
    [artifacts, selectedId]
  );

  const [codeOpen, setCodeOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  if (!a) return <EmptyState onUpload={() => setIntakeOpen(true)} />;

  const eff = effectiveStatus(a, allow);
  const run = scanRuns[a.id];
  const scanning = eff === "scanning" || eff === "queued";

  return (
    <div className="flex min-h-[64vh] w-full min-w-0 flex-col">
      {scanning ? (
        <ScanState key={a.id} a={a} run={run} />
      ) : (
        <VerdictView
          key={a.id}
          a={a}
          eff={eff}
          allow={allow}
          onCode={() => setCodeOpen(true)}
          onDrawer={() => setDrawerOpen(true)}
        />
      )}

      <SafeLoaderModal open={codeOpen} onOpenChange={setCodeOpen} a={a} />
      <EvidenceDrawer open={drawerOpen} onOpenChange={setDrawerOpen} a={a} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* A. Hero Verdict + B. Plain-English Summary + C. Action Row          */
/* ------------------------------------------------------------------ */

const toneBadge: Record<Tone, string> = {
  red: "border-red-200 bg-red-50 text-red-700",
  amber: "border-amber-200 bg-amber-50 text-amber-700",
  green: "border-emerald-200 bg-emerald-50 text-emerald-700",
  zinc: "border-border bg-muted text-muted-foreground",
};

function toneIcon(tone: Tone, eff: EffectiveStatus) {
  const cls = "h-4 w-4";
  if (eff === "scanning") return <Loader2 size={15} className={`${cls} animate-spin`} />;
  if (eff === "allowlisted") return <BadgeCheck size={15} className={cls} />;
  switch (tone) {
    case "red":
      return <ShieldX size={15} className={cls} />;
    case "amber":
      return <ShieldAlert size={15} className={cls} />;
    default:
      return <ShieldCheck size={15} className={cls} />;
  }
}

function VerdictView({
  a,
  eff,
  allow,
  onCode,
  onDrawer,
}: {
  a: Artifact;
  eff: EffectiveStatus;
  allow: Record<string, unknown>;
  onCode: () => void;
  onDrawer: () => void;
}) {
  const [copied, copySha] = useCopy();
  const meta = verdictMeta(a, allow);
  const summary = plainSummary(a, allow);
  const footnote = summaryFootnote(a, allow);
  const allowRec = allow[a.id] as { expiry?: string } | undefined;
  const isReview = eff === "review";
  const isError = eff === "error";
  const retryExtended = useVigilant((s) => s.retryExtended);

  return (
    <div className="animate-fade-in mx-auto w-full max-w-3xl px-1 py-2 lg:px-6 lg:py-6">
      {/* ——— A. Hero verdict ——— */}
      <div className="flex flex-wrap items-center gap-2.5">
        <span
          className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-[13px] font-semibold ${toneBadge[meta.tone]}`}
        >
          {toneIcon(meta.tone, eff)}
          {meta.label}
        </span>
        {eff === "allowlisted" && allowRec?.expiry && (
          <span className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs text-muted-foreground">
            Approved · expires {allowRec.expiry}
          </span>
        )}
        {a.cacheHit && (
          <span className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs text-muted-foreground">
            Loaded from verdict cache
          </span>
        )}
      </div>

      <h1 className="mt-5 break-all text-[28px] font-semibold leading-tight tracking-tight lg:text-[32px]">
        {a.name}
      </h1>

      {/* Minimal metadata row */}
      <div className="mt-3.5 flex flex-wrap items-center gap-x-2 gap-y-1.5 text-[13px] text-muted-foreground">
        <button
          onClick={() => copySha(a.sha256)}
          className="-mx-1 inline-flex items-center gap-1.5 rounded-md px-1.5 py-0.5 font-mono transition-colors duration-200 hover:bg-muted"
          aria-label="Copy full SHA-256"
          title={a.sha256}
        >
          <Hash size={13} />
          {shortSha(a.sha256)}
          {copied ? (
            <span className="font-sans text-xs font-medium text-emerald-600">Copied</span>
          ) : (
            <Copy size={12.5} />
          )}
        </button>
        <span aria-hidden>·</span>
        <span className="inline-flex items-center gap-1.5">
          <HardDrive size={13} />
          {fmtSize(a.sizeMB)}
        </span>
        <span aria-hidden>·</span>
        <span className="inline-flex items-center gap-1.5">
          <Timer size={13} />
          {fmtDuration(a.latencyMs)} scan
        </span>
      </div>

      <div className="my-8 border-t" />

      {/* ——— B. Plain-English summary ——— */}
      <section
        className="rounded-2xl border bg-card p-6 shadow-xs lg:p-7"
        aria-label="Plain-English summary"
      >
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          What's going on
        </p>
        <p className="mt-3 text-[15.5px] leading-7 text-foreground/90">{summary}</p>
        {footnote && (
          <p className="mt-3 border-t pt-3 text-[13px] leading-6 text-muted-foreground">
            {footnote}
          </p>
        )}
      </section>

      {/* ——— C. Primary action row ——— */}
      <div className="mt-8 flex flex-wrap items-center gap-3">
        {!isError && (
          <Button
            onClick={onCode}
            className="h-11 gap-2 rounded-xl px-5 text-sm font-medium"
          >
            <Code2 size={16} />
            View Safe-Loader Code
          </Button>
        )}
        {isError && (
          <Button
            onClick={() => retryExtended(a.id)}
            className="h-11 gap-2 rounded-xl px-5 text-sm font-medium"
          >
            <RefreshCw size={15} />
            Retry with Extended Bounds
          </Button>
        )}
        {(isReview || eff === "malicious") && <AllowlistPopover a={a} />}
        <Button
          variant="ghost"
          onClick={onDrawer}
          className="h-11 gap-2 rounded-xl px-5 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <FileSearch size={16} />
          Inspect Technical Evidence
        </Button>
      </div>

      <p className="mt-6 flex items-center gap-2 text-[12.5px] text-muted-foreground">
        <Lock size={12.5} />
        Deep technical data — opcodes, manifests, raw JSON — stays hidden until you
        open it.
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Loading state — pulsing progress ring + skeleton, no console spam   */
/* ------------------------------------------------------------------ */

function ScanState({
  a,
  run,
}: {
  a: Artifact;
  run: { elapsed: number; total: number; currentStage: number } | undefined;
}) {
  const elapsed = run?.elapsed ?? 0;
  const total = Math.max(1, run?.total ?? 1);
  const pct = Math.min(100, Math.round((elapsed / total) * 100));
  const stageTitle =
    a.plan.stages[Math.max(0, Math.min(a.plan.stages.length - 1, run?.currentStage ?? 0))]
      ?.title ?? "Preparing";

  // friendly one-liners per pipeline stage
  const friendly: Record<string, string> = {
    intake: "Fingerprinting the file…",
    demux: "Checking the container's structure…",
    static: "Reading any embedded code…",
    sandbox: "Testing it inside a sealed sandbox…",
    verdict: "Finalizing the verdict…",
  };
  const stageKey = a.plan.stages[Math.max(0, Math.min(a.plan.stages.length - 1, run?.currentStage ?? 0))]?.key ?? "intake";

  const R = 30;
  const C = 2 * Math.PI * R;

  return (
    <div
      className="animate-fade-in grid flex-1 place-items-center py-16"
      role="status"
      aria-label={`Scanning ${a.name}`}
    >
      <div className="flex w-full max-w-md flex-col items-center text-center">
        <div className="relative">
          <svg width="84" height="84" viewBox="0 0 84 84" className="-rotate-90">
            <circle cx="42" cy="42" r={R} fill="none" stroke="#e4e4e7" strokeWidth="6" />
            <circle
              cx="42"
              cy="42"
              r={R}
              fill="none"
              stroke="#18181b"
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={C}
              strokeDashoffset={C - (C * pct) / 100}
              style={{ transition: "stroke-dashoffset 0.2s linear" }}
            />
          </svg>
          <span className="absolute inset-0 m-auto h-2.5 w-2.5 animate-pulse rounded-full bg-primary" />
        </div>

        <h2 className="mt-7 text-lg font-semibold tracking-tight">
          Scanning {a.name}
        </h2>
        <p className="mt-1.5 text-sm text-muted-foreground">
          {friendly[stageKey] ?? "Working…"}{" "}
          <span className="text-muted-foreground/70">
            · Stage {(run?.currentStage ?? 0) + 1} of {a.plan.stages.length}
          </span>
        </p>

        <div className="mt-8 flex w-full flex-col items-center gap-2.5">
          <Skeleton className="h-3 w-64 max-w-full rounded-full" />
          <Skeleton className="h-3 w-40 max-w-full rounded-full" />
          <Skeleton className="h-3 w-52 max-w-full rounded-full" />
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Empty state — friendly scanner prompt                               */
/* ------------------------------------------------------------------ */

function EmptyState({ onUpload }: { onUpload: () => void }) {
  const loadSample = useVigilant((s) => s.loadSample);
  return (
    <div className="animate-fade-in grid flex-1 place-items-center py-16">
      <div className="flex max-w-sm flex-col items-center text-center">
        <div className="relative">
          <div className="absolute inset-0 animate-ping rounded-3xl bg-muted [animation-duration:2.4s]" />
          <div className="relative grid h-20 w-20 place-items-center rounded-3xl border bg-muted/60">
            <ScanSearch size={34} strokeWidth={1.6} className="text-muted-foreground" />
          </div>
        </div>
        <h2 className="mt-7 text-xl font-semibold tracking-tight">
          Drag and drop an AI model to begin
        </h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Drop a <span className="font-mono text-[12.5px]">.pkl</span>,{" "}
          <span className="font-mono text-[12.5px]">.keras</span>,{" "}
          <span className="font-mono text-[12.5px]">.safetensors</span> or any model
          file anywhere on this window. Vigilant checks it for hidden executable
          code before it ever touches your machine.
        </p>
        <div className="mt-7 flex flex-wrap items-center justify-center gap-2.5">
          <Button onClick={onUpload} className="h-10 gap-2 rounded-xl px-4 text-sm font-medium">
            <UploadCloud size={15} />
            Upload a model
          </Button>
          <Button
            variant="ghost"
            onClick={() => loadSample("efficientnet")}
            className="h-10 gap-2 rounded-xl px-4 text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            <ScanSearch size={15} />
            Try a sample scan
          </Button>
        </div>
      </div>
    </div>
  );
}
