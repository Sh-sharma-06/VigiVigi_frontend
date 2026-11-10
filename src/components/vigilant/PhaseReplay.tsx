"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  BadgeCheck,
  Check,
  FileSearch,
  FlaskConical,
  PackageOpen,
  Pause,
  RotateCcw,
  ScanSearch,
  ShieldAlert,
  ShieldCheck,
  ShieldX,
  Sparkles,
  Zap,
} from "lucide-react";
import { fmtDuration } from "@/lib/vigilant/format";
import type { Artifact, StagePlan } from "@/lib/vigilant/types";

/* ------------------------------------------------------------------ */
/* PhaseReplay — the phase-wise data for THIS file, shown right below  */
/* the plain-English summary, with a replay button that re-runs the    */
/* whole 5-phase pipeline with big, loud, crazy animation.             */
/*                                                                     */
/*  • idle   → every phase card shows its real measured data           */
/*  • replay → cards reset, then light up one by one: laser sweep,     */
/*             orbit rings, energy beams, particle bursts, metric      */
/*             counters, then a verdict stamp slam + confetti + shake  */
/* ------------------------------------------------------------------ */

type PhaseStyle = {
  title: string;
  caption: string;
  icon: React.ComponentType<{ size?: number; className?: string; strokeWidth?: number }>;
};

const PHASE_STYLE: Record<string, PhaseStyle> = {
  intake: {
    title: "Looking",
    caption: "Checking what kind of file this is…",
    icon: FileSearch,
  },
  demux: {
    title: "Opening",
    caption: "Opening the model's container…",
    icon: PackageOpen,
  },
  static: {
    title: "Reading",
    caption: "Reading any code hidden inside…",
    icon: ScanSearch,
  },
  sandbox: {
    title: "Testing",
    caption: "Testing it inside a sealed sandbox…",
    icon: FlaskConical,
  },
  verdict: {
    title: "Verdict",
    caption: "Making the final call…",
    icon: BadgeCheck,
  },
};

/* Concise tags for the idle phase grid — keeps narrow cards readable */
const PHASE_TAG: Record<string, string> = {
  intake: "Type & hash",
  demux: "Container",
  static: "Code & sinks",
  sandbox: "Sandbox",
  verdict: "Verdict",
};

const STAMP = {
  malicious: { label: "BLOCKED", sub: "Malicious · never ran on your machine", cls: "text-[#d4969e] border-[#c87a86]/60 bg-[#c87a86]/12 shadow-[0_0_50px_-8px_rgba(200,122,134,0.7)]", Icon: ShieldX },
  review: { label: "NEEDS REVIEW", sub: "A human gives the final yes", cls: "text-amber-200 border-amber-300/60 bg-amber-400/12 shadow-[0_0_50px_-8px_rgba(201,168,106,0.65)]", Icon: ShieldAlert },
  clean: { label: "SAFE", sub: "No threats detected", cls: "text-emerald-200 border-emerald-300/60 bg-emerald-400/12 shadow-[0_0_50px_-8px_rgba(111,169,184,0.65)]", Icon: ShieldCheck },
} as const;

const CONFETTI_COLORS = ["#7c6fe6", "#9ba0f5", "#ffffff", "#6fa9b8", "#c9a86a", "#c87a86"];

const PHASE_MS = 1000; // per phase at 1x
const SKIP_MS = 420; // fast-lane phase
const STAMP_AT = 350; // beat before the stamp slams

interface Burst {
  id: number;
  node: number;
  tone: string; // particle color
}
interface Confetti {
  id: number;
  cx: string;
  cy: string;
  cr: string;
  color: string;
  w: number;
  h: number;
}

let fxSeq = 1;

