import { NextResponse } from "next/server";

/**
 * POST /api/v1/workstation/allowlist
 * Body: { sample_id, model_name, justification, expiry }
 * Backend integration point — persist the org hash allowlist entry here.
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const { sample_id, model_name, justification, expiry } = body as Record<string, string>;
  if (!sample_id || !justification) {
    return NextResponse.json({ error: "sample_id and justification are required" }, { status: 400 });
  }
  return NextResponse.json({
    ok: true,
    entry: {
      sample_id,
      model_name: model_name ?? null,
      justification,
      expiry: expiry ?? "90 Days",
      created_at: new Date().toISOString(),
    },
  });
}
