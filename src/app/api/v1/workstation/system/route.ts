import { NextResponse } from "next/server";
import { execSync } from "child_process";
import fs from "fs";
import path from "path";

const Q_DIR = "/tmp/vigilant_hf_quarantine";

function getStats() {
  let freeGB = 0;
  let totalGB = 0;
  let usedGB = 0;
  let usedPct = 0;
  let tmpFreeGB = 0;

  try {
    const line = execSync("df -BM --output=size,used,avail,pcent / | tail -n 1", { encoding: "utf-8" }).trim();
    const [sz, us, av, pc] = line.split(/\s+/);
    totalGB = +(parseInt(sz.replace("M", ""), 10) / 1024).toFixed(1);
    usedGB = +(parseInt(us.replace("M", ""), 10) / 1024).toFixed(1);
    freeGB = +(parseInt(av.replace("M", ""), 10) / 1024).toFixed(1);
    usedPct = parseInt(pc.replace("%", ""), 10) || 0;
  } catch {}

  try {
    const tline = execSync("df -BM --output=avail /tmp | tail -n 1", { encoding: "utf-8" }).trim();
    tmpFreeGB = +(parseInt(tline.replace("M", ""), 10) / 1024).toFixed(1);
  } catch {}

  let quarantineMB = 0;
  try {
    if (fs.existsSync(Q_DIR)) {
      const du = execSync(`du -sm "${Q_DIR}" | cut -f1`, { encoding: "utf-8" }).trim();
      quarantineMB = parseInt(du, 10) || 0;
    }
  } catch {}

  return { freeGB, totalGB, usedGB, usedPct, tmpFreeGB, quarantineMB };
}

export async function GET() {
  return NextResponse.json({ ok: true, ...getStats() });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  if (body?.action === "purge_quarantine") {
    try {
      if (fs.existsSync(Q_DIR)) {
        for (const f of fs.readdirSync(Q_DIR)) {
          fs.rmSync(path.join(Q_DIR, f), { recursive: true, force: true });
        }
      }
    } catch {}
  }
  return NextResponse.json({ ok: true, purged: true, ...getStats() });
}
