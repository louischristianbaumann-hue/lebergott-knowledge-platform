/* ============================================================
   Layout.jsx — App shell: 240px dark sidebar + main area
   InfraNodus aesthetic — clean nav with icons + labels
   ============================================================ */

import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

const PAGE_NAV = [
  { path: '/dashboard', label: 'Dashboard', icon: '▦' },
  { path: '/lebergott', label: 'Graph',     icon: '⬡' },
]

const PANEL_TABS = [
  { id: 'chat',    label: 'Chat',    icon: '◉' },
  { id: 'gaps',    label: 'Lücken',  icon: '◌' },
  { id: 'bridges', label: 'Brücken', icon: '◎' },
]

function NavSection({ label, children }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{
        fontSize: 10, color: 'var(--text-muted)',
        padding: '0 10px 6px', letterSpacing: '0.08em',
        textTransform: 'uppercase',
      }}>
        {label}
      </div>
      {children}
    </div>
  )
}

function navItemStyle(active) {
  return {
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '7px 10px', borderRadius: 6, marginBottom: 1,
    background: active ? 'rgba(0,212,255,0.08)' : 'transparent',
    border: active ? '1px solid rgba(0,212,255,0.18)' : '1px solid transparent',
    color: active ? 'var(--accent)' : 'var(--text-secondary)',
    textDecoration: 'none', fontSize: 13,
    fontWeight: active ? 500 : 400,
    cursor: 'pointer', textAlign: 'left',
    transition: 'all 0.15s ease',
  }
}

const ICON = { fontSize: 14, width: 18, textAlign: 'center', flexShrink: 0 }

/* ── Component ────────────────────────────────────────────── */

export default function Layout({ children, tabs }) {
  const loc = useLocation()
  const { isAuthenticated, isStaff, isAdmin } = useAuth()

  return (
    <div style={{ display: 'flex', height: '100vh', background: 'var(--bg)', overflow: 'hidden' }}>

      {/* ── Left sidebar ── */}
      <nav style={{
        width: 240, flexShrink: 0,
        background: 'var(--bg-panel)',
        borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column',
      }}>

        {/* Logo */}
        <div style={{
          padding: '20px 20px 18px',
          borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <div style={{
            width: 30, height: 30, borderRadius: 6,
            background: 'var(--accent)', flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 13, fontWeight: 800, color: '#000',
          }}>
            L
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.2 }}>
              Lebergott
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.05em' }}>
              Wissensraum
            </div>
          </div>
        </div>

        {/* Nav items */}
        <div style={{ padding: '14px 10px', flex: 1 }}>

          <NavSection label="Navigation">
            {PAGE_NAV.map(item => {
              const active = loc.pathname === item.path ||
                (item.path !== '/' && loc.pathname.startsWith(item.path))
              return (
                <Link key={item.path} to={item.path} style={navItemStyle(active)}>
                  <span style={ICON}>{item.icon}</span>
                  {item.label}
                </Link>
              )
            })}
          </NavSection>

          {tabs && (
            <NavSection label="Panels">
              {PANEL_TABS.map(tab => {
                const active = tabs.activeTab === tab.id
                return (
                  <button
                    key={tab.id}
                    onClick={() => tabs.setActiveTab(tab.id)}
                    style={{ ...navItemStyle(active), width: '100%', fontFamily: 'var(--font-sans)' }}
                  >
                    <span style={ICON}>{tab.icon}</span>
                    {tab.label}
                  </button>
                )
              })}
            </NavSection>
          )}

          {isAuthenticated && isStaff && (
            <NavSection label="Team">
              <Link
                to={isAdmin ? '/admin' : '/staff'}
                style={navItemStyle(
                  loc.pathname === '/admin' || loc.pathname === '/staff'
                )}
              >
                <span style={ICON}>⊕</span>
                Staff
              </Link>
            </NavSection>
          )}

        </div>
      </nav>

      {/* ── Main content ── */}
      <main style={{ flex: 1, overflow: 'hidden', position: 'relative', background: 'var(--bg)' }}>
        {children}
      </main>
    </div>
  )
}
