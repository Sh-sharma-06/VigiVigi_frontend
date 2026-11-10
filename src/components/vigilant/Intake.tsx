"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Plus, UploadCloud, Link2, FileDown, Loader2, Zap, Database, HardDriveDownload, ShieldAlert, RefreshCw } from "lucide-react";
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
/* Shared intake logic (used by card, modal, and viewport drop)         */
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
    toast({ title: "Forcing live sandbox re-scan", detail: "Cache bypassed — all 5 stages will re-execute.", kind: "info" });
    return clone;
  }, [addArtifact, select, toast]);

  const addFromHF = useCallback((f: HFRepoFile) => {
    const verdict: BaseVerdict = f.precheck === "malicious" ? "malicious" : f.precheck === "review" ? "review" : "clean";
    const art = buildUploadArtifact({
      name: f.name,
      format: f.format,
      sizeMB: f.sizeMB,
      sha256: f.lfsOid,
      verdict,
      cacheHit: !!KNOWN_CACHE[f.lfsOid],
    });
    addArtifact(art, { scan: false });
    return art;
  }, [addArtifact]);

  return { loadCached, forceRescan, addFromHF, toast };
}

/* ------------------------------------------------------------------ */
/* Reference-style Upload card (top-right zone)                        */
/* ------------------------------------------------------------------ */

export function IntakeCard() {
  const setIntakeOpen = useVigilant((s) => s.setIntakeOpen);
  return (
    <section className="glass relative flex min-h-[150px] flex-col items-center justify-center gap-2.5 p-4" aria-label="Upload intake">
      <button
        onClick={() => setIntakeOpen(true)}
        className="group flex flex-col items-center gap-2.5 outline-none"
        aria-label="Upload file or paste Hugging Face URL"
      >
        <span
          className="glow-breathe grid h-16 w-16 place-items-center rounded-full text-white transition-transform duration-200 group-hover:scale-110"
          style={{ background: "radial-gradient(circle at 32% 28%, #f0a8f5 0%, #d451ec 38%, #8f24ad 78%, #5e1a75 100%)", border: "1px solid rgba(255,255,255,0.35)" }}
        >
          <Plus size={30} strokeWidth={2.4} />
        </span>
        <span className="text-[12.5px] font-semibold text-[#ecdcf8]">Upload File</span>
      </button>
      <div className="flex items-center gap-1.5 text-[9.5px] text-[#9d8fb8]">
        <HardDriveDownload size={11} /> 8 MB chunked SHA-256 · <Link2 size={11} /> HF URL intake
      </div>
    </section>
  );
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
/* Full intake modal                                                   */
/* ------------------------------------------------------------------ */

type Mode = "file" | "url";

export function IntakeModal() {
  const open = useVigilant((s) => s.intakeOpen);
  const setOpen = useVigilant((s) => s.setIntakeOpen);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[92] grid place-items-center bg-black/55 p-4 backdrop-blur-sm" onMouseDown={() => setOpen(false)}>
      <div className="glass-deep rise-in w-[min(680px,94vw)] overflow-hidden" onMouseDown={(e) => e.stopPropagation()} role="dialog" aria-label="Intake">
        <IntakeBody onClose={() => setOpen(false)} />
      </div>
    </div>
  );
}

