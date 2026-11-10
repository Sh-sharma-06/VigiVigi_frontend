"use client";

import React, { useState } from "react";
import {
  Wrench, Check, ClipboardCheck, ShieldCheck, ListFilter, Send, Trash2, Tag, CalendarClock, Loader2,
} from "lucide-react";
import { useVigilant, effectiveStatus } from "@/lib/vigilant/store";
import { CopyButton } from "./bits";

const EXPIRY_OPTIONS = ["30 Days", "90 Days", "Until Ruleset Upgrade", "Single Release Tag"];

export function Remediation() {
  const id = useVigilant((s) => s.selectedId);
  const a = useVigilant((s) => s.artifacts.find((x) => x.id === id));
  const allow = useVigilant((s) => s.allowlisted);

  if (!a) {
    return (
      <section className="glass grid min-h-[240px] place-items-center p-4" aria-label="Remediation">
        <p className="text-[13.5px] text-[#837f93]">Remediation & triage actions appear here.</p>
      </section>
    );
  }

  const st = effectiveStatus(a, allow);

  return (
    <section className="glass relative flex min-h-0 flex-col overflow-hidden" aria-label="Remediation and triage">
      <div className="flex items-center gap-2 px-5 pt-4">
        <span className="glass-pill"><Wrench size={12} /> Remediate</span>
        <span className="ml-auto truncate text-[13px] text-[#837f93]">{a.name}</span>
      </div>

      <div className="vil-scroll min-h-0 flex-1 overflow-y-auto p-5">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <SafeLoader a={a} />
          <Allowlist a={a} st={st} />
          <FalsePositive a={a} st={st} />
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* A. Safe-loader diff                                                 */
/* ------------------------------------------------------------------ */

function SafeLoader({ a }: { a: import("@/lib/vigilant/types").Artifact }) {
  const toast = useVigilant((s) => s.toast);
  const [copied, setCopied] = useState(false);
  const [converting, setConverting] = useState(false);
  const r = a.remediation;

  return (
    <div className="inset-panel p-3.5">
      <p className="mb-2 flex items-center gap-2 text-[12.5px] font-bold text-[#f0ebf2]">
        <ClipboardCheck size={13} className="text-[#ef95bb]" /> Safe-Loader Patch · {a.format}
      </p>

      {r.vulnerable && (
        <div className="mb-2">
          <CodeMini code={r.vulnerable} tone="bad" />
        </div>
      )}
      <div className="relative">
        <CodeMini code={r.hardened} tone="good" />
        {copied && (
          <span className="latch-in absolute right-2 top-2 rounded-full border border-emerald-300/50 bg-emerald-400/20 px-2 py-0.5 text-[10.5px] font-bold text-emerald-200">
            Copied!
          </span>
        )}
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <button
          className="btn-gloss"
          onClick={async () => {
            try { await navigator.clipboard.writeText(r.hardened); } catch { /* noop */ }
            setCopied(true);
            setTimeout(() => setCopied(false), 1600);
            toast({ title: "Safe loader copied", detail: "Paste it into your loading path.", kind: "ok" });
          }}
        >
          <Check size={12} /> Copy Safe Loader
        </button>
        {r.extraAction && (
          <button
            className="btn-ghost"
            disabled={converting}
            onClick={() => {
              setConverting(true);
              setTimeout(() => {
                setConverting(false);
                toast({ title: r.extraAction!.label, detail: r.extraAction!.result, kind: "info" });
              }, 1200);
            }}
          >
            {converting ? <Loader2 size={12} className="animate-spin" /> : <Wrench size={12} />} {r.extraAction.label}
          </button>
        )}
      </div>
      {r.note && <p className="mt-2 border-t border-white/[0.06] pt-2 text-[11.5px] leading-relaxed text-[#8c899a]">{r.note}</p>}
    </div>
  );
}

function CodeMini({ code, tone }: { code: string; tone: "bad" | "good" }) {
  return (
    <pre
      className="code-pane vil-scroll max-h-40 overflow-auto p-2.5"
      style={{ borderColor: tone === "bad" ? "rgba(255,92,138,0.25)" : "rgba(74,222,128,0.22)" }}
    >
      <code>{code}</code>
    </pre>
  );
}

/* ------------------------------------------------------------------ */
/* B. Org SHA-256 allowlist controller                                 */
/* ------------------------------------------------------------------ */

function Allowlist({ a, st }: { a: import("@/lib/vigilant/types").Artifact; st: string }) {
  const submit = useVigilant((s) => s.submitAllowlist);
  const allowlisting = useVigilant((s) => s.allowlisting);
  const allow = useVigilant((s) => s.allowlisted);
  const toast = useVigilant((s) => s.toast);
  const [justification, setJustification] = useState("");
  const [expiry, setExpiry] = useState("90 Days");

  const isAllowlisted = st === "allowlisted";
  const eligible = a.verdict === "review" && a.status === "done" && !a.errorState;

  if (!eligible && !isAllowlisted) {
    return (
      <div className="inset-panel p-3.5">
        <p className="mb-1.5 flex items-center gap-2 text-[12.5px] font-bold text-[#f0ebf2]">
          <ShieldCheck size={13} className="text-[#7dd3fc]" /> Org SHA-256 Allowlist
        </p>
        <p className="text-[12px] leading-relaxed text-[#837f93]">
          Available for artifacts with verdict <b className="text-[#b3afbf]">NEEDS REVIEW</b>. {a.name} is {a.errorState ? "in error state" : `verdict ${st.toUpperCase()}`} — allowlisting not applicable.
        </p>
      </div>
    );
  }

  if (isAllowlisted) {
    const entry = allow[a.id];
    return (
      <div className="latch-in inset-panel p-3.5" style={{ borderColor: "rgba(125,211,252,0.4)" }}>
        <p className="mb-1.5 flex items-center gap-2 text-[12.5px] font-bold text-[#7dd3fc]">
          <ShieldCheck size={13} /> ALLOWLISTED (ORG OVERRIDE · EXPIRES {entry?.expiry.toUpperCase()})
        </p>
        <p className="font-mono text-[11px] text-[#9db8cc]">{a.sha256.slice(0, 32)}…</p>
        <p className="mt-1.5 text-[12px] leading-relaxed text-[#b3afbf]">
          <b className="text-[#ece8f0]">Justification:</b> {entry?.justification}
        </p>
        <p className="mt-1 text-[11px] text-[#837f93]">Added {entry?.at ? new Date(entry.at).toLocaleString("en-GB") : ""} · review queue badge decremented automatically.</p>
        <button
          className="btn-ghost mt-2 !border-rose-300/30 !text-rose-200"
          onClick={() => {
            useVigilant.setState((s) => {
              const next = { ...s.allowlisted };
              delete next[a.id];
              return { allowlisted: next };
            });
            toast({ title: "Allowlist entry revoked", detail: `${a.name} returns to NEEDS REVIEW`, kind: "warn" });
          }}
        >
          <Trash2 size={11} /> Revoke override
        </button>
      </div>
    );
  }

  return (
    <div className="inset-panel p-3.5">
      <p className="mb-2 flex items-center gap-2 text-[12.5px] font-bold text-[#f0ebf2]">
        <ShieldCheck size={13} className="text-[#7dd3fc]" /> Allowlist this SHA-256 for the org
        <span className="font-normal text-[#837f93]">— solve review fatigue</span>
      </p>
      <input
        value={justification}
        onChange={(e) => setJustification(e.target.value)}
        placeholder='Justification note (required) — e.g. "Reviewed co_names; Lambda only performs 1/255 pixel rescaling"'
        className="inset-panel mb-2 w-full px-2.5 py-2 text-[12.5px] text-[#f4f0f6] outline-none placeholder:text-[#726f83] focus:border-fuchsia-300/40"
      />
      <div className="mb-2 flex flex-wrap gap-1.5">
        {EXPIRY_OPTIONS.map((o) => (
          <button
            key={o}
            onClick={() => setExpiry(o)}
            className={`flex items-center gap-1 rounded-full px-2 py-1 text-[11.5px] font-medium transition ${
              expiry === o ? "bg-fuchsia-500/25 text-[#f7eef4] ring-1 ring-fuchsia-300/40" : "bg-white/[0.04] text-[#94919f] hover:text-white"
            }`}
          >
            {o.includes("Days") ? <CalendarClock size={10} /> : <Tag size={10} />} {o}
          </button>
        ))}
      </div>
      <button
        className="btn-gloss w-full"
        disabled={!justification.trim() || allowlisting}
        onClick={() => submit(a.id, justification.trim(), expiry)}
      >
        {allowlisting ? <Loader2 size={12} className="animate-spin" /> : <ShieldCheck size={12} />}
        Allowlist SHA-256 for Org
      </button>
      <p className="mt-1.5 font-mono text-[10.5px] text-[#837f93]">POST /api/v1/workstation/allowlist → {"{ sample_id, model_name, justification, expiry_days }"}</p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* C. False-positive feedback & labeling bridge                        */
/* ------------------------------------------------------------------ */

function FalsePositive({ a, st }: { a: import("@/lib/vigilant/types").Artifact; st: string }) {
  const reportFP = useVigilant((s) => s.reportFP);
  const reporting = useVigilant((s) => s.reportingFp);
  const reports = useVigilant((s) => s.fpReports);
  const seeds = useVigilant((s) => s.fpSeeds);
  const toast = useVigilant((s) => s.toast);
  const [open, setOpen] = useState(false);

  const tally = {
    "by-design": seeds["by-design"] + reports.filter((r) => r.bucket === "by-design").length,
    "rule-bug": seeds["rule-bug"] + reports.filter((r) => r.bucket === "rule-bug").length,
    "parser-gap": seeds["parser-gap"] + reports.filter((r) => r.bucket === "parser-gap").length,
  };
  const total = tally["by-design"] + tally["rule-bug"] + tally["parser-gap"];
  const mine = reports.find((r) => r.artifactId === a.id);

  const BUCKETS = [
    { id: "by-design" as const, label: "By-Design Code-Bearing", desc: "Harmless Lambda / custom function — working as intended, needs allowlist" },
    { id: "rule-bug" as const, label: "Overly Broad Substring / Keyword Rule", desc: "Scanner rule bug — matched text inside benign metadata" },
    { id: "parser-gap" as const, label: "Container / Parser Format Gap", desc: "Parser bug — e.g. ZIP without data.pkl or uncompressed size limit" },
  ];

  return (
    <div className="inset-panel p-3.5">
      <p className="mb-2 flex items-center gap-2 text-[12.5px] font-bold text-[#f0ebf2]">
        <ListFilter size={13} className="text-[#f7b8d0]" /> False-Positive Root-Cause Feedback
      </p>

      {mine ? (
        <p className="mb-2 rounded-md border border-emerald-300/25 bg-emerald-400/[0.07] px-2 py-1.5 text-[12px] text-emerald-200">
          Reported as <b>{BUCKETS.find((b) => b.id === mine.bucket)!.label}</b> — queued on the Ground-Truth Triage Deck.
        </p>
      ) : (
        !open && (
          <button className="btn-ghost w-full" onClick={() => setOpen(true)} disabled={st === "scanning"}>
            <Send size={11} /> Report False Positive / Send to Ground-Truth Queue
          </button>
        )
      )}

      {open && !mine && (
        <div className="rise-in mb-2 space-y-1.5">
          {BUCKETS.map((b) => (
            <button
              key={b.id}
              className="w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-2.5 py-2 text-left transition hover:border-fuchsia-300/40 hover:bg-fuchsia-500/[0.08]"
              onClick={() => { reportFP(a.id, b.id); setOpen(false); }}
              disabled={reporting}
            >
              <p className="text-[12px] font-bold text-[#f4f0f6]">{b.label}</p>
              <p className="mt-0.5 text-[11px] leading-snug text-[#8c899a]">{b.desc}</p>
            </button>
          ))}
          <button className="btn-ghost w-full !text-[11.5px]" onClick={() => setOpen(false)}>Cancel</button>
        </div>
      )}

      {/* Live tally */}
      <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#837f93]">False-Positive Cause Breakdown (live)</p>
      {(
        [
          { k: "by-design", label: "By-Design Code-Bearing", color: "#f5a3c4" },
          { k: "rule-bug", label: "Broad Rule Bug", color: "#ffc46b" },
          { k: "parser-gap", label: "Parser Gap", color: "#ff8aa8" },
        ] as const
      ).map((b) => (
        <div key={b.k} className="mb-1.5">
          <div className="mb-0.5 flex justify-between text-[11px]">
            <span className="text-[#b3afbf]">{b.label}</span>
            <span className="font-mono font-bold text-[#f0ebf2]">{tally[b.k]} <span className="text-[#837f93]">({Math.round((tally[b.k] / Math.max(1, total)) * 100)}%)</span></span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${(tally[b.k] / Math.max(1, total)) * 100}%`, background: b.color, boxShadow: `0 0 8px ${b.color}88` }} />
          </div>
        </div>
      ))}
    </div>
  );
}
