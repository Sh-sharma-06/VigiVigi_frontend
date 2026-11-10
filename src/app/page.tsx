"use client";

import React, { useCallback, useEffect, useState } from "react";
import { UploadCloud } from "lucide-react";
import { useVigilant, hydrateStore } from "@/lib/vigilant/store";
import { ARTIFACTS } from "@/lib/vigilant/data";
import { TopBar } from "@/components/vigilant/TopBar";
import { Workstation } from "@/components/vigilant/Workstation";
import { IntakeModal, setPendingDrop } from "@/components/vigilant/Intake";
import { Toasts } from "@/components/vigilant/bits";

export default function Page() {
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
      <TopBar />

      <Workstation />

      <IntakeModal />
      <Toasts />

      {dragging && (
        <div className="pointer-events-none fixed inset-0 z-[95] grid place-items-center bg-white/70 backdrop-blur-sm">
          <div className="animate-pop flex flex-col items-center gap-3.5 rounded-2xl border-2 border-dashed border-zinc-300 bg-white/90 px-16 py-12 shadow-xl">
            <span className="grid h-16 w-16 place-items-center rounded-2xl bg-primary text-primary-foreground">
              <UploadCloud size={28} />
            </span>
            <p className="text-base font-semibold tracking-tight">
              Drop anywhere to scan
            </p>
            <p className="text-[13px] text-muted-foreground">
              Your file is hashed locally in 8 MB chunks — nothing leaves the browser.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
