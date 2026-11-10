"use client";

import { useMemo } from "react";
import { Search, Trash2, UploadCloud, X } from "lucide-react";
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
  const clearQueue = useVigilant((s) => s.clearQueue);
  const toast = useVigilant((s) => s.toast);

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
      {
        key: "safe",
        label: "Safe",
        count: safe,
        barClass: "bg-emerald-400 shadow-[0_0_10px_rgba(111,169,184,0.55)]",
        dotClass: "bg-emerald-400 shadow-[0_0_8px_rgba(111,169,184,0.7)]",
      },
      {
        key: "review",
        label: "Needs review",
        count: review,
        barClass: "bg-amber-300 shadow-[0_0_10px_rgba(201,168,106,0.5)]",
        dotClass: "bg-amber-300 shadow-[0_0_8px_rgba(201,168,106,0.65)]",
      },
      {
        key: "blocked",
        label: "Blocked",
        count: blocked,
        barClass: "bg-[#c87a86] shadow-[0_0_10px_rgba(200,122,134,0.55)]",
        dotClass: "bg-[#c87a86] shadow-[0_0_8px_rgba(200,122,134,0.7)]",
      },
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
    <aside className="lg:sticky lg:top-[74px] lg:h-[calc(100vh-90px)]">
      <div className="glass flex h-full min-h-0 min-w-0 flex-col gap-4 rounded-3xl p-4 lg:p-5">
        {/* Header */}
        <div className="flex items-center gap-2">
          <h2 className="text-[15px] font-semibold tracking-tight text-[#eef0f3]">
            Scanned Files
          </h2>
          <span className="glass-soft rounded-full px-2 py-0.5 text-xs font-medium text-[#eef0f3]/65">
            {artifacts.length}
          </span>
          {segmentFilter ? (
            <button
              onClick={() => setSegmentFilter(null)}
              className="glass-soft ml-auto inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium text-[#eef0f3]/60 transition-colors duration-200 hover:bg-white/[0.1] hover:text-[#eef0f3]"
              aria-label="Clear filter"
            >
              Filtered
              <X size={11} />
            </button>
          ) : (
            artifacts.length > 0 && (
              <button
                onClick={() => {
                  clearQueue();
                  toast({ title: "Queue cleared", detail: "Every file and verdict removed from this session.", kind: "info" });
                }}
                className="ml-auto rounded-lg p-1.5 text-[#eef0f3]/35 transition-colors duration-200 hover:bg-[#c87a86]/12 hover:text-[#d4969e]"
                aria-label="Clear the whole queue"
                title="Clear the whole queue"
              >
                <Trash2 size={13.5} />
              </button>
            )
          )}
        </div>

        {/* Upload */}
        <button
          onClick={() => setIntakeOpen(true)}
          className="flex h-10 w-full items-center gap-2.5 rounded-xl border border-dashed border-white/[0.16] px-3.5 text-sm font-medium text-[#eef0f3]/85 transition-all duration-200 hover:border-white/30 hover:bg-white/[0.06] hover:text-[#eef0f3] active:scale-[0.98]"
        >
          <UploadCloud size={16} className="shrink-0 text-[#eef0f3]/50" />
          <span className="shrink-0 whitespace-nowrap">Upload model</span>
          <span className="ml-auto hidden truncate text-[11px] text-[#eef0f3]/40 min-[1560px]:inline">
            or drop anywhere
          </span>
        </button>

        {/* Search */}
        <div className="relative">
          <Search
            size={15}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#eef0f3]/40"
          />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search files…"
            className="glass-soft h-10 rounded-xl pl-9 text-sm text-[#eef0f3] transition-colors duration-200 focus-visible:border-[#7c6fe6]/40 focus-visible:bg-white/[0.09] placeholder:text-[#eef0f3]/35"
            aria-label="Search scanned files"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-[#eef0f3]/45 transition-colors duration-200 hover:bg-white/[0.1] hover:text-[#eef0f3]"
              aria-label="Clear search"
            >
              <X size={13} />
            </button>
          )}
        </div>

        {/* Horizontal safe / review / blocked bar (replaces donut) */}
        <div
          className="flex h-2 w-full gap-px overflow-hidden rounded-full bg-white/[0.08] shadow-[inset_0_1px_2px_rgba(0,0,0,0.35)]"
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
                  ? "font-semibold text-[#eef0f3]"
                  : "text-[#eef0f3]/50 hover:text-[#eef0f3]/85"
              }`}
            >
              <span className={`h-2 w-2 rounded-full ${s.dotClass}`} />
              {s.label}
              <span className="font-medium">{s.count}</span>
            </button>
          ))}
        </div>

        {/* File list — bounded flex item, so it really scrolls */}
        <div
          className="nice-scroll -mx-1 min-h-0 flex-1 overflow-y-auto overscroll-contain px-1 pb-2 max-lg:max-h-72"
          role="list"
          aria-label="Scanned files"
        >
          {filtered.length === 0 ? (
            <p className="px-2 py-6 text-center text-[13px] text-[#eef0f3]/45">
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
                    className={`group flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-all duration-200 active:scale-[0.985] ${
                      selected
                        ? "border border-white/[0.14] bg-white/[0.1] shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]"
                        : "border border-transparent hover:bg-white/[0.05]"
                    }`}
                    aria-current={selected ? "true" : undefined}
                  >
                    <StatusDot eff={eff} selected={selected} />
                    <span className="min-w-0 flex-1">
                      <span
                        className={`block truncate text-[13.5px] leading-5 ${
                          selected ? "font-semibold text-[#eef0f3]" : "font-medium text-[#eef0f3]/90"
                        }`}
                      >
                        {a.name}
                      </span>
                      <span className="mt-0.5 block truncate text-xs leading-4 text-[#eef0f3]/45">
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
      </div>
    </aside>
  );
}

function StatusDot({ eff, selected }: { eff: string; selected: boolean }) {
  const base = "mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full transition-all duration-200";
  const ring = selected
    ? " ring-2 ring-[#7c6fe6]/40 ring-offset-2 ring-offset-[#0e0e12]"
    : "";
  if (eff === "scanning" || eff === "queued")
    return (
      <span
        className={`${base} animate-pulse bg-[#9ba0f5] shadow-[0_0_8px_rgba(155,160,245,0.7)]${ring}`}
      />
    );
  if (eff === "malicious" || eff === "error")
    return <span className={`${base} bg-[#c87a86] shadow-[0_0_8px_rgba(200,122,134,0.7)]${ring}`} />;
  if (eff === "review")
    return <span className={`${base} bg-amber-300 shadow-[0_0_8px_rgba(201,168,106,0.65)]${ring}`} />;
  return <span className={`${base} bg-emerald-400 shadow-[0_0_8px_rgba(111,169,184,0.7)]${ring}`} />;
}
