"use client";

import { useState } from "react";
import { Check, Code2, Download, Loader2, Sparkles, Upload, Wrench, Zap } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CopyButton, highlightPython } from "./bits";
import type { Artifact } from "@/lib/vigilant/types";

interface RepairResult {
  ok: boolean;
  mode?: string;
  filename?: string;
  patched_code?: string;
  unified_diff?: string;
  repaired_base64?: string;
  changes?: { line: number; rule: string; detail: string }[];
  changes_count?: number;
  error?: string;
}

export function SafeLoaderModal({
  open,
  onOpenChange,
  a,
}: {
  open: boolean;
  onOpenChange: (b: boolean) => void;
  a: Artifact;
}) {
  const r = a.remediation;
  const defaultDraft =
    r.vulnerable ||
    `import torch\nmodel = torch.load("${a.name}")\n`;

  const [showRepair, setShowRepair] = useState(false);
  const [draftCode, setDraftCode] = useState(defaultDraft);
  const [repairing, setRepairing] = useState(false);
  const [repairRes, setRepairRes] = useState<RepairResult | null>(null);
  const [attestBadge, setAttestBadge] = useState<string | null>(null);
  const [agentBusy, setAgentBusy] = useState<"triage" | "sandbox" | "pr" | "hunt" | null>(null);
  const [triageOut, setTriageOut] = useState<any>(null);
  const [sandboxOut, setSandboxOut] = useState<any>(null);
  const [prOut, setPrOut] = useState<any>(null);
  const [huntOut, setHuntOut] = useState<any>(null);

  const runPrAgent = async () => {
    setAgentBusy("pr");
    try {
      const res = await fetch("/api/v1/workstation/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "pr_remediate", name: a.name, sha256: a.sha256, code: draftCode }),
      });
      const d = await res.json();
      setPrOut(d);
      if (d?.pr_body) { try { void navigator.clipboard?.writeText(d.pr_body); } catch {} }
    } finally {
      setAgentBusy(null);
    }
  };

  const runThreatHunt = async () => {
    setAgentBusy("hunt");
    try {
      const res = await fetch("/api/v1/workstation/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "threat_hunt" }),
      });
      setHuntOut(await res.json());
    } finally {
      setAgentBusy(null);
    }
  };

  const runTriageAgent = async () => {
    setAgentBusy("triage");
    try {
      const res = await fetch("/api/v1/workstation/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "triage",
          name: a.name,
          format: a.format,
          verdict: a.verdict,
          rootCause: a.rootCause,
          findings: a.findings,
          code: draftCode,
        }),
      });
      setTriageOut(await res.json());
    } finally {
      setAgentBusy(null);
    }
  };

  const runSandboxAgent = async () => {
    setAgentBusy("sandbox");
    try {
      const res = await fetch("/api/v1/workstation/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "sandbox",
          name: a.name,
          simulate_attack: a.verdict === "malicious",
        }),
      });
      setSandboxOut(await res.json());
    } finally {
      setAgentBusy(null);
    }
  };

  const convertSafetensors = async () => {
    setRepairing(true);
    setRepairRes(null);
    try {
      const res = await fetch("/api/v1/workstation/repair", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "convert_safetensors", filename: a.name, file_base64: "" }),
      });
      setRepairRes((await res.json()) as RepairResult);
    } finally {
      setRepairing(false);
    }
  };

  const downloadAttestation = async () => {
    const res = await fetch("/api/v1/workstation/attestation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: a.name, sha256: a.sha256, verdict: a.verdict, ruleset: a.ruleset }),
    });
    const d = await res.json();
    if (!d?.ok) return;
    setAttestBadge(d.badge_markdown);
    try { void navigator.clipboard?.writeText(d.badge_markdown); } catch {}
    const blob = new Blob([JSON.stringify(d.receipt, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const el = document.createElement("a");
    el.href = url;
    el.download = d.filename;
    el.click();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  };

  const runAstRepair = async () => {
    setRepairing(true);
    setRepairRes(null);
    try {
      const res = await fetch("/api/v1/workstation/repair", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "python_ast",
          filename: `${a.name.replace(/\.[^.]+$/, "")}_loader.py`,
          code: draftCode,
        }),
      });
      const data = (await res.json()) as RepairResult;
      setRepairRes(data);
    } catch {
      setRepairRes({ ok: false, error: "Could not reach /api/v1/workstation/repair" });
    } finally {
      setRepairing(false);
    }
  };

  const handleFileUpload = async (file: File) => {
    setRepairing(true);
    setRepairRes(null);
    try {
      if (file.name.endsWith(".keras")) {
        const buf = await file.arrayBuffer();
        const b64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
        const res = await fetch("/api/v1/workstation/repair", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mode: "keras_sanitize", filename: file.name, file_base64: b64 }),
        });
        setRepairRes((await res.json()) as RepairResult);
      } else {
        const text = await file.text();
        setDraftCode(text);
        const res = await fetch("/api/v1/workstation/repair", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mode: "python_ast", filename: file.name, code: text }),
        });
        setRepairRes((await res.json()) as RepairResult);
      }
    } catch {
      setRepairRes({ ok: false, error: "File repair failed" });
    } finally {
      setRepairing(false);
    }
  };

  const downloadRepaired = () => {
    if (!repairRes?.ok) return;
    let blob: Blob;
    if (repairRes.repaired_base64) {
      const bin = atob(repairRes.repaired_base64);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      blob = new Blob([bytes], { type: "application/octet-stream" });
    } else {
      blob = new Blob([repairRes.patched_code || ""], { type: "text/x-python" });
    }
    const url = URL.createObjectURL(blob);
    const el = document.createElement("a");
    el.href = url;
    el.download = repairRes.filename || "repaired_loader.py";
    el.click();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-deep nice-scroll max-h-[88vh] w-[calc(100%-2rem)] max-w-[680px] overflow-y-auto rounded-3xl border-white/[0.14] text-[#eef0f3]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg text-[#eef0f3]">
            <Code2 size={17} className="text-[#9ba0f5]" />
            Safe-Loader & Auto-Repair
          </DialogTitle>
          <DialogDescription className="text-[#eef0f3]/55">{r.title}</DialogDescription>
        </DialogHeader>

        <div className="flex min-w-0 flex-col gap-4">
          {r.vulnerable && (
            <CodeBlock label="Before — vulnerable" tone="red" code={r.vulnerable} fileName={a.name} />
          )}
          <CodeBlock
            label={r.vulnerable ? "After — safe" : "Recommended loader"}
            tone="green"
            code={r.hardened}
            fileName={a.name}
            copy
          />

          {/* Interactive Live AST Auto-Repair Section */}
          <div className="rounded-2xl border border-white/[0.12] bg-white/[0.03] p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Wrench size={14} className="text-[#9ba0f5]" />
                <span className="text-[13px] font-semibold text-[#eef0f3]">
                  Live AST Code &amp; .keras Auto-Repair
                </span>
              </div>
              <button
                onClick={() => setShowRepair((v) => !v)}
                className="btn-glass inline-flex h-7 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium text-[#eef0f3]/85"
              >
                <Sparkles size={12} className="text-[#9ba0f5]" />
                {showRepair ? "Hide repair studio" : "Open repair studio"}
              </button>
            </div>

            {showRepair && (
              <div className="animate-fade-in mt-3 flex flex-col gap-3">
                <textarea
                  value={draftCode}
                  onChange={(e) => setDraftCode(e.target.value)}
                  rows={5}
                  spellCheck={false}
                  className="w-full rounded-xl border border-white/[0.12] bg-black/40 p-3 font-mono text-[12px] leading-5 text-[#eef0f3] outline-none focus:border-[#9ba0f5]/60"
                  placeholder="Paste any Python loader script here..."
                />

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={runAstRepair}
                    disabled={repairing}
                    className="btn-liquid inline-flex h-8 items-center gap-1.5 rounded-lg px-3.5 text-xs font-semibold disabled:opacity-50"
                  >
                    {repairing ? <Loader2 size={13} className="animate-spin" /> : <Wrench size={13} />}
                    {repairing ? "Patching AST…" : "Auto-Repair Python AST"}
                  </button>

                  <label className="btn-glass inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg px-3 text-xs font-medium text-[#eef0f3]/85">
                    <Upload size={12} />
                    Repair .py or .keras file
                    <input
                      type="file"
                      accept=".py,.keras"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) void handleFileUpload(f);
                      }}
                    />
                  </label>

                  <button
                    onClick={convertSafetensors}
                    disabled={repairing}
                    className="btn-glass inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-medium text-[#eef0f3]/85"
                  >
                    <Zap size={12} className="text-amber-300" />
                    Convert → .safetensors
                  </button>

                  <button
                    onClick={downloadAttestation}
                    className="btn-glass inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-medium text-emerald-200"
                  >
                    <Download size={12} />
                    Signed Attestation + Badge
                  </button>

                  {repairRes?.ok && (
                    <button
                      onClick={downloadRepaired}
                      className="btn-glass ml-auto inline-flex h-8 items-center gap-1.5 rounded-lg border-emerald-300/30 bg-emerald-400/15 px-3 text-xs font-semibold text-emerald-100"
                    >
                      <Download size={12} /> Download {repairRes.filename}
                    </button>
                  )}
                </div>

                {attestBadge && (
                  <div className="rounded-xl border border-emerald-300/25 bg-emerald-400/[0.06] p-2.5 text-[11px] text-emerald-200">
                    <p className="font-semibold">Signed receipt downloaded · Markdown badge copied to clipboard:</p>
                    <code className="mt-1 block break-all font-mono text-[#eef0f3]/80">{attestBadge}</code>
                  </div>
                )}

                {repairRes && !repairRes.ok && (
                  <p className="rounded-xl border border-rose-400/30 bg-rose-500/10 p-2.5 text-xs text-rose-200">
                    {repairRes.error}
                  </p>
                )}

                {repairRes?.ok && (
                  <div className="flex flex-col gap-2.5 rounded-xl border border-emerald-300/25 bg-emerald-400/[0.07] p-3">
                    <div className="flex items-center gap-2 text-xs font-semibold text-emerald-200">
                      <Check size={13} />
                      Applied {repairRes.changes_count ?? 0} real AST/archive patch
                      {(repairRes.changes_count ?? 0) === 1 ? "" : "es"}
                    </div>
                    {repairRes.changes && repairRes.changes.length > 0 && (
                      <ul className="space-y-1 text-[11.5px] text-[#eef0f3]/80">
                        {repairRes.changes.map((c, idx) => (
                          <li key={idx} className="font-mono">
                            L{c.line} · <span className="text-emerald-200">{c.rule}</span> — {c.detail}
                          </li>
                        ))}
                      </ul>
                    )}
                    {repairRes.unified_diff && (
                      <pre className="nice-scroll max-h-48 overflow-auto rounded-lg bg-black/45 p-2.5 font-mono text-[11px] leading-5 text-[#eef0f3]/90">
                        {repairRes.unified_diff}
                      </pre>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Agentic AI Triage (Ollama) + Real Dynamic Sandbox (bwrap + strace) */}
          <div className="rounded-2xl border border-[#9ba0f5]/25 bg-[#9ba0f5]/[0.05] p-4">
            <div className="flex flex-wrap items-center gap-2">
              <Sparkles size={14} className="text-[#9ba0f5]" />
              <span className="text-[13px] font-semibold text-[#eef0f3]">
                Agentic Triage &amp; Isolated Sandbox
              </span>
              <div className="ml-auto flex flex-wrap gap-2">
                <button
                  onClick={runTriageAgent}
                  disabled={agentBusy !== null}
                  className="btn-glass inline-flex h-7 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium text-[#eef0f3]"
                >
                  {agentBusy === "triage" ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} className="text-[#9ba0f5]" />}
                  AI Triage (Qwen 2.5)
                </button>
                <button
                  onClick={runSandboxAgent}
                  disabled={agentBusy !== null}
                  className="btn-glass inline-flex h-7 items-center gap-1.5 rounded-lg border-amber-300/30 px-2.5 text-xs font-medium text-amber-100"
                >
                  {agentBusy === "sandbox" ? <Loader2 size={12} className="animate-spin" /> : <Zap size={12} className="text-amber-300" />}
                  Detonate in Sandbox
                </button>
                <button
                  onClick={runPrAgent}
                  disabled={agentBusy !== null}
                  className="btn-glass inline-flex h-7 items-center gap-1.5 rounded-lg border-emerald-300/30 px-2.5 text-xs font-medium text-emerald-100"
                >
                  {agentBusy === "pr" ? <Loader2 size={12} className="animate-spin" /> : <Wrench size={12} className="text-emerald-300" />}
                  Auto-PR Bundle
                </button>
                <button
                  onClick={runThreatHunt}
                  disabled={agentBusy !== null}
                  className="btn-glass inline-flex h-7 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium text-[#eef0f3]/85"
                >
                  {agentBusy === "hunt" ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} className="text-sky-300" />}
                  HF Threat Hunt
                </button>
              </div>
            </div>

            {triageOut?.ok && triageOut.triage && (
              <div className="mt-3 rounded-xl border border-white/[0.1] bg-black/35 p-3 text-xs">
                <div className="flex items-center justify-between font-mono text-[11px] text-[#9ba0f5]">
                  <span>{triageOut.triage.classification} ({triageOut.triage.confidence}% conf)</span>
                  <span className="opacity-60">{triageOut.engine} · {triageOut.latency_ms}ms</span>
                </div>
                <p className="mt-1.5 text-[#eef0f3]/85">{triageOut.triage.summary}</p>
                <p className="mt-1 text-emerald-200/85">→ {triageOut.triage.recommended_action}</p>
              </div>
            )}

            {sandboxOut?.ok && (
              <div className="mt-3 rounded-xl border border-white/[0.1] bg-black/35 p-3 font-mono text-[11px]">
                <div className="flex items-center justify-between">
                  <span className={sandboxOut.verdict.includes("MALICIOUS") ? "font-bold text-rose-300" : "font-bold text-emerald-300"}>
                    {sandboxOut.verdict}
                  </span>
                  <span className="text-[#eef0f3]/50">{sandboxOut.runtime} · {sandboxOut.latency_ms}ms</span>
                </div>
                <p className="mt-1 text-[#eef0f3]/75">
                  Canaries hit: {sandboxOut.canary_hits?.length ? sandboxOut.canary_hits.join(", ") : "0 / 3"} ·
                  Execve: {sandboxOut.suspicious_execve?.length ?? 0} ·
                  Sockets: {sandboxOut.network_connects?.length ?? 0}
                </p>
              </div>
            )}
            {prOut?.ok && (
              <div className="mt-3 rounded-xl border border-emerald-300/25 bg-black/35 p-3 text-xs">
                <div className="flex items-center justify-between font-mono text-[11px] text-emerald-300">
                  <span>PR Ready · {prOut.branch} (copied to clipboard)</span>
                  <span className="opacity-60">{prOut.latency_ms}ms</span>
                </div>
                <p className="mt-1 font-semibold text-[#eef0f3]">{prOut.pr_title}</p>
                <pre className="nice-scroll mt-1.5 max-h-32 overflow-auto rounded bg-black/40 p-2 font-mono text-[10.5px] text-[#eef0f3]/80">{prOut.unified_diff}</pre>
              </div>
            )}

            {huntOut?.ok && huntOut.ruleset_validation && (
              <div className="mt-3 rounded-xl border border-sky-300/25 bg-black/35 p-3 font-mono text-[11px]">
                <div className="flex items-center justify-between text-sky-300">
                  <span>Ruleset Check: {huntOut.ruleset_validation.decision}</span>
                  <span className="opacity-60">{huntOut.latency_ms}ms</span>
                </div>
                <p className="mt-1 text-[#eef0f3]/80">
                  Corpus FP: {huntOut.ruleset_validation.false_positives}/{huntOut.ruleset_validation.corpus_benign_checked} ({huntOut.ruleset_validation.false_positive_rate_pct}%) · Live HF risky repos spotted: {huntOut.hf_scanned_repos}
                </p>
              </div>
            )}

          </div>

          {r.extraAction && (
            <div className="flex items-start gap-2.5 rounded-2xl border border-amber-300/25 bg-amber-400/10 p-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
              <Zap size={15} className="mt-0.5 shrink-0 text-amber-300" />
              <div>
                <p className="text-[13px] font-semibold text-amber-100">{r.extraAction.label}</p>
                <p className="mt-0.5 text-xs leading-5 text-amber-200/70">{r.extraAction.result}</p>
              </div>
            </div>
          )}

          {r.note && <p className="text-xs leading-5 text-[#eef0f3]/50">{r.note}</p>}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CodeBlock({
  label,
  tone,
  code,
  fileName,
  copy,
}: {
  label: string;
  tone: "red" | "green";
  code: string;
  fileName: string;
  copy?: boolean;
}) {
  return (
    <div
      className={`overflow-hidden rounded-2xl border ${
        tone === "red"
          ? "border-[#c87a86]/25 bg-[#c87a86]/[0.06]"
          : "border-emerald-300/25 bg-emerald-400/[0.06]"
      }`}
    >
      <div className="flex items-center justify-between border-b border-white/[0.08] px-3.5 py-2">
        <span
          className={`text-xs font-semibold ${
            tone === "red" ? "text-[#d4969e]" : "text-emerald-200"
          }`}
        >
          {label} · <span className="font-mono font-normal opacity-70">{fileName}</span>
        </span>
        {copy && <CopyButton text={code} label="Copy" />}
      </div>
      <pre
        className="nice-scroll overflow-x-auto p-3.5 font-mono text-[12px] leading-6 text-[#e6e8ee]"
        dangerouslySetInnerHTML={{ __html: highlightPython(code) }}
      />
    </div>
  );
}
