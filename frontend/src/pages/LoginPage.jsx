/* ============================================================
   Lebergott Akademie — Login Page
   Warm brand: forest #1a3a2a × gold #c5a55a × cream #faf9f5
   Playfair Display + DM Sans
   ============================================================ */

import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

const BRAND = {
  forest:     '#1a3a2a',
  forestDark: '#0f2418',
  forestMid:  '#2a5040',
  gold:       '#c5a55a',
  goldDim:    '#a0874a',
  goldLight:  '#d4b96e',
  cream:      '#faf9f5',
  creamDim:   '#f0ede4',
  text:       '#2d3a2d',
  textMid:    '#4a6a4a',
}

const DEMO_HINTS = [
  { label: 'Marcel (Admin)',  email: 'marcel@lebergott.de',      password: 'Lebergott2026!', role: 'Admin' },
  { label: 'Mitarbeiter',     email: 'mitarbeiter@lebergott.de', password: 'Staff2026!',      role: 'Staff' },
  { label: 'Klient Demo',     email: 'demo@lebergott.de',         password: 'Demo2026!',       role: 'Client' },
]

export default function LoginPage() {
  const { login, loading, error, isAuthenticated, isAdmin, isStaff, needsOnboarding } = useAuth()
  const navigate = useNavigate()

  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [showDemo, setShowDemo] = useState(false)
  const [localErr, setLocalErr] = useState('')
  const [emailFocused, setEmailFocused]     = useState(false)
  const [passwordFocused, setPasswordFocused] = useState(false)
  const [btnHover, setBtnHover] = useState(false)
  const [mounted, setMounted]   = useState(false)

  useEffect(() => {
    // Animate card in on mount
    setTimeout(() => setMounted(true), 40)
  }, [])

  // Redirect if already authenticated
  useEffect(() => {
    if (!isAuthenticated) return
    if (isAdmin)  { navigate('/admin');      return }
    if (isStaff)  { navigate('/staff');      return }
    if (needsOnboarding) { navigate('/onboarding'); return }
    navigate('/lebergott')
  }, [isAuthenticated, isAdmin, isStaff, needsOnboarding, navigate])

  async function handleSubmit(e) {
    e.preventDefault()
    setLocalErr('')
    if (!email || !password) {
      setLocalErr('Bitte E-Mail und Passwort eingeben.')
      return
    }
    const result = await login(email, password)
    if (result?.success) {
      const u = result.user
      if (u.role === 'admin') navigate('/admin')
      else if (u.role === 'staff') navigate('/staff')
      else if (!u.onboarding_data || Object.keys(u.onboarding_data).length === 0) navigate('/onboarding')
      else navigate('/lebergott')
    }
  }

  function fillDemo(hint) {
    setEmail(hint.email)
    setPassword(hint.password)
    setShowDemo(false)
  }

  return (
    <div style={styles.root}>
      {/* Embedded CSS for hover/focus that inline styles can't do */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&family=DM+Sans:wght@400;500;600&display=swap');

        .lb-login-input {
          width: 100%;
          padding: 13px 14px;
          border-radius: 10px;
          border: 1.5px solid rgba(26,58,42,0.18);
          background: #f0ede4;
          color: #2d3a2d;
          font-size: 15px;
          font-family: 'DM Sans', sans-serif;
          outline: none;
          transition: border-color 200ms ease, box-shadow 200ms ease;
          box-sizing: border-box;
        }
        .lb-login-input:focus {
          border-color: #c5a55a;
          box-shadow: 0 0 0 3px rgba(197,165,90,0.14);
        }
        .lb-login-input::placeholder { color: #7a9a7a; }
        .lb-login-input:disabled { opacity: 0.6; }

        .lb-submit-btn {
          width: 100%;
          margin-top: 20px;
          padding: 14px;
          border-radius: 11px;
          border: none;
          background: #1a3a2a;
          color: #faf9f5;
          font-size: 16px;
          font-weight: 600;
          font-family: 'DM Sans', sans-serif;
          letter-spacing: 0.01em;
          cursor: pointer;
          transition: background 200ms ease, transform 100ms ease, box-shadow 200ms ease;
          position: relative;
          overflow: hidden;
        }
        .lb-submit-btn:hover:not(:disabled) {
          background: #0f2418;
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(26,58,42,0.3), 0 0 0 1px rgba(197,165,90,0.15);
        }
        .lb-submit-btn:active:not(:disabled) {
          transform: translateY(0);
          box-shadow: 0 2px 8px rgba(26,58,42,0.2);
        }
        .lb-submit-btn:focus-visible {
          outline: none;
          box-shadow: 0 0 0 3px rgba(197,165,90,0.4);
        }
        .lb-submit-btn:disabled {
          background: rgba(26,58,42,0.35);
          cursor: not-allowed;
        }

        .lb-demo-btn-item {
          background: rgba(26,58,42,0.04);
          border: 1px solid rgba(26,58,42,0.10);
          border-radius: 9px;
          padding: 10px 14px;
          cursor: pointer;
          display: flex;
          justify-content: space-between;
          align-items: center;
          width: 100%;
          font-family: 'DM Sans', sans-serif;
          transition: background 150ms ease, border-color 150ms ease, transform 100ms ease;
        }
        .lb-demo-btn-item:hover {
          background: rgba(197,165,90,0.08);
          border-color: rgba(197,165,90,0.3);
          transform: translateX(2px);
        }

        .lb-demo-toggle {
          background: none;
          border: none;
          color: #7a9a7a;
          font-size: 13px;
          cursor: pointer;
          padding: 0;
          font-family: 'DM Sans', sans-serif;
          display: block;
          width: 100%;
          text-align: center;
          transition: color 150ms ease;
        }
        .lb-demo-toggle:hover { color: #4a6a4a; }

        @keyframes lb-card-enter {
          from { opacity: 0; transform: translateY(18px) scale(0.98); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        .lb-card-animated {
          animation: lb-card-enter 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        @keyframes lb-leaf-float {
          0%, 100% { transform: translateY(0) rotate(-3deg); }
          50% { transform: translateY(-8px) rotate(-1deg); }
        }
        .lb-leaf-float {
          animation: lb-leaf-float 6s ease-in-out infinite;
        }
      `}</style>

      {/* Background — forest gradient + gold halos */}
      <div style={styles.bgGradient} />
      <div style={styles.bgHalo1} />
      <div style={styles.bgHalo2} />

      {/* Decorative floating leaf */}
      <div className="lb-leaf-float" style={styles.decorLeaf}>
        <svg width="120" height="120" viewBox="0 0 80 80" fill="none" opacity="0.06">
          <path d="M40 6C22 6 8 20 8 40c0 12 5 21 12 27 0-10 3-18 10-24-5 8-5 16-3 24 3 2 6 2 9 2 15 0 21-12 21-28C57 20 58 6 40 6z" fill="#c5a55a"/>
        </svg>
      </div>

      {/* Card */}
      <div className="lb-card-animated" style={styles.card}>
        {/* Top accent line */}
        <div style={styles.topAccent} />

        {/* Logo area */}
        <div style={styles.logoWrap}>
          <div style={styles.logoMark}>
            <svg width="22" height="22" viewBox="0 0 48 48" fill="none">
              <path d="M24 4C14 4 6 14 6 26c0 8 4 14 10 17 0-8 2-14 8-18-4 6-4 12-2 18 2 1 4 1 6 1 10 0 14-8 14-18C42 14 34 4 24 4z" fill="#faf9f5" opacity="0.9"/>
            </svg>
          </div>
          <div>
            <div style={styles.logoTitle}>Lebergott</div>
            <div style={styles.logoSub}>Akademie für Lebergesundheit</div>
          </div>
        </div>

        {/* Headline */}
        <h1 style={styles.headline}>Willkommen zurück</h1>
        <p style={styles.subline}>Ihr persönlicher Wissensraum erwartet Sie.</p>

        {/* Form */}
        <form onSubmit={handleSubmit} style={styles.form} noValidate>
          <label style={styles.label}>E-Mail</label>
          <input
            className="lb-login-input"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="ihre@email.de"
            autoComplete="email"
            disabled={loading}
          />

          <label style={{ ...styles.label, marginTop: '16px' }}>Passwort</label>
          <input
            className="lb-login-input"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="••••••••"
            autoComplete="current-password"
            disabled={loading}
          />

          {(error || localErr) && (
            <div style={styles.errorBox}>{localErr || error}</div>
          )}

          <button
            type="submit"
            className="lb-submit-btn"
            disabled={loading}
          >
            {loading ? (
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <span style={{
                  width: '14px', height: '14px',
                  border: '2px solid rgba(250,249,245,0.3)',
                  borderTopColor: '#faf9f5',
                  borderRadius: '50%',
                  display: 'inline-block',
                  animation: 'lb-spin 0.7s linear infinite',
                }} />
                Einen Moment…
              </span>
            ) : 'Einloggen →'}
          </button>
        </form>

        {/* Demo mode */}
        <div style={styles.demoSection}>
          <button
            className="lb-demo-toggle"
            onClick={() => setShowDemo(v => !v)}
            type="button"
          >
            Demo-Zugänge {showDemo ? '▲' : '▼'}
          </button>

          {showDemo && (
            <div style={styles.demoList}>
              {DEMO_HINTS.map(h => (
                <button
                  key={h.email}
                  className="lb-demo-btn-item"
                  onClick={() => fillDemo(h)}
                  type="button"
                >
                  <div style={{ textAlign: 'left' }}>
                    <div style={styles.demoBtnLabel}>{h.label}</div>
                    <div style={styles.demoBtnEmail}>{h.email}</div>
                  </div>
                  <span style={{
                    fontSize: '10px', fontWeight: 700,
                    color: BRAND.forestMid,
                    background: 'rgba(42,80,64,0.08)',
                    padding: '2px 8px', borderRadius: '99px',
                    letterSpacing: '0.05em',
                  }}>{h.role}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div style={styles.footer}>
        © 2024 Lebergott · Natürliche Lebergesundheit
      </div>
    </div>
  )
}

const styles = {
  root: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px 16px',
    fontFamily: "'DM Sans', -apple-system, sans-serif",
    position: 'relative',
    overflow: 'hidden',
    background: `linear-gradient(155deg, ${BRAND.forestDark} 0%, ${BRAND.forest} 55%, #1a3528 100%)`,
  },
  bgGradient: {
    position: 'absolute', inset: 0, pointerEvents: 'none',
    background: `radial-gradient(ellipse 70% 60% at 50% 30%, rgba(42,90,58,0.25) 0%, transparent 70%)`,
  },
  bgHalo1: {
    position: 'absolute', top: '10%', left: '5%',
    width: '50%', height: '50%', pointerEvents: 'none',
    background: 'radial-gradient(ellipse, rgba(197,165,90,0.07) 0%, transparent 65%)',
  },
  bgHalo2: {
    position: 'absolute', bottom: '5%', right: '5%',
    width: '40%', height: '40%', pointerEvents: 'none',
    background: 'radial-gradient(ellipse, rgba(197,165,90,0.05) 0%, transparent 65%)',
  },
  decorLeaf: {
    position: 'absolute', top: '8%', right: '8%',
    pointerEvents: 'none', zIndex: 0,
  },
  card: {
    background: BRAND.cream,
    borderRadius: '22px',
    padding: '40px 36px 36px',
    width: '100%',
    maxWidth: '420px',
    boxShadow: '0 24px 60px rgba(8,18,10,0.4), 0 0 0 1px rgba(197,165,90,0.08)',
    position: 'relative',
    zIndex: 1,
    overflow: 'hidden',
  },
  topAccent: {
    position: 'absolute', top: 0, left: '20%', right: '20%',
    height: '2px',
    background: `linear-gradient(90deg, transparent, ${BRAND.gold}, transparent)`,
    borderRadius: '0 0 4px 4px',
  },
  logoWrap: {
    display: 'flex', alignItems: 'center', gap: '12px',
    marginBottom: '28px',
  },
  logoMark: {
    width: '46px', height: '46px', borderRadius: '13px',
    background: BRAND.forest,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
    boxShadow: `0 4px 14px rgba(26,58,42,0.3), 0 0 0 1px rgba(197,165,90,0.15)`,
  },
  logoTitle: {
    fontFamily: "'Playfair Display', Georgia, serif",
    fontSize: '20px', fontWeight: 700, color: BRAND.forest, lineHeight: 1.1,
  },
  logoSub: { fontSize: '11px', color: BRAND.textMid, marginTop: '3px' },
  headline: {
    fontFamily: "'Playfair Display', Georgia, serif",
    fontSize: '26px', fontWeight: 700, color: BRAND.forest,
    margin: '0 0 7px 0', lineHeight: 1.25,
  },
  subline: {
    fontSize: '14px', color: BRAND.textMid,
    margin: '0 0 28px 0', lineHeight: 1.5,
  },
  form: { display: 'flex', flexDirection: 'column', gap: '0' },
  label: {
    fontSize: '12px', fontWeight: 700, color: BRAND.forest,
    marginBottom: '6px', letterSpacing: '0.03em', textTransform: 'uppercase',
    display: 'block',
  },
  errorBox: {
    marginTop: '12px', padding: '10px 14px',
    borderRadius: '9px',
    background: 'rgba(168,48,32,0.06)',
    border: '1px solid rgba(168,48,32,0.18)',
    color: '#7a2010',
    fontSize: '13px', lineHeight: 1.45,
  },
  demoSection: {
    marginTop: '24px', paddingTop: '20px',
    borderTop: `1px solid rgba(26,58,42,0.10)`,
  },
  demoList: {
    marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '6px',
  },
  demoBtnLabel: { fontSize: '13px', fontWeight: 600, color: BRAND.forest },
  demoBtnEmail: { fontSize: '11px', color: BRAND.textMid, marginTop: '1px' },
  footer: {
    marginTop: '20px', fontSize: '11px',
    color: 'rgba(250,249,245,0.35)', textAlign: 'center', zIndex: 1,
  },
}
