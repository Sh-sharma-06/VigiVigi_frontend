"use client";

import React, { useEffect } from "react";
import { Eye } from "lucide-react";
import { useVigilant, triageCounts } from "@/lib/vigilant/store";
import { Queue } from "./Queue";
import { VerdictHeader } from "./Header";
import { IntakeCard } from "./Intake";
import { ForensicCanvas } from "./Pipeline";
import { Remediation } from "./Remediation";

export function Workstation({ forcedFilter }: { forcedFilter?: "review" }) {
  const setFilterPill = useVigilant((s) => s.setFilterPill);
  const artifacts = useVigilant((s) => s.artifacts);
  const allow = useVigilant((s) => s.allowlisted);
  const counts = triageCounts(artifacts, allow);

  useEffect(() => {
    if (forcedFilter === "review") {
      setFilterPill("review");
      const st = useVigilant.getState();
      const firstReview = st.artifacts.find((a) => a.verdict === "review" && !st.allowlisted[a.id] && a.status === "done" && !a.errorState);
      if (firstReview && (!st.selectedId || st.artifacts.find((a) => a.id === st.selectedId)?.verdict !== "review")) {
        st.select(firstReview.id);
      }
    }
  }, [forcedFilter, setFilterPill]);

  return (
    <>
      {forcedFilter === "review" && (
        <div className="glass mb-4 flex shrink-0 items-center gap-3 px-5 py-3">
          <Eye size={16} className="shrink-0 text-amber-300" />
          <p className="text-[13.5px] leading-relaxed text-[#d9d6e0]">
            <b className="font-semibold text-amber-200">Review Queue</b> — filtered to artifacts flagged <b className="font-semibold text-amber-200">NEEDS REVIEW: Contains executable code</b>. {counts.review} awaiting triage: justify &amp; allowlist verified-harmless hashes, or report false positives to the ground-truth deck.
          </p>
        </div>
      )}
      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[336px_minmax(0,1fr)_340px] lg:grid-rows-[auto_auto_auto]">
        {/* Top-center: verdict header */}
        <div className="order-1 min-w-0 lg:col-start-2 lg:row-start-1">
          <VerdictHeader />
        </div>

        {/* Top-right: intake — stretches to exactly meet the header's bottom edge */}
        <div className="order-2 flex min-w-0 lg:col-start-3 lg:row-start-1">
          <IntakeCard />
        </div>

        {/* Left: queue (full height on desktop) */}
        <div className="order-3 flex min-h-0 flex-col max-lg:max-h-[560px] lg:col-start-1 lg:row-span-3 lg:row-start-1">
          <Queue />
        </div>

        {/* Middle: forensic canvas — spans the full width right of the queue so the
            phase-wise DAG rectangles stay horizontally wide, never squeezed */}
        <div className="order-4 flex min-h-[440px] min-w-0 flex-col lg:col-span-2 lg:col-start-2 lg:row-start-2">
          <ForensicCanvas />
        </div>

        {/* Below: remediation — moved under the phase-wise analysis so neither box
            competes for horizontal space */}
        <div className="order-5 flex min-h-[320px] min-w-0 flex-col lg:col-span-2 lg:col-start-2 lg:row-start-3">
          <Remediation />
        </div>
      </div>
    </>
  );
}
