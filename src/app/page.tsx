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

      <main className="flex min-h-0 flex-1 flex-col p-4 lg:p-5">
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
        <div className="pointer-events-none fixed inset-0 z-[85] grid place-items-center bg-[#0b090f]/60 backdrop-blur-md">
          <div className="rise-in glass-deep flex flex-col items-center gap-3.5 border-2 border-dashed border-fuchsia-300/50 px-16 py-12">
            <span className="glow-breathe grid h-[72px] w-[72px] place-items-center rounded-full bg-gradient-to-br from-[#e05588] to-[#822850] text-white">
              <UploadCloud size={32} />
            </span>
            <p className="text-[15px] font-semibold tracking-tight text-white">Drop anywhere to intake</p>
            <p className="text-xs text-[#a29fb1]">8 MB chunked SHA-256 pre-flight starts immediately</p>
          </div>
        </div>
      )}
    </div>
  );
}
