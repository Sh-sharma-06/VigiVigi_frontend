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
 * backdrop, shows exactly how to load the model safely.
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
      <DialogContent className="max-h-[86vh] overflow-y-auto nice-scroll sm:max-w-[640px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Code2 size={17} className="text-muted-foreground" />
            Safe-Loader Code
          </DialogTitle>
          <DialogDescription>{r.title}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
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
            <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 p-3.5">
              <Zap size={15} className="mt-0.5 shrink-0 text-amber-600" />
              <div>
                <p className="text-[13px] font-semibold text-amber-800">
                  {r.extraAction.label}
                </p>
                <p className="mt-0.5 text-xs leading-5 text-amber-700">
                  {r.extraAction.result}
                </p>
              </div>
            </div>
          )}

          {r.note && (
            <p className="text-xs leading-5 text-muted-foreground">{r.note}</p>
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
  const cls =
    tone === "red"
      ? "border-red-200 bg-red-50 text-red-900"
      : "border-emerald-200 bg-emerald-50 text-emerald-900";
  const filled = code.replaceAll(/WEIGHTS1\.PKL/gi, fileName);
  return (
    <div className="min-w-0">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        {copy && <CopyButton text={filled} label="Copy to Clipboard" />}
      </div>
      <pre
        className={`${cls} nice-scroll min-w-0 overflow-x-auto rounded-xl border p-4 font-mono text-[12.5px] leading-6`}
      >
        <code>{highlightPython(filled)}</code>
      </pre>
    </div>
  );
}
