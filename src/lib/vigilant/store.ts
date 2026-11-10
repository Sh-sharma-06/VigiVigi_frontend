"use client";

import { create } from "zustand";
import { ARTIFACTS } from "./data";
import type {
  Artifact,
  BaseVerdict,
  FPReport,
  ModelFormat,
  PolicyMode,
  ScanRun,
  Toast,
  ViewId,
  WebhookEntry,
} from "./types";

/* ------------------------------------------------------------------ */
/* Effective-status helpers                                            */
/* ------------------------------------------------------------------ */

export type EffectiveStatus =
  | "queued"
  | "scanning"
  | "malicious"
  | "review"
  | "clean"
  | "allowlisted"
  | "error";

export function effectiveStatus(a: Artifact, allow: Record<string, unknown>): EffectiveStatus {
  if (a.errorState && a.status === "error") return "error";
  if (a.status === "scanning" || a.status === "queued") return a.status;
  if (allow[a.id]) return "allowlisted";
  return a.verdict;
}

export function isReviewPending(a: Artifact, allow: Record<string, unknown>) {
  return a.verdict === "review" && !allow[a.id];
}

const fmtPct = (n: number, d: number) => (d === 0 ? "0%" : `${Math.round((n / d) * 100)}%`);

export function triageCounts(arts: Artifact[], allow: Record<string, unknown>) {
  let malicious = 0;
  let review = 0;
  let clean = 0;
  let error = 0;
  for (const a of arts) {
    const s = effectiveStatus(a, allow);
    if (s === "malicious") malicious++;
    else if (s === "review" || s === "allowlisted") review++;
    else if (s === "clean") clean++;
    else if (s === "error") error++;
  }
  const total = arts.length;
  return { malicious, review, clean, error, total,
    pct: {
      malicious: fmtPct(malicious, total),
      review: fmtPct(review, total),
      clean: fmtPct(clean, total),
      error: fmtPct(error, total),
    } };
}

/* ------------------------------------------------------------------ */
/* Scan simulation engine                                              */
/* ------------------------------------------------------------------ */

const timers = new Map<string, ReturnType<typeof setInterval>>();

function buildDoneRun(a: Artifact): ScanRun {
  const total = a.plan.stages.reduce((s, st) => s + st.ms, 0);
  return {
    status: "done",
    elapsed: total,
    total,
    currentStage: -1,
    stageElapsed: a.plan.stages.map((s) => s.ms),
    lane: a.plan.lane,
    skipGvisor: a.plan.skipGvisor,
    speed: 1,
    startedAt: 0,
    verdictLatch: a.verdict,
    extended: false,
  };
}

/* ------------------------------------------------------------------ */
/* Store                                                               */
/* ------------------------------------------------------------------ */

export interface UploadSpec {
  name: string;
  format: ModelFormat;
  sizeMB: number;
  sha256: string;
  verdict: BaseVerdict;
}

interface VigilantState {
  view: ViewId;
  setView: (v: ViewId) => void;

  policy: PolicyMode;
  setPolicy: (p: PolicyMode) => void;

  artifacts: Artifact[];
  selectedId: string | null;
  select: (id: string | null) => void;

  scanRuns: Record<string, ScanRun>;
  replaySpeed: 1 | 0.5;
  setReplaySpeed: (s: 1 | 0.5) => void;
  startScan: (id: string, opts?: { speed?: number; extended?: boolean }) => void;
  cancelScan: (id: string) => void;

  search: string;
  setSearch: (s: string) => void;
  filterPill: "all" | "blocked" | "review" | "clean";
  setFilterPill: (f: "all" | "blocked" | "review" | "clean") => void;
  segmentFilter: EffectiveStatus | null;
  setSegmentFilter: (s: EffectiveStatus | null) => void;
  hoverSegment: EffectiveStatus | null;
  setHoverSegment: (s: EffectiveStatus | null) => void;

  pipelineMode: "flow" | "evidence";
  setPipelineMode: (m: "flow" | "evidence") => void;
  evidenceTab: number;
  setEvidenceTab: (i: number) => void;
  opcodeFocus: { index: number; nonce: number } | null;
  focusOpcode: (index: number) => void;

  pipelineDrawer: number | null;
  setPipelineDrawer: (i: number | null) => void;

