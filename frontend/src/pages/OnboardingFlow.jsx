/* ============================================================
   Lebergott Akademie — Onboarding Flow
   6-phase: Welcome → 5 questions → Completion
   Design: chip hover states, progress animation, smooth transitions
   POST /onboarding/submit — localStorage fallback on API fail
   ============================================================ */

import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'

const BRAND = {
  forest:     '#1a3a2a',
  forestDark: '#0f2418',
  forestMid:  '#2a5040',
  gold:       '#c5a55a',
  goldLight:  '#d4b96e',
  cream:      '#faf9f5',
  creamDim:   '#f0ede4',
  text:       '#2d3a2d',
  textMid:    '#4a6a4a',
  textLight:  '#7a9a7a',
}

const BESCHWERDEN_OPTIONS = [
  { value: 'Müdigkeit',     icon: '🌙', label: 'Müdigkeit & Erschöpfung' },
  { value: 'Verdauung',     icon: '🌿', label: 'Verdauungsprobleme' },
  { value: 'Hautprobleme',  icon: '✨', label: 'Hautprobleme' },
  { value: 'Übergewicht',   icon: '⚖️', label: 'Übergewicht' },
  { value: 'Energiemangel', icon: '⚡', label: 'Energiemangel' },
  { value: 'Stress',        icon: '🧘', label: 'Stress & innere Unruhe' },
]

const DAUER_OPTIONS = [
  { value: 'unter 1 Monat', label: 'Weniger als 1 Monat' },
  { value: '1–6 Monate',    label: '1 – 6 Monate' },
  { value: '6–12 Monate',   label: '6 – 12 Monate' },
  { value: 'über 1 Jahr',   label: 'Über 1 Jahr' },
]

const ZIEL_OPTIONS = [
  { value: 'Entgiftung', icon: '🌊', label: 'Entgiftung & Reinigung' },
  { value: 'Energie',    icon: '⚡', label: 'Mehr Energie & Vitalität' },
  { value: 'Gewicht',    icon: '⚖️', label: 'Gewichtsreduktion' },
  { value: 'Ganzheit',   icon: '🌿', label: 'Ganzheitliche Gesundheit' },
]

const VERTRAUTHEIT_LABELS = ['Neueinsteiger', 'Wenig Erfahrung', 'Grundwissen', 'Erfahren', 'Experte']
const QUESTION_STEPS = ['Beschwerden', 'Dauer', 'Bisherige Maßnahmen', 'Hauptziel', 'Erfahrung']

