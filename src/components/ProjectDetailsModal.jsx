import React from 'react';
import { soundFX } from '../utils/audio';

export default function ProjectDetailsModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        background: 'rgba(0, 0, 0, 0.94)',
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
          maxWidth: '860px',
          background: 'rgba(3, 10, 22, 0.97)',
          border: '1px solid var(--border-blue)',
          borderRadius: '16px',
          boxShadow: '0 25px 80px rgba(0,0,0,0.95), 0 0 60px rgba(0, 102, 255, 0.25)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '1.2rem 1.6rem',
            borderBottom: '1px solid var(--border-blue)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'rgba(0, 102, 255, 0.06)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', fontFamily: '"JetBrains Mono", monospace', fontSize: '0.9rem', color: 'var(--ink)' }}>
            <span style={{ color: 'var(--cobalt-neon)', fontSize: '1.2rem' }}>◈</span>
            <span style={{ fontWeight: 600 }}>PROJECT SPECIFICATION // COBALT ARCHITECTURE</span>
          </div>
          <button
            onClick={() => { soundFX.close(); onClose(); }}
            style={{
              background: 'none',
              border: '1px solid rgba(41, 121, 255, 0.3)',
              color: 'var(--ink-dim)',
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1rem'
            }}
          >
            ✕
          </button>
        </div>

        {/* Content Body */}
        <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.6rem', maxHeight: '80vh', overflowY: 'auto' }}>
          <div>
            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.3rem', fontWeight: 500, color: '#ffffff' }}>
              Why Zero-Detonation Scanning?
            </h3>
            <p style={{ margin: 0, color: 'var(--ink-dim)', fontSize: '0.95rem', lineHeight: 1.65 }}>
              Standard antivirus solutions rely on sandbox detonation &mdash; running untrusted files inside Docker containers or virtual machines. With machine learning models, unpickling executable bytecodes or loading arbitrary PyTorch objects can compromise GPU CUDA kernels or trigger remote code execution (RCE) prior to sandbox containment.
            </p>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: '1rem'
            }}
          >
            <div
              style={{
                background: 'rgba(0, 102, 255, 0.04)',
                border: '1px solid var(--border-glass)',
                borderRadius: '10px',
                padding: '1.2rem'
              }}
            >
              <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.95rem', color: 'var(--cobalt-neon)' }}>
                01. Static AST Parsing
              </h4>
              <p style={{ margin: 0, fontSize: '0.82rem', lineHeight: 1.55, color: 'var(--ink-dim)' }}>
                Disassembles PyTorch pickle opcodes into an Abstract Syntax Tree without scheduling CPU instructions or invoking Python's <code>__reduce__</code>.
              </p>
            </div>

            <div
              style={{
                background: 'rgba(0, 102, 255, 0.04)',
                border: '1px solid var(--border-glass)',
                borderRadius: '10px',
                padding: '1.2rem'
              }}
            >
              <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.95rem', color: 'var(--cobalt-neon)' }}>
                02. SafeTensors Verification
              </h4>
              <p style={{ margin: 0, fontSize: '0.82rem', lineHeight: 1.55, color: 'var(--ink-dim)' }}>
                Cryptographically validates JSON header offsets and contiguous array boundaries to prevent out-of-bounds pointer tampering and heap disclosure.
              </p>
            </div>

            <div
              style={{
                background: 'rgba(0, 102, 255, 0.04)',
                border: '1px solid var(--border-glass)',
                borderRadius: '10px',
                padding: '1.2rem'
              }}
            >
              <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.95rem', color: 'var(--cobalt-neon)' }}>
                03. Neural Backdoors (BadNets)
              </h4>
              <p style={{ margin: 0, fontSize: '0.82rem', lineHeight: 1.55, color: 'var(--ink-dim)' }}>
                Heuristic tensor distribution and kurtosis analysis to detect hidden trigger tokens and steganographic payloads in low-rank adaptation weights.
              </p>
            </div>
          </div>

          <div
            style={{
              background: 'rgba(0, 102, 255, 0.06)',
              border: '1px solid var(--border-blue)',
              borderRadius: '8px',
              padding: '1.2rem',
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: '0.82rem',
              color: 'var(--ink-dim)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.4rem'
            }}
          >
            <div style={{ color: 'var(--cobalt-neon)', fontWeight: 600 }}>SECURITY ATTRIBUTES:</div>
            <div>&bull; Detonation Latency: <strong>0.000 ms (Zero runtime execution)</strong></div>
            <div>&bull; Supported Formats: <strong>PyTorch (.pt, .bin) &middot; SafeTensors &middot; GGUF &middot; ONNX</strong></div>
            <div>&bull; Memory Overhead: <strong>&lt; 14 MB (Streaming non-executable buffer)</strong></div>
          </div>
        </div>
      </div>
    </div>
  );
}
