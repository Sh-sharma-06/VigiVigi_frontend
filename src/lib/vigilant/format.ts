/* Formatting helpers shared across the workstation UI */

export function fmtSize(mb: number): string {
  if (mb >= 1024) return `${parseFloat((mb / 1024).toFixed(2))} GB`;
  if (mb >= 1) return `${parseFloat(mb.toFixed(2))} MB`;
  return `${Math.max(1, Math.round(mb * 1024))} KB`;
}

export function fmtBytes(b: number): string {
  if (b >= 1073741824) return `${(b / 1073741824).toFixed(2)} GB`;
  if (b >= 1048576) return `${(b / 1048576).toFixed(1)} MB`;
  if (b >= 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${b} B`;
}

export function fmtDuration(ms: number): string {
  if (ms >= 10000) return `${(ms / 1000).toFixed(0)} s`;
  if (ms >= 1000) return `${(ms / 1000).toFixed(1)} s`;
  return `${Math.max(1, Math.round(ms))} ms`;
}

export function shortSha(sha: string): string {
  if (sha.length <= 14) return sha;
  return `${sha.slice(0, 7)}…${sha.slice(-4)}`;
}
