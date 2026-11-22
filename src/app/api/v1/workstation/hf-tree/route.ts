import { NextResponse } from "next/server";
import { HF_REPO, guessFormat } from "@/lib/vigilant/data";
import { GLOBAL_CORPUS_PATH, ALLOWLIST_PATH, readJsonSafe } from "@/lib/vigilant/server-bridge";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const org = searchParams.get("org") ?? HF_REPO.org;
  const repo = searchParams.get("repo") ?? HF_REPO.repo;

  try {
    const hfRes = await fetch(`https://huggingface.co/api/models/${org}/${repo}/tree/main?recursive=true`, {
      headers: { "Accept": "application/json", "User-Agent": "Vigilant-Workstation/3.2" },
      next: { revalidate: 30 }
    });
    if (!hfRes.ok) throw new Error(`HF HTTP ${hfRes.status}`);
    const treeData = (await hfRes.json()) as any[];

    const corpus = readJsonSafe<any>(GLOBAL_CORPUS_PATH, {});
    const allowlist = readJsonSafe<Record<string, any>>(ALLOWLIST_PATH, {});
    const currentRecords = corpus?.current_records || {};

    const files = treeData
      .filter((item) => item && item.type === "file")
      .slice(0, 40)
      .map((item) => {
        const filePath = String(item.path || "");
        const name = filePath.split("/").pop() || filePath;
        const lfsOid = String(item.lfs?.oid || item.oid || "").toLowerCase();
        const sizeBytes = Number(item.lfs?.size ?? item.size ?? 0);
        const sizeMB = Math.max(0.01, Number((sizeBytes / (1024 * 1024)).toFixed(2)));
        const fmt = guessFormat(name);

        // Check real corpus cache & allowlist first!
        const cached = currentRecords[lfsOid]?.record;
        let precheck: "safe" | "review" | "malicious" = "safe";
        if (allowlist[lfsOid]) {
          precheck = "safe";
        } else if (cached) {
          const v = String(cached.features?.raw_verdict || cached.verdict || "").toUpperCase();
          if (v === "MALICIOUS" && !String(cached.summary || "").toLowerCase().includes("lambda")) {
            precheck = "malicious";
          } else if (v === "SUSPICIOUS" || v === "MALICIOUS") {
            precheck = "review";
          } else {
            precheck = "safe";
          }
        } else {
          const lower = name.toLowerCase();
          if (/mal|rce|exploit|backdoor|unsafe/.test(lower)) precheck = "malicious";
          else if (/\.(pkl|pickle|pt|pth|ckpt|keras|h5|pb)$/.test(lower)) precheck = "review";
          else precheck = "safe";
        }

        return {
          path: filePath,
          name,
          format: fmt,
          sizeMB,
          lfsOid: lfsOid.padEnd(64, "0").slice(0, 64),
          precheck,
          downloadUrl: `https://huggingface.co/${org}/${repo}/resolve/main/${filePath}`,
          gateScanUrl: `http://100.71.40.11:8090/scan?target=${encodeURIComponent(`https://huggingface.co/${org}/${repo}/resolve/main/${filePath}`)}`
        };
      });

    if (files.length > 0) {
      return NextResponse.json({
        org,
        repo,
        live: true,
        url: `https://huggingface.co/${org}/${repo}`,
        files,
      });
    }
  } catch (err) {
    // Fallback to built-in demo repo if offline or repo is private
  }

  return NextResponse.json({
    org,
    repo,
    live: false,
    url: `https://huggingface.co/${org}/${repo}`,
    files: HF_REPO.files,
  });
}
