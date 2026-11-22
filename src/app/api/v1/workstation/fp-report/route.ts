import { NextResponse } from "next/server";
import { FP_REPORTS_PATH, readJsonSafe, writeJsonSafe } from "@/lib/vigilant/server-bridge";

export async function GET() {
  const reports = readJsonSafe<any[]>(FP_REPORTS_PATH, []);
  return NextResponse.json({ ok: true, reports });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const { artifact_id, sha256, model_name, bucket } = body as Record<string, string>;
  if (!artifact_id || !["by-design", "rule-bug", "parser-gap"].includes(bucket)) {
    return NextResponse.json({ error: "artifact_id and a valid bucket are required" }, { status: 400 });
  }
  const reports = readJsonSafe<any[]>(FP_REPORTS_PATH, []);
  const ticket = {
    triage_ticket: `gt_${Date.now().toString(36)}`,
    artifact_id,
    sha256: sha256 || artifact_id,
    model_name: model_name || artifact_id,
    bucket,
    created_at: new Date().toISOString(),
    queued_for: "ground-truth-deck",
  };
  reports.push(ticket);
  writeJsonSafe(FP_REPORTS_PATH, reports);
  return NextResponse.json({ ok: true, ...ticket });
}