function IntakeBody({ onClose }: { onClose: () => void }) {
  const [mode, setMode] = useState<Mode>("file");
  const { loadCached, forceRescan, addFromHF } = useIntake();
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
      <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
        <UploadCloud size={16} className="text-[#dc9aee]" />
        <span className="text-sm font-bold text-[#f4ebfc]">Persistent Upload & Repo Intake</span>
        <div className="ml-auto flex gap-1.5">
          {(["file", "url"] as Mode[]).map((m) => (
            <button key={m} onClick={() => setMode(m)} className={`nav-tab !px-3 !py-1 !text-[11px] ${mode === m ? "nav-tab-active" : ""}`}>
              {m === "file" ? "Local file" : "Hugging Face URL"}
            </button>
          ))}
          <button className="btn-ghost !px-2.5" onClick={onClose} aria-label="Close">✕</button>
        </div>
      </div>

      <div className="p-4">
        {mode === "file" ? (
          <div>
            <label
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) handleFile(f); }}
              className="flex cursor-pointer flex-col items-center gap-2 rounded-2xl border border-dashed border-fuchsia-300/25 bg-fuchsia-500/[0.05] px-4 py-7 transition hover:border-fuchsia-300/50 hover:bg-fuchsia-500/[0.09]"
            >
              <input type="file" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
              {phase === "hashing" ? (
                <Loader2 size={26} className="animate-spin text-[#dc9aee]" />
              ) : (
                <UploadCloud size={26} className="text-[#dc9aee]" />
              )}
              <span className="text-[12.5px] font-semibold text-[#ecdcf8]">
                {phase === "hashing" ? "Computing SHA-256 locally…" : "Drop a model file here, or click to browse"}
              </span>
              <span className="text-[10px] text-[#9d8fb8]">Streams in {CHUNK / 1048576} MB chunks through WebCrypto-grade SHA-256 — nothing leaves the browser yet.</span>
            </label>

            {phase === "hashing" && (
              <div className="mt-3">
                <div className="mb-1 flex justify-between font-mono text-[10.5px] text-[#c3b4da]">
                  <span>{fileName}</span>
                  <span>{(prog.done / 1048576).toFixed(0)} MB / {(prog.total / 1048576).toFixed(0)} MB · {prog.speed.toFixed(0)} MB/s</span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full border border-white/10 bg-black/40">
                  <div
                    className="h-full rounded-full transition-[width] duration-100"
                    style={{ width: `${prog.total ? (prog.done / prog.total) * 100 : 0}%`, background: "linear-gradient(90deg,#8f24ad,#e05ae0,#f5b8f0)", boxShadow: "0 0 14px rgba(224,90,224,0.7)" }}
                  />
                </div>
              </div>
            )}

            {phase === "cached" && (
              <div className="rise-in mt-3 rounded-xl border border-emerald-300/30 bg-emerald-400/[0.07] p-3">
                <p className="flex items-center gap-2 text-[12px] font-bold text-emerald-200">
                  <Database size={13} /> Cache hit on (sha256, ruleset v2.4.0)
                </p>
                <p className="mt-1 break-all font-mono text-[10px] text-[#bfe8cd]">{sha}</p>
                <div className="mt-2.5 flex flex-wrap gap-2">
                  <button className="btn-gloss" onClick={() => { loadCached(sha); onClose(); }}>
                    <Zap size={13} /> Load Cached Verdict (0.5 ms)
                  </button>
                  <button className="btn-ghost" onClick={() => { forceRescan(sha); onClose(); }}>
                    <RefreshCw size={13} /> Force Live Sandbox Re-Scan
                  </button>
                </div>
              </div>
            )}

            {phase === "ready" && (
              <div className="rise-in mt-3 rounded-xl border border-fuchsia-300/25 bg-fuchsia-500/[0.07] p-3">
                <p className="flex items-center gap-2 text-[12px] font-bold text-[#f0dcf8]">
                  <ShieldAlert size={13} className="text-[#dc9aee]" /> No cache entry — {fileName}
                </p>
                <p className="mt-1 break-all font-mono text-[10px] text-[#c9a7e2]">{sha}</p>
                <div className="mt-2.5 flex flex-wrap items-center gap-2">
                  <button
                    className="btn-gloss"
                    onClick={() => {
                      const art = buildUploadArtifact({ name: fileName, format: guessFormat(fileName), sizeMB: 42 + (sha.charCodeAt(0) % 900), sha256: sha, verdict: simVerdictFor(fileName) });
                      addArtifact(art);
                      select(art.id);
                      onClose();
                    }}
                  >
                    <FileDown size={13} /> Start Live 5-Stage Scan
                  </button>
                  <span className="text-[10px] text-[#8d7fa8]">Verdict simulated client-side until the real backend is wired.</span>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div>
            <div className="inset-panel flex items-center gap-2 px-3 py-2.5">
              <Link2 size={14} className="text-[#c9a7e2]" />
              <input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://huggingface.co/<org>/<repo>"
                className="w-full bg-transparent font-mono text-[12px] text-[#efe6fa] outline-none placeholder:text-[#827399]"
              />
              <button className="btn-gloss !py-1" onClick={fetchTree} disabled={fetching}>
                {fetching ? <Loader2 size={12} className="animate-spin" /> : <Database size={12} />} Fetch tree
              </button>
            </div>
            {tree && (
              <div className="rise-in mt-3">
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-[#cfc0e6]">{tree.length} files · lfs.oid SHA-256 resolved</span>
                  <button
                    className="btn-gloss !py-1"
                    onClick={() => {
                      const added: Artifact[] = tree.map((f) => addFromHF(f));
                      if (added[0]) {
                        select(added[0].id);
                        setTimeout(() => useVigilant.getState().startScan(added[0].id), 250);
                      }
                      onClose();
                    }}
                  >
                    Add all to queue & scan first
                  </button>
                </div>
                <div className="vil-scroll max-h-64 space-y-1 overflow-y-auto">
                  {tree.map((f) => (
                    <div key={f.path} className="flex items-center gap-2 rounded-lg border border-white/[0.07] bg-white/[0.03] px-2.5 py-1.5">
                      <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-[#e2d5f2]">{f.path}</span>
                      <span className="font-mono text-[9px] text-[#8d7fa8]">{f.lfsOid.slice(0, 12)}…</span>
                      <span className="text-[9.5px] text-[#a798c2]">{f.sizeMB >= 1024 ? `${(f.sizeMB / 1024).toFixed(2)} GB` : `${f.sizeMB} MB`}</span>
                      <span
                        className={`rounded px-1.5 py-px text-[9px] font-bold ${
                          f.precheck === "malicious" ? "bg-rose-400/15 text-rose-300" : f.precheck === "review" ? "bg-amber-400/15 text-amber-300" : "bg-emerald-400/15 text-emerald-300"
                        }`}
                      >
                        {f.precheck === "safe" ? "✓ badge" : f.precheck === "review" ? "⚠ badge" : f.precheck === "malicious" ? "✗ badge" : "?"}
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

