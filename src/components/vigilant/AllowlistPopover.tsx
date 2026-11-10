"use client";

import { useState } from "react";
import { Loader2, ShieldCheck } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useVigilant } from "@/lib/vigilant/store";
import type { Artifact } from "@/lib/vigilant/types";

/**
 * "Allowlist this Model" — small liquid-glass dialog anchored to the
 * trigger button: reviewer notes + liquid-glass expiry dropdown + confirm.
 * Calls the real POST /api/v1/workstation/allowlist endpoint via the store.
 */
export function AllowlistPopover({ a }: { a: Artifact }) {
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState("");
  const [expiry, setExpiry] = useState("90 days");
  const loading = useVigilant((s) => s.allowlisting);
  const submit = useVigilant((s) => s.submitAllowlist);

  const confirm = async () => {
    if (!notes.trim()) return;
    await submit(a.id, notes.trim(), expiry);
    setOpen(false);
    setNotes("");
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="btn-glass inline-flex h-11 items-center gap-2 rounded-xl px-5 text-sm font-medium text-[#f3effc]/90">
          <ShieldCheck size={16} className="text-[#c4b5fd]" />
          Allowlist this Model
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={10}
        className="menu-liquid w-80 animate-pop rounded-2xl border-white/[0.15] p-5 text-[#f3effc]"
      >
        <p className="text-sm font-semibold text-[#f3effc]">Allowlist this model</p>
        <p className="mt-1 text-xs leading-5 text-[#f3effc]/55">
          Approves this exact SHA-256 for your whole organization. You can remove
          it from the allowlist at any time.
        </p>

        <div className="mt-4 flex flex-col gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="allowlist-notes" className="text-xs font-medium text-[#f3effc]/70">
              Reviewer notes
            </Label>
            <Textarea
              id="allowlist-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Justification — e.g. verified the Lambda is a 1/255 rescale…"
              className="glass-soft min-h-[72px] resize-none rounded-xl border-white/[0.12] bg-white/[0.05] text-[13px] text-[#f3effc] placeholder:text-[#f3effc]/30 focus-visible:border-[#a78bfa]/50 focus-visible:ring-[#a78bfa]/20"
            />
          </div>

          <div className="grid gap-1.5">
            <Label className="text-xs font-medium text-[#f3effc]/70">Expiry</Label>
            {/* Liquid-glass dropdown menu */}
            <Select value={expiry} onValueChange={setExpiry}>
              <SelectTrigger className="btn-glass h-9 w-full rounded-xl border-white/[0.14] text-[13px] text-[#f3effc] [&_svg]:text-[#f3effc]/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent
                sideOffset={8}
                align="start"
                className="menu-liquid w-[var(--radix-select-trigger-width)] rounded-xl border-white/[0.15] p-1.5"
              >
                {["30 days", "90 days", "1 year"].map((opt) => (
                  <SelectItem
                    key={opt}
                    value={opt}
                    className="rounded-lg px-2.5 py-2 text-[13px] text-[#f3effc]/85 focus:bg-white/[0.12] focus:text-[#f3effc] data-[state=checked]:text-[#f3effc] [&_svg]:text-[#c4b5fd]"
                  >
                    {opt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-end gap-2">
            <button
              onClick={() => setOpen(false)}
              className="inline-flex h-8 items-center rounded-lg px-3 text-xs font-medium text-[#f3effc]/55 transition-colors duration-200 hover:bg-white/[0.08] hover:text-[#f3effc]"
            >
              Cancel
            </button>
            <button
              onClick={confirm}
              disabled={!notes.trim() || loading}
              className="btn-liquid inline-flex h-8 items-center gap-1.5 rounded-lg px-3.5 text-xs font-semibold disabled:pointer-events-none disabled:opacity-45"
            >
              {loading && <Loader2 size={12} className="animate-spin" />}
              Confirm allowlist
            </button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
