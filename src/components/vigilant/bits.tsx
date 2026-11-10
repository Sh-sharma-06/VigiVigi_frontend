"use client";

import React, { useEffect, useRef, useState } from "react";
import { Check, Copy, Download, AlertTriangle, ShieldX, ShieldCheck, Eye, Clock, Loader2, BadgeCheck } from "lucide-react";
import type { BaseVerdict, Confidence, ScanRun } from "@/lib/vigilant/types";
import { useVigilant } from "@/lib/vigilant/store";

/* ---------------------------------------------------------------- */
/* Brand                                                             */
/* ---------------------------------------------------------------- */

export function ShieldMark({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <defs>
        <linearGradient id="vil-shield" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#f5a3c4" />
          <stop offset="100%" stopColor="#962d5c" />
        </linearGradient>
      </defs>
      <path
        d="M12 1.6 3.8 4.7v6.1c0 5.2 3.5 10 8.2 11.6 4.7-1.6 8.2-6.4 8.2-11.6V4.7L12 1.6z"
        fill="url(#vil-shield)"
        stroke="rgba(255,255,255,0.55)"
        strokeWidth="0.9"
      />
      <path d="M8.1 7.6 12 15.8l3.9-8.2h-2.2L12 11.9 10.3 7.6H8.1z" fill="#3d0f24" />
    </svg>
  );
}

/* ---------------------------------------------------------------- */
/* Verdict visuals                                                   */
/* ---------------------------------------------------------------- */

export type EffState = "malicious" | "review" | "clean" | "allowlisted" | "error" | "scanning" | "queued";

export const VERDICT_META: Record<EffState, { label: string; short: string; color: string; bg: string; border: string; icon: React.ComponentType<{ size?: number | string; className?: string }> }> = {
  malicious: { label: "MALICIOUS · HARD BLOCKED", short: "Blocked", color: "#ff5c8a", bg: "rgba(255,60,120,0.12)", border: "rgba(255,92,138,0.45)", icon: ShieldX },
  review: { label: "NEEDS REVIEW: Contains executable code", short: "Needs Review", color: "#ffc46b", bg: "rgba(255,180,84,0.10)", border: "rgba(255,196,107,0.42)", icon: Eye },
  clean: { label: "NO THREATS DETECTED", short: "No Threats", color: "#4ade80", bg: "rgba(74,222,128,0.10)", border: "rgba(74,222,128,0.4)", icon: ShieldCheck },
  allowlisted: { label: "ALLOWLISTED (ORG OVERRIDE)", short: "Allowlisted", color: "#7dd3fc", bg: "rgba(125,211,252,0.10)", border: "rgba(125,211,252,0.4)", icon: BadgeCheck },
  error: { label: "SCAN ERROR / UNSUPPORTED", short: "Error", color: "#f87171", bg: "rgba(248,113,113,0.10)", border: "rgba(248,113,113,0.42)", icon: AlertTriangle },
  scanning: { label: "SCANNING…", short: "Scanning", color: "#ef95bb", bg: "rgba(201,99,224,0.12)", border: "rgba(220,154,238,0.45)", icon: Loader2 },
  queued: { label: "QUEUED", short: "Queued", color: "#94919f", bg: "rgba(255,255,255,0.05)", border: "rgba(255,255,255,0.16)", icon: Clock },
};

export const CONFIDENCE_COLOR: Record<Confidence, string> = {
  HIGH: "#4ade80",
  MEDIUM: "#ffc46b",
  LOW: "#f87171",
};

/* ---------------------------------------------------------------- */
/* Small components                                                  */
/* ---------------------------------------------------------------- */

export function GlassPill({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <span className={`glass-pill ${className}`}>{children}</span>;
}

export function ProgressRing({
  progress,
  size = 34,
  stroke = 3.2,
  label,
  color = "#ef95bb",
}: {
  progress: number; // 0..1
  size?: number;
  stroke?: number;
  label?: string;
  color?: string;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(255,255,255,0.12)" strokeWidth={stroke} fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - Math.max(0, Math.min(1, progress)))}
          style={{ transition: "stroke-dashoffset 0.12s linear", filter: `drop-shadow(0 0 5px ${color}88)` }}
        />
      </svg>
      {label && (
        <span className="absolute inset-0 grid place-items-center text-[8px] font-bold text-[#f0ebf2]">{label}</span>
      )}
    </div>
  );
}

export function Donut({
  segments,
  size = 118,
  thickness = 20,
  center,
}: {
  segments: { value: number; color: string }[];
  size?: number;
  thickness?: number;
  center?: React.ReactNode;
}) {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  const arcs = segments.map((s, i) => {
    const startFrac = segments.slice(0, i).reduce((acc, x) => acc + x.value, 0) / total;
    const frac = s.value / total;
    const dash = Math.max(0, frac * c - 3);
    return { ...s, dash, off: -startFrac * c };
  });
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(255,255,255,0.07)" strokeWidth={thickness} fill="none" />
        {arcs.map((s, i) => (
          <circle
            key={i}
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke={s.color}
            strokeWidth={thickness}
            fill="none"
            strokeDasharray={`${s.dash} ${c - s.dash}`}
            strokeDashoffset={s.off}
            strokeLinecap="butt"
            style={{ filter: `drop-shadow(0 0 6px ${s.color}55)` }}
          />
        ))}
      </svg>
      {center && <div className="absolute inset-0 grid place-items-center">{center}</div>}
    </div>
  );
}

