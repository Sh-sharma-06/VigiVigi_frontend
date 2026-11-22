'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, Lock, Mail, User, ArrowLeft, CheckCircle2, Loader2 } from 'lucide-react'

type AuthMode = 'signin' | 'register' | 'forgot'

export default function LoginPage() {
  const router = useRouter()
  const [mode, setMode] = useState<AuthMode>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [remember, setRemember] = useState(true)
  const [loading, setLoading] = useState(false)
  const [ssoProvider, setSsoProvider] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [resetSent, setResetSent] = useState(false)

  const completeAuth = (userEmail: string, name: string, provider: string) => {
    try {
      localStorage.setItem(
        'vigilant_user',
        JSON.stringify({ email: userEmail, name, provider, signedInAt: new Date().toISOString() })
      )
    } catch {}
    router.push('/dashboard')
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!email.trim() || !email.includes('@')) {
      setError('Enter a valid email address.')
      return
    }

    if (mode === 'forgot') {
      setLoading(true)
      setTimeout(() => {
        setLoading(false)
        setResetSent(true)
      }, 550)
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }

    if (mode === 'register') {
      if (!fullName.trim()) {
        setError('Enter your full name.')
        return
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match.')
        return
      }
    }

    setLoading(true)
    setTimeout(() => {
      setLoading(false)
      completeAuth(email.trim(), fullName.trim() || email.split('@')[0], 'email')
    }, 550)
  }

  const handleSSO = (provider: 'Google' | 'Apple' | 'GitHub') => {
    setError(null)
    setSsoProvider(provider)
    setTimeout(() => {
      setSsoProvider(null)
      completeAuth(`user@${provider.toLowerCase()}.vigilant.ai`, `${provider} User`, provider.toLowerCase())
    }, 600)
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '11px 14px 11px 40px',
    borderRadius: 12,
    background: 'rgba(255, 255, 255, 0.04)',
    border: '1px solid rgba(255, 255, 255, 0.16)',
    color: '#ffffff',
    fontSize: 14,
    outline: 'none',
    transition: 'border-color 0.2s ease, background 0.2s ease',
  }

  const glassPillStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    padding: '8px 18px',
    borderRadius: 999,
    border: '1px solid rgba(255, 255, 255, 0.35)',
    background: 'rgba(255, 255, 255, 0.03)',
    backdropFilter: 'blur(12px) saturate(1.4)',
    WebkitBackdropFilter: 'blur(12px) saturate(1.4)',
    boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.2)',
    color: '#ffffff',
    fontSize: 13.5,
    fontWeight: 500,
    textDecoration: 'none',
    cursor: 'pointer',
  }

  return (
    <div
      style={{
        position: 'relative',
        minHeight: '100vh',
        width: '100%',
        background: '#05040c',
        fontFamily: '"Inter", "Helvetica Neue", Arial, system-ui, sans-serif',
        color: '#ffffff',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        overflow: 'hidden',
        WebkitFontSmoothing: 'antialiased',
      }}
    >
      <style>{`
        .v-glow-glass {
          transition: box-shadow 0.25s ease, border-color 0.25s ease, background 0.25s ease, transform 0.15s ease;
        }
        .v-glow-glass:hover {
          border-color: rgba(139, 92, 246, 0.55) !important;
          background: rgba(76, 29, 149, 0.22) !important;
          box-shadow: 0 0 22px rgba(91, 33, 182, 0.55), inset 0 1px 0 rgba(196, 181, 253, 0.25) !important;
        }
        .v-glow-glass:active {
          transform: scale(0.985);
          border-color: rgba(167, 139, 250, 0.75) !important;
          background: rgba(76, 29, 149, 0.36) !important;
          box-shadow: 0 0 30px rgba(109, 40, 217, 0.78), inset 0 0 12px rgba(91, 33, 182, 0.45) !important;
        }
        .v-glow-primary {
          transition: box-shadow 0.25s ease, border-color 0.25s ease, transform 0.15s ease;
        }
        .v-glow-primary:hover {
          border-color: rgba(139, 92, 246, 0.7) !important;
          box-shadow: 0 0 26px rgba(91, 33, 182, 0.68), 0 0 10px rgba(124, 58, 237, 0.42) !important;
        }
        .v-glow-primary:active {
          transform: scale(0.985);
          box-shadow: 0 0 34px rgba(109, 40, 217, 0.9), 0 0 14px rgba(139, 92, 246, 0.6) !important;
        }
      `}</style>
      {/* Looping Coverpage Video Background */}
      <video
        autoPlay
        loop
        muted
        playsInline
        poster="/cover/assets/hero-mesh.jpg"
        style={{
          position: 'fixed',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          opacity: 0.42,
          zIndex: 0,
        }}
      >
        <source src="/cover/assets/hero-mesh.mp4" type="video/mp4" />
      </video>

      {/* Subtle Dark Vignette (No Neon Colors) */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          background: 'linear-gradient(180deg, rgba(5,4,12,0.52) 0%, rgba(5,4,12,0.82) 100%)',
          zIndex: 1,
        }}
      />

      {/* Top Navigation */}
      <div
        style={{
          position: 'fixed',
          top: 24,
          left: 28,
          right: 28,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          zIndex: 10,
        }}
      >
        <a href="/" className="v-glow-glass" style={glassPillStyle}>
          <ArrowLeft size={14} /> Home
        </a>
        <button
          type="button"
          onClick={() => completeAuth('guest@vigilant.ai', 'Guest User', 'demo')}
          className="v-glow-glass"
          style={glassPillStyle}
        >
          Continue as Guest &rarr;
        </button>
      </div>

      {/* Monochrome Liquid-Glass Card */}
      <div
        style={{
          position: 'relative',
          zIndex: 5,
          width: '100%',
          maxWidth: 420,
          borderRadius: 26,
          padding: '36px 32px',
          background: 'rgba(255, 255, 255, 0.04)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          backdropFilter: 'blur(26px) saturate(1.55)',
          WebkitBackdropFilter: 'blur(26px) saturate(1.55)',
          boxShadow:
            'inset 0 1px 0 rgba(255, 255, 255, 0.24), 0 28px 80px rgba(0, 0, 0, 0.65)',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 26 }}>
          <div
            style={{
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: 'rgba(255, 255, 255, 0.55)',
              marginBottom: 8,
            }}
          >
            VIGILANT
          </div>
          <h1 style={{ fontSize: 25, fontWeight: 700, letterSpacing: '-0.03em', margin: '0 0 6px' }}>
            {mode === 'signin' && 'Sign in'}
            {mode === 'register' && 'Create account'}
            {mode === 'forgot' && 'Reset password'}
          </h1>
          <p style={{ fontSize: 13.5, color: 'rgba(255, 255, 255, 0.6)', margin: 0 }}>
            {mode === 'signin' && 'Access your model security workstation'}
            {mode === 'register' && 'Get started with zero-trust model scanning'}
            {mode === 'forgot' && 'Enter your email to receive a reset link'}
          </p>
        </div>

        {/* SSO Buttons */}
        {mode !== 'forgot' && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 20 }}>
              {(['Google', 'Apple', 'GitHub'] as const).map((provider) => (
                <button
                  key={provider}
                  type="button"
                  disabled={!!ssoProvider || loading}
                  className="v-glow-glass"
                  onClick={() => handleSSO(provider)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    padding: '10px 12px',
                    borderRadius: 12,
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.16)',
                    boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.14)',
                    color: '#ffffff',
                    fontSize: 13,
                    fontWeight: 500,
                    cursor: 'pointer',
                  }}
                >
                  {ssoProvider === provider && <Loader2 size={14} className="animate-spin" />}
                  {provider}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <div style={{ flex: 1, height: 1, background: 'rgba(255, 255, 255, 0.12)' }} />
              <span style={{ fontSize: 11.5, color: 'rgba(255, 255, 255, 0.45)', letterSpacing: '0.04em' }}>
                or with email
              </span>
              <div style={{ flex: 1, height: 1, background: 'rgba(255, 255, 255, 0.12)' }} />
            </div>
          </>
        )}

        {error && (
          <div
            style={{
              padding: '10px 14px',
              borderRadius: 12,
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.28)',
              color: 'rgba(255, 255, 255, 0.92)',
              fontSize: 13,
              marginBottom: 16,
            }}
          >
            {error}
          </div>
        )}

        {mode === 'forgot' && resetSent ? (
          <div style={{ textAlign: 'center', padding: '12px 4px' }}>
            <CheckCircle2 size={34} color="rgba(255,255,255,0.9)" style={{ margin: '0 auto 12px' }} />
            <p style={{ fontSize: 13.5, color: 'rgba(255, 255, 255, 0.78)', marginBottom: 20, lineHeight: 1.6 }}>
              We sent a password reset link to <strong style={{ color: '#fff' }}>{email}</strong>.
            </p>
            <button
              type="button"
              onClick={() => {
                setResetSent(false)
                setMode('signin')
              }}
              className="v-glow-primary"
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: 999,
                background: 'rgba(255, 255, 255, 0.92)',
                border: 'none',
                color: '#05040c',
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Back to Sign In
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
            {mode === 'register' && (
              <div style={{ position: 'relative' }}>
                <User size={15} style={{ position: 'absolute', left: 14, top: 13, color: 'rgba(255,255,255,0.45)' }} />
                <input
                  type="text"
                  placeholder="Full name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  style={inputStyle}
                />
              </div>
            )}

            <div style={{ position: 'relative' }}>
              <Mail size={15} style={{ position: 'absolute', left: 14, top: 13, color: 'rgba(255,255,255,0.45)' }} />
              <input
                type="email"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={inputStyle}
              />
            </div>

            {mode !== 'forgot' && (
              <div style={{ position: 'relative' }}>
                <Lock size={15} style={{ position: 'absolute', left: 14, top: 13, color: 'rgba(255,255,255,0.45)' }} />
                <input
                  type={showPwd ? 'text' : 'password'}
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{ ...inputStyle, paddingRight: 42 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(!showPwd)}
                  style={{
                    position: 'absolute',
                    right: 12,
                    top: 11,
                    background: 'none',
                    border: 'none',
                    color: 'rgba(255,255,255,0.5)',
                    cursor: 'pointer',
                  }}
                >
                  {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            )}

            {mode === 'register' && (
              <div style={{ position: 'relative' }}>
                <Lock size={15} style={{ position: 'absolute', left: 14, top: 13, color: 'rgba(255,255,255,0.45)' }} />
                <input
                  type={showPwd ? 'text' : 'password'}
                  placeholder="Confirm password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  style={inputStyle}
                />
              </div>
            )}

            {mode === 'signin' && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12.5, marginTop: 2 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 7, color: 'rgba(255,255,255,0.65)', cursor: 'pointer' }}>
                  <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
                  Remember me
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setError(null)
                    setMode('forgot')
                  }}
                  style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.82)', fontSize: 12.5, fontWeight: 500, cursor: 'pointer' }}
                >
                  Forgot password?
                </button>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="v-glow-primary"
              style={{
                marginTop: 8,
                width: '100%',
                padding: '12px',
                borderRadius: 999,
                background: 'rgba(255, 255, 255, 0.92)',
                border: '1px solid rgba(255, 255, 255, 0.95)',
                color: '#05040c',
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              {loading && <Loader2 size={15} className="animate-spin" />}
              {mode === 'signin' && 'Sign In'}
              {mode === 'register' && 'Create Account'}
              {mode === 'forgot' && 'Send Reset Link'}
            </button>
          </form>
        )}

        <div style={{ textAlign: 'center', marginTop: 22, fontSize: 13, color: 'rgba(255, 255, 255, 0.58)' }}>
          {mode === 'signin' ? (
            <>
              New to Vigilant?{' '}
              <button
                type="button"
                onClick={() => {
                  setError(null)
                  setMode('register')
                }}
                style={{ background: 'none', border: 'none', color: '#ffffff', fontWeight: 600, cursor: 'pointer' }}
              >
                Register
              </button>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => {
                  setError(null)
                  setResetSent(false)
                  setMode('signin')
                }}
                style={{ background: 'none', border: 'none', color: '#ffffff', fontWeight: 600, cursor: 'pointer' }}
              >
                Sign in
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
