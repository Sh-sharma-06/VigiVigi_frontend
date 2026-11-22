"use client";

import React, { useCallback, useEffect, useState } from "react";
import { UploadCloud } from "lucide-react";
import { useVigilant, hydrateStore } from "@/lib/vigilant/store";
import { ARTIFACTS, buildUploadArtifact, guessFormat } from "@/lib/vigilant/data";
import { TopBar } from "@/components/vigilant/TopBar";
import { Workstation } from "@/components/vigilant/Workstation";
import { IntakeModal, setPendingDrop } from "@/components/vigilant/Intake";
import { Toasts } from "@/components/vigilant/bits";

export default function Page() {
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    hydrateStore(ARTIFACTS);
    const seen = new Set<string>();
    let primed = false;
    const poll = async () => {
      try {
        const res = await fetch("/api/v1/workstation/intercepts");
        const data = await res.json();
        const items = Array.isArray(data?.items) ? data.items : [];
        if (!primed) {
          items.forEach((it: any) => seen.add(it.id));
          primed = true;
          return;
        }
        for (const it of items) {
          if (seen.has(it.id)) continue;
          seen.add(it.id);
          const vRaw = String(it.verdict || "BENIGN").toUpperCase();
          const v = vRaw === "MALICIOUS" ? "malicious" : vRaw === "SUSPICIOUS" ? "review" : "clean";
          const art = buildUploadArtifact({
            name: it.name,
            format: guessFormat(it.name),
            sizeMB: Math.max(0.1, Number(it.sizeMB || 1)),
            sha256: it.sha256,
            verdict: v,
          });
          art.rootCause = it.summary || art.rootCause;
          useVigilant.getState().addArtifact(art, { scan: false });
          useVigilant.getState().select(art.id);
          useVigilant.getState().toast({
            title: `Extension Intercepted: ${it.name}`,
            detail: `${v.toUpperCase()} · synced live from Chrome Gate (:8090)`,
            kind: v === "malicious" ? "err" : v === "review" ? "warn" : "ok",
          });
        }
      } catch {}
    };
    void poll();
    const iv = setInterval(poll, 4000);
    return () => clearInterval(iv);
  }, []);

  const onDragOver = useCallback((e: React.DragEvent) => {
    if (e.dataTransfer.types.includes("Files")) {
      e.preventDefault();
      setDragging(true);
    }
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent) => {
    if (e.relatedTarget === null) setDragging(false);
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) {
      setPendingDrop(f);
      useVigilant.getState().setIntakeOpen(true);
    }
  }, []);

  return (
    <div
      className="flex min-h-screen flex-col"
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <TopBar />

      <Workstation />

      <IntakeModal />
      <Toasts />

      {dragging && (
        <div className="pointer-events-none fixed inset-0 z-[95] grid place-items-center bg-[#050507]/55 backdrop-blur-md">
          <div className="glass animate-pop flex flex-col items-center gap-3.5 rounded-3xl border-dashed border-white/25 px-16 py-12">
            <span className="btn-liquid grid h-16 w-16 place-items-center rounded-2xl">
              <UploadCloud size={28} />
            </span>
            <p className="text-base font-semibold tracking-tight text-[#eef0f3]">
              Drop anywhere to scan
            </p>
            <p className="text-[13px] text-[#eef0f3]/55">
              Your file is hashed locally in 8 MB chunks — nothing leaves the browser.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