export function CopyButton({
  text,
  label,
  copiedLabel = "Copied!",
  className = "btn-ghost",
  iconOnly = false,
}: {
  text: string;
  label?: string;
  copiedLabel?: string;
  className?: string;
  iconOnly?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className={`${className} ${copied ? "!border-emerald-300/50 !text-emerald-200" : ""}`}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
        } catch {
          const ta = document.createElement("textarea");
          ta.value = text;
          document.body.appendChild(ta);
          ta.select();
          document.execCommand("copy");
          ta.remove();
        }
        setCopied(true);
        setTimeout(() => setCopied(false), 1400);
      }}
      aria-label={label ?? "copy"}
    >
      {copied ? <Check size={12} /> : <Copy size={12} />}
      {!iconOnly && <span>{copied ? copiedLabel : label ?? "Copy"}</span>}
    </button>
  );
}

export function CodeBlock({
  code,
  title,
  tone = "neutral",
  maxHeight,
  copy = true,
}: {
  code: string;
  title?: string;
  tone?: "neutral" | "bad" | "good";
  maxHeight?: number;
  copy?: boolean;
}) {
  return (
    <div className="relative">
      {(title || copy) && (
        <div className="mb-1.5 flex items-center justify-between">
          {title && (
            <span className={`text-[10px] font-semibold tracking-wide ${tone === "bad" ? "text-rose-300" : tone === "good" ? "text-emerald-300" : "text-[#a29fb1]"}`}>
              {title}
            </span>
          )}
          {copy && <CopyButton text={code} className="btn-ghost !px-2 !py-0.5 !text-[10px]" />}
        </div>
      )}
      <pre className="code-pane vil-scroll overflow-auto p-3" style={{ maxHeight }}>
        <code>{code}</code>
      </pre>
    </div>
  );
}

export function DownloadButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button type="button" className="btn-ghost" onClick={onClick}>
      <Download size={12} /> {label}
    </button>
  );
}

/* ---------------------------------------------------------------- */
/* Toasts                                                            */
/* ---------------------------------------------------------------- */

export function Toasts() {
  const toasts = useVigilant((s) => s.toasts);
  const dismiss = useVigilant((s) => s.dismissToast);
  const kindColor: Record<string, string> = {
    ok: "border-emerald-300/40 text-emerald-200",
    warn: "border-amber-300/40 text-amber-200",
    err: "border-rose-300/40 text-rose-200",
    info: "border-fuchsia-300/40 text-fuchsia-200",
  };
  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[95] flex w-80 flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`toast-in glass pointer-events-auto cursor-pointer border px-4 py-3 ${kindColor[t.kind]}`}
          onClick={() => dismiss(t.id)}
          role="status"
        >
          <div className="text-xs font-semibold">{t.title}</div>
          {t.detail && <div className="mt-0.5 text-[11px] leading-snug text-[#b3afbf]">{t.detail}</div>}
        </div>
      ))}
    </div>
  );
}

/* ---------------------------------------------------------------- */
/* Helpers                                                           */
/* ---------------------------------------------------------------- */

export function fmtSize(mb: number): string {
  if (mb >= 1024) return `${(mb / 1024).toFixed(2)} GB`;
  return `${mb.toFixed(2)} MB`;
}

export function fmtTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("en-GB", {
    day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", second: "2-digit",
  }).replace(",", " ·");
}

export function truncSha(sha: string, head = 6, tail = 4): string {
  return `${sha.slice(0, head)}…${sha.slice(-tail)}`;
}

/** derive live values for count-up metrics from stage progress */
export function metricValue(
  m: { label: string; value: string; count?: { from: number; to: number; decimals?: number; suffix?: string } },
  progress: number
): string {
  if (!m.count) return m.value;
  const p = Math.max(0, Math.min(1, progress));
  const eased = 1 - Math.pow(1 - p, 2);
  const v = m.count.from + (m.count.to - m.count.from) * eased;
  const dec = m.count.decimals ?? 0;
  return `${v.toFixed(dec)}${m.count.suffix ?? ""}`;
}

export function useTicker() {
  const ref = useRef<ScanRun | null>(null);
  return ref;
}
