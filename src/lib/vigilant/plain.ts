/* Verdict display metadata + plain-English summary generation.
   This is the "consumer voice" layer: no jargon unless the user asks
   for the technical drawer. */

import type { Artifact } from "./types";
import type { EffectiveStatus } from "./store";
import { fmtSize } from "./format";

export type Tone = "red" | "amber" | "green" | "zinc";

export interface VerdictMeta {
  label: string;
  tone: Tone;
}

export function verdictMeta(
  a: Artifact,
  allow: Record<string, unknown>
): VerdictMeta {
  const eff = effectiveOf(a, allow);
  switch (eff) {
    case "queued":
      return { label: "Queued", tone: "zinc" };
    case "scanning":
      return { label: "Scanning…", tone: "zinc" };
    case "malicious":
      return { label: "Malicious · Hard Blocked", tone: "red" };
    case "review":
      return {
        label: a.containsExecutableCode
          ? "Needs Review: Executable Code Found"
          : "Needs Review",
        tone: "amber",
      };
    case "clean":
      return { label: "No Threats Detected", tone: "green" };
    case "allowlisted":
      return { label: "Allowlisted", tone: "green" };
    case "error":
      return { label: "Scan Failed", tone: "red" };
  }
}

function effectiveOf(a: Artifact, allow: Record<string, unknown>): EffectiveStatus {
  if (a.errorState && a.status === "error") return "error";
  if (a.status === "scanning" || a.status === "queued") return a.status;
  if (allow[a.id]) return "allowlisted";
  return a.verdict;
}

/** Friendly, human-readable explanation of the verdict. */
export function plainSummary(
  a: Artifact,
  allow: Record<string, unknown>
): string {
  const eff = effectiveOf(a, allow);
  if (eff === "error") {
    return "The scanner stopped before it could reach a verdict — this file's structure pushed past the parser's normal limits. Nothing was executed and nothing is at risk. You can retry with extended bounds below.";
  }
  if (eff === "allowlisted") {
    const rec = allow[a.id] as { expiry?: string } | undefined;
    const expiry = rec?.expiry ? ` for the next ${rec.expiry}` : "";
    return `A security reviewer has checked this exact build and approved it${expiry}. The code inside was verified as intentional, so it now loads normally for everyone in your organization. The original findings are still available in the technical evidence if you want to see them.`;
  }
  if (eff === "malicious") {
    const execAttempt = a.hooks.some((h) => h.name === "execve" && h.count > 0);
    const netAttempt = a.hooks.some((h) => h.name === "connect" && h.count > 0);
    const actions: string[] = [];
    if (execAttempt) actions.push("run hidden shell commands");
    if (netAttempt) actions.push("contact a remote server");
    if (!actions.length) actions.push("execute code the moment it is opened");
    const action = actions.join(" and ");
    return `This file isn't just storing numbers — it carries instructions that would ${action} as soon as it's loaded. The scanner caught this inside a sealed sandbox before anything ran, so your machine was never at risk. Keep the file quarantined and let the security team trace where it came from.`;
  }
  if (eff === "review") {
    const joined = a.findings.map((f) => f.evidence).join(" ");
    if (a.format === "KERAS" && /lambda/i.test(joined + a.rootCause)) {
      return "This model contains a custom Lambda layer. While this might just be math, it has the capability to run hidden code. Keras 3 blocks this by default to keep you safe.";
    }
    if (a.format === "GGUF") {
      return "This model ships with a chat template that calls a few helper functions we couldn't fully verify by reading the file alone. The model itself is likely fine — it just needs a quick human look before it's trusted for everyone.";
    }
    if (a.format === "PYTORCH_ZIP" || a.format === "PICKLE") {
      return "This checkpoint was saved with Python's pickle format, which can embed runnable code alongside the weights. The scanner flagged a few spots that deserve a human look before you load it into a training run. Nothing dangerous executed during the scan.";
    }
    return "The scanner found something in this file that can technically run code. It held the file back so a person can double-check it. If it turns out to be intentional, one click adds it to your organization's allowlist.";
  }
  // clean
  if (a.format === "SAFETENSORS") {
    return "We walked every byte of this file and found pure tensor weights — this format is built so it can't carry executable code. No sandbox was even needed. You can load it normally.";
  }
  if (a.format === "ONNX") {
    return "The computation graph is clean: standard operators only, external data properly referenced, and nothing that executes when the model loads. You can use it as-is.";
  }
  return "We walked every byte of this file and found only math — no embedded code, no archive tricks, no surprise network calls. You can load it normally.";
}

/** Short line under the summary for allowlisted / blocked states. */
export function summaryFootnote(
  a: Artifact,
  allow: Record<string, unknown>
): string | null {
  const eff = effectiveOf(a, allow);
  if (eff === "malicious")
    return "Held at the security gate — the file never ran on your machine.";
  if (eff === "review" && a.containsExecutableCode)
    return "Held until a reviewer approves it or the code is replaced with a safe alternative.";
  if (eff === "allowlisted") {
    const rec = allow[a.id] as { justification?: string } | undefined;
    return rec?.justification ? `Reviewer note: “${rec.justification}”` : null;
  }
  return null;
}
