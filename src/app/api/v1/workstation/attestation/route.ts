import { NextResponse } from "next/server";
import { execFileSync } from "child_process";

const ATTEST_SCRIPT = "/home/sandesh/vigilant-eval-triage/attestation_engine.py";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const out = execFileSync("python3", [ATTEST_SCRIPT], {
      input: JSON.stringify(body),
      encoding: "utf-8",
      timeout: 8000,
    });
    return NextResponse.json(JSON.parse(out));
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || "Attestation failed" }, { status: 500 });
  }
}
