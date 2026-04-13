/* ============================================================
   Toast.jsx — Lebergott brand toast notifications
   Types: success | error | info | warning
   ============================================================ */

import React, { useEffect, useState } from 'react'

const COLORS = {
  success: { bg: 'rgba(26,58,42,0.97)', border: 'rgba(197,165,90,0.4)', icon: '✓', iconColor: '#c5a55a' },
  error:   { bg: 'rgba(80,20,15,0.97)', border: 'rgba(200,80,60,0.4)',  icon: '✕', iconColor: '#e07060' },
  info:    { bg: 'rgba(15,36,24,0.97)', border: 'rgba(197,165,90,0.25)',icon: 'ℹ', iconColor: '#c5a55a' },
  warning: { bg: 'rgba(60,40,10,0.97)', border: 'rgba(220,160,50,0.4)', icon: '⚠', iconColor: '#dda040' },
}

export function Toast({ id, type = 'info', message, onRemove, duration = 4000 }) {
  const [visible, setVisible] = useState(false)
  const c = COLORS[type] || COLORS.info

  useEffect(() => {
    // Animate in
    const inTimer = requestAnimationFrame(() => setVisible(true))
    // Auto-remove
    const outTimer = setTimeout(() => {
      setVisible(false)
      setTimeout(() => onRemove(id), 320)
    }, duration)
    return () => { cancelAnimationFrame(inTimer); clearTimeout(outTimer) }
  }, [])

  return (
    <div
      onClick={() => { setVisible(false); setTimeout(() => onRemove(id), 320) }}
      style={{
        display: 'flex', alignItems: 'flex-start', gap: '10px',
        padding: '12px 16px',
        background: c.bg,
        border: `1px solid ${c.border}`,
        borderRadius: '12px',
        boxShadow: '0 6px 28px rgba(0,0,0,0.28)',
        backdropFilter: 'blur(12px)',
        cursor: 'pointer',
        maxWidth: '340px',
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0) scale(1)' : 'translateY(8px) scale(0.96)',
        transition: 'all 280ms cubic-bezier(0.16, 1, 0.3, 1)',
        pointerEvents: 'all',
      }}
    >
      <span style={{
        fontSize: '0.75rem', fontWeight: 700, color: c.iconColor,
        background: `${c.iconColor}20`, borderRadius: '50%',
        width: 20, height: 20, display: 'flex', alignItems: 'center',
        justifyContent: 'center', flexShrink: 0, marginTop: '1px',
      }}>
        {c.icon}
      </span>
      <span style={{
        fontSize: '0.78rem', color: '#faf9f5', lineHeight: 1.45,
        fontFamily: "'DM Sans', sans-serif", flex: 1,
      }}>
        {message}
      </span>
    </div>
  )
}

export function ToastContainer({ toasts, onRemove }) {
  return (
    <div style={{
      position: 'fixed', bottom: 80, right: 16, zIndex: 9999,
      display: 'flex', flexDirection: 'column', gap: '8px',
      alignItems: 'flex-end', pointerEvents: 'none',
    }}>
      {toasts.map(t => (
        <Toast key={t.id} {...t} onRemove={onRemove} />
      ))}
    </div>
  )
}
