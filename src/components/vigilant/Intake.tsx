"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  UploadCloud, ListPlus, Check,
  Link2,
  Loader2,
  Zap,
  Database,
  FileDown,
  ShieldAlert,
  RefreshCw,
  X,
} from "lucide-react";
import jsSHA256 from "js-sha256";
import { useVigilant } from "@/lib/vigilant/store";
import { ARTIFACTS, HF_REPO, KNOWN_CACHE, buildUploadArtifact, guessFormat } from "@/lib/vigilant/data";
import type { Artifact, BaseVerdict, HFRepoFile } from "@/lib/vigilant/types";

const CHUNK = 8 * 1024 * 1024; // 8 MB browser chunks

function simVerdictFor(name: string): BaseVerdict {
  const n = name.toLowerCase();
  if (/mal|rce|exploit|trojan/.test(n)) return "malicious";
  if (/\.(pkl|pt|pth|ckpt|keras|gguf|h5)$/.test(n)) return "review";
  return "clean";
}

/* ------------------------------------------------------------------ */
/* Chunked client-side SHA-256 pre-flight                              */
/* ------------------------------------------------------------------ */

async function hashFileChunked(
  file: File,
  onProgress: (done: number, total: number, speed: number) => void,
  signal: { cancelled: boolean }
): Promise<string> {
  const hasher = jsSHA256.create();
  const t0 = performance.now();
  let done = 0;
  while (done < file.size) {
    if (signal.cancelled) throw new Error("cancelled");
    const slice = file.slice(done, Math.min(done + CHUNK, file.size));
    const buf = await slice.arrayBuffer();
    hasher.update(buf);
    done += slice.size;
    const secs = (performance.now() - t0) / 1000;
    onProgress(done, file.size, secs > 0 ? done / secs / 1048576 : 0);
    await new Promise((r) => setTimeout(r, 12)); // yield to UI
  }
  return hasher.hex();
}

/* ------------------------------------------------------------------ */
/* Shared intake hooks                                                 */
/* ------------------------------------------------------------------ */

export function useIntake() {
  const addArtifact = useVigilant((s) => s.addArtifact);
  const select = useVigilant((s) => s.select);
  const toast = useVigilant((s) => s.toast);

  const loadCached = useCallback((sha: string) => {
    const srcId = KNOWN_CACHE[sha];
    const src = ARTIFACTS.find((a) => a.id === srcId);
    if (!src) return null;
    const clone: Artifact = { ...src, id: `${src.id}-c${Date.now().toString(36)}`, status: "done", cacheHit: true };
    addArtifact(clone, { scan: false });
    select(clone.id);
    toast({ title: "Loaded cached verdict", detail: `${src.name} · 0.5 ms · ruleset ${src.ruleset}`, kind: "ok" });
    return clone;
  }, [addArtifact, select, toast]);

  const forceRescan = useCallback((sha: string) => {
    const srcId = KNOWN_CACHE[sha];
    const src = ARTIFACTS.find((a) => a.id === srcId);
    if (!src) return null;
    const clone: Artifact = { ...src, id: `${src.id}-r${Date.now().toString(36)}`, status: "queued", cacheHit: false };
    addArtifact(clone, { scan: false });
    select(clone.id);
    setTimeout(() => useVigilant.getState().startScan(clone.id), 200);
    toast({ title: "Forcing live re-scan", detail: "Cache bypassed — all 5 stages will re-execute.", kind: "info" });
    return clone;
  }, [addArtifact, select, toast]);

  return { loadCached, forceRescan, toast };
}

/* ------------------------------------------------------------------ */
/* Viewport drop handoff                                               */
/* ------------------------------------------------------------------ */

let pendingDrop: File | null = null;
export function setPendingDrop(f: File | null) {
  pendingDrop = f;
}
function takePendingDrop(): File | null {
  const f = pendingDrop;
  pendingDrop = null;
  return f;
}

/* ------------------------------------------------------------------ */
/* Full intake modal — burgundy liquid glass                           */
/* ------------------------------------------------------------------ */

type Mode = "file" | "url";

