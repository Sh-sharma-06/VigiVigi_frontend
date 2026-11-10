"use client";

import { ShieldCheck } from "lucide-react";
import * as SelectPrimitive from "@radix-ui/react-select";
import {
  Select,
  SelectContent,
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
    <header className="sticky top-0 z-40 border-b border-white/[0.08] bg-[#200812]/55 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_12px_40px_-20px_rgba(5,1,3,0.8)] backdrop-blur-2xl">
      <div className="mx-auto flex h-14 w-full max-w-[1400px] items-center gap-2.5 px-4 lg:px-6">
        <div className="btn-liquid grid h-7 w-7 shrink-0 place-items-center rounded-lg">
          <ShieldCheck size={15} strokeWidth={2.2} />
        </div>
        <span className="text-[15px] font-semibold tracking-tight text-[#f7ede4]">
          Vigilant
        </span>
        <span className="hidden text-sm text-[#f7ede4]/45 sm:inline">
          · AI Model Security
        </span>

        <div className="ml-auto flex items-center gap-2.5">
          <span className="hidden text-xs text-[#f7ede4]/45 md:inline">Policy</span>
          <Select value={policy} onValueChange={(v) => setPolicy(v as PolicyMode)}>
            <SelectTrigger
              size="sm"
              className="btn-glass h-8 w-[112px] rounded-lg text-xs font-medium text-[#f7ede4] data-[placeholder]:text-[#f7ede4]/60 [&_svg]:text-[#f7ede4]/50"
              aria-label="Security policy mode"
            >
              <SelectValue />
            </SelectTrigger>
            {/* Liquid-glass dropdown menu */}
            <SelectContent
              align="end"
              className="menu-liquid rounded-xl border-white/[0.14] p-1.5"
              sideOffset={8}
            >
              {POLICY_ITEMS.map((p) => (
                <SelectPrimitive.Item
                  key={p.value}
                  value={p.value}
                  className="relative flex w-full cursor-default select-none items-start gap-2 rounded-lg px-2.5 py-2 text-[13px] text-[#f7ede4]/85 outline-none transition-colors duration-150 focus:bg-white/[0.12] focus:text-[#f7ede4] data-[state=checked]:text-[#f7ede4] [&_svg]:pointer-events-none [&_svg]:shrink-0"
                >
                  <SelectPrimitive.ItemText className="font-semibold leading-5">
                    {p.label}
                  </SelectPrimitive.ItemText>
                  <SelectPrimitive.ItemIndicator className="mt-0.5 text-[#eec9a8]">
                    <ShieldCheck size={13} />
                  </SelectPrimitive.ItemIndicator>
                  {/* hint lives outside ItemText → never leaks into the trigger */}
                  <span className="block w-full pt-0.5 text-[11px] font-normal leading-4 text-[#f7ede4]/45">
                    {p.hint}
                  </span>
                </SelectPrimitive.Item>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </header>
  );
}