export function PhaseReplay({ a }: { a: Artifact }) {
  const [running, setRunning] = useState(false);
  const [phase, setPhase] = useState(-1); // -1 idle · 0..4 active · 5 stamp landed
  const [speed, setSpeed] = useState<1 | 2>(1);
  const [bursts, setBursts] = useState<Burst[]>([]);
  const [confetti, setConfetti] = useState<Confetti[]>([]);
  const [flash, setFlash] = useState(false);
  const [shake, setShake] = useState(false);
  const [auroraKey, setAuroraKey] = useState(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const doneTone =
    a.verdict === "malicious" ? "#c87a86" : a.verdict === "review" ? "#c9a86a" : "#6fa9b8";

  const clearTimers = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }, []);

  useEffect(() => {
    // switching files resets everything
    setRunning(false);
    setPhase(-1);
    setBursts([]);
    setConfetti([]);
    setFlash(false);
    setShake(false);
    clearTimers();
  }, [a.id, clearTimers]);

  useEffect(() => () => clearTimers(), [clearTimers]);

  const burst = (node: number, tone: string) => {
    const id = fxSeq++;
    setBursts((b) => [...b, { id, node, tone }]);
    setTimeout(() => setBursts((b) => b.filter((x) => x.id !== id)), 900);
  };

  const replay = () => {
    if (running) return;
    clearTimers();
    setConfetti([]);
    setFlash(false);
    setShake(false);
    setAuroraKey((k) => k + 1);
    setRunning(true);
    setPhase(0);

    const unit = PHASE_MS / speed;
    const skipUnit = SKIP_MS / speed;
    let t = 0;
    a.plan.stages.forEach((st, i) => {
      const dur = st.key === "sandbox" && a.plan.skipGvisor ? skipUnit : unit;
      t += dur;
      // phase completion → burst + advance
      timers.current.push(
        setTimeout(() => {
          burst(i, i === a.plan.stages.length - 1 ? doneTone : "#9ba0f5");
          if (i < a.plan.stages.length - 1) setPhase(i + 1);
        }, t - 60 / speed)
      );
    });

    // finale: stamp slam + confetti + flash + shake
    const stampT = t + STAMP_AT / speed;
    timers.current.push(
      setTimeout(() => {
        setPhase(5);
        setFlash(true);
        setShake(true);
        const pieces: Confetti[] = Array.from({ length: 22 }, () => {
          const ang = Math.random() * Math.PI * 2;
          const dist = 90 + Math.random() * 130;
          return {
            id: fxSeq++,
            cx: `${Math.cos(ang) * dist}px`,
            cy: `${Math.sin(ang) * dist - 30}px`,
            cr: `${Math.round(Math.random() * 540 - 270)}deg`,
            color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
            w: 5 + Math.round(Math.random() * 6),
            h: 8 + Math.round(Math.random() * 8),
          };
        });
        setConfetti(pieces);
        setTimeout(() => setConfetti((c) => (c === pieces ? [] : c)), 1400);
      }, stampT)
    );
    timers.current.push(setTimeout(() => setRunning(false), stampT + 1400 / speed));
    timers.current.push(setTimeout(() => setFlash(false), stampT + 700));
    timers.current.push(setTimeout(() => setShake(false), stampT + 600));
    // let the finale breathe, then settle back into the full data grid
    timers.current.push(
      setTimeout(() => {
        setPhase(-1);
        setConfetti([]);
      }, stampT + 4600 / speed)
    );
  };

  const stop = () => {
    clearTimers();
    setRunning(false);
    setPhase(-1);
    setBursts([]);
  };

  const stamp = STAMP[a.verdict];
  const activeKey = phase >= 0 && phase < a.plan.stages.length ? a.plan.stages[phase].key : null;
  const activeStyle = activeKey ? PHASE_STYLE[activeKey] : null;
  const stamped = phase === 5;

  return (
    <section
      aria-label="Phase-wise scan data with replay"
      className={`glass relative mt-5 overflow-hidden rounded-3xl p-6 lg:p-7 ${
        running ? "vil-replaying" : ""
      } ${shake ? "vil-shake" : ""}`}
    >
      {/* ambient glows */}
      <div aria-hidden className="pointer-events-none absolute -right-20 -top-24 h-56 w-56 rounded-full bg-[#7c6fe6]/20 blur-[70px]" />
      <div aria-hidden className="pointer-events-none absolute -bottom-28 -left-16 h-52 w-52 rounded-full bg-[#5b5fd6]/15 blur-[70px]" />

      {/* aurora sweep on replay start */}
      {auroraKey > 0 && (
        <div key={auroraKey} aria-hidden className="vil-aurora inset-y-0" />
      )}

      {/* header */}
      <div className="relative flex flex-wrap items-center gap-3">
        <span className="relative flex h-2.5 w-2.5">
          <span className={`absolute inline-flex h-full w-full rounded-full bg-[#7c6fe6]/60 ${running ? "animate-ping" : ""} [animation-duration:1.6s]`} />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[#7c6fe6] shadow-[0_0_10px_rgba(124,111,230,0.9)]" />
        </span>
        <div className="min-w-0">
          <h3 className="text-[15px] font-semibold tracking-tight text-[#eef0f3]">
            How this file was scanned
          </h3>
          <p className="text-xs leading-4 text-[#eef0f3]/50">
            {running
              ? "Replaying the scan — watch every phase light up…"
              : stamped
                ? "Replay finished — this is the verdict that was stamped."
                : "Every phase the scanner ran, with the real numbers it measured."}
          </p>
        </div>

        <div className="ml-auto flex items-center gap-2">
          {/* speed toggle */}
          <div className="glass-soft flex items-center gap-0.5 rounded-lg p-0.5" role="group" aria-label="Replay speed">
            {([1, 2] as const).map((s) => (
              <button
                key={s}
                onClick={() => setSpeed(s)}
                disabled={running}
                className={`rounded-md px-2 py-1 text-[11px] font-semibold transition-all duration-200 disabled:opacity-50 ${
                  speed === s
                    ? "bg-[#7c6fe6]/25 text-[#eef0f3] shadow-[inset_0_1px_0_rgba(255,255,255,0.15)]"
                    : "text-[#eef0f3]/45 hover:text-[#eef0f3]/85"
                }`}
                aria-pressed={speed === s}
              >
                {s}×
              </button>
            ))}
          </div>

          {running ? (
            <button
              onClick={stop}
              className="btn-glass inline-flex h-9 items-center gap-1.5 rounded-xl px-3.5 text-[13px] font-semibold text-[#eef0f3]/90"
            >
              <Pause size={14} />
              Stop
            </button>
          ) : (
            <button
              onClick={replay}
              className="btn-liquid group inline-flex h-9 items-center gap-1.5 rounded-xl px-4 text-[13px] font-semibold"
            >
              <RotateCcw size={14} className="transition-transform duration-300 group-hover:-rotate-180" />
              Replay scan
              <Sparkles size={13} className="text-white/80" />
            </button>
          )}
        </div>
      </div>

      {/* stepper + laser */}
      <div className="relative mt-6">
        {running && phase < a.plan.stages.length && (
          <div
            aria-hidden
            className="vil-laser"
            style={{ ["--laser-dur" as string]: `${(activeKey === "sandbox" && a.plan.skipGvisor ? SKIP_MS : PHASE_MS) / speed}ms` }}
          />
        )}
        <div className="flex items-start">
          {a.plan.stages.map((st, i) => {
            const style = PHASE_STYLE[st.key] ?? PHASE_STYLE.intake;
            const skipped = st.key === "sandbox" && a.plan.skipGvisor;
            const done = phase === -1 || stamped || i < phase;
            const active = running && i === phase;
            const Icon = skipped && !done ? Zap : style.icon;
            return (
              <div key={st.key + i} className="flex min-w-0 flex-1 items-start last:flex-none">
                <div
                  className={`flex w-[68px] shrink-0 flex-col items-center gap-1.5 ${active ? "vil-card-pop" : ""}`}
                  style={active ? { animationDelay: "0ms" } : undefined}
                >
                  <div className="relative">
                    {active && (
                      <>
                        <span className="vil-orbit" />
                        <span className="vil-orbit vil-orbit-fast" />
                        <span className="absolute inset-0 animate-ping rounded-full bg-[#7c6fe6]/30 [animation-duration:1.1s]" />
                      </>
                    )}
                    {done && !running && !stamped && (
                      <span className="absolute inset-0 rounded-full bg-emerald-400/10 blur-[6px]" />
                    )}
                    {/* particle bursts + shockwave anchor here */}
                    {bursts
                      .filter((b) => b.node === i)
                      .map((b) => (
                        <span key={b.id} aria-hidden className="pointer-events-none absolute left-1/2 top-1/2 h-9 w-9">
                          <span className="vil-shockwave" />
                          {Array.from({ length: 10 }).map((_, p) => {
                            const ang = (p / 10) * Math.PI * 2 + i * 0.7;
                            const dist = 26 + Math.random() * 26;
                            return (
                              <span
                                key={p}
                                className="vil-particle"
                                style={{
                                  color: b.tone,
                                  background: b.tone,
                                  width: p % 3 === 0 ? 5 : 3.5,
                                  height: p % 3 === 0 ? 5 : 3.5,
                                  ["--tx" as string]: `${Math.cos(ang) * dist}px`,
                                  ["--ty" as string]: `${Math.sin(ang) * dist}px`,
                                }}
                              />
                            );
                          })}
                        </span>
                      ))}
                    <span
                      className={`relative grid h-10 w-10 place-items-center rounded-full border transition-all duration-300 ${
                        done
                          ? skipped
                            ? "border-white/25 bg-white/[0.08] text-[#eef0f3]/60"
                            : i === a.plan.stages.length - 1
                              ? "shadow-[0_0_20px_rgba(111,169,184,0.45)]"
                              : "border-emerald-300/40 bg-emerald-400/15 text-emerald-200 shadow-[0_0_16px_rgba(111,169,184,0.4)]"
                          : ""
                      } ${
                        active
                          ? "border-[#7c6fe6]/70 bg-[#7c6fe6]/20 text-white shadow-[0_0_26px_rgba(124,111,230,0.75),inset_0_1px_0_rgba(255,255,255,0.25)]"
                          : ""
                      } ${!done && !active ? "border-white/[0.12] bg-white/[0.05] text-[#eef0f3]/35" : ""}`}
                      style={
                        done && i === a.plan.stages.length - 1
                          ? { borderColor: `${doneTone}66`, background: `${doneTone}22`, color: doneTone }
                          : undefined
                      }
                    >
                      {done && !active ? (
                        skipped && i !== a.plan.stages.length - 1 ? (
                          <Zap size={14} />
                        ) : (
                          <Check size={16} strokeWidth={2.6} className="animate-pop" />
                        )
                      ) : (
                        <Icon size={16} strokeWidth={1.9} className={active ? "animate-pulse" : ""} />
                      )}
                    </span>
                  </div>
                  <span
                    className={`text-center text-[10.5px] leading-tight transition-colors duration-300 ${
                      active ? "font-semibold text-[#eef0f3]" : done ? "font-medium text-[#eef0f3]/65" : "text-[#eef0f3]/35"
                    }`}
                  >
                    {skipped ? "Fast lane" : style.title}
                  </span>
                  <span className="font-mono text-[9.5px] leading-none text-[#eef0f3]/30">
                    {fmtDuration(st.ms)}
                  </span>
                </div>

                {i < a.plan.stages.length - 1 && (
                  <div className="relative mt-[19px] h-[3px] min-w-3 flex-1 overflow-hidden rounded-full bg-white/[0.09]">
                    {active ? (
                      <div className="vil-beam h-full w-full rounded-full" />
                    ) : (
                      <div
                        className={`h-full rounded-full bg-gradient-to-r from-[#7c6fe6] to-[#9ba0f5] transition-[width] duration-500 ease-out ${
                          done ? "shadow-[0_0_10px_rgba(124,111,230,0.7)]" : ""
                        }`}
                        style={{ width: done ? "100%" : "0%" }}
                      />
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* live detail card — caption + streaming tickers + counting metrics */}
      <div className="relative mt-6 min-h-[112px]">
        {activeStyle && running ? (
          <div key={phase} className="animate-fade-in glass-soft rounded-2xl p-4">
            <div className="flex items-center gap-2">
              <Sparkles size={13} className="vil-twinkle text-[#9ba0f5]" />
              <p className="text-[13.5px] font-semibold text-[#eef0f3]">
                {a.plan.stages[phase].key === "sandbox" && a.plan.skipGvisor
                  ? "Fast lane — this format can't carry code, no sandbox needed."
                  : activeStyle.caption}
              </p>
            </div>
            <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1">
              {a.plan.stages[phase].tickers.slice(-2).map((tk, i) => (
                <p
                  key={i}
                  className="animate-fade-in max-w-full truncate font-mono text-[11px] text-[#eef0f3]/55"
                  style={{ animationDelay: `${i * 260 + 140}ms` }}
                >
                  <span className="text-[#9ba0f5]/70">▸ </span>
                  {tk.text}
                </p>
              ))}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {a.plan.stages[phase].metrics.slice(0, 4).map((m) => (
                <MetricPill key={m.label} m={m} active />
              ))}
            </div>
          </div>
        ) : stamped ? (
          /* ——— verdict stamp finale ——— */
          <div className="relative grid place-items-center py-2">
            {flash && <span aria-hidden className="vil-flash" />}
            {confetti.map((c) => (
              <span
                key={c.id}
                aria-hidden
                className="vil-confetti"
                style={{
                  background: c.color,
                  width: c.w,
                  height: c.h,
                  ["--cx" as string]: c.cx,
                  ["--cy" as string]: c.cy,
                  ["--cr" as string]: c.cr,
                }}
              />
            ))}
            <div className={`vil-stamp relative flex items-center gap-3 rounded-2xl border-2 px-6 py-3.5 backdrop-blur-sm ${stamp.cls}`}>
              <stamp.Icon size={26} strokeWidth={2.2} />
              <div>
                <p className="text-lg font-extrabold tracking-wide">{stamp.label}</p>
                <p className="text-[11px] font-medium tracking-wide opacity-75">
                  {stamp.sub}
                </p>
              </div>
            </div>
            <p className="mt-3 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.18em] text-[#eef0f3]/40">
              <ShieldCheck size={12} className="text-[#9ba0f5]/70" />
              Stamped by Vigilant · engine {a.engine}
            </p>
          </div>
        ) : (
          /* ——— idle: full phase-wise data grid ——— */
          <div className={`grid gap-2.5 sm:grid-cols-2 ${a.plan.stages.length === 5 ? "xl:grid-cols-5" : "xl:grid-cols-4"}`}>
            {a.plan.stages.map((st, i) => (
              <IdlePhaseCard key={st.key + i} a={a} st={st} index={i} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Idle card — one phase, its duration + real measured numbers         */
/* ------------------------------------------------------------------ */

function IdlePhaseCard({ a, st, index }: { a: Artifact; st: StagePlan; index: number }) {
  const style = PHASE_STYLE[st.key] ?? PHASE_STYLE.intake;
  const skipped = st.key === "sandbox" && a.plan.skipGvisor;
  const isVerdict = index === a.plan.stages.length - 1;
  const Icon = skipped ? Zap : style.icon;

  return (
    <div className="glass-soft rounded-2xl p-3.5 transition-all duration-200 hover:bg-white/[0.08]">
      <div className="flex items-center gap-2">
        <span
          className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg ${
            skipped
              ? "bg-white/[0.07] text-[#eef0f3]/55"
              : isVerdict
                ? a.verdict === "malicious"
                  ? "bg-[#c87a86]/15 text-[#d4969e]"
                  : a.verdict === "review"
                    ? "bg-amber-400/15 text-amber-200"
                    : "bg-emerald-400/15 text-emerald-200"
                : "bg-[#7c6fe6]/15 text-[#9ba0f5]"
          }`}
        >
          <Icon size={13.5} />
        </span>
        <div className="min-w-0">
          <p className="truncate text-[12.5px] font-semibold text-[#eef0f3]/90">
            {skipped ? "Fast lane" : style.title}
          </p>
          <p className="truncate text-[10px] leading-3 text-[#eef0f3]/40">
            {skipped ? "sandbox skipped" : PHASE_TAG[st.key] ?? style.title}
          </p>
        </div>
        <span className="ml-auto shrink-0 font-mono text-[9.5px] text-[#eef0f3]/35">
          {fmtDuration(st.ms)}
        </span>
      </div>

      {isVerdict ? (
        <p
          className={`mt-2.5 truncate rounded-lg px-2 py-1.5 text-center text-[11px] font-bold tracking-wide ${
            a.verdict === "malicious"
              ? "bg-[#c87a86]/12 text-[#d4969e]"
              : a.verdict === "review"
                ? "bg-amber-400/12 text-amber-200"
                : "bg-emerald-400/12 text-emerald-200"
          }`}
        >
          {STAMP[a.verdict].label}
        </p>
      ) : (
        <div className="mt-2.5 flex flex-col gap-1">
          {st.metrics.slice(0, 2).map((m) => {
            const val = m.count ? `${m.count.to.toLocaleString()}${m.count.suffix ?? ""}` : m.value;
            return (
              <div key={m.label} className="flex items-baseline justify-between gap-2">
                <span className="min-w-0 truncate text-[10px] text-[#eef0f3]/45">{m.label}</span>
                <span className="shrink-0 font-mono text-[10.5px] font-semibold text-[#e6e8ee]/90">
                  {val}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Metric pill — counts up furiously while its phase is active         */
/* ------------------------------------------------------------------ */

function MetricPill({ m, active }: { m: StagePlan["metrics"][number]; active: boolean }) {
  const target = m.count?.to ?? null;
  const [v, setV] = useState(target ?? 0);

  useEffect(() => {
    if (target === null) return;
    if (!active) {
      setV(target);
      return;
    }
    let raf = 0;
    const t0 = performance.now();
    const dur = 750;
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / dur);
      setV(target * (1 - Math.pow(1 - p, 3)));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, active]);

  if (target === null) {
    return (
      <span className="glass-soft rounded-lg px-2.5 py-1.5 text-[11px]">
        <span className="text-[#eef0f3]/45">{m.label}: </span>
        <span className="font-mono font-semibold text-[#e6e8ee]">{m.value}</span>
      </span>
    );
  }
  const decimals = m.count?.decimals ?? 0;
  return (
    <span className="glass-soft rounded-lg px-2.5 py-1.5 text-[11px]">
      <span className="text-[#eef0f3]/45">{m.label}: </span>
      <span className="font-mono font-semibold tabular-nums text-[#e6e8ee]">
        {v.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}
        {m.count?.suffix ?? ""}
      </span>
    </span>
  );
}
