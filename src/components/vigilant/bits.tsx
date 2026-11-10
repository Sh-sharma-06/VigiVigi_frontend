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
      className={`inline-flex h-7 items-center gap-1.5 rounded-lg border bg-white px-2.5 text-xs font-medium text-foreground transition-colors duration-200 hover:bg-muted ${className}`}
      aria-label={copied ? "Copied" : `Copy ${label}`}
    >
      {copied ? (
        <Check size={12.5} className="text-emerald-600" />
      ) : (
        <Copy size={12.5} className="text-muted-foreground" />
      )}
      {copied ? "Copied" : label}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Toasts — bottom-right stack, slide-up, auto-dismiss (store-driven)  */
/* ------------------------------------------------------------------ */

const toastIcon = {
  ok: <CheckCircle2 size={16} className="mt-px shrink-0 text-emerald-600" />,
  warn: <AlertTriangle size={16} className="mt-px shrink-0 text-amber-600" />,
  err: <XCircle size={16} className="mt-px shrink-0 text-red-600" />,
  info: <Info size={16} className="mt-px shrink-0 text-muted-foreground" />,
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
          className="animate-slide-up pointer-events-auto flex items-start gap-2.5 rounded-xl border bg-white p-3.5 shadow-lg shadow-black/[0.06]"
        >
          {toastIcon[t.kind]}
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-medium leading-5">{t.title}</p>
            {t.detail && (
              <p className="mt-0.5 text-xs leading-5 text-muted-foreground">
                {t.detail}
              </p>
            )}
          </div>
          <button
            onClick={() => dismiss(t.id)}
            className="-m-1 rounded-md p-1 text-muted-foreground transition-colors duration-200 hover:bg-muted hover:text-foreground"
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
        <span key={key++} className="italic text-zinc-400">
          {full}
        </span>
      );
    } else if (str) {
      out.push(
        <span key={key++} className="text-amber-700">
          {full}
        </span>
      );
    } else if (kw) {
      out.push(
        <span key={key++} className="font-semibold">
          {full}
        </span>
      );
    } else if (num) {
      out.push(<span key={key++}>{full}</span>);
    }
    last = idx + full.length;
  }
  if (last < code.length) out.push(code.slice(last));
  return out;
}
