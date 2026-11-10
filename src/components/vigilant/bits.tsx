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
  err: <XCircle size={16} className="mt-px shrink-0 text-[#c87a86]" />,
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
