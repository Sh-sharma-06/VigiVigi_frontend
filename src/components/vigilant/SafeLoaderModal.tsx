"use client";

import { Code2, Zap } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CopyButton, highlightPython } from "./bits";
import type { Artifact } from "@/lib/vigilant/types";

/**
 * "View Safe-Loader Code" modal — scales up from center over a blurred
 * burgundy backdrop, shows exactly how to load the model safely.
 */
export function SafeLoaderModal({
  open,
  onOpenChange,
  a,
}: {
  open: boolean;
  onOpenChange: (b: boolean) => void;
  a: Artifact;
}) {
  const r = a.remediation;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-deep nice-scroll max-h-[86vh] w-[calc(100%-2rem)] max-w-[640px] overflow-y-auto rounded-3xl border-white/[0.14] text-[#f3effc]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg text-[#f3effc]">
            <Code2 size={17} className="text-[#c4b5fd]" />
            Safe-Loader Code
          </DialogTitle>
          <DialogDescription className="text-[#f3effc]/55">{r.title}</DialogDescription>
        </DialogHeader>

        <div className="flex min-w-0 flex-col gap-4">
          {r.vulnerable && (
            <CodeBlock
              label="Before — vulnerable"
              tone="red"
              code={r.vulnerable}
              fileName={a.name}
            />
          )}
          <CodeBlock
            label={r.vulnerable ? "After — safe" : "Recommended loader"}
            tone="green"
            code={r.hardened}
            fileName={a.name}
            copy
          />

          {r.extraAction && (
            <div className="flex items-start gap-2.5 rounded-2xl border border-amber-300/25 bg-amber-400/10 p-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
              <Zap size={15} className="mt-0.5 shrink-0 text-amber-300" />
              <div>
                <p className="text-[13px] font-semibold text-amber-100">
                  {r.extraAction.label}
                </p>
                <p className="mt-0.5 text-xs leading-5 text-amber-200/70">
                  {r.extraAction.result}
                </p>
              </div>
            </div>
          )}

          {r.note && (
            <p className="text-xs leading-5 text-[#f3effc]/45">{r.note}</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CodeBlock({
  label,
  tone,
  code,
  fileName,
  copy = false,
}: {
  label: string;
  tone: "red" | "green";
  code: string;
  fileName: string;
  copy?: boolean;
}) {
  const chipCls =
    tone === "red" ? "text-[#ffa1b0]" : "text-emerald-300";
  const filled = code.replaceAll(/WEIGHTS1\.PKL/gi, fileName);
  return (
    <div className="min-w-0">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className={`text-xs font-semibold uppercase tracking-wide ${chipCls}`}>
          {label}
        </p>
        {copy && <CopyButton text={filled} label="Copy to Clipboard" />}
      </div>
      <pre className="nice-scroll min-w-0 max-w-full overflow-x-auto rounded-2xl border border-white/[0.1] bg-black/35 p-4 font-mono text-[12.5px] leading-6 text-[#ece5fb] shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_12px_30px_-18px_rgba(0,0,0,0.7)]">
        <code className="block w-max min-w-full">{highlightPython(filled)}</code>
      </pre>
    </div>
  );
}
