import { NextResponse } from "next/server";
import { GLOBAL_CORPUS_PATH, ALLOWLIST_PATH, API_KEYS_PATH, readJsonSafe, writeJsonSafe } from "@/lib/vigilant/server-bridge";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  if (body?.action === "register_key" && body?.key) {
    const keys = readJsonSafe<any[]>(API_KEYS_PATH, []);
    keys.push({ key_prefix: String(body.key).slice(0, 14), created_at: new Date().toISOString() });
    writeJsonSafe(API_KEYS_PATH, keys);
    return NextResponse.json({ ok: true });
  }

  const policy = (body?.policy as string) ?? "enforce";
  const sha = String(body?.sha256 ?? "a1c3e5f7b9d0246813579acfbd0e2468a1c3e5f7b9d0246813579acfbd0e2468").toLowerCase();
  const scanId = `scn_${Date.now().toString(36)}`;

  const corpus = readJsonSafe<any>(GLOBAL_CORPUS_PATH, {});
  const allowlist = readJsonSafe<Record<string, any>>(ALLOWLIST_PATH, {});
  const hit = corpus?.current_records?.[sha]?.record;

  const isAllowlisted = Boolean(allowlist[sha]);
  const verdict = isAllowlisted
    ? "ALLOWLISTED_CLEAN"
    : hit
      ? String(hit.features?.raw_verdict || hit.verdict || "NO_THREATS_DETECTED")
      : "NO_THREATS_DETECTED";

  return NextResponse.json(
    {
      scan_id: scanId,
      sha256: sha,
      model_name: hit?.model_name || body?.artifact_url?.split("/").pop() || "model.safetensors",
      policy,
      cache: hit ? "HIT" : "MISS",
      verdict,
      queued: !hit,
      est_latency_ms: hit ? 1.2 : 1840,
      webhook: body?.callback_url ?? null,
    },
    { status: 202, headers: { "x-vigilant-scan-id": scanId } }
  );
}
