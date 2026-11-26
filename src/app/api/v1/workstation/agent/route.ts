import { NextResponse } from "next/server";
import { execFileSync } from "child_process";

const SCRIPTS: Record<string, string> = {
  triage: "/home/sandesh/vigilant-eval-triage/agent_triage.py",
  sandbox: "/home/sandesh/vigilant-eval-triage/agent_sandbox.py",
  pr_remediate: "/home/sandesh/vigilant-eval-triage/agent_pr_remediate.py",
  threat_hunt: "/home/sandesh/vigilant-eval-triage/agent_threat_hunter.py",
  orchestrate: "/home/sandesh/vigilant-eval-triage/vigilant_orchestrator.py",
};

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const mode = String(body?.mode || "triage");
    const script = SCRIPTS[mode] || SCRIPTS.triage;
    const out = execFileSync("python3", [script], {
      input: JSON.stringify(body),
      encoding: "utf-8",
      timeout: 30000,
    });
    return NextResponse.json(JSON.parse(out));
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || "Agent execution failed" },
      { status: 500 }
    );
  }
}
