"use client";

import { ShieldCheck } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useVigilant } from "@/lib/vigilant/store";
import type { PolicyMode } from "@/lib/vigilant/types";

const POLICY_ITEMS: { value: PolicyMode; label: string; hint: string }[] = [
  { value: "audit", label: "Audit", hint: "Log findings only — nothing is blocked" },
  { value: "warn", label: "Warn", hint: "Block malicious, flag the rest for review" },
  { value: "enforce", label: "Enforce", hint: "Hard-block everything risky" },
];

export function TopBar() {
  const policy = useVigilant((s) => s.policy);
  const setPolicy = useVigilant((s) => s.setPolicy);

  return (
    <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-14 w-full max-w-[1400px] items-center gap-2.5 px-4 lg:px-6">
        <div className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground">
          <ShieldCheck size={15} strokeWidth={2.2} />
        </div>
        <span className="text-[15px] font-semibold tracking-tight">Vigilant</span>
        <span className="hidden text-sm text-muted-foreground sm:inline">
          · AI Model Security
        </span>

        <div className="ml-auto flex items-center gap-2">
          <span className="hidden text-xs text-muted-foreground md:inline">
            Policy
          </span>
          <Select value={policy} onValueChange={(v) => setPolicy(v as PolicyMode)}>
            <SelectTrigger
              size="sm"
              className="h-8 w-[118px] rounded-lg text-xs font-medium"
              aria-label="Security policy mode"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="end">
              {POLICY_ITEMS.map((p) => (
                <SelectItem key={p.value} value={p.value} className="text-xs">
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </header>
  );
}
