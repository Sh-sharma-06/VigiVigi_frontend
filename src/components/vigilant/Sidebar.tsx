"use client";

import { useMemo } from "react";
import { Search, UploadCloud, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useVigilant, effectiveStatus } from "@/lib/vigilant/store";
import { fmtSize } from "@/lib/vigilant/format";
import type { Artifact } from "@/lib/vigilant/types";
import type { EffectiveStatus as Eff } from "@/lib/vigilant/store";

type SegmentKey = "safe" | "review" | "blocked";

interface Segment {
  key: SegmentKey;
  label: string;
  count: number;
  barClass: string;
  dotClass: string;
}

function segmentOf(a: Artifact, allow: Record<string, unknown>): SegmentKey {
  const eff = effectiveStatus(a, allow);
  if (eff === "malicious" || eff === "error") return "blocked";
  if (eff === "review") return "review";
  return "safe"; // clean + allowlisted are safe to load
}

export function Sidebar() {
  const artifacts = useVigilant((s) => s.artifacts);
  const allow = useVigilant((s) => s.allowlisted);
  const search = useVigilant((s) => s.search);
  const setSearch = useVigilant((s) => s.setSearch);
  const selectedId = useVigilant((s) => s.selectedId);
  const select = useVigilant((s) => s.select);
  const setIntakeOpen = useVigilant((s) => s.setIntakeOpen);
  const segmentFilter = useVigilant((s) => s.segmentFilter);
  const setSegmentFilter = useVigilant((s) => s.setSegmentFilter);

  const segments: Segment[] = useMemo(() => {
    let safe = 0;
    let review = 0;
    let blocked = 0;
    for (const a of artifacts) {
      const k = segmentOf(a, allow);
      if (k === "safe") safe++;
      else if (k === "review") review++;
      else blocked++;
    }
    return [
      { key: "safe", label: "Safe", count: safe, barClass: "bg-emerald-500", dotClass: "bg-emerald-500" },
      { key: "review", label: "Needs review", count: review, barClass: "bg-amber-400", dotClass: "bg-amber-400" },
      { key: "blocked", label: "Blocked", count: blocked, barClass: "bg-red-500", dotClass: "bg-red-500" },
    ];
  }, [artifacts, allow]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return artifacts.filter((a) => {
      if (segmentFilter && segmentOf(a, allow) !== segmentFilter) return false;
      if (q && !a.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [artifacts, allow, search, segmentFilter]);

  const total = artifacts.length || 1;

  return (
    <aside className="flex min-w-0 flex-col gap-4 lg:sticky lg:top-[74px] lg:max-h-[calc(100vh-90px)]">
      {/* Header */}
      <div className="flex items-center gap-2">
        <h2 className="text-[15px] font-semibold tracking-tight">Scanned Files</h2>
        <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
          {artifacts.length}
        </span>
        {segmentFilter && (
          <button
            onClick={() => setSegmentFilter(null)}
            className="ml-auto inline-flex items-center gap-1 rounded-full border bg-muted/60 px-2 py-0.5 text-[11px] font-medium text-muted-foreground transition-colors duration-200 hover:bg-muted"
            aria-label="Clear filter"
          >
            Filtered
            <X size={11} />
          </button>
        )}
      </div>

      {/* Upload */}
      <button
        onClick={() => setIntakeOpen(true)}
        className="flex h-10 w-full items-center gap-2.5 rounded-xl border border-dashed px-3.5 text-sm font-medium text-foreground transition-colors duration-200 hover:bg-muted/70"
      >
        <UploadCloud size={16} className="text-muted-foreground" />
        Upload model
        <span className="ml-auto hidden text-[11px] text-muted-foreground xl:inline">
          or drop anywhere
        </span>
      </button>

      {/* Search */}
      <div className="relative">
        <Search
          size={15}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search files…"
          className="h-10 rounded-xl border-transparent bg-muted/70 pl-9 text-sm transition-colors duration-200 focus-visible:bg-white focus-visible:border-input"
          aria-label="Search scanned files"
        />
        {search && (
          <button
            onClick={() => setSearch("")}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground transition-colors duration-200 hover:bg-accent hover:text-foreground"
            aria-label="Clear search"
          >
            <X size={13} />
          </button>
        )}
      </div>

      {/* Horizontal safe / review / blocked bar (replaces donut) */}
      <div
        className="flex h-2 w-full gap-px overflow-hidden rounded-full bg-muted"
        role="img"
        aria-label={`Safe ${segments[0].count}, needs review ${segments[1].count}, blocked ${segments[2].count}`}
      >
        {segments.map(
          (s) =>
            s.count > 0 && (
              <button
                key={s.key}
                onClick={() =>
                  setSegmentFilter(
                    segmentFilter === s.key ? null : (s.key as unknown as Eff)
                  )
                }
                className={`${s.barClass} h-full transition-all duration-300 ${
                  segmentFilter && segmentFilter !== s.key ? "opacity-30" : ""
                } hover:opacity-80`}
                style={{ width: `${(s.count / total) * 100}%` }}
                aria-label={`Filter: ${s.label}`}
              />
            )
        )}
      </div>
      <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1">
        {segments.map((s) => (
          <button
            key={s.key}
            onClick={() =>
              setSegmentFilter(
                segmentFilter === s.key ? null : (s.key as unknown as Eff)
              )
            }
            className={`inline-flex items-center gap-1.5 text-[11.5px] transition-colors duration-200 ${
              segmentFilter === s.key
                ? "font-semibold text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <span className={`h-2 w-2 rounded-full ${s.dotClass}`} />
            {s.label}
            <span className="font-medium">{s.count}</span>
          </button>
        ))}
      </div>

      {/* File list */}
      <div
        className="nice-scroll -mx-1 flex-1 overflow-y-auto px-1 pb-2 lg:overflow-y-auto max-lg:max-h-72"
        role="list"
        aria-label="Scanned files"
      >
        {filtered.length === 0 ? (
          <p className="px-2 py-6 text-center text-[13px] text-muted-foreground">
            No files match “{search}”.
          </p>
        ) : (
          <div className="flex flex-col gap-0.5">
            {filtered.map((a) => {
              const eff = effectiveStatus(a, allow);
              const selected = a.id === selectedId;
              return (
                <button
                  key={a.id}
                  role="listitem"
                  onClick={() => select(a.id)}
                  className={`group flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors duration-200 ${
                    selected
                      ? "bg-accent"
                      : "hover:bg-muted/70"
                  }`}
                  aria-current={selected ? "true" : undefined}
                >
                  <StatusDot eff={eff} selected={selected} />
                  <span className="min-w-0 flex-1">
                    <span
                      className={`block truncate text-[13.5px] leading-5 ${
                        selected ? "font-semibold" : "font-medium"
                      }`}
                    >
                      {a.name}
                    </span>
                    <span className="mt-0.5 block truncate text-xs leading-4 text-muted-foreground">
                      {eff === "scanning" || eff === "queued"
                        ? "Scanning…"
                        : eff === "error"
                          ? "Scan failed"
                          : `${a.format} · ${fmtSize(a.sizeMB)}`}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </aside>
  );
}

function StatusDot({ eff, selected }: { eff: string; selected: boolean }) {
  const base = "mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full transition-shadow duration-200";
  const ring = selected ? " ring-2 ring-ring/30 ring-offset-2 ring-offset-background" : "";
  if (eff === "scanning" || eff === "queued")
    return <span className={`${base} animate-pulse bg-zinc-400${ring}`} />;
  if (eff === "malicious" || eff === "error")
    return <span className={`${base} bg-red-500${ring}`} />;
  if (eff === "review") return <span className={`${base} bg-amber-400${ring}`} />;
  return <span className={`${base} bg-emerald-500${ring}`} />;
}
