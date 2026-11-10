"use client";

import React, { useCallback, useEffect, useState } from "react";
import { UploadCloud } from "lucide-react";
import { useVigilant, hydrateStore } from "@/lib/vigilant/store";
import { ARTIFACTS } from "@/lib/vigilant/data";
import { TopNav, CommandPalette } from "@/components/vigilant/TopNav";
import { Workstation } from "@/components/vigilant/Workstation";
import { HistoryView, ExtensionView, GateView, ApiView } from "@/components/vigilant/Views";
import { IntakeModal, setPendingDrop } from "@/components/vigilant/Intake";
import { Toasts } from "@/components/vigilant/bits";

export default function Page() {
  const view = useVigilant((s) => s.view);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    hydrateStore(ARTIFACTS);
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
      <TopNav />

      <main className="flex min-h-0 flex-1 flex-col p-3">
        {view === "investigate" && <Workstation />}
        {view === "review" && <Workstation forcedFilter="review" />}
        {view === "history" && <HistoryView />}
        {view === "extension" && <ExtensionView />}
        {view === "gate" && <GateView />}
        {view === "api" && <ApiView />}
      </main>

      <IntakeModal />
      <CommandPalette />
      <Toasts />

      {dragging && (
        <div className="pointer-events-none fixed inset-0 z-[85] grid place-items-center bg-[#0a070f]/70 backdrop-blur-sm">
          <div className="rise-in glass-deep flex flex-col items-center gap-3 border-2 border-dashed border-fuchsia-300/50 px-14 py-10">
            <span className="glow-breathe grid h-16 w-16 place-items-center rounded-full bg-gradient-to-br from-[#d862e8] to-[#8f24ad] text-white">
              <UploadCloud size={30} />
            </span>
            <p className="text-sm font-bold text-[#f4e8fc]">Drop anywhere to intake</p>
            <p className="text-[11px] text-[#b9a8d4]">8 MB chunked SHA-256 pre-flight starts immediately</p>
          </div>
        </div>
      )}
    </div>
  );
}
