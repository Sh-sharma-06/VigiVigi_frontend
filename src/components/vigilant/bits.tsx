"use client";

import React, { useEffect, useState } from "react";
import {
  Check,
  CheckCircle2,
  Copy,
  Info,
  AlertTriangle,
  X,
  XCircle,
} from "lucide-react";
import { useVigilant } from "@/lib/vigilant/store";
import type { Toast } from "@/lib/vigilant/types";

/* ------------------------------------------------------------------ */
/* Copy-to-clipboard with transient checkmark                          */
/* ------------------------------------------------------------------ */

export function useCopy(): [boolean, (text: string) => void] {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 1600);
    return () => clearTimeout(t);
  }, [copied]);
  const copy = (text: string) => {
    void navigator.clipboard?.writeText(text).catch(() => {});
    setCopied(true);
  };
  return [copied, copy];
}

export function CopyButton({
  text,
  label = "Copy",
  className = "",
}: {
  text: string;
  label?: string;
  className?: string;
}) {
  const [copied, copy] = useCopy();
  return (
    <button
      type="button"
      onClick={() => copy(text)}
      className={`btn-glass inline-flex h-7 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium text-[#eef0f3]/85 ${className}`}
      aria-label={copied ? "Copied" : `Copy ${label}`}
    >
      {copied ? (
        <Check size={12.5} className="text-emerald-300" />
      ) : (
        <Copy size={12.5} className="text-[#eef0f3]/50" />
      )}
      {copied ? "Copied" : label}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Toasts — bottom-right stack, slide-up, auto-dismiss (store-driven)  */
/* ------------------------------------------------------------------ */

const toastIcon = {
  ok: <CheckCircle2 size={16} className="mt-px shrink-0 text-emerald-300" />,
  warn: <AlertTriangle size={16} className="mt-px shrink-0 text-amber-300" />,
  err: <XC size={16} className="mt-px shrink-0 text-[#c87a86]" />,
  info: <Info size={16} className="mt-px shrink-0 text-[#eef0f3]/45" />,
};

export function Toasts() {
  const toasts = useVigilant((s) => s.toasts);
  const dismiss = useVigilant((s) => s.dismissToast);
  if (!toasts.length) return null;
  return (
    <div
      className="pointer-events-none fixed bottom-4 right-4 z-[110] flex w-[min(340px,calc(100vw-2rem))] flex-col gap-2"
      role="status"
      aria-live="polite"
    >
      {toasts.map((t: Toast) => (
        <div
          key={t.id}
          className="glass-deep animate-slide-up pointer-events-auto flex items-start gap-2.5 rounded-2xl p-3.5"
        >
          {toastIcon[t.kind]}
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-medium leading-5 text-[#eef0f3]">{t.title}</p>
            {t.detail && (
              <p className="mt-0.5 text-xs leading-5 text-[#eef0f3]/55">{t.detail}</p>
            )}
          </div>
          <button
            onClick={() => dismiss(t.id)}
            className="-m-1 rounded-md p-1 text-[#eef0f3]/40 transition-colors duration-200 hover:bg-white/[0.1] hover:text-[#eef0f3]"
            aria-label="Dismiss notification"
          >
            <X size={13} />
          </button>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Tiny Python syntax highlighter (regex, zero deps)                   */
/* ------------------------------------------------------------------ */

const PY_TOKEN =
  /(#.*$)|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')|\b(import|from|as|def|return|with|if|else|elif|for|in|not|and|or|raise|try|except|finally|True|False|None|lambda|class)\b|(\b\d+(?:\.\d+)?\b)/g;

export function highlightPython(code: string): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  let last = 0;
  let key = 0;
  for (const m of code.matchAll(PY_TOKEN)) {
    const idx = m.index ?? 0;
    if (idx > last) out.push(code.slice(last, idx));
    const [full, comment, str, kw, num] = m;
    if (comment) {
      out.push(
        <span key={key++} className="italic text-[#eef0f3]/35">
          {full}
        </span>
      );
    } else if (str) {
      out.push(
        <span key={key++} className="text-[#7fb8c4]">
          {full}
        </span>
      );
    } else if (kw) {
      out.push(
        <span key={key++} className="font-semibold text-[#9ba0f5]">
          {full}
        </span>
      );
    } else if (num) {
      out.push(
        <span key={key++} className="text-[#c9a86a]">
          {full}
        </span>
      );
    }
    last = idx + full.length;
  }
  if (last < code.length) out.push(code.slice(last));
  return out;
}


export function Donut({ size, thickness, segments, center }: { size: number, thickness: number, segments: {value: number, color: string}[], center?: React.ReactNode }) {
  let acc = 0;
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", position: "relative", background: "#1a1625" }}>
      {segments.map((seg, i) => {
        const pct = (seg.value / total) * 100;
        const offset = acc;
        acc += pct;
        return (
          <div key={i} style={{
            position: "absolute", inset: 0, borderRadius: "50%",
            background: `conic-gradient(transparent ${offset}%, ${seg.color} ${offset}%, ${seg.color} ${offset + pct}%, transparent ${offset + pct}%)`,
            mask: `radial-gradient(transparent ${size/2 - thickness}px, #000 ${size/2 - thickness + 1}px)`
          }} />
        );
      })}
      {center && <div style={{ position: "absolute", inset: thickness, borderRadius: "50%", display: "grid", placeItems: "center" }}>{center}</div>}
    </div>
  );
}

import { ShieldAlert as MSA, ShieldCheck as MSC, Eye as MEY, XCircle as MXC } from 'lucide-react';
export const VERDICT_META: Record<string, { short: string; color: string; bg: string; border: string; label: string; icon: any }> = {
  malicious: { short: "malicious", color: "#ff5c8a", bg: "rgba(255,92,138,0.1)", border: "rgba(255,92,138,0.3)", label: "MALICIOUS · HARD BLOCKED", icon: MSA },
  review: { short: "review", color: "#ffc46b", bg: "rgba(255,196,107,0.1)", border: "rgba(255,196,107,0.3)", label: "NEEDS REVIEW: CONTAINS EXECUTABLE CODE", icon: MEY },
  clean: { short: "clean", color: "#4ade80", bg: "rgba(74,222,128,0.1)", border: "rgba(74,222,128,0.3)", label: "NO THREATS DETECTED", icon: MSC },
  error: { short: "error", color: "#f87171", bg: "rgba(248,113,113,0.1)", border: "rgba(248,113,113,0.3)", label: "SCAN ERROR", icon: MXC },
};
export const CONFIDENCE_COLOR = { HIGH: "#4ade80", MEDIUM: "#ffc46b", LOW: "#f87171" };

export function fmtSize(mb: number) { return mb >= 1024 ? (mb / 1024).toFixed(2) + " GB" : mb.toFixed(2) + " MB"; }
export function fmtTime(iso: string) { return new Date(iso).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }); }
export function truncSha(sha: string) { return sha.slice(0, 12) + "…"; }

export function DownloadButton({ label, onClick }: { label: string; onClick: () => void }) {
  return <button className="btn-ghost !px-2 !py-0.5 !text-[11.5px]" onClick={onClick}>{label}</button>;
}

export function ProgressRing({ progress, size = 16, stroke = 2, label }: { progress: number, size?: number, stroke?: number, label?: string }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth={stroke} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#7c6fe6" strokeWidth={stroke} strokeDasharray={circ} strokeDashoffset={circ - (progress * circ)} style={{ transition: "stroke-dashoffset 0.3s ease" }} />
    </svg>
  );
}

import { ShieldAlert as SA, ShieldCheck as SC, Eye as EY, BadgeCheck as BC, XCircle as XC } from "lucide-react";
export function ShieldMark({ status, size = 16 }: { status: string; size?: number }) {
  if (status === "malicious") return <SA size={size} className="text-[#ff5c8a]" />;
  if (status === "review") return <EY size={size} className="text-[#ffc46b]" />;
  if (status === "allowlisted") return <BC size={size} className="text-[#7dd3fc]" />;
  if (status === "error") return <XC size={size} className="text-[#f87171]" />;
  return <SC size={size} className="text-[#4ade80]" />;
}
