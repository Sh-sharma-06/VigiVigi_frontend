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
        <div className="pointer-events-none fixed inset-0 z-[95] grid place-items-center bg-[#140409]/55 backdrop-blur-md">
          <div className="glass animate-pop flex flex-col items-center gap-3.5 rounded-3xl border-dashed border-white/25 px-16 py-12">
            <span className="btn-liquid grid h-16 w-16 place-items-center rounded-2xl">
              <UploadCloud size={28} />
            </span>
            <p className="text-base font-semibold tracking-tight text-[#f7ede4]">
              Drop anywhere to scan
            </p>
            <p className="text-[13px] text-[#f7ede4]/55">
              Your file is hashed locally in 8 MB chunks — nothing leaves the browser.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
