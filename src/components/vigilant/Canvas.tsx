"use client";

import { useMemo, useState } from "react";
import {
  BadgeCheck,
  Check,
  Code2,
  Copy,
  FileDown,
  FileSearch,
  FlaskConical,
  Flag,
  Gauge,
  GitBranch,
  Hash,
  HardDrive,
  KeyRound,
  Link2,
  Loader2,
  Lock,
  PackageOpen,
  Puzzle,
  RefreshCw,
  ScanSearch,
  ShieldAlert,
  ShieldCheck,
  ShieldX,
  Sparkles,
  Timer,
  UploadCloud,
  Wrench,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useCopy } from "./bits";
import { highlightPython } from "./bits";
import { SafeLoaderModal } from "./SafeLoaderModal";
import { EvidenceDrawer } from "./EvidenceDrawer";
import { AllowlistPopover } from "./AllowlistPopover";
import { PhaseSimulation } from "./PhaseSimulation";
import { PhaseReplay } from "./PhaseReplay";
import {
  useVigilant,
  effectiveStatus,
  type EffectiveStatus,
} from "@/lib/vigilant/store";
import { fmtDuration, fmtSize, shortSha } from "@/lib/vigilant/format";
import { plainSummary, summaryFootnote, verdictMeta, type Tone } from "@/lib/vigilant/plain";
import { ARTIFACTS } from "@/lib/vigilant/data";
import type { Artifact, Finding } from "@/lib/vigilant/types";

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
        <div key={a.id} className="animate-fade-in flex flex-col gap-5 py-2">
          <div className="glass flex flex-wrap items-center justify-between gap-3 rounded-2xl px-5 py-3.5">
            <div className="flex items-center gap-2.5">
              <Loader2 size={16} className="animate-spin text-[#9ba0f5]" />
              <span className="text-sm font-semibold text-[#eef0f3]">
                Live Scanning · <span className="title-silver-gradient font-semibold">{a.name}</span>
              </span>
            </div>
            <span className="font-mono text-xs text-[#eef0f3]/55">
              Stage {Math.min(a.plan.stages.length, (run?.currentStage ?? 0) + 1)} / {a.plan.stages.length} · SSE Live
            </span>
          </div>
          <PhaseReplay a={a} autoPlay />
        </div>
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
/* Shared bits                                                         */
/* ------------------------------------------------------------------ */

