/* ============================================================
   Layout.jsx — App shell with sidebar + main area
   ============================================================ */

import React, { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'

const NAV_ITEMS = [
  { path: '/dashboard', label: 'Graph', icon: '⬡' },
  { path: '/analysis/demo', label: 'Analyse', icon: '◈' },
  { path: '/', label: 'Landing', icon: '⌂' },
]

export default function Layout({ children, sidebar }) {
  const location = useLocation()
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div style={{
      display: 'flex',
      height: '100vh',
      background: 'var(--bg-primary)',
      overflow: 'hidden',
    }}>
      {/* ---- Left nav ---- */}
      <nav style={{
        width: collapsed ? 48 : 56,
        background: 'var(--bg-secondary)',
        borderRight: '1px solid var(--border-subtle)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: 'var(--space-4) 0',
        gap: 'var(--space-3)',
        flexShrink: 0,
        transition: 'width 0.2s ease',
        zIndex: 10,
      }}>
        {/* Logo */}
        <div style={{
          width: 28, height: 28,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(0,255,136,0.8) 0%, rgba(0,255,136,0.1) 100%)',
          boxShadow: '0 0 12px rgba(0,255,136,0.5)',
          marginBottom: 'var(--space-2)',
          flexShrink: 0,
        }} />

        {NAV_ITEMS.map((item) => {
          const active = location.pathname === item.path ||
            (item.path !== '/' && location.pathname.startsWith(item.path))
          return (
            <Link
              key={item.path}
              to={item.path}
              title={item.label}
              style={{
                width: 36, height: 36,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                borderRadius: 'var(--radius-sm)',
                fontSize: '1rem',
                background: active ? 'rgba(0,255,136,0.12)' : 'transparent',
                border: active ? '1px solid rgba(0,255,136,0.25)' : '1px solid transparent',
                color: active ? 'var(--accent-green)' : 'var(--text-muted)',
                transition: 'all var(--transition-fast)',
                textDecoration: 'none',
                filter: active ? 'drop-shadow(0 0 6px rgba(0,255,136,0.5))' : 'none',
              }}
            >
              {item.icon}
            </Link>
          )
        })}
      </nav>

      {/* ---- Left sidebar (optional, passed as prop) ---- */}
      {sidebar && (
        <aside style={{
          width: 220,
          background: 'var(--bg-secondary)',
          borderRight: '1px solid var(--border-subtle)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          flexShrink: 0,
        }}>
          {sidebar}
        </aside>
      )}

      {/* ---- Main content ---- */}
      <main style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
        {children}
      </main>
    </div>
  )
}
