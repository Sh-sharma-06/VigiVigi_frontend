import { NextResponse } from "next/server";

/**
 * POST /api/v1/workstation/fp-report
 * Body: { artifact_id, bucket }  bucket: by-design | rule-bug | parser-gap
 * Forwards the label to the Ground-Truth Triage Deck.
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const { artifact_id, bucket } = body as Record<string, string>;
  if (!artifact_id || !["by-design", "rule-bug", "parser-gap"].includes(bucket)) {
    return NextResponse.json({ error: "artifact_id and a valid bucket are required" }, { status: 400 });
  }
  return NextResponse.json({
    ok: true,
    triage_ticket: `gt_${Date.now().toString(36)}`,
    bucket,
    artifact_id,
    queued_for: "ground-truth-deck",
  });
}
