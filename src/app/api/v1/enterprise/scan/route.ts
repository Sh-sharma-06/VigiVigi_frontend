import { NextResponse } from "next/server";

/**
 * POST /api/v1/enterprise/scan
 * CI/CD integration endpoint. Simulated here — wire to the real scan orchestrator.
 * Response honors the requested policy: enforce blocks MALICIOUS + un-allowlisted review.
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const policy = (body?.policy as string) ?? "enforce";
  const sha = (body?.sha256 as string) ?? "a1c3e5f7b9d0246813579acfbd0e2468a1c3e5f7b9d0246813579acfbd0e2468";
  const scanId = `scn_${Math.random().toString(36).slice(2, 10)}`;
  return NextResponse.json(
    {
      scan_id: scanId,
      sha256: sha.slice(0, 12) + "…",
      policy,
      cache: "MISS",
      queued: true,
      est_latency_ms: 4200,
      webhook: body?.callback_url ?? null,
    },
    { status: 202, headers: { "x-vigilant-scan-id": scanId } }
  );
}
