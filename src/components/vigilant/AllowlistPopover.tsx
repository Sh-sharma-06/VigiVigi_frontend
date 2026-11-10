"use client";

import { useState } from "react";
import { Loader2, ShieldCheck } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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
 * "Allowlist this Model" — small dialog anchored to the trigger button:
 * reviewer notes + expiry dropdown + confirm. Calls the real
 * POST /api/v1/workstation/allowlist endpoint via the store.
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
        <Button
          variant="outline"
          className="h-11 gap-2 rounded-xl px-5 text-sm font-medium"
        >
          <ShieldCheck size={16} />
          Allowlist this Model
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 animate-pop">
        <p className="text-sm font-semibold">Allowlist this model</p>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">
          Approves this exact SHA-256 for your whole organization. You can remove
          it from the allowlist at any time.
        </p>

        <div className="mt-4 flex flex-col gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="allowlist-notes" className="text-xs font-medium">
              Reviewer notes
            </Label>
            <Textarea
              id="allowlist-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Justification — e.g. verified the Lambda is a 1/255 rescale…"
              className="min-h-[72px] resize-none text-[13px]"
            />
          </div>

          <div className="grid gap-1.5">
            <Label className="text-xs font-medium">Expiry</Label>
            <Select value={expiry} onValueChange={setExpiry}>
              <SelectTrigger className="h-9 w-full text-[13px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="30 days">30 days</SelectItem>
                <SelectItem value="90 days">90 days</SelectItem>
                <SelectItem value="1 year">1 year</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setOpen(false)}
              className="h-8 rounded-lg px-3 text-xs text-muted-foreground hover:text-foreground"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={confirm}
              disabled={!notes.trim() || loading}
              className="h-8 gap-1.5 rounded-lg px-3 text-xs font-medium"
            >
              {loading && <Loader2 size={12} className="animate-spin" />}
              Confirm allowlist
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