  allowlisted: Record<string, { justification: string; expiry: string; at: string }>;
  allowlisting: boolean;
  submitAllowlist: (id: string, justification: string, expiry: string) => Promise<void>;

  fpReports: FPReport[];
  fpSeeds: { "by-design": number; "rule-bug": number; "parser-gap": number };
  reportingFp: boolean;
  reportFP: (id: string, bucket: FPReport["bucket"]) => Promise<void>;

  toasts: Toast[];
  toast: (t: Omit<Toast, "id">) => void;
  dismissToast: (id: number) => void;

  paletteOpen: boolean;
  setPaletteOpen: (b: boolean) => void;
  intakeOpen: boolean;
  setIntakeOpen: (b: boolean) => void;

  addArtifact: (a: Artifact, opts?: { scan?: boolean }) => void;
  clearQueue: () => void;
  loadSample: (id: string) => void;
  retryExtended: (id: string) => void;

  webhookLog: WebhookEntry[];
  pushWebhook: (e: Omit<WebhookEntry, "id">) => void;
}

let toastSeq = 1;
let uploadSeq = 1;

export const useVigilant = create<VigilantState>((set, get) => ({
  view: "investigate",
  setView: (v) => set({ view: v }),

  policy: "warn",
  setPolicy: (p) => {
    set({ policy: p });
    get().toast({ title: `Policy → ${p.toUpperCase()}`, kind: "info",
      detail: p === "audit" ? "All findings logged silently; nothing is blocked." : p === "warn" ? "MALICIOUS blocked; NEEDS REVIEW requires justification." : "MALICIOUS and un-allowlisted code-bearing files hard-blocked." });
  },

  artifacts: [],
  selectedId: null,
  select: (id) => {
    set({ selectedId: id, pipelineMode: "flow", evidenceTab: 0, pipelineDrawer: null });
  },

  scanRuns: {},
  replaySpeed: 1,
  setReplaySpeed: (s) => set({ replaySpeed: s }),

  startScan: (id, opts) => {
    const { artifacts } = get();
    const a = artifacts.find((x) => x.id === id);
    if (!a) return;
    get().cancelScan(id);
    const speed = opts?.speed ?? get().replaySpeed;
    const total = a.plan.stages.reduce((s, st) => s + st.ms, 0);
    const run: ScanRun = {
      status: "running",
      elapsed: 0,
      total,
      currentStage: 0,
      stageElapsed: a.plan.stages.map(() => 0),
      lane: null,
      skipGvisor: a.plan.skipGvisor,
      speed,
      startedAt: Date.now(),
      verdictLatch: null,
      extended: !!opts?.extended,
    };
    set((s) => ({
      scanRuns: { ...s.scanRuns, [id]: run },
      artifacts: s.artifacts.map((x) =>
        x.id === id ? { ...x, status: "scanning", errorState: opts?.extended ? undefined : x.errorState } : x
      ),
      pipelineMode: "flow",
    }));
    const t0 = performance.now();
    const iv = setInterval(() => {
      const elapsed = (performance.now() - t0) * speed;
      const st = get().scanRuns[id];
      if (!st || st.status !== "running") return;
      // stage boundaries
      let acc = 0;
      let cur = -1;
      const stageElapsed = a.plan.stages.map((ps) => {
        const start = acc;
        acc += ps.ms;
        if (elapsed >= start && elapsed < acc) cur = a.plan.stages.indexOf(ps);
        return Math.max(0, Math.min(ps.ms, elapsed - start));
      });
      let lane: string | null = null;
      const s0 = a.plan.stages[0].ms;
      const s1 = a.plan.stages[1].ms;
      if (elapsed > s0 + s1 * 0.55) lane = a.plan.lane;
      if (elapsed >= total) {
        get().cancelScan(id);
        set((s) => ({
          scanRuns: { ...s.scanRuns, [id]: buildDoneRun(a) },
          artifacts: s.artifacts.map((x) => (x.id === id ? { ...x, status: "done" } : x)),
        }));
        set({ pipelineMode: "evidence", evidenceTab: 0 });
        get().toast({ title: `Scan complete — ${a.name}`, kind: a.verdict === "malicious" ? "err" : a.verdict === "review" ? "warn" : "ok",
          detail: `Verdict latched: ${a.verdict === "malicious" ? "MALICIOUS · HARD BLOCKED" : a.verdict === "review" ? "NEEDS REVIEW" : "NO THREATS DETECTED"}` });
        return;
      }
      set((s) => ({
        scanRuns: { ...s.scanRuns, [id]: { ...st, elapsed, currentStage: cur, stageElapsed, lane } },
      }));
    }, 60);
    timers.set(id, iv);
  },

  cancelScan: (id) => {
    const iv = timers.get(id);
    if (iv) clearInterval(iv);
    timers.delete(id);
  },

  search: "",
  setSearch: (s) => set({ search: s }),
  filterPill: "all",
  setFilterPill: (f) => set({ filterPill: f }),
  segmentFilter: null,
  setSegmentFilter: (s) => set({ segmentFilter: s }),
  hoverSegment: null,
  setHoverSegment: (s) => set({ hoverSegment: s }),

  pipelineMode: "flow",
  setPipelineMode: (m) => set({ pipelineMode: m }),
  evidenceTab: 0,
  setEvidenceTab: (i) => set({ evidenceTab: i, pipelineMode: i === -1 ? "flow" : "evidence" }),
  opcodeFocus: null,
  focusOpcode: (index) =>
    set({ evidenceTab: 1, opcodeFocus: { index, nonce: Date.now() } }),

  pipelineDrawer: null,
  setPipelineDrawer: (i) => set({ pipelineDrawer: i }),

  allowlisted: {},
  allowlisting: false,
  submitAllowlist: async (id, justification, expiry) => {
    set({ allowlisting: true });
    const a = get().artifacts.find((x) => x.id === id);
    try {
      // Real backend integration point:
      //   await fetch("/api/v1/workstation/allowlist", { method: "POST", body: JSON.stringify({...}) })
      await fetch("/api/v1/workstation/allowlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sample_id: id, model_name: a?.name, justification, expiry }),
      }).catch(() => null);
      await new Promise((r) => setTimeout(r, 650));
      set((s) => ({
        allowlisted: { ...s.allowlisted, [id]: { justification, expiry, at: new Date().toISOString() } },
        allowlisting: false,
      }));
      get().toast({ title: "SHA-256 allowlisted for org", kind: "ok",
        detail: `${a?.name} · expires ${expiry} · review queue decremented` });
    } finally {
      set({ allowlisting: false });
    }
  },

  fpReports: [],
  fpSeeds: { "by-design": 12, "rule-bug": 5, "parser-gap": 3 },
  reportingFp: false,
  reportFP: async (id, bucket) => {
    set({ reportingFp: true });
    try {
      await fetch("/api/v1/workstation/fp-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ artifact_id: id, bucket }),
      }).catch(() => null);
      await new Promise((r) => setTimeout(r, 500));
      set((s) => ({ fpReports: [...s.fpReports, { bucket, artifactId: id, at: new Date().toISOString() }] }));
      get().toast({ title: "Sent to Ground-Truth Triage Deck", kind: "ok",
        detail: `Labelled as ${bucket === "by-design" ? "By-Design Code-Bearing" : bucket === "rule-bug" ? "Overly Broad Rule" : "Parser / Format Gap"}` });
    } finally {
      set({ reportingFp: false });
    }
  },

  toasts: [],
  toast: (t) => {
    const id = toastSeq++;
    set((s) => ({ toasts: [...s.toasts.slice(-3), { ...t, id }] }));
    setTimeout(() => get().dismissToast(id), 4200);
  },
  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

  paletteOpen: false,
  setPaletteOpen: (b) => set({ paletteOpen: b }),
  intakeOpen: false,
  setIntakeOpen: (b) => set({ intakeOpen: b }),

  addArtifact: (a, opts) => {
    set((s) => {
      const runs = { ...s.scanRuns };
      runs[a.id] = a.status === "done" ? buildDoneRun(a) : {
        status: "running", elapsed: 0, total: 1, currentStage: -1,
        stageElapsed: [0, 0, 0, 0, 0], lane: null, skipGvisor: a.plan.skipGvisor,
        speed: 1, startedAt: 0, verdictLatch: null, extended: false,
      };
      return {
        artifacts: [...s.artifacts, a],
        scanRuns: runs,
        selectedId: opts?.scan === false ? s.selectedId : a.id,
      };
    });
    if (opts?.scan !== false) setTimeout(() => get().startScan(a.id, { speed: 6 }), 350);
  },

  clearQueue: () => {
    get().artifacts.forEach((a) => get().cancelScan(a.id));
    set({ artifacts: [], selectedId: null, filterPill: "all", segmentFilter: null, search: "" });
  },

  loadSample: (id) => {
    // Re-add a pristine copy of the sample artifact (used from empty state)
    const src = ARTIFACTS.find((x) => x.id === id);
    if (!src) return;
    const copy: Artifact = { ...src, id: `${src.id}-s${uploadSeq++}`, status: "queued" };
    get().addArtifact(copy);
  },

  retryExtended: (id) => {
    const a = get().artifacts.find((x) => x.id === id);
    if (!a) return;
    if (!a.errorState) return;
    const recovered: Artifact = {
      ...a,
      errorState: undefined,
      verdict: "clean",
      confidence: "MEDIUM",
      decidedBy: "gvisor_sandbox",
      containsExecutableCode: false,
      rootCause:
        "Extended-bounds re-scan completed: 4,096 metadata KVs parsed with raised plan budget; tensor blocks verified — no executable constructs.",
      latencyMs: 41230,
      status: "queued",
      findings: [
        { id: "r1", state: "INFO", location: "header", offset: "0x0000",
          evidence: "All 4,096 metadata KVs parsed under extended budget; magic GGUF v3 verified", opcodeIndex: 1 },
        { id: "r2", state: "INFO", location: "tensors[0..291]", offset: "—",
          evidence: "Q4_K_M tensor blocks bounds-checked; 0 executable layers · 0 sink symbols", opcodeIndex: 2 },
      ],
    };
    set((s) => ({
      artifacts: s.artifacts.map((x) => (x.id === id ? recovered : x)),
    }));
    get().startScan(id, { extended: true });
  },

  webhookLog: [
    { id: 1, ts: "2026-11-10T06:12:04Z", event: "scan.completed", status: 200, detail: "scn_01JDF2XQ9A → verdict NO_THREATS_DETECTED delivered to hooks.internal.acme-labs.com" },
    { id: 2, ts: "2026-11-10T06:09:51Z", event: "scan.blocked", status: 200, detail: "scn_01JDF2T4M7 → verdict MALICIOUS delivered · policy=enforce" },
    { id: 3, ts: "2026-11-10T05:58:22Z", event: "delivery.retry", status: 503, detail: "webhook.circuit.dev unreachable — retrying with backoff (2/5)" },
  ],
  pushWebhook: (e) =>
    set((s) => ({ webhookLog: [...s.webhookLog, { ...e, id: (s.webhookLog.at(-1)?.id ?? 0) + 1 }] })),
}));

