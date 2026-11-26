import { NextResponse } from "next/server";
import { execFileSync } from "child_process";

const REPAIR_SCRIPT = "/home/sandesh/vigilant-eval-triage/repair_engine.py";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const stdout = execFileSync("python3", [REPAIR_SCRIPT], {
      input: JSON.stringify(body),
      encoding: "utf-8",
      timeout: 15000,
      maxBuffer: 50 * 1024 * 1024,
    });
    const parsed = JSON.parse(stdout);
    return NextResponse.json(parsed, { status: parsed.ok ? 200 : 400 });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || "Repair engine execution failed" },
      { status: 500 }
    );
  }
}