export function IntakeModal() {
  const open = useVigilant((s) => s.intakeOpen);
  const setOpen = useVigilant((s) => s.setIntakeOpen);
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[100] grid place-items-center bg-[#050507]/80 p-4"
      onMouseDown={() => setOpen(false)}
    >
      <div
        className="glass-deep animate-pop w-[min(600px,94vw)] overflow-hidden rounded-3xl text-[#eef0f3]"
        onMouseDown={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Add a model to scan"
      >
        <IntakeBody onClose={() => setOpen(false)} />
      </div>
    </div>
  );
}

function IntakeBody({ onClose }: { onClose: () => void }) {
  const [mode, setMode] = useState<Mode>("file");
  const { loadCached, forceRescan } = useIntake();
  const toast = useVigilant((s) => s.toast);
  const addArtifact = useVigilant((s) => s.addArtifact);
  const select = useVigilant((s) => s.select);

  const [phase, setPhase] = useState<"idle" | "hashing" | "cached" | "ready">("idle");
  const [prog, setProg] = useState({ done: 0, total: 0, speed: 0 });
  const [sha, setSha] = useState("");
  const [fileName, setFileName] = useState("");
  const cancelRef = useRef({ cancelled: false });
  const [url, setUrl] = useState("https://huggingface.co/acme-labs/invoice-parser-v4");
  const [tree, setTree] = useState<HFRepoFile[] | null>(null);
  const [fetching, setFetching] = useState(false);

  // --- NEW BATCH SCAN STATE ---
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [confirmBatch, setConfirmBatch] = useState(false);

  const handleFile = useCallback(async (file: File) => {
    cancelRef.current = { cancelled: false };
    setFileName(file.name);
    setSha("");
    setPhase("hashing");
    setProg({ done: 0, total: file.size, speed: 0 });
    try {
      const hex = await hashFileChunked(file, (done, total, speed) => setProg({ done, total, speed }), cancelRef.current);
      setSha(hex);
      let isCached = Boolean(KNOWN_CACHE[hex]);
      if (!isCached) {
        try {
          const r = await fetch(`/api/v1/workstation/corpus?sha256=${hex}`);
          const d = await r.json();
          if (d?.found && d?.record) {
            const rec = d.record;
            const vRaw = String(rec.features?.raw_verdict || rec.verdict || "BENIGN").toUpperCase();
            const vMapped: BaseVerdict = vRaw === "BENIGN" ? "clean" : (vRaw === "SUSPICIOUS" || String(rec.summary || "").toLowerCase().includes("lambda")) ? "review" : "malicious";
            const built = buildUploadArtifact({
              name: rec.model_name || file.name,
              format: guessFormat(rec.model_name || file.name),
              sizeMB: Math.max(0.1, Number((file.size / 1048576).toFixed(2))),
              sha256: hex,
              verdict: vMapped,
              cacheHit: true,
            });
            built.rootCause = String(rec.summary || built.rootCause);
            ARTIFACTS.push(built);
            KNOWN_CACHE[hex] = built.id;
            isCached = true;
          }
        } catch {}
      }
      setPhase(isCached ? "cached" : "ready");
    } catch {
      setPhase("idle");
    }
  }, [addArtifact]);

  const fetchTree = useCallback(async () => {
    const m = url.match(/huggingface\.co\/([\w.-]+)\/([\w.-]+)/i);
    if (!m) {
      toast({ title: "Unrecognized URL", detail: "Expected https://huggingface.co/<org>/<repo>", kind: "err" });
      return;
    }
    setFetching(true);
    setSelectedFiles(new Set());
    setConfirmBatch(false);
    try {
      const res = await fetch(`/api/v1/workstation/hf-tree?org=${m[1]}&repo=${m[2]}`);
      const data = await res.json();
      setTree(data.files);
    } catch {
      setTree(HF_REPO.files);
    } finally {
      setFetching(false);
    }
  }, [url, toast]);

  // --- BATCH SELECTION LOGIC ---
  const toggleFile = (path: string) => {
    setSelectedFiles((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedFiles.size === tree?.length) {
      setSelectedFiles(new Set());
    } else {
      setSelectedFiles(new Set(tree?.map((f) => f.path) || []));
    }
  };

  const executeBatchScan = () => {
    const filesToScan = tree?.filter((f) => selectedFiles.has(f.path)) || [];
    let firstId: string | null = null;
    
    filesToScan.forEach((f) => {
      const verdict: BaseVerdict =
        f.precheck === "malicious" ? "malicious" : f.precheck === "review" ? "review" : "clean";
      const art = buildUploadArtifact({
        name: f.name,
        format: f.format,
        sizeMB: f.sizeMB,
        sha256: f.lfsOid,
        verdict,
        cacheHit: !!KNOWN_CACHE[f.lfsOid],
      });
      if (!firstId) firstId = art.id;
      addArtifact(art);
    });

    if (firstId) select(firstId);
    toast({ title: `Queued ${filesToScan.length} files for scan`, detail: "Batch sent to workstation.", kind: "info" });
    onClose();
  };

  useEffect(() => {
    const f = takePendingDrop();
    if (f) void handleFile(f);
  }, [handleFile]);

  return (
    <div>
      <div className="flex items-center gap-2.5 border-b border-white/[0.08] bg-white/[0.03] px-5 py-4">
        <UploadCloud size={16} className="text-[#9ba0f5]" />
        <span className="text-[15px] font-semibold tracking-tight text-[#eef0f3]">
          Add a model to scan
        </span>
        <div className="ml-auto flex items-center gap-2">
          <div className="glass-soft flex rounded-lg p-0.5">
            {(["file", "url"] as Mode[]).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-all duration-200 ${
                  mode === m
                    ? "bg-white/[0.14] text-[#eef0f3] shadow-[inset_0_1px_0_rgba(255,255,255,0.16)]"
                    : "text-[#eef0f3]/45 hover:text-[#eef0f3]/80"
                }`}
              >
                {m === "file" ? "Local file" : "HF URL"}
              </button>
            ))}
          </div>
          <button
            className="rounded-md p-1.5 text-[#eef0f3]/45 transition-colors duration-200 hover:bg-white/[0.08] hover:text-[#eef0f3]"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={15} />
          </button>
        </div>
      </div>

      <div className="p-5">
        {mode === "file" ? (
          <div>
            <label
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) handleFile(f); }}
              className="flex cursor-pointer flex-col items-center gap-2.5 rounded-2xl border-2 border-dashed border-white/[0.16] px-4 py-8 transition-all duration-200 hover:border-white/30 hover:bg-white/[0.05]"
            >
              <input type="file" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
              {phase === "hashing" ? (
                <Loader2 size={24} className="animate-spin text-[#7c6fe6]" />
              ) : (
                <UploadCloud size={24} className="text-[#eef0f3]/45" />
              )}
              <span className="text-sm font-medium text-[#eef0f3]/90">
                {phase === "hashing" ? "Computing SHA-256 locally…" : "Drop a model file here, or click to browse"}
              </span>
              <span className="max-w-sm text-center text-xs leading-5 text-[#eef0f3]/45">
                Hashed in 8 MB chunks right in your browser — nothing leaves your machine yet.
              </span>
            </label>

            {phase === "hashing" && (
              <div className="animate-fade-in mt-4">
                <div className="mb-1.5 flex justify-between font-mono text-[11.5px] text-[#eef0f3]/50">
                  <span className="truncate">{fileName}</span>
                  <span>
                    {(prog.done / 1048576).toFixed(0)} / {(prog.total / 1048576).toFixed(0)} MB ·{" "}
                    {prog.speed.toFixed(0)} MB/s
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-white/[0.08] shadow-[inset_0_1px_2px_rgba(0,0,0,0.35)]">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#5b5fd6] to-[#7c6fe6] shadow-[0_0_12px_rgba(124,111,230,0.5)] transition-[width] duration-100"
                    style={{ width: `${prog.total ? (prog.done / prog.total) * 100 : 0}%` }}
                  />
                </div>
              </div>
            )}

            {phase === "cached" && (
              <div className="animate-fade-in mt-4 rounded-2xl border border-emerald-300/25 bg-emerald-400/10 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                <p className="flex items-center gap-2 text-[13px] font-semibold text-emerald-200">
                  <Database size={13.5} /> Already scanned before — verdict is cached
                </p>
                <p className="mt-1.5 break-all font-mono text-[11px] text-emerald-200/60">{sha}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    className="btn-glass inline-flex h-8 items-center gap-1.5 rounded-lg border-emerald-300/30 bg-emerald-400/15 px-3 text-xs font-medium text-emerald-100 hover:border-emerald-300/50"
                    onClick={() => { loadCached(sha); onClose(); }}
                  >
                    <Zap size={12} /> Load verdict instantly
                  </button>
                  <button
                    className="btn-glass inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-medium text-[#eef0f3]/85"
                    onClick={() => { forceRescan(sha); onClose(); }}
                  >
                    <RefreshCw size={12} /> Re-scan anyway
                  </button>
                </div>
              </div>
            )}

            {phase === "ready" && (
              <div className="glass-soft animate-fade-in mt-4 rounded-2xl p-4">
                <p className="flex items-center gap-2 text-[13px] font-semibold text-[#eef0f3]/90">
                  <ShieldAlert size={13.5} className="text-amber-300" /> No cache entry — first
                  scan for {fileName}
                </p>
                <p className="mt-1.5 break-all font-mono text-[11px] text-[#eef0f3]/45">{sha}</p>
                <div className="mt-3 flex flex-wrap items-center gap-2.5">
                  <button
                    className="btn-liquid inline-flex h-9 items-center gap-1.5 rounded-lg px-4 text-[13px] font-semibold"
                    onClick={() => {
                      const art = buildUploadArtifact({
                        name: fileName,
                        format: guessFormat(fileName),
                        sizeMB: 42 + (sha.charCodeAt(0) % 900),
                        sha256: sha,
                        verdict: simVerdictFor(fileName),
                      });
                      addArtifact(art);
                      select(art.id);
                      onClose();
                    }}
                  >
                    <FileDown size={14} /> Start scan
                  </button>
                  <span className="text-[11.5px] text-[#eef0f3]/40">
                    Verdict is simulated client-side until the real backend is wired.
                  </span>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div>
            <div className="glass-soft flex items-center gap-2 rounded-xl px-3 py-2">
              <Link2 size={14} className="shrink-0 text-[#eef0f3]/40" />
              <input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://huggingface.co/<org>/<repo>"
                className="w-full bg-transparent font-mono text-[12.5px] text-[#eef0f3] outline-none placeholder:text-[#eef0f3]/30"
                aria-label="Hugging Face repository URL"
              />
              <button
                className="btn-liquid inline-flex h-7 shrink-0 items-center gap-1.5 rounded-md px-2.5 text-xs font-semibold disabled:opacity-50"
                onClick={fetchTree}
                disabled={fetching}
              >
                {fetching ? <Loader2 size={12} className="animate-spin" /> : <Database size={12} />}
                Fetch
              </button>
            </div>

            {tree && (
              <div className="animate-fade-in mt-4">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs text-[#eef0f3]/50">
                    {tree.length} files · SHA-256 resolved from LFS pointers
                  </span>
                  <button onClick={toggleAll} className="btn-ghost !px-2 !py-1 text-[11.5px] text-[#eef0f3]/70 hover:text-white">
                    {selectedFiles.size === tree.length ? "Deselect all" : "Select all"}
                  </button>
                </div>
                
                <div className="nice-scroll flex max-h-60 flex-col gap-1 overflow-y-auto pr-1">
                  {tree.map((f) => (
                    <div
                      key={f.path}
                      onClick={() => toggleFile(f.path)}
                      className={`glass-soft flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 transition-all duration-300 ease-out ${
                        selectedFiles.has(f.path)
                          ? "border-teal-500/40 bg-teal-500/10 shadow-[inset_0_0_15px_rgba(20,184,166,0.1)]"
                          : "border-transparent hover:bg-white/[0.06]"
                      }`}
                    >
                      {/* Checkbox */ }
                      <div className={`grid h-4 w-4 shrink-0 place-items-center rounded border transition-colors duration-300 ${
                        selectedFiles.has(f.path) ? "border-teal-400 bg-teal-500/20 text-teal-300" : "border-white/20 bg-black/20"
                      }`}>
                        {selectedFiles.has(f.path) && <Check size={12} strokeWidth={3} />}
                      </div>

                      <span className={`min-w-0 flex-1 truncate font-mono text-[12px] transition-colors ${selectedFiles.has(f.path) ? "text-teal-50 font-bold" : "text-[#eef0f3]/85"}`}>
                        {f.path}
                      </span>
                      <span className="hidden font-mono text-[10.5px] text-[#eef0f3]/35 sm:inline">
                        {f.lfsOid.slice(0, 10)}…
                      </span>
                      <span className="text-[11px] text-[#eef0f3]/45">
                        {f.sizeMB >= 1024 ? `${(f.sizeMB / 1024).toFixed(2)} GB` : `${f.sizeMB} MB`}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${
                          f.precheck === "malicious"
                            ? "bg-[#c87a86]/15 text-[#d4969e]"
                            : f.precheck === "review"
                              ? "bg-amber-400/15 text-amber-200"
                              : f.precheck === "safe"
                                ? "bg-emerald-400/15 text-emerald-200"
                                : "bg-white/[0.08] text-[#eef0f3]/55"
                        }`}
                      >
                        {f.precheck === "safe" ? "safe" : f.precheck}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Batch Action Bar */}
                <div className="mt-3 flex flex-col gap-2">
                  {confirmBatch ? (
                    <div className="animate-pop glass-soft flex items-center justify-between gap-3 rounded-xl border border-teal-500/30 bg-teal-500/10 p-3 shadow-[0_0_15px_rgba(20,184,166,0.15)]">
                      <div className="text-[12.5px] text-teal-100">
                        <span className="font-bold">Queue {selectedFiles.size} files for scanning?</span>
                        <p className="text-[11px] text-teal-200/70 mt-0.5">They will be added to your workstation queue.</p>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => setConfirmBatch(false)} className="btn-ghost !px-3 !py-1.5 !text-xs !border-teal-500/30 !text-teal-200 hover:!bg-teal-500/20">Cancel</button>
                        <button onClick={executeBatchScan} className="btn-liquid !bg-teal-600 !px-4 !py-1.5 !text-xs font-bold text-white shadow-[0_0_10px_rgba(20,184,166,0.4)]">Confirm</button>
                      </div>
                    </div>
                  ) : (
                    <button
                      disabled={selectedFiles.size === 0}
                      onClick={() => setConfirmBatch(true)}
                      className="btn-liquid flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-[13px] font-semibold disabled:opacity-50 transition-all duration-300"
                    >
                      <ListPlus size={16} /> Scan {selectedFiles.size} file{selectedFiles.size !== 1 ? 's' : ''}
                    </button>
                  )}
                </div>

              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
