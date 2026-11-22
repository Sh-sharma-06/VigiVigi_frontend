import { NextResponse } from "next/server";
import { ALLOWLIST_PATH, readJsonSafe, writeJsonSafe } from "@/lib/vigilant/server-bridge";

export async function GET() {
  const store = readJsonSafe<Record<string, any>>(ALLOWLIST_PATH, {});
  return NextResponse.json({ ok: true, allowlisted: store });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const { sample_id, sha256, model_name, justification, expiry } = body as Record<string, string>;
  const key = (sample_id || sha256 || "").trim();
  if (!key || !justification) {
    return NextResponse.json({ error: "sample_id and justification are required" }, { status: 400 });
  }
  const store = readJsonSafe<Record<string, any>>(ALLOWLIST_PATH, {});
  const entry = {
    sample_id: key,
    sha256: sha256 || key,
    model_name: model_name ?? "artifact",
    justification,
    expiry: expiry ?? "90 Days",
    ruleset: "v2.4.0",
    created_at: new Date().toISOString(),
  };
  store[key] = entry;
  if (sha256) store[sha256.toLowerCase()] = entry;
  writeJsonSafe(ALLOWLIST_PATH, store);
  return NextResponse.json({ ok: true, entry });
}