const toneBadge: Record<Tone, string> = {
  red: "border-[#c87a86]/35 bg-[#c87a86]/12 text-[#d4969e] shadow-[0_0_24px_-6px_rgba(200,122,134,0.45),inset_0_1px_0_rgba(255,255,255,0.12)]",
  amber:
    "border-amber-300/35 bg-amber-400/12 text-amber-200 shadow-[0_0_24px_-6px_rgba(201,168,106,0.4),inset_0_1px_0_rgba(255,255,255,0.12)]",
  green:
    "border-emerald-300/35 bg-emerald-400/12 text-emerald-200 shadow-[0_0_24px_-6px_rgba(111,169,184,0.4),inset_0_1px_0_rgba(255,255,255,0.12)]",
  zinc: "border-white/[0.14] bg-white/[0.07] text-[#eef0f3]/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]",
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

function verdictWord(eff: EffectiveStatus): { word: string; dot: string } {
  switch (eff) {
    case "malicious":
      return { word: "Blocked", dot: "bg-[#c87a86] shadow-[0_0_8px_rgba(200,122,134,0.8)]" };
    case "review":
      return { word: "Needs review", dot: "bg-amber-300 shadow-[0_0_8px_rgba(201,168,106,0.8)]" };
    case "allowlisted":
      return { word: "Allowlisted", dot: "bg-emerald-400 shadow-[0_0_8px_rgba(111,169,184,0.8)]" };
    case "clean":
      return { word: "Safe", dot: "bg-emerald-400 shadow-[0_0_8px_rgba(111,169,184,0.8)]" };
    case "error":
      return { word: "Failed", dot: "bg-[#c87a86] shadow-[0_0_8px_rgba(200,122,134,0.8)]" };
    default:
      return { word: "Pending", dot: "bg-[#9ba0f5]" };
  }
}

const DECIDER_LABEL: Record<string, string> = {
  static_pickle_vm: "Static bytecode VM",
  keras_scanner: "Keras format scanner",
  gvisor_sandbox: "Sandbox detonation",
  org_allowlist: "Org allowlist",
};

const CONF_PCT: Record<string, number> = { HIGH: 95, MEDIUM: 72, LOW: 46 };

function findingChip(state: Finding["state"]): string {
  switch (state) {
    case "BLOCKED":
      return "border-[#c87a86]/35 bg-[#c87a86]/12 text-[#d4969e]";
    case "NEEDS REVIEW":
      return "border-amber-300/35 bg-amber-400/12 text-amber-200";
    default:
      return "border-white/[0.13] bg-white/[0.06] text-[#eef0f3]/60";
  }
}

/* ------------------------------------------------------------------ */
/* A. Hero Verdict + B. Plain-English Summary + phase replay + panels  */
/* ------------------------------------------------------------------ */

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
    <div className="animate-fade-in mx-auto w-full max-w-5xl px-1 py-2 lg:px-6 lg:py-6">
      {/* ——— A. Hero verdict banner ——— */}
      <div className="glass relative overflow-hidden rounded-3xl p-7 lg:p-8">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 -top-32 h-72 w-72 rounded-full bg-[#7c6fe6]/25 blur-[70px]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-36 -left-20 h-64 w-64 rounded-full bg-[#9ba0f5]/10 blur-[70px]"
        />

        <div className="relative flex flex-wrap items-center gap-2.5">
          <span
            className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-[13px] font-semibold ${toneBadge[meta.tone]}`}
          >
            {toneIcon(meta.tone, eff)}
            {meta.label}
          </span>
          {eff === "allowlisted" && allowRec?.expiry && (
            <span className="glass-soft inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs text-[#eef0f3]/70">
              Approved · expires {allowRec.expiry}
            </span>
          )}
          {a.cacheHit && (
            <span className="glass-soft inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs text-[#eef0f3]/70">
              Loaded from verdict cache
            </span>
          )}
        </div>

        <h1 className="relative mt-5 break-all text-[28px] font-semibold leading-tight tracking-tight title-silver-gradient lg:text-[32px]">
          {a.name}
        </h1>

        {/* Minimal metadata row */}
        <div className="relative mt-3.5 flex flex-wrap items-center gap-x-2 gap-y-1.5 text-[13px] text-[#eef0f3]/55">
          <button
            onClick={() => copySha(a.sha256)}
            className="-mx-1 inline-flex items-center gap-1.5 rounded-md px-1.5 py-0.5 font-mono transition-colors duration-200 hover:bg-white/[0.09] hover:text-[#eef0f3]"
            aria-label="Copy full SHA-256"
            title={a.sha256}
          >
            <Hash size={13} />
            {shortSha(a.sha256)}
            {copied ? (
              <span className="font-sans text-xs font-medium text-emerald-300">Copied</span>
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

        {/* engine chips */}
        <div className="relative mt-3.5 flex flex-wrap items-center gap-1.5">
          {[
            a.format,
            `ruleset ${a.ruleset}`,
            `engine ${a.engine}`,
            `scanned ${new Date(a.scannedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`,
            `${a.compressionRatio.toFixed(1)}× compression`,
          ].map((chip) => (
            <span
              key={chip}
              className="glass-soft rounded-full px-2.5 py-1 font-mono text-[10.5px] text-[#eef0f3]/55"
            >
              {chip}
            </span>
          ))}
        </div>
      </div>

      {/* ——— Stat strip ——— */}
      <StatStrip a={a} eff={eff} />

      {/* ——— B. Plain-English summary ——— */}
      <section
        className="glass mt-4 rounded-3xl p-6 lg:p-7"
        aria-label="Plain-English summary"
      >
        <p className="text-xs font-medium uppercase tracking-wider text-[#9ba0f5]/80">
          What&apos;s going on
        </p>
        <p className="mt-3 text-[15.5px] leading-7 text-[#eef0f3]/90">{summary}</p>
        {footnote && (
          <p className="mt-3 border-t border-white/[0.08] pt-3 text-[13px] leading-6 text-[#eef0f3]/50">
            {footnote}
          </p>
        )}
      </section>

      {/* ——— Phase-wise data + crazy replay ——— */}
      <PhaseReplay a={a} />

      {/* ——— C. Primary action row ——— */}
      <div className="mt-6 flex flex-wrap items-center gap-3">
        {!isError && (
          <button
            onClick={onCode}
            className="btn-liquid inline-flex h-11 items-center gap-2 rounded-xl px-5 text-sm font-semibold"
          >
            <Code2 size={16} />
            View Safe-Loader Code
          </button>
        )}
        {isError && (
          <button
            onClick={() => retryExtended(a.id)}
            className="btn-liquid inline-flex h-11 items-center gap-2 rounded-xl px-5 text-sm font-semibold"
          >
            <RefreshCw size={15} />
            Retry with Extended Bounds
          </button>
        )}
        {(isReview || eff === "malicious") && <AllowlistPopover a={a} />}
        <Button
          variant="ghost"
          onClick={onDrawer}
          className="h-11 gap-2 rounded-xl border border-transparent px-5 text-sm font-medium text-[#eef0f3]/60 transition-all duration-200 hover:border-white/[0.12] hover:bg-white/[0.06] hover:text-[#eef0f3]"
        >
          <FileSearch size={16} />
          Inspect Technical Evidence
        </Button>
      </div>

      {/* ——— Findings + sandbox snapshot ——— */}
      <div className="mt-6 grid gap-4 lg:grid-cols-[1.55fr_1fr]">
        <FindingsPanel a={a} onDrawer={onDrawer} />
        <SandboxPanel a={a} />
      </div>

      {/* ——— Quick actions ——— */}
      <QuickActions a={a} />

      {/* ——— Remediation ——— */}
      <RemediationCard a={a} />

      <p className="mt-6 flex items-center gap-2 text-[12.5px] text-[#eef0f3]/40">
        <Lock size={12.5} />
        Deep technical data — opcodes, manifests, raw JSON — stays hidden until you
        open it.
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Stat strip — risk · confidence · scan time · decided by             */
/* ------------------------------------------------------------------ */

function StatStrip({ a, eff }: { a: Artifact; eff: EffectiveStatus }) {
  const { word, dot } = verdictWord(eff);
  const conf = CONF_PCT[a.confidence] ?? 60;
  const confColor =
    a.confidence === "HIGH"
      ? "from-emerald-400 to-emerald-300 shadow-[0_0_12px_rgba(111,169,184,0.6)]"
      : a.confidence === "MEDIUM"
        ? "from-amber-400 to-amber-300 shadow-[0_0_12px_rgba(201,168,106,0.55)]"
        : "from-[#7c6fe6] to-[#9ba0f5] shadow-[0_0_12px_rgba(124,111,230,0.55)]";

  const tiles: { label: string; node: React.ReactNode; caption: string }[] = [
    {
      label: "Risk level",
      node: (
        <span className="flex items-center gap-2 text-[15px] font-semibold text-[#eef0f3]">
          <span className={`h-2.5 w-2.5 rounded-full ${dot}`} />
          {word}
        </span>
      ),
      caption: a.containsExecutableCode ? "executable code present" : "no executable code",
    },
    {
      label: "Confidence",
      node: (
        <span className="flex w-full items-center gap-2.5">
          <span className="text-[15px] font-semibold text-[#eef0f3]">{a.confidence}</span>
          <span className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-white/[0.09]">
            <span
              className={`vil-meter block h-full rounded-full bg-gradient-to-r ${confColor}`}
              style={{ width: `${conf}%` }}
            />
          </span>
        </span>
      ),
      caption: "verdict certainty",
    },
    {
      label: "Scan time",
      node: (
        <span className="text-[15px] font-semibold text-[#eef0f3]">
          {fmtDuration(a.latencyMs)}
        </span>
      ),
      caption: a.cacheHit ? "served from verdict cache" : "full 5-phase pipeline",
    },
    {
      label: "Decided by",
      node: (
        <span className="truncate text-[15px] font-semibold text-[#eef0f3]">
          {DECIDER_LABEL[a.decidedBy] ?? a.decidedBy}
        </span>
      ),
      caption: `${a.format} lane`,
    },
  ];

  return (
    <div className="mt-4 grid grid-cols-2 gap-3 xl:grid-cols-4" aria-label="Scan statistics">
      {tiles.map((t) => (
        <div key={t.label} className="glass-soft rounded-2xl px-4 py-3.5 transition-colors duration-200 hover:bg-white/[0.08]">
          <p className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-[#eef0f3]/45">
            {t.label === "Confidence" && <Gauge size={11} className="text-[#9ba0f5]/70" />}
            {t.label}
          </p>
          <div className="mt-2">{t.node}</div>
          <p className="mt-1.5 truncate text-[11px] text-[#eef0f3]/40">{t.caption}</p>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Findings panel — clickable signals that open the evidence drawer    */
/* ------------------------------------------------------------------ */

function FindingsPanel({ a, onDrawer }: { a: Artifact; onDrawer: () => void }) {
  const blocked = a.findings.filter((f) => f.state === "BLOCKED").length;
  const review = a.findings.filter((f) => f.state === "NEEDS REVIEW").length;
  const info = a.findings.filter((f) => f.state === "INFO").length;

  return (
    <section className="glass rounded-3xl p-5 lg:p-6" aria-label="Signals found in this file">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-[15px] font-semibold tracking-tight text-[#eef0f3]">
          Signals in this file
        </h3>
        <span className="glass-soft rounded-full px-2 py-0.5 text-[11px] font-medium text-[#eef0f3]/60">
          {a.findings.length}
        </span>
        <span className="ml-auto flex items-center gap-2.5 text-[11px] text-[#eef0f3]/45">
          {blocked > 0 && <span className="text-[#d4969e]">{blocked} blocked</span>}
          {review > 0 && <span className="text-amber-200/90">{review} review</span>}
          {info > 0 && <span>{info} info</span>}
        </span>
      </div>

      <div className="mt-3.5 flex flex-col gap-2">
        {a.findings.map((f) => (
          <button
            key={f.id}
            onClick={onDrawer}
            className="group flex w-full items-start gap-3 rounded-xl border border-transparent px-3 py-2.5 text-left transition-all duration-200 hover:border-white/[0.12] hover:bg-white/[0.05]"
            title="Open in technical evidence"
          >
            <span
              className={`mt-0.5 shrink-0 rounded-md border px-1.5 py-0.5 text-[9.5px] font-bold tracking-wide ${findingChip(f.state)}`}
            >
              {f.state}
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-baseline gap-2">
                <span className="truncate font-mono text-[12px] font-semibold text-[#e6e8ee]">
                  {f.location}
                </span>
                {f.offset && f.offset !== "—" && (
                  <span className="shrink-0 font-mono text-[10.5px] text-[#eef0f3]/40">
                    @ {f.offset}
                  </span>
                )}
              </span>
              <span className="mt-0.5 block line-clamp-2 text-[12.5px] leading-5 text-[#eef0f3]/60">
                {f.evidence}
              </span>
            </span>
            <FileSearch
              size={14}
              className="mt-1 shrink-0 text-[#eef0f3]/25 transition-colors duration-200 group-hover:text-[#9ba0f5]"
            />
          </button>
        ))}
      </div>

      <button
        onClick={onDrawer}
        className="mt-3.5 inline-flex items-center gap-1.5 text-[12.5px] font-medium text-[#9ba0f5]/85 transition-colors duration-200 hover:text-[#9ba0f5]"
      >
        Open full technical evidence
        <span aria-hidden>→</span>
      </button>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Sandbox snapshot — canaries, syscall hooks, fast-lane state         */
/* ------------------------------------------------------------------ */

function SandboxPanel({ a }: { a: Artifact }) {
  if (a.plan.skipGvisor) {
    return (
      <section className="glass rounded-3xl p-5 lg:p-6" aria-label="Sandbox snapshot">
        <h3 className="text-[15px] font-semibold tracking-tight text-[#eef0f3]">
          Sandbox snapshot
        </h3>
        <div className="mt-4 flex items-start gap-3 rounded-2xl border border-emerald-300/25 bg-emerald-400/[0.07] px-4 py-3.5">
          <ShieldCheck size={18} className="mt-0.5 shrink-0 text-emerald-300" />
          <div>
            <p className="text-[13px] font-semibold text-emerald-100">Fast lane — sandbox skipped</p>
            <p className="mt-1 text-[12.5px] leading-5 text-[#eef0f3]/60">
              The {a.format} format physically can&apos;t store executable code, so detonation
              wasn&apos;t needed. Static passes still walked 100% of the bytes.
            </p>
          </div>
        </div>
        <div className="mt-3.5 flex flex-col gap-1.5">
          {a.hooks.map((h) => (
            <div key={h.name} className="flex items-baseline justify-between gap-2 text-[12px]">
              <span className="font-mono text-[#eef0f3]/70">{h.name}</span>
              <span className={h.count === 0 ? "text-emerald-300/80" : "text-[#eef0f3]/60"}>
                {h.count} calls
              </span>
            </div>
          ))}
        </div>
      </section>
    );
  }

  const touched = a.canaries.filter((c) => c.status === "accessed");
  const armed = a.canaries.length - touched.length;
  const danger = touched.length > 0;

  return (
    <section className="glass rounded-3xl p-5 lg:p-6" aria-label="Sandbox snapshot">
      <div className="flex items-center gap-2">
        <h3 className="text-[15px] font-semibold tracking-tight text-[#eef0f3]">
          Sandbox snapshot
        </h3>
        <span
          className={`ml-auto rounded-full px-2.5 py-1 text-[10.5px] font-semibold ${
            danger
              ? "bg-[#c87a86]/15 text-[#d4969e]"
              : "bg-emerald-400/12 text-emerald-200"
          }`}
        >
          {danger ? `${touched.length} canary hit${touched.length > 1 ? "s" : ""}` : "clean detonation"}
        </span>
      </div>

      {/* canary bar */}
      <div className="mt-4 flex items-center gap-2.5">
        <FlaskConical size={14} className="shrink-0 text-[#9ba0f5]" />
        <div className="flex h-2 min-w-0 flex-1 gap-px overflow-hidden rounded-full bg-white/[0.08]">
          <span
            className={danger ? "h-full bg-[#c87a86] shadow-[0_0_8px_rgba(200,122,134,0.6)]" : "h-full bg-emerald-400/80"}
            style={{ width: `${(touched.length / a.canaries.length) * 100}%` }}
          />
          <span
            className="h-full flex-1 bg-white/[0.16]"
            style={{ width: `${(armed / a.canaries.length) * 100}%` }}
          />
        </div>
        <span className="shrink-0 font-mono text-[10.5px] text-[#eef0f3]/45">
          {armed}/{a.canaries.length} armed
        </span>
      </div>
      {touched.length > 0 && (
        <p className="mt-2 truncate font-mono text-[10.5px] text-[#d4969e]/80">
          touched: {touched.map((c) => c.path).join(", ")}
        </p>
      )}

      {/* syscall hooks */}
      <div className="mt-4 flex flex-col gap-1.5">
        {a.hooks.map((h) => {
          const hot = (h.name === "connect" || h.name === "execve") && h.count > 0;
          return (
            <div
              key={h.name}
              className="glass-soft flex items-center gap-2.5 rounded-xl px-3 py-2"
            >
              <span className={`font-mono text-[11.5px] font-semibold ${hot ? "text-[#d4969e]" : "text-[#9ba0f5]"}`}>
                {h.name}
              </span>
              <span
                className={`shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-bold ${
                  hot ? "bg-[#c87a86]/15 text-[#d4969e]" : "bg-white/[0.07] text-[#eef0f3]/55"
                }`}
              >
                {h.count}
              </span>
              <span className="min-w-0 flex-1 truncate text-[11px] text-[#eef0f3]/45" title={h.detail}>
                {h.detail}
              </span>
            </div>
          );
        })}
      </div>

      {/* mini process timeline */}
      <div className="mt-4 border-t border-white/[0.07] pt-3">
        {a.processTimeline.slice(0, 3).map((e, i) => (
          <div key={i} className="flex items-baseline gap-2.5 py-0.5 text-[11px]">
            <span className="shrink-0 font-mono text-[#9ba0f5]/60">{e.t}</span>
            <span className="shrink-0 font-mono font-semibold text-[#eef0f3]/70">{e.event}</span>
            <span className="min-w-0 truncate text-[#eef0f3]/40" title={e.detail}>
              {e.detail}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Quick actions — download JSON · share link · CI gate · FP report    */
/* ------------------------------------------------------------------ */

function QuickActions({ a }: { a: Artifact }) {
  const toast = useVigilant((s) => s.toast);
  const reportFP = useVigilant((s) => s.reportFP);
  const [fpOpen, setFpOpen] = useState(false);
  const [copied, copy] = useCopy();

  const downloadJson = () => {
    const report = {
      tool: "VIGILANT",
      generatedAt: new Date().toISOString(),
      artifact: { ...a, plan: undefined },
      phases: a.plan.stages.map((st) => ({
        key: st.key,
        title: st.title,
        durationMs: st.ms,
        metrics: st.metrics.map((m) => ({
          label: m.label,
          value: m.count ? `${m.count.to}${m.count.suffix ?? ""}` : m.value,
        })),
      })),
    };
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${a.name}.vigilant-report.json`;
    link.click();
    URL.revokeObjectURL(url);
    toast({ title: "Full report downloaded", detail: `${a.name}.vigilant-report.json · verdict + phase data`, kind: "ok" });
  };

  const share = () => {
    copy(`https://vigilant.app/v/${a.sha256.slice(0, 16)}`);
    toast({ title: "Verdict link copied", detail: "Anyone in your org can open this scan result.", kind: "ok" });
  };

  const ciGate = () => {
    toast({ title: "SHA pinned to pipeline gate", detail: "CI jobs will hard-fail if this exact hash appears again.", kind: "ok" });
  };

  const FP_BUCKETS: { id: "by-design" | "rule-bug" | "parser-gap"; label: string; hint: string }[] = [
    { id: "by-design", label: "By-design code-bearing", hint: "The code is supposed to be there" },
    { id: "rule-bug", label: "Overly broad rule", hint: "A detection rule is too aggressive" },
    { id: "parser-gap", label: "Parser / format gap", hint: "The scanner misread the file" },
  ];

  const tileCls =
    "glass-soft group flex flex-col items-start gap-1.5 rounded-2xl px-4 py-3.5 text-left transition-all duration-200 hover:-translate-y-0.5 hover:bg-white/[0.09] hover:shadow-[0_14px_30px_-16px_rgba(92,95,214,0.55)]";

  return (
    <section className="mt-4" aria-label="Quick actions">
      <h3 className="px-1 text-[12.5px] font-semibold uppercase tracking-[0.14em] text-[#eef0f3]/45">
        Do more with this verdict
      </h3>
      <div className="mt-2.5 grid grid-cols-2 gap-3 xl:grid-cols-4">
        <button onClick={downloadJson} className={tileCls}>
          <FileDown size={17} className="text-[#9ba0f5] transition-transform duration-200 group-hover:scale-110" />
          <span className="text-[13px] font-semibold text-[#eef0f3]/90">Download report</span>
          <span className="text-[11px] leading-4 text-[#eef0f3]/45">Verdict + phase data as JSON</span>
        </button>

        <button onClick={share} className={tileCls}>
          {copied ? (
            <Check size={17} className="text-emerald-300" />
          ) : (
            <Link2 size={17} className="text-[#9ba0f5] transition-transform duration-200 group-hover:scale-110" />
          )}
          <span className="text-[13px] font-semibold text-[#eef0f3]/90">
            {copied ? "Link copied" : "Share verdict"}
          </span>
          <span className="text-[11px] leading-4 text-[#eef0f3]/45">Permanent link for your org</span>
        </button>

        <button onClick={ciGate} className={tileCls}>
          <GitBranch size={17} className="text-[#9ba0f5] transition-transform duration-200 group-hover:scale-110" />
          <span className="text-[13px] font-semibold text-[#eef0f3]/90">Send to CI gate</span>
          <span className="text-[11px] leading-4 text-[#eef0f3]/45">Block this hash in builds</span>
        </button>

        <Popover open={fpOpen} onOpenChange={setFpOpen}>
          <PopoverTrigger asChild>
            <button className={tileCls}>
              <Flag size={17} className="text-[#9ba0f5] transition-transform duration-200 group-hover:scale-110" />
              <span className="text-[13px] font-semibold text-[#eef0f3]/90">Report false positive</span>
              <span className="text-[11px] leading-4 text-[#eef0f3]/45">Tell the triage deck why</span>
            </button>
          </PopoverTrigger>
          <PopoverContent
            align="end"
            sideOffset={10}
            className="menu-liquid w-72 animate-pop rounded-2xl border-white/[0.15] p-4 text-[#eef0f3]"
          >
            <p className="text-[13px] font-semibold">Why is this a false positive?</p>
            <div className="mt-3 flex flex-col gap-1.5">
              {FP_BUCKETS.map((b) => (
                <button
                  key={b.id}
                  onClick={() => {
                    void reportFP(a.id, b.id);
                    setFpOpen(false);
                  }}
                  className="rounded-xl border border-white/[0.1] bg-white/[0.04] px-3 py-2.5 text-left transition-all duration-200 hover:border-white/[0.2] hover:bg-white/[0.1]"
                >
                  <p className="text-[12.5px] font-semibold text-[#eef0f3]/90">{b.label}</p>
                  <p className="mt-0.5 text-[11px] text-[#eef0f3]/45">{b.hint}</p>
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Remediation — how to fix it; risky pattern hidden behind a toggle   */
/* ------------------------------------------------------------------ */

function RemediationCard({ a }: { a: Artifact }) {
  const toast = useVigilant((s) => s.toast);
  const [showVuln, setShowVuln] = useState(false);
  const r = a.remediation;

  return (
    <section className="glass mt-4 rounded-3xl p-5 lg:p-6" aria-label="How to fix">
      <div className="flex items-center gap-2">
        <Wrench size={14} className="text-[#9ba0f5]" />
        <h3 className="text-[15px] font-semibold tracking-tight text-[#eef0f3]">
          {r.title}
        </h3>
        {r.vulnerable && (
          <button
            onClick={() => setShowVuln((v) => !v)}
            className="btn-glass ml-auto inline-flex h-7 items-center gap-1.5 rounded-lg px-2.5 text-[11px] font-medium text-[#eef0f3]/80"
            aria-expanded={showVuln}
          >
            {showVuln ? "Hide risky pattern" : "Show risky pattern"}
          </button>
        )}
      </div>

      {showVuln && r.vulnerable && (
        <pre className="nice-scroll animate-fade-in mt-3 overflow-x-auto rounded-xl border border-[#c87a86]/25 bg-[#c87a86]/[0.06] p-3.5 font-mono text-[11.5px] leading-5 text-[#d4969e]">
          {r.vulnerable}
        </pre>
      )}

      <pre className="nice-scroll mt-3 overflow-x-auto rounded-xl border border-emerald-300/20 bg-emerald-400/[0.05] p-3.5 font-mono text-[11.5px] leading-5 text-emerald-100/90">
        {r.vulnerable ? highlightPython(r.hardened) : r.hardened}
      </pre>

      <div className="mt-3.5 flex flex-wrap items-center gap-2.5">
        {r.extraAction && (
          <button
            onClick={() =>
              toast({ title: r.extraAction!.label, detail: r.extraAction!.result, kind: "ok" })
            }
            className="btn-glass inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold text-[#eef0f3]/90"
          >
            <Sparkles size={12.5} className="text-[#9ba0f5]" />
            {r.extraAction.label}
          </button>
        )}
        {r.note && <p className="text-[11.5px] leading-5 text-[#eef0f3]/45">{r.note}</p>}
      </div>
    </section>
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
      className="animate-fade-in grid flex-1 place-items-center py-10"
      role="status"
      aria-label={`Scanning ${a.name}`}
    >
      <div className="glass w-full max-w-md rounded-3xl px-8 py-14">
        <div className="flex flex-col items-center text-center">
          <div className="relative">
            <svg width="84" height="84" viewBox="0 0 84 84" className="-rotate-90">
              <circle cx="42" cy="42" r={R} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="6" />
              <circle
                cx="42"
                cy="42"
                r={R}
                fill="none"
                stroke="#7c6fe6"
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={C}
                strokeDashoffset={C - (C * pct) / 100}
                style={{ transition: "stroke-dashoffset 0.2s linear", filter: "drop-shadow(0 0 8px rgba(124,111,230,0.65))" }}
              />
            </svg>
            <span className="absolute inset-0 m-auto h-2.5 w-2.5 animate-pulse rounded-full bg-[#7c6fe6] shadow-[0_0_12px_rgba(124,111,230,0.8)]" />
          </div>

          <h2 className="mt-7 text-lg font-semibold tracking-tight title-silver-gradient">
            Scanning {a.name}
          </h2>
          <p className="mt-1.5 text-sm text-[#eef0f3]/55">
            {friendly[stageKey] ?? "Working…"}{" "}
            <span className="text-[#eef0f3]/35">
              · Stage {(run?.currentStage ?? 0) + 1} of {a.plan.stages.length}
            </span>
          </p>

          <div className="mt-8 flex w-full flex-col items-center gap-2.5">
            <Skeleton className="h-3 w-64 max-w-full rounded-full bg-white/[0.09]" />
            <Skeleton className="h-3 w-40 max-w-full rounded-full bg-white/[0.09]" />
            <Skeleton className="h-3 w-52 max-w-full rounded-full bg-white/[0.09]" />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Empty state — drop card + sample chips + live demo + feature tiles  */
/* ------------------------------------------------------------------ */

function EmptyState({ onUpload }: { onUpload: () => void }) {
  const loadSample = useVigilant((s) => s.loadSample);
  const setExtensionOpen = useVigilant((s) => s.setExtensionOpen);
  const setApiKeyOpen = useVigilant((s) => s.setApiKeyOpen);

  const samples = useMemo(() => ARTIFACTS.map((a) => ({
    id: a.id,
    name: a.name,
    sizeMB: a.sizeMB,
    verdict: a.verdict,
  })), []);

  const dotFor = (v: string) =>
    v === "malicious"
      ? "bg-[#c87a86] shadow-[0_0_7px_rgba(200,122,134,0.8)]"
      : v === "review"
        ? "bg-amber-300 shadow-[0_0_7px_rgba(201,168,106,0.75)]"
        : "bg-emerald-400 shadow-[0_0_7px_rgba(111,169,184,0.8)]";

  return (
    <div className="animate-fade-in mx-auto grid w-full max-w-5xl gap-5 px-1 py-4 lg:grid-cols-2 lg:px-6">
      {/* ——— left column: drop card + sample chips ——— */}
      <div className="flex min-w-0 flex-col gap-5">
        <div className="glass relative overflow-hidden rounded-3xl px-8 py-10">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-16 -top-20 h-52 w-52 rounded-full bg-[#7c6fe6]/20 blur-[60px]"
          />
          <div className="relative flex flex-col items-center text-center">
            <div className="relative">
              <div className="absolute inset-0 animate-ping rounded-3xl bg-[#5b5fd6]/30 [animation-duration:2.4s]" />
              <div className="glass-soft relative grid h-20 w-20 place-items-center rounded-3xl">
                <ScanSearch size={34} strokeWidth={1.6} className="text-[#9ba0f5]" />
              </div>
            </div>
            <h2 className="mt-6 text-xl font-semibold tracking-tight text-[#eef0f3]">
              Drag and drop an AI model to begin
            </h2>
            <p className="mt-2 text-sm leading-6 text-[#eef0f3]/55">
              Drop a <span className="font-mono text-[12.5px]">.pkl</span>,{" "}
              <span className="font-mono text-[12.5px]">.keras</span>,{" "}
              <span className="font-mono text-[12.5px]">.safetensors</span> or any model
              file anywhere on this window. Vigilant checks it for hidden executable
              code before it ever touches your machine.
            </p>
            <button
              onClick={onUpload}
              className="btn-liquid mt-6 inline-flex h-10 items-center gap-2 rounded-xl px-4 text-sm font-semibold"
            >
              <UploadCloud size={15} />
              Upload a model
            </button>
          </div>
        </div>

        {/* sample chips */}
        <div className="glass rounded-3xl p-5">
          <div className="flex items-center gap-2">
            <Sparkles size={13} className="text-[#9ba0f5]" />
            <h3 className="text-[14px] font-semibold tracking-tight text-[#eef0f3]">
              Or scan a sample right now
            </h3>
            <span className="ml-auto text-[11px] text-[#eef0f3]/40">
              {samples.length} files · every verdict type
            </span>
          </div>
          <div className="mt-3 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
            {samples.map((s) => (
              <button
                key={s.id}
                onClick={() => loadSample(s.id)}
                className="group flex items-center gap-2.5 rounded-xl border border-transparent px-3 py-2 text-left transition-all duration-200 hover:border-white/[0.13] hover:bg-white/[0.06]"
              >
                <span className={`h-2 w-2 shrink-0 rounded-full ${dotFor(s.verdict)}`} />
                <span className="min-w-0 flex-1 truncate text-[12.5px] font-medium text-[#eef0f3]/85 group-hover:text-[#eef0f3]">
                  {s.name}
                </span>
                <span className="shrink-0 font-mono text-[10.5px] text-[#eef0f3]/35">
                  {fmtSize(s.sizeMB)}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ——— right column: live demo + what we check + promos ——— */}
      <div className="flex min-w-0 flex-col gap-5">
        <PhaseSimulation />

        <div className="glass rounded-3xl p-5">
          <h3 className="text-[14px] font-semibold tracking-tight text-[#eef0f3]">
            What Vigilant checks
          </h3>
          <div className="mt-3.5 flex flex-col gap-2.5">
            {[
              {
                icon: ScanSearch,
                title: "Hidden executable code",
                detail: "Finds code smuggled inside weight files — before it can run.",
              },
              {
                icon: PackageOpen,
                title: "Archive tricks",
                detail: "Catches zip bombs, spoofed headers and nested containers.",
              },
              {
                icon: FlaskConical,
                title: "Sealed-sandbox test",
                detail: "Suspicious files detonate in a box with no network, no secrets.",
              },
            ].map((f) => (
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
        </div>

        {/* promos — same dialogs as the top bar */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <button
            onClick={() => setExtensionOpen(true)}
            className="glass group flex flex-col items-start gap-1.5 rounded-2xl px-4 py-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_16px_36px_-18px_rgba(92,95,214,0.6)]"
          >
            <Puzzle size={17} className="text-[#9ba0f5] transition-transform duration-200 group-hover:scale-110" />
            <span className="text-[13px] font-semibold text-[#eef0f3]/90">Browser extension</span>
            <span className="text-[11px] leading-4 text-[#eef0f3]/50">
              Scan models on Hugging Face with one click.
            </span>
          </button>
          <button
            onClick={() => setApiKeyOpen(true)}
            className="glass group flex flex-col items-start gap-1.5 rounded-2xl px-4 py-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_16px_36px_-18px_rgba(92,95,214,0.6)]"
          >
            <KeyRound size={17} className="text-[#9ba0f5] transition-transform duration-200 group-hover:scale-110" />
            <span className="text-[13px] font-semibold text-[#eef0f3]/90">Company API key</span>
            <span className="text-[11px] leading-4 text-[#eef0f3]/50">
              Wire verdicts into CI — 600 scans/min per org.
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
