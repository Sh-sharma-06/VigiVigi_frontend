/* Vigilant — core domain types */

export type ModelFormat =
  | "PICKLE"
  | "KERAS"
  | "HDF5"
  | "GGUF"
  | "ONNX"
  | "SAFETENSORS"
  | "PYTORCH_ZIP";

export type BaseVerdict = "malicious" | "review" | "clean";

export type Confidence = "HIGH" | "MEDIUM" | "LOW";

export type SignalState = "BLOCKED" | "NEEDS REVIEW" | "INFO";

export type PolicyMode = "audit" | "warn" | "enforce";

export type ViewId =
  | "investigate"
  | "history"
  | "review"
  | "extension"
  | "gate"
  | "api";

export type ArtifactStatus = "queued" | "scanning" | "done" | "error";

export interface Finding {
  id: string;
  state: SignalState;
  location: string;
  offset?: string; // hex byte offset for AST tab linkage
  evidence: string;
  opcodeIndex?: number; // row index in opcodes[] to highlight
}

export interface SymbolRef {
  name: string;
  kind: "safe" | "dangerous";
  note?: string;
}

export interface ConstRef {
  value: string;
  kind: "number" | "string" | "url" | "shell";
}

export interface ClosureRef {
  name: string;
  detail: string;
  external: boolean;
}

export interface OpcodeRow {
  offset: string;
  op: string;
  arg?: string;
  flagged?: boolean;
}

export interface ArchiveMember {
  path: string;
  subformat?: string;
  size: number; // uncompressed bytes
  csize: number; // compressed bytes
  verdict: "BLOCKED" | "NEEDS REVIEW" | "INFO" | "OK";
  children?: ArchiveMember[];
}

export interface Canary {
  path: string;
  status: "untouched" | "accessed" | "armed";
}

export interface SyscallHook {
  name: string;
  count: number;
  detail: string;
}

export interface ProcessEvent {
  t: string;
  event: string;
  detail: string;
}

export interface MetricDef {
  label: string;
  value: string;
  /** if present, numeric part animates from→to over stage progress */
  count?: { from: number; to: number; decimals?: number; suffix?: string };
}

export interface TickerLine {
  at: number; // fraction 0..1 of stage duration
  text: string;
}

export interface StagePlan {
  key: string;
  title: string;
  ms: number; // duration at 1x
  metrics: MetricDef[];
  tickers: TickerLine[];
  io: { input: string; output: string };
}

export interface ScanPlan {
  stages: StagePlan[]; // always 5; stage 3 (gVisor) may be skipped
  lane: string; // format lane label lit up at node 1
  skipGvisor: boolean;
}

export interface Remediation {
  title: string;
  vulnerable?: string;
  hardened: string;
  extraAction?: { label: string; result: string };
  note?: string;
}

export interface ErrorState {
  stage: string;
  stageIndex: number;
  message: string;
  stack: string;
}

export interface Artifact {
  id: string;
  name: string;
  format: ModelFormat;
  ext: string;
  sizeMB: number;
  sha256: string;
  compressionRatio: number;
  scannedAt: string; // ISO
  ruleset: string;
  engine: string;
  verdict: BaseVerdict;
  confidence: Confidence;
  decidedBy: string; // static_pickle_vm | keras_scanner | gvisor_sandbox | org_allowlist
  containsExecutableCode: boolean;
  classification?: string;
  rootCause: string;
  latencyMs: number;
  cacheHit: boolean;
  status: ArtifactStatus;
  findings: Finding[];
  symbols: SymbolRef[];
  consts: ConstRef[];
  closures: ClosureRef[];
  opcodes: OpcodeRow[];
  archive: ArchiveMember[];
  canaries: Canary[];
  hooks: SyscallHook[];
  processTimeline: ProcessEvent[];
  remediation: Remediation;
  errorState?: ErrorState;
  plan: ScanPlan;
}

export interface ScanRun {
  status: "running" | "done" | "error";
  elapsed: number; // scaled ms
  total: number; // scaled ms
  currentStage: number; // -1 = finished
  stageElapsed: number[]; // per stage scaled ms
  lane: string | null;
  skipGvisor: boolean;
  speed: number;
  startedAt: number;
  verdictLatch: BaseVerdict | null;
  extended: boolean;
}

export interface FPReport {
  bucket: "by-design" | "rule-bug" | "parser-gap";
  artifactId: string;
  at: string;
}

export interface HistoryRow {
  id: string;
  name: string;
  format: ModelFormat;
  sizeMB: number;
  verdict: BaseVerdict | "error";
  confidence: Confidence | "—";
  latencyMs: number;
  scannedAt: string;
  sha256: string;
  queue: boolean; // present in active queue
}

export interface Toast {
  id: number;
  title: string;
  detail?: string;
  kind: "ok" | "warn" | "err" | "info";
}

export interface HFRepoFile {
  name: string;
  path: string;
  sizeMB: number;
  lfsOid: string;
  format: ModelFormat;
  precheck: "safe" | "review" | "malicious" | "unknown";
}

export interface GateFile {
  name: string;
  format: ModelFormat;
  sizeMB: number;
  sha: string;
  checks: { label: string; state: "pass" | "flag" | "block" }[];
  outcome: "approved" | "blocked" | "review";
}

export interface WebhookEntry {
  id: number;
  ts: string;
  event: string;
  status: number;
  detail: string;
}
