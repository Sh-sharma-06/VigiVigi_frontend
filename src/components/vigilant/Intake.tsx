"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  UploadCloud,
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
      className="fixed inset-0 z-[100] grid place-items-center bg-[#100308]/65 p-4 backdrop-blur-md"
      onMouseDown={() => setOpen(false)}
    >
      <div
        className="glass-deep animate-pop w-[min(600px,94vw)] overflow-hidden rounded-3xl text-[#f7ede4]"
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

  const handleFile = useCallback(async (file: File) => {
    cancelRef.current = { cancelled: false };
    setFileName(file.name);
    setSha("");
    setPhase("hashing");
    setProg({ done: 0, total: file.size, speed: 0 });
    try {
      const hex = await hashFileChunked(file, (done, total, speed) => setProg({ done, total, speed }), cancelRef.current);
      setSha(hex);
      setPhase(KNOWN_CACHE[hex] ? "cached" : "ready");
    } catch {
      setPhase("idle");
    }
  }, []);

  const fetchTree = useCallback(async () => {
    const m = url.match(/huggingface\.co\/([\w.-]+)\/([\w.-]+)/i);
    if (!m) {
      toast({ title: "Unrecognized URL", detail: "Expected https://huggingface.co/<org>/<repo>", kind: "err" });
      return;
    }
    setFetching(true);
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

  useEffect(() => {
    const f = takePendingDrop();
    if (f) void handleFile(f);
  }, [handleFile]);

  return (
    <div>
      <div className="flex items-center gap-2.5 border-b border-white/[0.08] bg-white/[0.03] px-5 py-4">
        <UploadCloud size={16} className="text-[#eec9a8]" />
        <span className="text-[15px] font-semibold tracking-tight text-[#f7ede4]">
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
                    ? "bg-white/[0.14] text-[#f7ede4] shadow-[inset_0_1px_0_rgba(255,255,255,0.16)]"
                    : "text-[#f7ede4]/45 hover:text-[#f7ede4]/80"
                }`}
              >
                {m === "file" ? "Local file" : "HF URL"}
              </button>
            ))}
          </div>
          <button
            className="rounded-md p-1.5 text-[#f7ede4]/45 transition-colors duration-200 hover:bg-white/[0.08] hover:text-[#f7ede4]"
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
                <Loader2 size={24} className="animate-spin text-[#e0607e]" />
              ) : (
                <UploadCloud size={24} className="text-[#f7ede4]/45" />
              )}
              <span className="text-sm font-medium text-[#f7ede4]/90">
                {phase === "hashing" ? "Computing SHA-256 locally…" : "Drop a model file here, or click to browse"}
              </span>
              <span className="max-w-sm text-center text-xs leading-5 text-[#f7ede4]/45">
                Hashed in 8 MB chunks right in your browser — nothing leaves your machine yet.
              </span>
            </label>

            {phase === "hashing" && (
              <div className="animate-fade-in mt-4">
                <div className="mb-1.5 flex justify-between font-mono text-[11.5px] text-[#f7ede4]/50">
                  <span className="truncate">{fileName}</span>
                  <span>
                    {(prog.done / 1048576).toFixed(0)} / {(prog.total / 1048576).toFixed(0)} MB ·{" "}
                    {prog.speed.toFixed(0)} MB/s
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-white/[0.08] shadow-[inset_0_1px_2px_rgba(0,0,0,0.35)]">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#a41e37] to-[#e0607e] shadow-[0_0_12px_rgba(224,96,126,0.5)] transition-[width] duration-100"
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
                    className="btn-glass inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-medium text-[#f7ede4]/85"
                    onClick={() => { forceRescan(sha); onClose(); }}
                  >
                    <RefreshCw size={12} /> Re-scan anyway
                  </button>
                </div>
              </div>
            )}

            {phase === "ready" && (
              <div className="glass-soft animate-fade-in mt-4 rounded-2xl p-4">
                <p className="flex items-center gap-2 text-[13px] font-semibold text-[#f7ede4]/90">
                  <ShieldAlert size={13.5} className="text-amber-300" /> No cache entry — first
                  scan for {fileName}
                </p>
                <p className="mt-1.5 break-all font-mono text-[11px] text-[#f7ede4]/45">{sha}</p>
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
                  <span className="text-[11.5px] text-[#f7ede4]/40">
                    Verdict is simulated client-side until the real backend is wired.
                  </span>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div>
            <div className="glass-soft flex items-center gap-2 rounded-xl px-3 py-2">
              <Link2 size={14} className="shrink-0 text-[#f7ede4]/40" />
              <input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://huggingface.co/<org>/<repo>"
                className="w-full bg-transparent font-mono text-[12.5px] text-[#f7ede4] outline-none placeholder:text-[#f7ede4]/30"
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
                  <span className="text-xs text-[#f7ede4]/50">
                    {tree.length} files · SHA-256 resolved from LFS pointers
                  </span>
                  <button
                    className="btn-liquid inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold"
                    onClick={() => {
                      const first = tree[0];
                      if (!first) return;
                      const verdict: BaseVerdict =
                        first.precheck === "malicious" ? "malicious" : first.precheck === "review" ? "review" : "clean";
                      const art = buildUploadArtifact({
                        name: first.name,
                        format: first.format,
                        sizeMB: first.sizeMB,
                        sha256: first.lfsOid,
                        verdict,
                        cacheHit: !!KNOWN_CACHE[first.lfsOid],
                      });
                      addArtifact(art);
                      select(art.id);
                      onClose();
                    }}
                  >
                    Scan first file
                  </button>
                </div>
                <div className="nice-scroll flex max-h-60 flex-col gap-1 overflow-y-auto">
                  {tree.map((f) => (
                    <div
                      key={f.path}
                      className="glass-soft flex items-center gap-2.5 rounded-lg px-3 py-2"
                    >
                      <span className="min-w-0 flex-1 truncate font-mono text-[12px] text-[#f7ede4]/85">
                        {f.path}
                      </span>
                      <span className="hidden font-mono text-[10.5px] text-[#f7ede4]/35 sm:inline">
                        {f.lfsOid.slice(0, 10)}…
                      </span>
                      <span className="text-[11px] text-[#f7ede4]/45">
                        {f.sizeMB >= 1024 ? `${(f.sizeMB / 1024).toFixed(2)} GB` : `${f.sizeMB} MB`}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${
                          f.precheck === "malicious"
                            ? "bg-[#fb5069]/15 text-[#ffa1b0]"
                            : f.precheck === "review"
                              ? "bg-amber-400/15 text-amber-200"
                              : f.precheck === "safe"
                                ? "bg-emerald-400/15 text-emerald-200"
                                : "bg-white/[0.08] text-[#f7ede4]/55"
                        }`}
                      >
                        {f.precheck === "safe" ? "safe" : f.precheck}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