/* ------------------------------------------------------------------ */
/* Store hydration helper (called once on mount)                       */
/* ------------------------------------------------------------------ */

export function hydrateStore(artifacts: Artifact[]) {
  const runs: Record<string, ScanRun> = {};
  for (const a of artifacts) runs[a.id] = buildDoneRun(a);
  useVigilant.setState((s) => {
    if (s.artifacts.length) return s; // already hydrated
    // land on the flagship "NEEDS REVIEW" sample so the verdict canvas
    // demonstrates progressive disclosure immediately
    const initial =
      artifacts.find((x) => x.id === "efficientnet") ?? artifacts[1] ?? artifacts[0] ?? null;
    return { artifacts, scanRuns: runs, selectedId: initial?.id ?? null };
  });
  // restore persisted analyst state (policy + org allowlist)
  try {
    const saved = JSON.parse(window.localStorage.getItem(LS_KEY) ?? "null") as
      | { policy?: PolicyMode; allowlisted?: Record<string, { justification: string; expiry: string; at: string }> }
      | null;
    if (saved) {
      useVigilant.setState({
        policy: saved.policy ?? "warn",
        allowlisted: saved.allowlisted ?? {},
      });
    }
  } catch {
    /* first visit */
  }
}

const LS_KEY = "vigilant-ui-state";

if (typeof window !== "undefined") {
  useVigilant.subscribe((s, prev) => {
    if (s.policy !== prev.policy || s.allowlisted !== prev.allowlisted) {
      try {
        window.localStorage.setItem(
          LS_KEY,
          JSON.stringify({ policy: s.policy, allowlisted: s.allowlisted })
        );
      } catch {
        /* storage unavailable */
      }
    }
  });
}
