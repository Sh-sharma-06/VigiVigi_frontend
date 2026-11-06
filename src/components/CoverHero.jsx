import React, { useEffect, useRef } from 'react';
import { soundFX } from '../utils/audio';

export default function CoverHero({ onExplore, onOpenProjectDetails }) {
  const videoRef = useRef(null);

  useEffect(() => {
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      if (videoRef.current) {
        videoRef.current.removeAttribute('autoplay');
        videoRef.current.pause();
      }
    } else if (videoRef.current) {
      const p = videoRef.current.play();
      if (p && p.catch) p.catch(() => {});
    }
  }, []);

  return (
    <main
      style={{
        position: 'relative',
        height: '100vh',
        width: '100vw',
        overflow: 'hidden',
        background: '#000000',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      {/* Pristine Full-Screen High-Quality Video */}
      <video
        ref={videoRef}
        id="bg"
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        aria-hidden="true"
        src="/23087-333074572_medium.mp4"
        className="bg-video-fullscreen"
      />

      {/* Soft gradient vignette for clear text legibility */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 1,
          background: `radial-gradient(ellipse at center, rgba(0,0,0,0.02) 0%, rgba(0,0,0,0.28) 60%, rgba(0,0,0,0.85) 100%),
                       linear-gradient(180deg, rgba(0,0,0,0.5) 0%, transparent 30%, transparent 70%, rgba(0,0,0,0.8) 100%)`,
          pointerEvents: 'none'
        }}
      />

      {/* Main Center Stage */}
      <section
        style={{
          position: 'relative',
          zIndex: 2,
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          padding: '1.5rem clamp(1.5rem, 5vw, 4.5rem)'
        }}
      >
        <div className="hero-title-box">
          {/* Title Container with laser scanner beam */}
          <div className="title-scanner-wrapper">
            {/* Holographic Laser Beam and Aura */}
            <div className="scanner-laser-aura" aria-hidden="true" />
            <div className="scanner-laser-beam" aria-hidden="true" />

            {/* Title: Big V draws itself cleanly (no shine), shrinks to place tightly attached to 'igilant' */}
            <h1
              aria-label="Vigilant"
              style={{
                margin: 0,
                fontWeight: 300,
                fontSize: 'clamp(4.8rem, 15vw, 11.5rem)',
                lineHeight: 0.88,
                letterSpacing: '-0.045em',
                position: 'relative',
                display: 'inline-flex',
                alignItems: 'flex-start',
                color: '#ffffff',
                textShadow: '0 8px 30px rgba(0,0,0,0.8)'
              }}
            >
              {/* Clean Self-Writing V: Tight kerning close to "igilant" */}
              <span
                className="v-clean-box"
                aria-hidden="true"
                style={{
                  marginRight: '-0.075em'
                }}
              >
                <svg
                  viewBox="0 0 100 120"
                  style={{
                    display: 'inline-block',
                    height: '0.86em',
                    width: '0.64em',
                    verticalAlign: '-0.03em',
                    overflow: 'visible'
                  }}
                >
                  <path
                    className="v-clean-stroke"
                    d="M 14 18 L 50 106 L 86 18"
                    fill="none"
                    stroke="#ffffff"
                    strokeWidth="11"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>

              {/* "igilant" in matching clean font, sitting right next to the V */}
              <span className="grow" aria-hidden="true">
                <span
                  className="rest"
                  style={{
                    marginLeft: '-0.02em',
                    color: '#ffffff'
                  }}
                >
                  igilant
                </span>
              </span>
            </h1>
          </div>

          {/* Below section fades up smoothly in crisp solid white font */}
          <div className="below-box" style={{ marginTop: 'clamp(1.4rem, 3.2vh, 2.5rem)' }}>
            <p
              style={{
                margin: '0 0 0.85rem 0',
                fontSize: 'clamp(1.15rem, 2.4vw, 1.8rem)',
                fontWeight: 400,
                color: '#ffffff',
                maxWidth: '40ch',
                lineHeight: 1.35,
                textShadow: '0 2px 14px rgba(0,0,0,0.85)'
              }}
            >
              <i
                style={{
                  display: 'inline-block',
                  width: '0.46em',
                  height: '0.46em',
                  borderRadius: '50%',
                  background: 'var(--cobalt-neon)',
                  boxShadow: '0 0 10px var(--cobalt-neon), 0 0 18px var(--cobalt)',
                  marginRight: '0.55em',
                  verticalAlign: '0.12em',
                  animation: 'beacon-blink 1.8s infinite ease-in-out'
                }}
              />
              <b style={{ fontWeight: 600, color: '#ffffff' }}>Zero-detonation</b> scanner for AI models
            </p>

            <p
              style={{
                margin: '0 0 2.2rem 0',
                fontSize: 'clamp(0.88rem, 1.2vw, 1.1rem)',
                fontWeight: 400,
                color: '#ffffff',
                maxWidth: '54ch',
                lineHeight: 1.55,
                textShadow: '0 2px 10px rgba(0,0,0,0.9)'
              }}
            >
              Static AST deserialization, neural weight tensor inspection, and backdoor payload interception without executing untrusted model code.
            </p>

            {/* Buttons */}
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '1.25rem'
              }}
            >
              <button
                type="button"
                onClick={() => {
                  soundFX.open();
                  onExplore();
                }}
                style={{
                  fontFamily: 'inherit',
                  fontWeight: 600,
                  fontSize: 'clamp(1.05rem, 2vw, 1.3rem)',
                  lineHeight: 1,
                  color: '#01050d',
                  background: 'linear-gradient(135deg, #0052ff 0%, #00d4ff 100%)',
                  border: '1px solid rgba(0, 212, 255, 0.8)',
                  padding: '1.05em 3em',
                  minWidth: 'min(230px, 82vw)',
                  borderRadius: '999px',
                  cursor: 'pointer',
                  letterSpacing: '0.01em',
                  boxShadow: '0 0 30px rgba(0, 102, 255, 0.58), 0 0 10px rgba(0, 212, 255, 0.38)',
                  transition: 'all 0.28s cubic-bezier(0.16, 1, 0.3, 1)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.6em'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)';
                  e.currentTarget.style.boxShadow = '0 0 48px rgba(0, 102, 255, 0.85), 0 0 18px #00d4ff';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'none';
                  e.currentTarget.style.boxShadow = '0 0 30px rgba(0, 102, 255, 0.58), 0 0 10px rgba(0, 212, 255, 0.38)';
                }}
              >
                <span>Explore</span>
                <span style={{ fontSize: '1.1em' }}>➔</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  soundFX.open();
                  onOpenProjectDetails();
                }}
                style={{
                  fontFamily: '"JetBrains Mono", monospace',
                  fontWeight: 400,
                  fontSize: 'clamp(0.92rem, 1.55vw, 1.08rem)',
                  lineHeight: 1,
                  color: '#ffffff',
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.25)',
                  padding: '1.15em 2.3em',
                  borderRadius: '999px',
                  cursor: 'pointer',
                  letterSpacing: '0.02em',
                  backdropFilter: 'blur(10px)',
                  WebkitBackdropFilter: 'blur(10px)',
                  transition: 'all 0.25s ease',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.6em'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'var(--cobalt-neon)';
                  e.currentTarget.style.background = 'rgba(0, 102, 255, 0.18)';
                  e.currentTarget.style.boxShadow = '0 0 24px rgba(0, 102, 255, 0.35)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.25)';
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                  e.currentTarget.style.boxShadow = 'none';
                  e.currentTarget.style.transform = 'none';
                }}
              >
                <span>Project Details</span>
                <span style={{ color: 'var(--cobalt-neon)', fontSize: '1.05em' }}>◈</span>
              </button>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
