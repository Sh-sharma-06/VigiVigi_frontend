"use client";

import { useEffect, useState } from "react";
import {
  BadgeCheck,
  Check,
  FileSearch,
  FlaskConical,
  PackageOpen,
  ScanSearch,
} from "lucide-react";

/**
 * Front-page live scan demo — the phase-wise simulation from the earlier
 * build, restored: staggered entrance, pulsing active node, connectors
 * that fill as phases complete, popping checkmarks. Copy kept in simple
 * words on purpose.
 */

const PHASES = [
  { icon: FileSearch, title: "Looking", caption: "Checking what kind of file this is…" },
  { icon: PackageOpen, title: "Opening", caption: "Opening the model's container…" },
  { icon: ScanSearch, title: "Reading", caption: "Looking for code hidden inside…" },
  { icon: FlaskConical, title: "Testing", caption: "Trying it inside a sealed sandbox…" },
  { icon: BadgeCheck, title: "Verdict", caption: "Making the final call…" },
];

const DONE_CAPTION = "All done — the file gets a badge: safe, blocked, or sent to a human.";

export function PhaseSimulation() {
  // 0..4 = phase running, 5 = everything complete, then loops
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const delay = phase === PHASES.length ? 2600 : 1500;
    const t = setTimeout(
      () => setPhase((p) => (p + 1) % (PHASES.length + 1)),
      delay
    );
    return () => clearTimeout(t);
  }, [phase]);

  const allDone = phase === PHASES.length;

  return (
    <div
      className="glass w-full rounded-3xl px-6 pb-5 pt-4"
      aria-label="Live scan demo"
    >
      {/* header */}
      <div className="flex items-center gap-2">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#7c6fe6]/60 [animation-duration:1.8s]" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-[#7c6fe6] shadow-[0_0_8px_rgba(124,111,230,0.9)]" />
        </span>
        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#9ba0f5]">
          {allDone ? "Demo complete" : "Live scan demo"}
        </span>
        <span className="ml-auto font-mono text-[11px] text-[#eef0f3]/40">
          {allDone ? "5 / 5" : `Step ${phase + 1} of 5`}
        </span>
      </div>

      {/* stepper */}
      <div className="mt-4 flex items-start">
        {PHASES.map((p, i) => {
          const done = i < phase;
          const active = i === phase;
          const Icon = p.icon;
          return (
            <div key={p.title} className="flex min-w-0 flex-1 items-start last:flex-none">
              <div
                className="stagger-in flex w-[64px] shrink-0 flex-col items-center gap-1.5"
                style={{ animationDelay: `${i * 90}ms` }}
              >
                <div className="relative">
                  {active && (
                    <span className="absolute inset-0 animate-ping rounded-full bg-[#7c6fe6]/25 [animation-duration:1.6s]" />
                  )}
                  <span
                    className={`relative grid h-9 w-9 place-items-center rounded-full border transition-all duration-300 ${
                      done
                        ? "border-emerald-300/40 bg-emerald-400/15 text-emerald-200 shadow-[0_0_14px_rgba(111,169,184,0.35)]"
                        : active
                          ? "border-[#7c6fe6]/60 bg-[#7c6fe6]/15 text-[#9ba0f5] shadow-[0_0_18px_rgba(124,111,230,0.5),inset_0_1px_0_rgba(255,255,255,0.15)]"
                          : "border-white/[0.12] bg-white/[0.05] text-[#eef0f3]/35"
                    }`}
                  >
                    {done ? (
                      <Check size={15} strokeWidth={2.5} className="animate-pop" />
                    ) : (
                      <Icon size={15} strokeWidth={1.9} />
                    )}
                  </span>
                </div>
                <span
                  className={`text-[10.5px] leading-none transition-colors duration-300 ${
                    active
                      ? "font-semibold text-[#eef0f3]"
                      : done
                        ? "font-medium text-[#eef0f3]/60"
                        : "text-[#eef0f3]/35"
                  }`}
                >
                  {p.title}
                </span>
              </div>

              {/* connector — fills with violet as the phase completes */}
              {i < PHASES.length - 1 && (
                <div className="mt-[18px] h-[2px] min-w-3 flex-1 overflow-hidden rounded-full bg-white/[0.09]">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#7c6fe6] to-[#9ba0f5] shadow-[0_0_8px_rgba(124,111,230,0.6)] transition-[width] duration-500 ease-out"
                    style={{ width: i < phase ? "100%" : "0%" }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* simple-words caption */}
      <p
        key={allDone ? "done" : phase}
        className="animate-fade-in mt-4 text-center text-[13px] leading-5 text-[#eef0f3]/70"
      >
        {allDone ? DONE_CAPTION : PHASES[phase].caption}
      </p>
    </div>
  );
}
