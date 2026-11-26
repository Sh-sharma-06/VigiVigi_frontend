import { NextResponse } from "next/server";
import { GLOBAL_CORPUS_PATH, ALLOWLIST_PATH, readJsonSafe } from "@/lib/vigilant/server-bridge";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const sha = (searchParams.get("sha256") || "").trim().toLowerCase();
  const corpus = readJsonSafe<any>(GLOBAL_CORPUS_PATH, {});
  const allowlist = readJsonSafe<Record<string, any>>(ALLOWLIST_PATH, {});
  const recordsMap = corpus?.current_records || {};

  if (sha) {
    const entry = recordsMap[sha]?.record || null;
    return NextResponse.json({
      found: Boolean(entry),
      allowlisted: allowlist[sha] || null,
      record: entry,
    });
  }

  return NextResponse.json({
    total_corpus_count: Object.keys(recordsMap).length,
    allowlisted_count: Object.keys(allowlist).length,
  });
}
