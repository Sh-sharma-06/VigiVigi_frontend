import React from 'react';
import { soundFX } from '../utils/audio';

export default function ArchitectureModal({ isOpen, onClose }) {
  if (!isOpen) return null;

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
            <span style={{ color: 'var(--signal)', fontSize: '1.1rem' }}>◈</span>
            <span>ZERO-DETONATION ARCHITECTURE SPECIFICATION</span>
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
        <div style={{ padding: '1.8rem', display: 'flex', flexDirection: 'column', gap: '1.4rem' }}>
          <p style={{ margin: 0, color: 'var(--ink)', fontSize: '0.95rem', lineHeight: 1.6 }}>
            Traditional AI model security relies on sandboxing models inside Docker containers or virtual machines before executing them. However, untrusted weights can trigger arbitrary Python bytecode during unpickling or exploit GPU CUDA memory runtimes before container isolation can intervene.
          </p>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '1rem'
            }}
          >
            <div
              style={{
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid var(--border-glass)',
                borderRadius: '10px',
                padding: '1.2rem'
              }}
            >
              <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.95rem', color: 'var(--signal)' }}>
                01. Pure Static Parsing
              </h4>
              <p style={{ margin: 0, fontSize: '0.82rem', lineHeight: 1.5, color: 'var(--ink-dim)' }}>
                Disassembles PyTorch pickle opcodes into an Abstract Syntax Tree (AST) without scheduling CPU instructions or invoking Python's <code>__reduce__</code>.
              </p>
            </div>

            <div
              style={{
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid var(--border-glass)',
                borderRadius: '10px',
                padding: '1.2rem'
              }}
            >
              <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.95rem', color: 'var(--signal)' }}>
                02. SafeTensors Bounds
              </h4>
              <p style={{ margin: 0, fontSize: '0.82rem', lineHeight: 1.5, color: 'var(--ink-dim)' }}>
                Cryptographically verifies header offsets, memory bounds, and contiguous array layouts to prevent out-of-bounds pointer tampering and buffer overflow exploits.
              </p>
            </div>

            <div
              style={{
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid var(--border-glass)',
                borderRadius: '10px',
                padding: '1.2rem'
              }}
            >
              <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.95rem', color: 'var(--signal)' }}>
                03. Weight Perturbations
              </h4>
              <p style={{ margin: 0, fontSize: '0.82rem', lineHeight: 1.5, color: 'var(--ink-dim)' }}>
                Identifies stealth neural backdoors, trigger tokens, and steganographic payload embeddings in low-rank adaptation (LoRA) matrices via distribution kurtosis.
              </p>
            </div>
          </div>

          <div
            style={{
              background: 'rgba(93,228,224,0.04)',
              border: '1px solid var(--border-glass)',
              borderRadius: '8px',
              padding: '1rem',
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: '0.8rem',
              color: 'var(--ink-dim)'
            }}
          >
            <strong style={{ color: 'var(--signal)' }}>ZERO-DETONATION GUARANTEE:</strong> CPU instructions are never scheduled. GPU memory is never mapped. Zero detonation. Zero host exposure.
          </div>
        </div>
      </div>
    </div>
  );
}

