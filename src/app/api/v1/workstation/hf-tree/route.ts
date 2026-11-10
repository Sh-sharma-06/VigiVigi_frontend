import { NextResponse } from "next/server";
import { HF_REPO } from "@/lib/vigilant/data";

/**
 * GET /api/v1/workstation/hf-tree?org=<org>&repo=<repo>
 * Simulates fetching a Hugging Face repo file tree with LFS OIDs.
 * Replace the body with a real call to https://huggingface.co/api/models/<org>/<repo>/tree/main
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const org = searchParams.get("org") ?? HF_REPO.org;
  const repo = searchParams.get("repo") ?? HF_REPO.repo;
  return NextResponse.json({
    org,
    repo,
    url: `https://huggingface.co/${org}/${repo}`,
    files: HF_REPO.files,
  });
}
