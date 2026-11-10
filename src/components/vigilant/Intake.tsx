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
/* Full intake modal — light, minimal, consumer-friendly               */
/* ------------------------------------------------------------------ */

type Mode = "file" | "url";

export function IntakeModal() {
  const open = useVigilant((s) => s.intakeOpen);
  const setOpen = useVigilant((s) => s.setIntakeOpen);
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[100] grid place-items-center bg-black/40 p-4 backdrop-blur-sm"
      onMouseDown={() => setOpen(false)}
    >
      <div
        className="animate-pop w-[min(600px,94vw)] overflow-hidden rounded-2xl border bg-white shadow-2xl"
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
      <div className="flex items-center gap-2.5 border-b px-5 py-4">
        <UploadCloud size={16} className="text-muted-foreground" />
        <span className="text-[15px] font-semibold tracking-tight">Add a model to scan</span>
        <div className="ml-auto flex items-center gap-2">
          <div className="flex rounded-lg bg-muted p-0.5">
            {(["file", "url"] as Mode[]).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-all duration-200 ${
                  mode === m ? "bg-white shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {m === "file" ? "Local file" : "HF URL"}
              </button>
            ))}
          </div>
          <button
            className="rounded-md p-1.5 text-muted-foreground transition-colors duration-200 hover:bg-muted hover:text-foreground"
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
              className="flex cursor-pointer flex-col items-center gap-2.5 rounded-xl border-2 border-dashed px-4 py-8 transition-colors duration-200 hover:border-zinc-300 hover:bg-muted/50"
            >
              <input type="file" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
              {phase === "hashing" ? (
                <Loader2 size={24} className="animate-spin text-muted-foreground" />
              ) : (
                <UploadCloud size={24} className="text-muted-foreground" />
              )}
              <span className="text-sm font-medium">
                {phase === "hashing" ? "Computing SHA-256 locally…" : "Drop a model file here, or click to browse"}
              </span>
              <span className="max-w-sm text-center text-xs leading-5 text-muted-foreground">
                Hashed in 8 MB chunks right in your browser — nothing leaves your machine yet.
              </span>
            </label>

            {phase === "hashing" && (
              <div className="animate-fade-in mt-4">
                <div className="mb-1.5 flex justify-between font-mono text-[11.5px] text-muted-foreground">
                  <span className="truncate">{fileName}</span>
                  <span>
                    {(prog.done / 1048576).toFixed(0)} / {(prog.total / 1048576).toFixed(0)} MB ·{" "}
                    {prog.speed.toFixed(0)} MB/s
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-[width] duration-100"
                    style={{ width: `${prog.total ? (prog.done / prog.total) * 100 : 0}%` }}
                  />
                </div>
              </div>
            )}

            {phase === "cached" && (
              <div className="animate-fade-in mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                <p className="flex items-center gap-2 text-[13px] font-semibold text-emerald-800">
                  <Database size={13.5} /> Already scanned before — verdict is cached
                </p>
                <p className="mt-1.5 break-all font-mono text-[11px] text-emerald-700">{sha}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-emerald-600 px-3 text-xs font-medium text-white transition-colors duration-200 hover:bg-emerald-700"
                    onClick={() => { loadCached(sha); onClose(); }}
                  >
                    <Zap size={12} /> Load verdict instantly
                  </button>
                  <button
                    className="inline-flex h-8 items-center gap-1.5 rounded-lg border bg-white px-3 text-xs font-medium transition-colors duration-200 hover:bg-muted"
                    onClick={() => { forceRescan(sha); onClose(); }}
                  >
                    <RefreshCw size={12} /> Re-scan anyway
                  </button>
                </div>
              </div>
            )}

            {phase === "ready" && (
              <div className="animate-fade-in mt-4 rounded-xl border bg-muted/40 p-4">
                <p className="flex items-center gap-2 text-[13px] font-semibold">
                  <ShieldAlert size={13.5} className="text-amber-600" /> No cache entry — first
                  scan for {fileName}
                </p>
                <p className="mt-1.5 break-all font-mono text-[11px] text-muted-foreground">{sha}</p>
                <div className="mt-3 flex flex-wrap items-center gap-2.5">
                  <button
                    className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-4 text-[13px] font-medium text-primary-foreground transition-colors duration-200 hover:bg-primary/90"
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
                  <span className="text-[11.5px] text-muted-foreground">
                    Verdict is simulated client-side until the real backend is wired.
                  </span>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div>
            <div className="flex items-center gap-2 rounded-lg border px-3 py-2">
              <Link2 size={14} className="shrink-0 text-muted-foreground" />
              <input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://huggingface.co/<org>/<repo>"
                className="w-full bg-transparent font-mono text-[12.5px] outline-none placeholder:text-muted-foreground/60"
                aria-label="Hugging Face repository URL"
              />
              <button
                className="inline-flex h-7 shrink-0 items-center gap-1.5 rounded-md bg-primary px-2.5 text-xs font-medium text-primary-foreground transition-colors duration-200 hover:bg-primary/90 disabled:opacity-50"
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
                  <span className="text-xs text-muted-foreground">
                    {tree.length} files · SHA-256 resolved from LFS pointers
                  </span>
                  <button
                    className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-medium text-primary-foreground transition-colors duration-200 hover:bg-primary/90"
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
                      className="flex items-center gap-2.5 rounded-lg border px-3 py-2"
                    >
                      <span className="min-w-0 flex-1 truncate font-mono text-[12px]">{f.path}</span>
                      <span className="hidden font-mono text-[10.5px] text-muted-foreground sm:inline">
                        {f.lfsOid.slice(0, 10)}…
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        {f.sizeMB >= 1024 ? `${(f.sizeMB / 1024).toFixed(2)} GB` : `${f.sizeMB} MB`}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${
                          f.precheck === "malicious"
                            ? "bg-red-50 text-red-700"
                            : f.precheck === "review"
                              ? "bg-amber-50 text-amber-700"
                              : f.precheck === "safe"
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-muted text-muted-foreground"
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