export default function OnboardingFlow() {
  const { user, token } = useAuth()
  const navigate = useNavigate()

  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState({ beschwerden: [], dauer: '', massnahmen: '', hauptziel: '', vertrautheit: 3 })
  const [submitting, setSubmitting] = useState(false)
  const [topicCount, setTopicCount] = useState(4)
  const [fadeIn, setFadeIn] = useState(true)

  function goTo(next) {
    setFadeIn(false)
    setTimeout(() => { setStep(next); setFadeIn(true) }, 200)
  }

  function toggleBeschwerde(val) {
    setAnswers(prev => ({
      ...prev,
      beschwerden: prev.beschwerden.includes(val)
        ? prev.beschwerden.filter(b => b !== val)
        : [...prev.beschwerden, val],
    }))
  }

  function canAdvance() {
    if (step === 1) return answers.beschwerden.length > 0
    if (step === 2) return !!answers.dauer
    if (step === 3) return true
    if (step === 4) return !!answers.hauptziel
    return true
  }

  async function finish() {
    setSubmitting(true)
    try {
      const res = await fetch(`${BASE_URL}/onboarding/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ answers }),
      })
      if (res.ok) {
        const data = await res.json()
        setTopicCount(data?.gap_recommendations?.length ?? 4)
      } else { _saveLocally() }
    } catch { _saveLocally() }
    setSubmitting(false)
    goTo(6)
  }

  function _saveLocally() {
    localStorage.setItem('lb_onboarding_pending', JSON.stringify({ answers, savedAt: new Date().toISOString() }))
    try {
      const u = JSON.parse(localStorage.getItem('lb_user') || '{}')
      localStorage.setItem('lb_user', JSON.stringify({ ...u, onboarding_data: answers }))
    } catch { /* ok */ }
  }

  useEffect(() => {
    if (step === 6) {
      const t = setTimeout(() => navigate('/lebergott'), 3500)
      return () => clearTimeout(t)
    }
  }, [step, navigate])

  const progressPct = step >= 1 && step <= 5 ? (step / 5) * 100 : step > 5 ? 100 : 0

  return (
    <div style={s.root}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&family=DM+Sans:wght@400;500;600&display=swap');

        .lb-chip {
          padding: 12px 10px; border-radius: 11px;
          border: 1.5px solid rgba(26,58,42,0.12);
          background: #f0ede4;
          cursor: pointer; display: flex; align-items: center; gap: 9px;
          font-family: 'DM Sans', sans-serif;
          transition: border-color 170ms ease, background 170ms ease, transform 120ms ease, box-shadow 170ms ease;
          position: relative; text-align: left; width: 100%;
        }
        .lb-chip:hover {
          border-color: rgba(26,58,42,0.25);
          background: rgba(26,58,42,0.04);
          transform: translateY(-1px);
          box-shadow: 0 3px 10px rgba(26,58,42,0.08);
        }
        .lb-chip.active {
          border-color: #1a3a2a;
          background: rgba(26,58,42,0.07);
          box-shadow: 0 2px 10px rgba(26,58,42,0.12);
        }
        .lb-chip.active:hover { transform: none; }

        .lb-radio {
          padding: 13px 16px; border-radius: 10px;
          border: 1.5px solid rgba(26,58,42,0.12);
          background: #f0ede4; cursor: pointer;
          display: flex; align-items: center; gap: 12px;
          font-size: 14px; color: #2d3a2d;
          font-family: 'DM Sans', sans-serif;
          transition: border-color 170ms ease, background 170ms ease, transform 120ms ease;
          width: 100%; text-align: left;
        }
        .lb-radio:hover {
          border-color: rgba(26,58,42,0.25);
          background: rgba(26,58,42,0.04);
          transform: translateX(3px);
        }
        .lb-radio.active {
          border-color: #1a3a2a;
          background: rgba(26,58,42,0.06);
        }
        .lb-radio.active:hover { transform: none; }

        .lb-goal-card {
          padding: 18px 14px; border-radius: 13px;
          border: 1.5px solid rgba(26,58,42,0.12);
          background: #f0ede4; cursor: pointer;
          display: flex; flex-direction: column; align-items: center;
          gap: 8px; position: relative; font-family: 'DM Sans', sans-serif;
          transition: border-color 170ms ease, background 170ms ease, transform 130ms ease, box-shadow 170ms ease;
        }
        .lb-goal-card:hover {
          border-color: rgba(26,58,42,0.25);
          background: rgba(26,58,42,0.04);
          transform: scale(1.03) translateY(-2px);
          box-shadow: 0 4px 14px rgba(26,58,42,0.1);
        }
        .lb-goal-card.active {
          border-color: #1a3a2a;
          background: rgba(26,58,42,0.07);
          transform: scale(1.02);
          box-shadow: 0 3px 12px rgba(26,58,42,0.12);
        }
        .lb-goal-card.active:hover { transform: scale(1.02); }

        .lb-btn-back {
          padding: 10px 18px; border-radius: 9px;
          border: 1.5px solid rgba(26,58,42,0.15); background: transparent;
          color: #4a6a4a; font-size: 14px; cursor: pointer;
          font-family: 'DM Sans', sans-serif;
          transition: border-color 170ms ease, background 170ms ease, color 170ms ease;
        }
        .lb-btn-back:hover {
          border-color: rgba(26,58,42,0.3);
          background: rgba(26,58,42,0.04);
          color: #1a3a2a;
        }

        .lb-btn-next {
          padding: 12px 26px; border-radius: 10px; border: none;
          background: #1a3a2a; color: #faf9f5;
          font-size: 15px; font-weight: 600; cursor: pointer;
          font-family: 'DM Sans', sans-serif;
          transition: background 180ms ease, transform 100ms ease, box-shadow 180ms ease;
        }
        .lb-btn-next:hover:not(:disabled) {
          background: #0f2418;
          transform: translateY(-1px);
          box-shadow: 0 4px 14px rgba(26,58,42,0.25);
        }
        .lb-btn-next:active:not(:disabled) { transform: translateY(0); }
        .lb-btn-next:disabled { background: rgba(26,58,42,0.22); cursor: not-allowed; }

        .lb-btn-primary-large {
          padding: 14px 36px; border-radius: 11px; border: none;
          background: #1a3a2a; color: #faf9f5;
          font-size: 15px; font-weight: 600; cursor: pointer;
          font-family: 'DM Sans', sans-serif; letter-spacing: 0.01em;
          box-shadow: 0 4px 16px rgba(26,58,42,0.25);
          transition: background 180ms ease, transform 100ms ease, box-shadow 180ms ease;
        }
        .lb-btn-primary-large:hover {
          background: #0f2418;
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(26,58,42,0.3), 0 0 0 1px rgba(197,165,90,0.12);
        }
        .lb-btn-primary-large:active { transform: translateY(0); }

        .lb-textarea {
          width: 100%; padding: 13px 14px; border-radius: 10px;
          border: 1.5px solid rgba(26,58,42,0.15);
          background: #f0ede4; color: #2d3a2d;
          font-size: 14px; font-family: 'DM Sans', sans-serif;
          resize: vertical; outline: none; box-sizing: border-box; line-height: 1.6;
          transition: border-color 200ms ease, box-shadow 200ms ease;
        }
        .lb-textarea:focus {
          border-color: #c5a55a;
          box-shadow: 0 0 0 3px rgba(197,165,90,0.12);
        }
        .lb-textarea::placeholder { color: #7a9a7a; }

        input[type="range"] { accent-color: #1a3a2a; cursor: pointer; width: 100%; }

        @keyframes lb-check-pop {
          0% { transform: scale(0.5); opacity: 0; }
          60% { transform: scale(1.15); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        .lb-check-pop { animation: lb-check-pop 0.3s cubic-bezier(0.16, 1, 0.3, 1) both; }

        @keyframes lb-done-check {
          0% { transform: scale(0); opacity: 0; }
          70% { transform: scale(1.12); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }

        @keyframes fillBar {
          from { transform: translateX(-100%); }
          to   { transform: translateX(0); }
        }

        @keyframes lb-spin { to { transform: rotate(360deg); } }
      `}</style>

      <div style={s.bgGlow} />
      <div style={s.bgGlow2} />

      <div style={{ ...s.card, opacity: fadeIn ? 1 : 0, transition: 'opacity 0.2s ease' }}>

        {/* Welcome */}
        {step === 0 && (
          <div style={s.welcomeWrap}>
            <div style={s.leafMark}><LeafSVG /></div>
            <div style={s.brand}>Lebergott Akademie</div>
            <h1 style={s.welcomeTitle}>Ihr persönliches<br />Wissensprofil</h1>
            <p style={s.welcomeSub}>
              In wenigen Schritten erstellen wir einen personalisierten Wissensraum —
              abgestimmt auf Ihre Gesundheitsziele.
            </p>
            <div style={s.welcomeMeta}>5 Fragen · ca. 2 Minuten</div>
            <button className="lb-btn-primary-large" onClick={() => goTo(1)}>
              Profil erstellen →
            </button>
          </div>
        )}

        {/* Questions 1–5 */}
        {step >= 1 && step <= 5 && (
          <>
            <div style={s.header}>
              <div style={s.logoSmall}><LeafSVG small /></div>
              <div>
                <div style={s.headerTitle}>Lebergott Akademie</div>
                <div style={s.headerSub}>Frage {step} von 5</div>
              </div>
            </div>

            <div style={s.progressTrack}>
              <div style={{ ...s.progressFill, width: `${progressPct}%` }} />
            </div>
            <div style={s.stepLabel}>{QUESTION_STEPS[step - 1]}</div>

            {/* Q1 — Beschwerden */}
            {step === 1 && (
              <div style={s.stepBody}>
                <h2 style={s.question}>Was beschäftigt Sie aktuell am meisten?</h2>
                <p style={s.hint}>Mehrfachauswahl möglich</p>
                <div style={s.chipGrid}>
                  {BESCHWERDEN_OPTIONS.map(o => {
                    const active = answers.beschwerden.includes(o.value)
                    return (
                      <button
                        key={o.value}
                        className={`lb-chip ${active ? 'active' : ''}`}
                        onClick={() => toggleBeschwerde(o.value)}
                      >
                        <span style={{ fontSize: '18px', flexShrink: 0 }}>{o.icon}</span>
                        <span style={{ fontSize: '13px', fontWeight: 500, color: BRAND.text, flex: 1 }}>{o.label}</span>
                        {active && (
                          <span className="lb-check-pop" style={{
                            fontSize: '10px', color: BRAND.gold, fontWeight: 700,
                            background: BRAND.forest, width: '17px', height: '17px', borderRadius: '50%',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                          }}>✓</span>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Q2 — Dauer */}
            {step === 2 && (
              <div style={s.stepBody}>
                <h2 style={s.question}>Wie lange bestehen diese Beschwerden?</h2>
                <div style={s.radioList}>
                  {DAUER_OPTIONS.map(o => {
                    const active = answers.dauer === o.value
                    return (
                      <button
                        key={o.value}
                        className={`lb-radio ${active ? 'active' : ''}`}
                        onClick={() => setAnswers(p => ({ ...p, dauer: o.value }))}
                      >
                        <span style={{
                          width: '16px', height: '16px', borderRadius: '50%', flexShrink: 0,
                          border: active ? `2px solid ${BRAND.forest}` : `2px solid rgba(26,58,42,0.25)`,
                          background: active ? BRAND.forest : 'transparent',
                          transition: 'all 150ms ease',
                        }} />
                        {o.label}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Q3 — Maßnahmen */}
            {step === 3 && (
              <div style={s.stepBody}>
                <h2 style={s.question}>Haben Sie bereits etwas ausprobiert?</h2>
                <p style={s.hint}>Optional — lassen Sie das Feld leer, wenn nicht</p>
                <textarea
                  className="lb-textarea"
                  value={answers.massnahmen}
                  onChange={e => setAnswers(p => ({ ...p, massnahmen: e.target.value }))}
                  placeholder="z.B. Mariendistel, Diät-Änderungen, Supplements…"
                  rows={5}
                />
              </div>
            )}

            {/* Q4 — Hauptziel */}
            {step === 4 && (
              <div style={s.stepBody}>
                <h2 style={s.question}>Was ist Ihr wichtigstes Ziel?</h2>
                <div style={s.goalGrid}>
                  {ZIEL_OPTIONS.map(o => {
                    const active = answers.hauptziel === o.value
                    return (
                      <button
                        key={o.value}
                        className={`lb-goal-card ${active ? 'active' : ''}`}
                        onClick={() => setAnswers(p => ({ ...p, hauptziel: o.value }))}
                      >
                        <span style={{ fontSize: '26px' }}>{o.icon}</span>
                        <span style={{ fontSize: '13px', fontWeight: 500, color: BRAND.text, textAlign: 'center', lineHeight: 1.3 }}>{o.label}</span>
                        {active && (
                          <div className="lb-check-pop" style={{
                            position: 'absolute', top: '8px', right: '8px',
                            width: '18px', height: '18px', borderRadius: '50%',
                            background: BRAND.forest, color: BRAND.gold,
                            fontSize: '10px', fontWeight: 700,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}>✓</div>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Q5 — Vertrautheit */}
            {step === 5 && (
              <div style={s.stepBody}>
                <h2 style={s.question}>Wie vertraut sind Sie mit Lebergesundheit?</h2>
                <p style={s.hint}>Das hilft uns, Inhalte für Sie anzupassen</p>
                <div style={s.sliderWrap}>
                  <input
                    type="range" min={1} max={5} step={1}
                    value={answers.vertrautheit}
                    onChange={e => setAnswers(p => ({ ...p, vertrautheit: Number(e.target.value) }))}
                  />
                  <div style={s.sliderTicks}>
                    {VERTRAUTHEIT_LABELS.map((l, i) => (
                      <span key={l} style={{
                        ...s.sliderTick,
                        color: answers.vertrautheit === i + 1 ? BRAND.forest : BRAND.textLight,
                        fontWeight: answers.vertrautheit === i + 1 ? 700 : 400,
                        transform: answers.vertrautheit === i + 1 ? 'scale(1.08)' : 'scale(1)',
                        transition: 'all 150ms ease',
                      }}>{l}</span>
                    ))}
                  </div>
                  <div style={s.sliderCurrent}>{VERTRAUTHEIT_LABELS[answers.vertrautheit - 1]}</div>
                </div>
              </div>
            )}

            {/* Nav row */}
            <div style={s.navRow}>
              <button className="lb-btn-back" onClick={() => goTo(step - 1)}>← Zurück</button>
              {step < 5 ? (
                <button
                  className="lb-btn-next"
                  onClick={() => canAdvance() && goTo(step + 1)}
                  disabled={!canAdvance()}
                >
                  Weiter →
                </button>
              ) : (
                <button
                  className="lb-btn-next"
                  onClick={finish}
                  disabled={submitting}
                >
                  {submitting ? (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ width: '12px', height: '12px', border: '2px solid rgba(250,249,245,0.3)', borderTopColor: '#faf9f5', borderRadius: '50%', display: 'inline-block', animation: 'lb-spin 0.7s linear infinite' }} />
                      Speichern…
                    </span>
                  ) : 'Profil erstellen →'}
                </button>
              )}
            </div>
          </>
        )}

        {/* Completion */}
        {step === 6 && (
          <div style={s.doneWrap}>
            <div style={{ ...s.doneCheck, animation: 'lb-done-check 0.5s cubic-bezier(0.16, 1, 0.3, 1) both' }}>✓</div>
            <h2 style={s.doneTitle}>Ihr Wissensprofil ist bereit</h2>
            <p style={s.doneSub}>
              Basierend auf Ihren Angaben haben wir{' '}
              <span style={s.doneCount}>{topicCount} Themen</span>
              {' '}für Sie vorbereitet.
            </p>
            <div style={s.doneBar}>
              <div style={s.doneBarFill} />
            </div>
            <p style={s.doneHint}>Sie werden gleich weitergeleitet…</p>
            <button className="lb-btn-primary-large" onClick={() => navigate('/lebergott')}>
              Zum Wissensraum →
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function LeafSVG({ small }) {
  const size = small ? 22 : 48
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <path d="M24 4C14 4 6 14 6 26c0 8 4 14 10 17 0-8 2-14 8-18-4 6-4 12-2 18 2 1 4 1 6 1 10 0 14-8 14-18C42 14 34 4 24 4z" fill={BRAND.gold} opacity="0.9"/>
      <path d="M24 22c0 10-2 16-8 20" stroke={BRAND.forest} strokeWidth={small ? 1.5 : 2} strokeLinecap="round" opacity="0.6"/>
    </svg>
  )
}

const s = {
  root: {
    minHeight: '100vh',
    background: `linear-gradient(155deg, ${BRAND.forestDark} 0%, ${BRAND.forest} 55%, ${BRAND.forestMid} 100%)`,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: '20px 16px',
    fontFamily: "'DM Sans', -apple-system, sans-serif",
    position: 'relative', overflow: 'hidden',
  },
  bgGlow: {
    position: 'absolute', top: '-20%', left: '-10%',
    width: '60%', height: '60%',
    background: 'radial-gradient(ellipse, rgba(197,165,90,0.08) 0%, transparent 65%)',
    pointerEvents: 'none',
  },
  bgGlow2: {
    position: 'absolute', bottom: '-10%', right: '-5%',
    width: '50%', height: '50%',
    background: 'radial-gradient(ellipse, rgba(42,80,64,0.3) 0%, transparent 65%)',
    pointerEvents: 'none',
  },
  card: {
    background: BRAND.cream,
    borderRadius: '24px',
    padding: '40px 36px',
    width: '100%', maxWidth: '500px',
    position: 'relative', zIndex: 1,
    boxShadow: '0 32px 80px rgba(8,18,10,0.42), 0 0 0 1px rgba(197,165,90,0.08)',
  },
  welcomeWrap: { display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '8px 0 4px' },
  leafMark: {
    width: '76px', height: '76px', borderRadius: '20px',
    background: BRAND.forest,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    marginBottom: '20px',
    boxShadow: `0 8px 28px rgba(26,58,42,0.4), 0 0 0 1px rgba(197,165,90,0.12)`,
  },
  brand: { fontSize: '12px', letterSpacing: '0.12em', color: BRAND.gold, fontWeight: 700, textTransform: 'uppercase', marginBottom: '16px' },
  welcomeTitle: {
    fontFamily: "'Playfair Display', Georgia, serif",
    fontSize: '32px', fontWeight: 700, color: BRAND.forest,
    lineHeight: 1.25, margin: '0 0 16px 0',
  },
  welcomeSub: { fontSize: '15px', color: BRAND.textMid, lineHeight: 1.65, margin: '0 0 12px 0' },
  welcomeMeta: {
    fontSize: '12px', color: BRAND.textLight,
    background: BRAND.creamDim, padding: '5px 14px', borderRadius: '20px',
    marginBottom: '28px',
  },
  header: { display: 'flex', alignItems: 'center', gap: '11px', marginBottom: '20px' },
  logoSmall: {
    width: '36px', height: '36px', borderRadius: '9px',
    background: BRAND.forest,
    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    boxShadow: '0 2px 8px rgba(26,58,42,0.25)',
  },
  headerTitle: { fontFamily: "'Playfair Display', Georgia, serif", fontSize: '15px', fontWeight: 700, color: BRAND.forest },
  headerSub: { fontSize: '11px', color: BRAND.textLight, marginTop: '1px' },
  progressTrack: {
    height: '3px', background: 'rgba(26,58,42,0.10)', borderRadius: '2px',
    overflow: 'hidden', marginBottom: '8px',
  },
  progressFill: {
    height: '100%', background: `linear-gradient(90deg, ${BRAND.forest}, ${BRAND.gold})`, borderRadius: '2px',
    transition: 'width 0.5s cubic-bezier(0.4,0,0.2,1)',
  },
  stepLabel: {
    fontSize: '11px', color: BRAND.gold, fontWeight: 700,
    letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: '24px',
  },
  stepBody: { minHeight: '210px' },
  question: {
    fontFamily: "'Playfair Display', Georgia, serif",
    fontSize: '21px', fontWeight: 700, color: BRAND.forest,
    margin: '0 0 8px 0', lineHeight: 1.3,
  },
  hint: { fontSize: '13px', color: BRAND.textLight, margin: '0 0 18px 0' },
  chipGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '9px' },
  radioList: { display: 'flex', flexDirection: 'column', gap: '8px' },
  goalGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' },
  sliderWrap: { paddingTop: '8px' },
  sliderTicks: { display: 'flex', justifyContent: 'space-between', marginTop: '10px' },
  sliderTick: { fontSize: '11px', textAlign: 'center', flex: 1 },
  sliderCurrent: {
    marginTop: '18px', textAlign: 'center',
    fontFamily: "'Playfair Display', Georgia, serif",
    fontSize: '20px', color: BRAND.forest, fontWeight: 700,
  },
  navRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '32px' },
  doneWrap: { display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '12px 0 4px' },
  doneCheck: {
    width: '66px', height: '66px', borderRadius: '50%',
    background: BRAND.forest, color: BRAND.gold,
    fontSize: '28px', fontWeight: 700,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    marginBottom: '20px',
    boxShadow: `0 8px 28px rgba(26,58,42,0.35), 0 0 0 1px rgba(197,165,90,0.15)`,
  },
  doneTitle: { fontFamily: "'Playfair Display', Georgia, serif", fontSize: '26px', fontWeight: 700, color: BRAND.forest, margin: '0 0 14px 0' },
  doneSub: { fontSize: '15px', color: BRAND.textMid, lineHeight: 1.65, margin: '0 0 24px 0' },
  doneCount: { color: BRAND.forest, fontWeight: 700 },
  doneBar: { width: '100%', height: '3px', background: 'rgba(26,58,42,0.10)', borderRadius: '2px', overflow: 'hidden', marginBottom: '10px' },
  doneBarFill: {
    height: '100%', width: '100%',
    background: `linear-gradient(90deg, ${BRAND.forest}, ${BRAND.gold})`,
    borderRadius: '2px',
    animation: 'fillBar 3.5s linear forwards',
  },
  doneHint: { fontSize: '12px', color: BRAND.textLight, marginBottom: '24px' },
}
