import { NextResponse } from "next/server";
import path from "path";
import { HUB_DATA_DIR, readJsonSafe } from "@/lib/vigilant/server-bridge";

const FEED_PATH = path.join(HUB_DATA_DIR, ".live_intercepts.json");

export async function GET() {
  const items = readJsonSafe<any[]>(FEED_PATH, []);
  return NextResponse.json({ ok: true, items });
}
