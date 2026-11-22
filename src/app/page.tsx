'use client'

import { useState, useEffect } from 'react'

export default function CoverPage() {
  const [loaded, setLoaded] = useState(false)
  const [mounted, setMounted] = useState(true)

  useEffect(() => {
    // Safety fallback so the loader never gets stuck
    const fallback = setTimeout(() => setLoaded(true), 2500)
    return () => clearTimeout(fallback)
  }, [])

  useEffect(() => {
    if (!loaded) return
    const timer = setTimeout(() => setMounted(false), 550)
    return () => clearTimeout(timer)
  }, [loaded])

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100vh',
        background: '#05040c',
        overflow: 'hidden',
      }}
    >
      <style>{`
        @keyframes v-spin {
          to { transform: rotate(360deg); }
        }
        @keyframes v-pulse {
          0%, 100% { opacity: 0.45; }
          50% { opacity: 0.95; }
        }
      `}</style>

      <iframe
        src="/cover/index.html"
        title="Vigilant"
        onLoad={() => setTimeout(() => setLoaded(true), 350)}
        style={{
          width: '100%',
          height: '100%',
          border: 'none',
          display: 'block',
          opacity: loaded ? 1 : 0,
          transition: 'opacity 0.5s cubic-bezier(0.22, 0.61, 0.36, 1)',
        }}
      />

      {mounted && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 50,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 20,
            background: 'rgba(5, 4, 12, 0.72)',
            backdropFilter: 'blur(28px) saturate(1.5)',
            WebkitBackdropFilter: 'blur(28px) saturate(1.5)',
            opacity: loaded ? 0 : 1,
            pointerEvents: loaded ? 'none' : 'auto',
            transition: 'opacity 0.5s cubic-bezier(0.22, 0.61, 0.36, 1)',
            fontFamily: '"Inter", "Helvetica Neue", Arial, system-ui, sans-serif',
          }}
        >
          {/* Liquid-Glass Spinner Container */}
          <div
            style={{
              width: 68,
              height: 68,
              borderRadius: '50%',
              display: 'grid',
              placeItems: 'center',
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.16)',
              boxShadow:
                'inset 0 1px 0 rgba(255, 255, 255, 0.25), 0 16px 48px rgba(0, 0, 0, 0.6)',
            }}
          >
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: '50%',
                border: '2px solid rgba(255, 255, 255, 0.14)',
                borderTopColor: 'rgba(255, 255, 255, 0.92)',
                animation: 'v-spin 0.85s cubic-bezier(0.5, 0.15, 0.5, 0.85) infinite',
              }}
            />
          </div>

          <span
            style={{
              fontSize: 11.5,
              fontWeight: 600,
              letterSpacing: '0.26em',
              color: 'rgba(255, 255, 255, 0.75)',
              animation: 'v-pulse 1.6s ease-in-out infinite',
            }}
          >
            VIGILANT
          </span>
        </div>
      )}
    </div>
  )
}
