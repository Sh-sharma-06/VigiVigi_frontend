"use client";

import { Sidebar } from "./Sidebar";
import { Canvas } from "./Canvas";

/**
 * Simplified 2-column layout:
 *   [ 280px artifact queue | flexible verdict canvas ]
 */
export function Workstation() {
  return (
    <div className="mx-auto grid w-full max-w-[1400px] flex-1 grid-cols-1 gap-6 px-4 py-5 lg:grid-cols-[280px_minmax(0,1fr)] lg:gap-8 lg:px-6 lg:py-6">
      <Sidebar />
      <main className="flex min-w-0 flex-col" aria-label="Scan results">
        <Canvas />
      </main>
    </div>
  );
}
