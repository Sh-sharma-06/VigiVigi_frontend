"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Search, Command, ShieldCheck, ShieldAlert, CircleUserRound, History,
  FlaskConical, Puzzle, UploadCloud, Webhook, FileSearch,
} from "lucide-react";
import { useVigilant } from "@/lib/vigilant/store";
import type { PolicyMode, ViewId } from "@/lib/vigilant/types";

const TABS: { id: ViewId; label: string; simulated?: boolean }[] = [
  { id: "investigate", label: "Investigate" },
  { id: "history", label: "History / Corpus" },
  { id: "review", label: "Review Queue" },
  { id: "extension", label: "Browser Extension" },
  { id: "gate", label: "HF Pre-Upload Gate", simulated: true },
  { id: "api", label: "Enterprise API", simulated: true },
];

const POLICIES: { id: PolicyMode; label: string }[] = [
  { id: "audit", label: "Audit" },
  { id: "warn", label: "Warn" },
  { id: "enforce", label: "Enforce" },
];

export function TopNav() {
  const view = useVigilant((s) => s.view);
  const setView = useVigilant((s) => s.setView);
  const policy = useVigilant((s) => s.policy);
  const setPolicy = useVigilant((s) => s.setPolicy);
  const artifacts = useVigilant((s) => s.artifacts);
  const allow = useVigilant((s) => s.allowlisted);
  const setPaletteOpen = useVigilant((s) => s.setPaletteOpen);
  const setIntakeOpen = useVigilant((s) => s.setIntakeOpen);

  const reviewCount = artifacts.filter((a) => a.verdict === "review" && !allow[a.id] && a.status === "done").length;

  return (
    <header className="sticky top-0 z-50 flex h-14 items-center gap-2 border-b border-white/[0.07] bg-[#0a080e]/70 px-3 backdrop-blur-2xl">
      {/* mobile brand */}
      <div className="flex items-center gap-2 lg:hidden">
        <MiniShield />
      </div>

      <nav className="no-scrollbar flex flex-1 items-center gap-1 overflow-x-auto" aria-label="Service switcher">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={`nav-tab flex items-center gap-1.5 ${view === t.id ? "nav-tab-active" : ""}`}
            onClick={() => setView(t.id)}
            aria-current={view === t.id ? "page" : undefined}
          >
            {t.label}
            {t.id === "review" && reviewCount > 0 && (
              <span className="grid h-4 min-w-4 place-items-center rounded-full bg-[#e05ab8] px-1 text-[9px] font-bold text-white shadow-[0_0_10px_rgba(224,90,184,0.8)]">
                {reviewCount}
              </span>
            )}
            {t.simulated && <span className="text-[8px] font-bold tracking-wider text-[#a88cc0]">[SIM]</span>}
          </button>
        ))}
      </nav>

      {/* Policy toggle */}
      <div className="inset-panel flex items-center gap-0.5 rounded-full p-0.5" role="radiogroup" aria-label="Global policy mode">
        {POLICIES.map((p) => (
          <button
            key={p.id}
            role="radio"
            aria-checked={policy === p.id}
            onClick={() => setPolicy(p.id)}
            className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition-all ${
              policy === p.id
                ? "bg-gradient-to-b from-white/20 to-fuchsia-500/25 text-[#fbeaff] shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_4px_14px_-4px_rgba(177,59,207,0.8)]"
                : "text-[#a394bd] hover:text-[#e8d9f6]"
            }`}
            title={
              p.id === "audit"
                ? "Log findings silently — nothing is blocked"
                : p.id === "warn"
                  ? "Block MALICIOUS · justify NEEDS REVIEW"
                  : "Hard-block MALICIOUS + un-allowlisted executable-code files"
            }
          >
            {p.label}
          </button>
        ))}
      </div>

      <button className="btn-ghost !px-2.5" onClick={() => setPaletteOpen(true)} title="Command palette (Ctrl+K / ⌘K)">
        <Search size={12} />
        <Command size={11} className="opacity-70" />
      </button>
      <button className="btn-gloss hidden md:inline-flex" onClick={() => setIntakeOpen(true)}>
        <UploadCloud size={13} /> New Scan
      </button>

      <div className="ml-1 hidden items-center gap-2 pr-1 md:flex" title="Signed-in analyst">
        <span className="text-[11px] font-medium text-[#c4b6dc]">Hello!</span>
        <span className="flex items-center gap-1.5 text-[12px] font-semibold text-[#f1e7fb]">
          <CircleUserRound size={16} className="text-[#dc9aee]" />
          UserName
        </span>
      </div>
    </header>
  );
}

function MiniShield() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-label="Vigilant">
      <path d="M12 1.6 3.8 4.7v6.1c0 5.2 3.5 10 8.2 11.6 4.7-1.6 8.2-6.4 8.2-11.6V4.7L12 1.6z" fill="url(#mv)" stroke="rgba(255,255,255,0.5)" strokeWidth="0.8" />
      <defs>
        <linearGradient id="mv" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#e79bf5" />
          <stop offset="100%" stopColor="#9c28b8" />
        </linearGradient>
      </defs>
      <path d="M8.1 7.6 12 15.8l3.9-8.2h-2.2L12 11.9 10.3 7.6H8.1z" fill="#2a0f33" />
    </svg>
  );
}

/* ---------------------------------------------------------------- */
/* Command palette (Ctrl+K / ⌘K)                                     */
/* ---------------------------------------------------------------- */

interface PaletteItem {
  key: string;
  label: string;
  hint: string;
  icon: React.ReactNode;
  run: () => void;
}

export function CommandPalette() {
  const open = useVigilant((s) => s.paletteOpen);
  const setOpen = useVigilant((s) => s.setPaletteOpen);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(!useVigilant.getState().paletteOpen);
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [setOpen]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-start justify-center bg-black/55 pt-[14vh] backdrop-blur-sm" onMouseDown={() => setOpen(false)}>
      <PaletteInner setOpen={setOpen} />
    </div>
  );
}

function PaletteInner({ setOpen }: { setOpen: (b: boolean) => void }) {
  const artifacts = useVigilant((s) => s.artifacts);
  const select = useVigilant((s) => s.select);
  const setView = useVigilant((s) => s.setView);
  const setPolicy = useVigilant((s) => s.setPolicy);
  const setFilterPill = useVigilant((s) => s.setFilterPill);
  const setIntakeOpen = useVigilant((s) => s.setIntakeOpen);
  const startScan = useVigilant((s) => s.startScan);
  const selectedId = useVigilant((s) => s.selectedId);
  const toast = useVigilant((s) => s.toast);

  const [q, setQ] = useState("");
  const [idx, setIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 30);
    return () => clearTimeout(t);
  }, []);

  const items = useMemo<PaletteItem[]>(() => {
    const acts: PaletteItem[] = [
      { key: "act-upload", label: "New scan — upload file / paste HF URL", hint: "Intake", icon: <UploadCloud size={14} />, run: () => { setIntakeOpen(true); setOpen(false); } },
      { key: "act-replay", label: "Replay live scan on selected artifact", hint: "Action", icon: <FlaskConical size={14} />, run: () => { if (selectedId) { startScan(selectedId); setView("investigate"); } setOpen(false); } },
      { key: "act-policy-a", label: "Switch policy → Audit (log silently)", hint: "Policy", icon: <ShieldCheck size={14} />, run: () => { setPolicy("audit"); setOpen(false); } },
      { key: "act-policy-w", label: "Switch policy → Warn (block malicious)", hint: "Policy", icon: <ShieldAlert size={14} />, run: () => { setPolicy("warn"); setOpen(false); } },
      { key: "act-policy-e", label: "Switch policy → Enforce (hard block)", hint: "Policy", icon: <ShieldAlert size={14} />, run: () => { setPolicy("enforce"); setOpen(false); } },
      { key: "act-review", label: "Filter queue → NEEDS REVIEW", hint: "Filter", icon: <FileSearch size={14} />, run: () => { setFilterPill("review"); setView("investigate"); setOpen(false); } },
      { key: "act-hist", label: "Go to History / Corpus", hint: "View", icon: <History size={14} />, run: () => { setView("history"); setOpen(false); } },
      { key: "act-ext", label: "Go to Browser Extension simulator", hint: "View", icon: <Puzzle size={14} />, run: () => { setView("extension"); setOpen(false); } },
      { key: "act-gate", label: "Go to HF Pre-Upload Gate", hint: "View", icon: <UploadCloud size={14} />, run: () => { setView("gate"); setOpen(false); } },
      { key: "act-api", label: "Go to Enterprise API console", hint: "View", icon: <Webhook size={14} />, run: () => { setView("api"); setOpen(false); } },
      { key: "act-toast", label: "Ping diagnostics", hint: "Action", icon: <Command size={14} />, run: () => { toast({ title: "Diagnostics OK", detail: "Engine gVisor-2026.11 · ruleset v2.4.0 · 5/5 stages online", kind: "ok" }); setOpen(false); } },
    ];
    const files: PaletteItem[] = artifacts.map((a) => ({
      key: `f-${a.id}`,
      label: a.name,
      hint: `${a.format} · ${a.sha256.slice(0, 10)}…`,
      icon: <FileSearch size={14} />,
      run: () => { select(a.id); setView(a.verdict === "review" && !useVigilant.getState().allowlisted[a.id] ? "review" : "investigate"); setOpen(false); },
    }));
    const all = [...files, ...acts];
    if (!q.trim()) return all;
    const needle = q.toLowerCase();
    return all.filter((i) => (i.label + " " + i.hint).toLowerCase().includes(needle));
  }, [q, artifacts, select, setView, setPolicy, setFilterPill, setIntakeOpen, startScan, selectedId, setOpen, toast]);

  return (
    <div
      className="glass-deep rise-in w-[min(640px,92vw)] overflow-hidden"
      onMouseDown={(e) => e.stopPropagation()}
      role="dialog"
      aria-label="Command palette"
    >
      <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
        <Search size={15} className="text-[#c9a7e2]" />
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => { setQ(e.target.value); setIdx(0); }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") { e.preventDefault(); setIdx((i) => Math.min(items.length - 1, i + 1)); }
            if (e.key === "ArrowUp") { e.preventDefault(); setIdx((i) => Math.max(0, i - 1)); }
            if (e.key === "Enter") { e.preventDefault(); items[idx]?.run(); }
          }}
          placeholder="Jump to file (name / SHA-256) · run action · switch policy…"
          className="w-full bg-transparent text-sm text-[#f2e8fb] outline-none placeholder:text-[#8d7fa8]"
        />
        <kbd className="glass-chip">ESC</kbd>
      </div>
      <div className="vil-scroll max-h-[46vh] overflow-y-auto p-1.5">
        {items.length === 0 && <div className="px-3 py-6 text-center text-xs text-[#9b8db5]">No matches — try a SHA prefix or “enforce”.</div>}
        {items.map((it, i) => (
          <button
            key={it.key}
            onMouseEnter={() => setIdx(i)}
            onClick={it.run}
            className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition-colors ${
              i === idx ? "bg-[#c963e0]/15 ring-1 ring-[#e9a8f5]/30" : "hover:bg-white/5"
            }`}
          >
            <span className="text-[#d9a8ee]">{it.icon}</span>
            <span className="flex-1 truncate text-[13px] text-[#efe5fa]">{it.label}</span>
            <span className="glass-chip">{it.hint}</span>
          </button>
        ))}
      </div>
      <div className="flex items-center gap-3 border-t border-white/10 px-4 py-2 text-[10px] text-[#8d7fa8]">
        <span>↑↓ navigate</span>
        <span>↵ select</span>
        <span className="ml-auto">Vigilant Command Palette</span>
      </div>
    </div>
  );
}
