"use client";

import React, { useMemo } from "react";
import { ShieldX, Eye, ShieldCheck, BadgeCheck, AlertTriangle, Clock, Loader2, Search, Plus, X } from "lucide-react";
import { useVigilant, effectiveStatus, triageCounts, type EffectiveStatus } from "@/lib/vigilant/store";
import { FORMAT_TAG_COLOR, SAMPLE_TRIGGERS } from "@/lib/vigilant/data";
import { Donut, ProgressRing, ShieldMark, fmtSize, truncSha } from "./bits";

const PILL_TABS = [
  { id: "all", label: "All" },
  { id: "blocked", label: "Blocked" },
  { id: "review", label: "Needs Review" },
  { id: "clean", label: "Clean" },
] as const;

const SEGMENTS: { id: EffectiveStatus; label: string; color: string; key: "malicious" | "review" | "clean" | "error" }[] = [
  { id: "malicious", label: "Hard Blocked", color: "#ff5c8a", key: "malicious" },
  { id: "review", label: "Needs Review", color: "#ffc46b", key: "review" },
  { id: "clean", label: "No Threats", color: "#4ade80", key: "clean" },
  { id: "error", label: "Scan Error", color: "#8d8098", key: "error" },
];

export function Queue() {
  const artifacts = useVigilant((s) => s.artifacts);
  const allow = useVigilant((s) => s.allowlisted);
  const search = useVigilant((s) => s.search);
  const setSearch = useVigilant((s) => s.setSearch);
  const filterPill = useVigilant((s) => s.filterPill);
  const setFilterPill = useVigilant((s) => s.setFilterPill);
  const segmentFilter = useVigilant((s) => s.segmentFilter);
  const setSegmentFilter = useVigilant((s) => s.setSegmentFilter);
  const hoverSegment = useVigilant((s) => s.hoverSegment);
  const setHoverSegment = useVigilant((s) => s.setHoverSegment);
  const selectedId = useVigilant((s) => s.selectedId);
  const select = useVigilant((s) => s.select);
  const scanRuns = useVigilant((s) => s.scanRuns);
  const setIntakeOpen = useVigilant((s) => s.setIntakeOpen);
  const clearQueue = useVigilant((s) => s.clearQueue);

  const counts = triageCounts(artifacts, allow);

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return artifacts.filter((a) => {
      const st = effectiveStatus(a, allow);
      if (needle && !(a.name.toLowerCase().includes(needle) || a.sha256.toLowerCase().includes(needle) || a.format.toLowerCase().includes(needle))) return false;
      if (segmentFilter) {
        if (segmentFilter === "review") return st === "review" || st === "allowlisted";
        return st === segmentFilter;
      }
      if (filterPill === "blocked") return st === "malicious";
      if (filterPill === "review") return st === "review" || st === "allowlisted";
      if (filterPill === "clean") return st === "clean";
      return true;
    });
  }, [artifacts, allow, search, filterPill, segmentFilter]);

  const pillCounts = useMemo(() => {
    const map: Record<string, number> = { all: artifacts.length, blocked: 0, review: 0, clean: 0 };
    for (const a of artifacts) {
      const st = effectiveStatus(a, allow);
      if (st === "malicious") map.blocked++;
      else if (st === "review" || st === "allowlisted") map.review++;
      else if (st === "clean") map.clean++;
    }
    return map;
  }, [artifacts, allow]);

  return (
    <aside className="glass-deep flex min-h-0 w-full flex-1 flex-col overflow-hidden" aria-label="Artifact queue">
      {/* Brand block — matches reference sidebar */}
      <div className="flex items-center gap-2.5 px-5 pb-3.5 pt-5">
        <ShieldMark size={28} />
        <span className="text-[21px] font-semibold tracking-tight text-white">Vigilant</span>
        <button
          className="ml-auto grid h-8 w-8 place-items-center rounded-full border border-fuchsia-300/25 bg-fuchsia-500/10 text-[#f2b6cd] transition hover:bg-fuchsia-500/25"
          onClick={() => setIntakeOpen(true)}
          title="Upload file / HF URL"
        >
          <Plus size={15} />
        </button>
      </div>
      <div className="mx-5 h-px bg-gradient-to-r from-white/35 via-white/12 to-transparent" />

      <div className="px-5 pb-2.5 pt-4">
        <span className="glass-pill">Modular Analysis</span>
      </div>

      {/* Search */}
      <div className="px-4">
        <div className="inset-panel flex items-center gap-2 px-3 py-2.5">
          <Search size={13} className="shrink-0 text-[#8c899a]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Name, SHA-256, format…"
            className="w-full bg-transparent text-[14px] text-[#f4f0f6] outline-none placeholder:text-[#726f83]"
            aria-label="Search artifacts"
          />
          {search && (
            <button onClick={() => setSearch("")} className="text-[#8c899a] hover:text-white" aria-label="Clear search">
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      {/* Filter pills */}
      <div className="no-scrollbar flex items-center gap-2 overflow-x-auto px-4 py-3">
        {PILL_TABS.map((p) => (
          <button
            key={p.id}
            onClick={() => { setFilterPill(p.id); setSegmentFilter(null); }}
            className={`flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-[13px] font-medium transition-all ${
              filterPill === p.id && !segmentFilter
                ? "border border-fuchsia-300/40 bg-fuchsia-500/15 text-[#f7eef4] shadow-[0_4px_14px_-6px_rgba(233,111,159,0.8)]"
                : "border border-white/10 bg-white/[0.04] text-[#94919f] hover:border-fuchsia-300/25 hover:text-[#f0ebf2]"
            }`}
          >
            {p.label}
            <span className={`rounded-full px-1 text-[10.5px] font-bold ${filterPill === p.id && !segmentFilter ? "bg-fuchsia-400/30 text-white" : "bg-white/10 text-[#a29fb1]"}`}>
              {pillCounts[p.id]}
            </span>
          </button>
        ))}
      </div>

      {/* Triage distribution: donut + segmented bar */}
      <div className="mx-4 mb-4 flex items-center gap-3.5 rounded-2xl border border-white/[0.07] bg-black/25 p-3.5">
        <Donut
          size={92}
          thickness={16}
          segments={[
            { value: counts.malicious, color: "#ff5c8a" },
            { value: counts.review, color: "#ffc46b" },
            { value: counts.clean, color: "#4ade80" },
            { value: counts.error, color: "#8d8098" },
          ]}
          center={
            <div className="text-center">
              <div className="text-base font-bold leading-none text-white">{counts.total}</div>
              <div className="text-[9.5px] uppercase tracking-wider text-[#8c899a]">files</div>
            </div>
          }
        />
        <div className="min-w-0 flex-1">
          <div
            className="flex h-3.5 w-full overflow-hidden rounded-full border border-white/10"
            role="figure"
            aria-label="Batch triage distribution"
            onMouseLeave={() => setHoverSegment(null)}
          >
            {SEGMENTS.map((seg) => {
              const n = counts[seg.key];
              if (n === 0) return null;
              return (
                <button
                  key={seg.id}
                  className="h-full transition-all first:rounded-l-full last:rounded-r-full"
                  style={{
                    width: `${(n / (counts.total || 1)) * 100}%`,
                    background: seg.color,
                    opacity: hoverSegment && hoverSegment !== seg.id ? 0.35 : 1,
                    boxShadow: hoverSegment === seg.id ? `0 0 12px ${seg.color}` : undefined,
                  }}
                  onMouseEnter={() => setHoverSegment(seg.id)}
                  onClick={() => setSegmentFilter(segmentFilter === seg.id ? null : seg.id)}
                  title={`${seg.label}: ${n} (${counts.pct[seg.key]})`}
                  aria-label={`${seg.label}: ${n} files`}
                />
              );
            })}
          </div>
          <div className="mt-2 space-y-0.5">
            {SEGMENTS.map((seg) => {
              const n = counts[seg.key];
              return (
                <button
                  key={seg.id}
                  className={`flex w-full items-center gap-1.5 rounded-md px-1 py-0.5 text-left text-[11.5px] transition-colors ${
                    hoverSegment === seg.id || segmentFilter === seg.id ? "bg-white/[0.07]" : ""
                  }`}
                  onMouseEnter={() => setHoverSegment(seg.id)}
                  onMouseLeave={() => setHoverSegment(null)}
                  onClick={() => setSegmentFilter(segmentFilter === seg.id ? null : seg.id)}
                >
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: seg.color }} />
                  <span className="flex-1 truncate text-[#b3afbf]">{seg.label}</span>
                  <span className="font-semibold text-[#f0ebf2]">{n}</span>
                  <span className="w-8 text-right text-[#837f93]">{counts.pct[seg.key]}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* List header */}
      <div className="flex items-center justify-between px-5 pb-2">
        <span className="text-[11.5px] font-semibold uppercase tracking-[0.08em] text-[#837f93]">
          Queue · {filtered.length}/{artifacts.length}
        </span>
        {artifacts.length > 0 && (
          <button className="text-[11.5px] text-[#837f93] underline-offset-2 hover:text-rose-300 hover:underline" onClick={clearQueue}>
            Clear queue
          </button>
        )}
      </div>

      {/* File list */}
      <div className="vil-scroll queue-fade min-h-0 flex-1 overflow-y-auto px-3 pb-5" role="listbox" aria-label="Scanned artifacts">
        {artifacts.length === 0 ? (
          <EmptyQueue />
        ) : filtered.length === 0 ? (
          <div className="mt-8 text-center text-[13.5px] text-[#837f93]">No artifacts match this filter.</div>
        ) : (
          filtered.map((a) => (
            <QueueRow
              key={a.id}
              id={a.id}
              selected={selectedId === a.id}
              dimmed={!!hoverSegment && effectiveStatus(a, allow) !== hoverSegment && !(hoverSegment === "review" && effectiveStatus(a, allow) === "allowlisted")}
            />
          ))
        )}
      </div>
    </aside>
  );
}

function QueueRow({ id, selected, dimmed }: { id: string; selected: boolean; dimmed: boolean }) {
  const a = useVigilant((s) => s.artifacts.find((x) => x.id === id))!;
  const allow = useVigilant((s) => s.allowlisted);
  const select = useVigilant((s) => s.select);
  const run = useVigilant((s) => s.scanRuns[id]);
  const st = effectiveStatus(a, allow);

  const scanning = st === "scanning";
  const stage = run?.currentStage ?? -1;
  const stageProgress = scanning && run && run.currentStage >= 0
    ? run.stageElapsed[run.currentStage] / (a.plan.stages[run.currentStage]?.ms || 1)
    : 0;

  const icon = (size = 15) => {
    if (scanning) return <Loader2 size={size} className="animate-spin text-[#ef95bb]" />;
    if (st === "malicious") return <ShieldX size={size} className="text-[#ff5c8a]" />;
    if (st === "review") return <Eye size={size} className="text-[#ffc46b]" />;
    if (st === "allowlisted") return <BadgeCheck size={size} className="text-[#7dd3fc]" />;
    if (st === "clean") return <ShieldCheck size={size} className="text-[#4ade80]" />;
    if (st === "error") return <AlertTriangle size={size} className="text-[#f87171]" />;
    return <Clock size={size} className="text-[#94919f]" />;
  };

  const accent =
    st === "malicious" ? "#ff5c8a" : st === "review" ? "#ffc46b" : st === "allowlisted" ? "#7dd3fc" : st === "clean" ? "#4ade80" : st === "error" ? "#f87171" : "#94919f";

  return (
    <button
      role="option"
      aria-selected={selected}
      onClick={() => select(id)}
      className={`group relative mb-1.5 flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-all ${
        selected
          ? "border-fuchsia-300/35 bg-gradient-to-r from-fuchsia-500/[0.14] to-transparent shadow-[0_8px_24px_-12px_rgba(233,111,159,0.7)]"
          : "border-transparent hover:border-white/10 hover:bg-white/[0.045]"
      } ${dimmed ? "opacity-35" : ""}`}
    >
      {selected && <span className="absolute left-0 top-1/2 h-7 w-0.5 -translate-y-1/2 rounded-full" style={{ background: accent, boxShadow: `0 0 8px ${accent}` }} />}
      {scanning ? (
        <ProgressRing progress={stageProgress} size={34} label={`${(stage ?? 0) + 1}`} />
      ) : (
        <span className="grid h-[34px] w-[34px] shrink-0 place-items-center rounded-xl border border-white/10 bg-white/[0.05]">
          {icon()}
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className={`block truncate text-[14.5px] font-medium ${selected ? "text-white underline decoration-2 underline-offset-4" : "text-[#ece8f0]"}`}>
          {a.name}
        </span>
        <span className="mt-0.5 flex items-center gap-1.5">
          <span className={`rounded border px-1 py-px text-[10px] font-bold tracking-wide ${FORMAT_TAG_COLOR[a.format] ?? ""}`}>{a.format}</span>
          <span className="truncate text-[11px] text-[#837f93]">{fmtSize(a.sizeMB)} · {truncSha(a.sha256)}</span>
        </span>
        {scanning && run && (
          <span className="mt-0.5 block text-[10.5px] font-medium text-[#ef95bb]">
            {run.currentStage >= 0 ? `Stage ${run.currentStage + 1}/5 · ${a.plan.stages[run.currentStage].title}` : "Finalizing…"}
          </span>
        )}
        {st === "allowlisted" && (
          <span className="mt-0.5 block text-[10.5px] font-medium text-[#7dd3fc]">ORG OVERRIDE · {allow[a.id]?.expiry}</span>
        )}
      </span>
    </button>
  );
}

function EmptyQueue() {
  const loadSample = useVigilant((s) => s.loadSample);
  const setIntakeOpen = useVigilant((s) => s.setIntakeOpen);
  return (
    <div className="rise-in mt-4 px-1">
      <button
        onClick={() => setIntakeOpen(true)}
        className="flex w-full flex-col items-center gap-2 rounded-2xl border border-dashed border-fuchsia-300/25 bg-fuchsia-500/[0.05] px-4 py-8 transition hover:border-fuchsia-300/50 hover:bg-fuchsia-500/[0.09]"
      >
        <span className="glow-breathe grid h-12 w-12 place-items-center rounded-full bg-gradient-to-br from-[#e05588] to-[#822850] text-white">
          <Plus size={22} />
        </span>
        <span className="text-[13.5px] font-semibold text-[#f0ebf2]">Drop a model file anywhere</span>
        <span className="text-[11.5px] text-[#8c899a]">or click to upload / paste a Hugging Face URL</span>
      </button>
      <div className="mt-4 space-y-1.5">
        <div className="text-[11.5px] font-semibold uppercase tracking-wider text-[#837f93]">One-click samples</div>
        {SAMPLE_TRIGGERS.map((s) => (
          <button key={s.artifactId} onClick={() => loadSample(s.artifactId)} className="btn-ghost w-full !justify-start">
            <span className="truncate">{s.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
