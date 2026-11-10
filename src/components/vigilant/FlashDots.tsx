import type { CSSProperties } from "react";

/* Deterministic PRNG so the field is identical on server and client. */
const mulberry = (seed: number) => () => {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const COLORS = ["#eef0f3", "#9ba0f5", "#8fbac4", "#c9a86a"];

const DOTS = (() => {
  const rnd = mulberry(20261110);
  return Array.from({ length: 24 }, (_, i) => ({
    x: 2 + rnd() * 96,
    y: 4 + rnd() * 90,
    s: 1.8 + rnd() * 2.2,
    dur: 4.4 + rnd() * 4.6,
    delay: rnd() * 9,
    dx: Math.round((rnd() - 0.5) * 28),
    dy: -Math.round(6 + rnd() * 22),
    peak: 0.4 + rnd() * 0.5,
    c: COLORS[i % COLORS.length],
  }));
})();

/** Tiny flash dots that randomly twinkle and drift — the only animated
    background layer, so the whole scene stays perfectly smooth. */
export function FlashDots() {
  return (
    <div className="flash-field" aria-hidden>
      {DOTS.map((d, i) => (
        <span
          key={i}
          className="flash-dot"
          style={{
            left: `${d.x.toFixed(2)}%`,
            top: `${d.y.toFixed(2)}%`,
            width: `${d.s.toFixed(2)}px`,
            height: `${d.s.toFixed(2)}px`,
            color: d.c,
            animationDuration: `${d.dur.toFixed(2)}s`,
            animationDelay: `-${d.delay.toFixed(2)}s`,
            "--peak": d.peak.toFixed(2),
            "--dx": `${d.dx}px`,
            "--dy": `${d.dy}px`,
          } as CSSProperties}
        />
      ))}
    </div>
  );
}
