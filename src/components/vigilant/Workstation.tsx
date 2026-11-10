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
        <div className="mb-1 flex shrink-0 items-center gap-2 rounded-xl border border-amber-300/30 bg-amber-400/[0.08] px-3.5 py-2">
          <Eye size={13} className="shrink-0 text-amber-300" />
          <p className="text-[11px] text-amber-100/90">
            <b>Review Queue</b> — filtered to artifacts flagged <b>NEEDS REVIEW: Contains executable code</b>. {counts.review} awaiting triage: justify &amp; allowlist verified-harmless hashes, or report false positives to the ground-truth deck.
          </p>
        </div>
      )}
      <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-[300px_minmax(0,1fr)_380px] lg:grid-rows-[auto_minmax(0,1fr)]">
        {/* Top-center: verdict header */}
        <div className="order-1 min-w-0 lg:col-start-2 lg:row-start-1">
          <VerdictHeader />
        </div>

        {/* Top-right: intake */}
        <div className="order-2 min-w-0 lg:col-start-3 lg:row-start-1">
          <IntakeCard />
        </div>

        {/* Left: queue (full height on desktop) */}
        <div className="order-3 flex min-h-0 flex-col max-lg:max-h-[520px] lg:col-start-1 lg:row-span-2 lg:row-start-1">
          <Queue />
        </div>

        {/* Bottom-center: pipeline + evidence */}
        <div className="order-4 flex min-h-[460px] min-w-0 flex-col lg:col-start-2 lg:row-start-2">
          <ForensicCanvas />
        </div>

        {/* Bottom-right: remediation */}
        <div className="order-5 flex min-h-[380px] min-w-0 flex-col lg:col-start-3 lg:row-start-2">
          <Remediation />
        </div>
      </div>
    </>
  );
}
