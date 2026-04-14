/* ============================================================
   LoginPage.jsx — Lebergott login
   Dark card, clean inputs, demo hints
   ============================================================ */

import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

const DEMO_HINTS = [
  { label: 'Marcel (Admin)',  email: 'marcel@lebergott.de',      password: 'Lebergott2026!', role: 'Admin' },
  { label: 'Mitarbeiter',     email: 'mitarbeiter@lebergott.de', password: 'Staff2026!',      role: 'Staff' },
  { label: 'Klient Demo',     email: 'demo@lebergott.de',        password: 'Demo2026!',       role: 'Client' },
]

export default function LoginPage() {
  const { login, loading, error, isAuthenticated, isAdmin, isStaff, needsOnboarding } = useAuth()
  const navigate = useNavigate()

  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [showDemo, setShowDemo] = useState(false)
  const [localErr, setLocalErr] = useState('')

  useEffect(() => {
    if (!isAuthenticated) return
    if (isAdmin)          { navigate('/admin');       return }
    if (isStaff)          { navigate('/staff');       return }
    if (needsOnboarding)  { navigate('/onboarding'); return }
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
      if (u.role === 'admin')       navigate('/admin')
      else if (u.role === 'staff')  navigate('/staff')
      else if (!u.onboarding_data || Object.keys(u.onboarding_data).length === 0)
        navigate('/onboarding')
      else navigate('/lebergott')
    }
  }

  function fillDemo(hint) {
    setEmail(hint.email)
    setPassword(hint.password)
    setShowDemo(false)
  }

  const errMsg = localErr || error

  return (
    <>
      <style>{`
        .lb-input {
          width: 100%; padding: 10px 12px;
          background: #0a0a0a; border: 1px solid #2a2a2a;
          border-radius: 6px; color: var(--text-primary);
          font-size: 14px; font-family: var(--font-sans);
          outline: none; box-sizing: border-box;
          transition: border-color 0.15s ease;
        }
        .lb-input:focus { border-color: var(--accent); }
        .lb-input::placeholder { color: #444; }
        .lb-input:disabled { opacity: 0.5; }

        .lb-submit {
          width: 100%; padding: 11px;
          background: var(--accent); border: none; border-radius: 6px;
          color: #000; font-size: 14px; font-weight: 600;
          font-family: var(--font-sans); cursor: pointer;
          transition: opacity 0.15s ease;
          margin-top: 8px;
        }
        .lb-submit:hover:not(:disabled) { opacity: 0.85; }
        .lb-submit:disabled { opacity: 0.4; cursor: not-allowed; }

        .lb-demo-item {
          width: 100%; padding: 9px 12px;
          background: #111; border: 1px solid #222;
          border-radius: 6px; cursor: pointer;
          display: flex; justify-content: space-between; align-items: center;
          font-family: var(--font-sans);
          transition: border-color 0.15s ease, background 0.15s ease;
          text-align: left;
        }
        .lb-demo-item:hover { background: #181818; border-color: #333; }

        .lb-spinner {
          width: 13px; height: 13px;
          border: 2px solid rgba(0,0,0,0.2);
          border-top-color: #000; border-radius: 50%;
          display: inline-block;
          animation: spin 0.7s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      <div style={{
        minHeight: '100vh', background: 'var(--bg)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '24px 16px',
        fontFamily: 'var(--font-sans)',
      }}>

        {/* Card */}
        <div style={{
          width: '100%', maxWidth: 380,
          background: 'var(--bg-panel)',
          border: '1px solid var(--border)',
          borderRadius: 12, padding: '32px 28px',
        }}>

          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 7,
              background: 'var(--accent)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 14, fontWeight: 800, color: '#000', flexShrink: 0,
            }}>
              L
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.2 }}>
                Lebergott
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                Akademie für Lebergesundheit
              </div>
            </div>
          </div>

          <h1 style={{
            fontSize: 20, fontWeight: 500, color: 'var(--text-primary)',
            margin: '0 0 6px', lineHeight: 1.25,
          }}>
            Willkommen zurück
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '0 0 24px', lineHeight: 1.5 }}>
            Melden Sie sich in Ihrem Wissensraum an.
          </p>

          {/* Form */}
          <form onSubmit={handleSubmit} noValidate>
            <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 6, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              E-Mail
            </label>
            <input
              className="lb-input"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="ihre@email.de"
              autoComplete="email"
              disabled={loading}
            />

            <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', margin: '16px 0 6px', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              Passwort
            </label>
            <input
              className="lb-input"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              disabled={loading}
            />

            {errMsg && (
              <div style={{
                marginTop: 12, padding: '9px 12px', borderRadius: 6,
                background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
                color: '#f87171', fontSize: 12, lineHeight: 1.45,
              }}>
                {errMsg}
              </div>
            )}

            <button type="submit" className="lb-submit" disabled={loading}>
              {loading ? (
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  <span className="lb-spinner" />
                  Einen Moment…
                </span>
              ) : 'Einloggen'}
            </button>
          </form>

          {/* Demo hints */}
          <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid var(--border)' }}>
            <button
              type="button"
              onClick={() => setShowDemo(v => !v)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                width: '100%', textAlign: 'center',
                fontSize: 12, color: 'var(--text-muted)',
                fontFamily: 'var(--font-sans)', padding: 0,
                transition: 'color 0.15s ease',
              }}
            >
              Demo-Zugänge {showDemo ? '▲' : '▼'}
            </button>

            {showDemo && (
              <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {DEMO_HINTS.map(h => (
                  <button
                    key={h.email}
                    className="lb-demo-item"
                    onClick={() => fillDemo(h)}
                    type="button"
                  >
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-primary)' }}>
                        {h.label}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>
                        {h.email}
                      </div>
                    </div>
                    <span style={{
                      fontSize: 10, fontWeight: 700,
                      color: 'var(--text-muted)',
                      background: 'rgba(255,255,255,0.05)',
                      padding: '2px 8px', borderRadius: 99,
                      letterSpacing: '0.05em',
                    }}>
                      {h.role}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={{ marginTop: 16, fontSize: 11, color: 'var(--text-muted)' }}>
          © 2024 Lebergott · Natürliche Lebergesundheit
        </div>
      </div>
    </>
  )
}
