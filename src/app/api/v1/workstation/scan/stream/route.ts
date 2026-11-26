import { spawn } from "child_process";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SCANNER_SCRIPT = "/home/sandesh/vigilant-eval-triage/live_sse_scanner.py";

export async function POST(req: Request) {
  const payload = await req.json().catch(() => ({}));
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      const py = spawn("python3", ["-u", SCANNER_SCRIPT], {
        stdio: ["pipe", "pipe", "pipe"],
      });

      py.stdin.write(JSON.stringify(payload));
      py.stdin.end();

      let buffer = "";
      py.stdout.on("data", (chunk: Buffer) => {
        buffer += chunk.toString("utf-8");
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed) {
            controller.enqueue(encoder.encode(`data: ${trimmed}\n\n`));
          }
        }
      });

      py.stderr.on("data", (chunk: Buffer) => {
        const msg = chunk.toString("utf-8").trim();
        if (msg) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: "error", message: msg })}\n\n`)
          );
        }
      });

      py.on("close", () => {
        if (buffer.trim()) {
          controller.enqueue(encoder.encode(`data: ${buffer.trim()}\n\n`));
        }
        controller.close();
      });

      py.on("error", (err) => {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: "error", message: err.message })}\n\n`)
        );
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
