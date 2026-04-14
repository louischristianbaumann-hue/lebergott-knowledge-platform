/* ============================================================
   Lebergott Akademie — Auth Context
   JWT auth + demo fallback. 3 roles: admin / staff / client
   ============================================================ */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'

const BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8000') + '/api/v1'

// Demo users — active when backend is offline
const DEMO_USERS = [
  { id: 1, email: 'marcel@lebergott.de',       password: 'lebergott2024', role: 'admin',  name: 'Marcel Lebergott' },
  { id: 2, email: 'mitarbeiter@lebergott.de',  password: 'lebergott2024', role: 'staff',  name: 'Mitarbeiter Demo' },
  { id: 3, email: 'klient@lebergott.de',       password: 'lebergott2024', role: 'client', name: 'Klient Demo' },
]

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('lb_token'))
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('lb_user')) } catch { return null }
  })
  const [loading, setLoading] = useState(false)
  const [error, setError]   = useState(null)

  // Validate token on mount — re-fetch user if needed
  useEffect(() => {
    if (token && !user) {
      _fetchMe(token)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function _fetchMe(jwt) {
    // Demo tokens skip network call
    if (jwt?.startsWith('demo_')) return
    try {
      const res = await fetch(`${BASE_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${jwt}` },
      })
      if (res.ok) {
        const data = await res.json()
        setUser(data)
        localStorage.setItem('lb_user', JSON.stringify(data))
      } else {
        _clear()
      }
    } catch {
      // Backend offline — keep user from localStorage
    }
  }

  const login = useCallback(async (email, password) => {
    setLoading(true)
    setError(null)
    try {
      // 1. Try real backend
      const res = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      if (res.ok) {
        const { access_token } = await res.json()
        setToken(access_token)
        localStorage.setItem('lb_token', access_token)

        const meRes = await fetch(`${BASE_URL}/auth/me`, {
          headers: { Authorization: `Bearer ${access_token}` },
        })
        if (meRes.ok) {
          const userData = await meRes.json()
          setUser(userData)
          localStorage.setItem('lb_user', JSON.stringify(userData))
          return { success: true, user: userData }
        }
      } else {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.detail || 'Login fehlgeschlagen')
      }
    } catch (err) {
      // 2. Fallback — demo mode ONLY for network errors (backend offline)
      if (err instanceof TypeError) {
        const demo = DEMO_USERS.find(u => u.email === email && u.password === password)
        if (demo) {
          const { password: _, ...safeUser } = demo
          const demoToken = `demo_${demo.role}_${demo.id}`
          setToken(demoToken)
          setUser(safeUser)
          localStorage.setItem('lb_token', demoToken)
          localStorage.setItem('lb_user', JSON.stringify(safeUser))
          return { success: true, user: safeUser }
        }
        const msg = 'Server nicht erreichbar — Demo-Modus verfügbar'
        setError(msg)
        return { success: false, error: msg }
      }
      // HTTP errors (e.g. 401) — show the error message directly
      const msg = err.message || 'Login fehlgeschlagen'
      setError(msg)
      return { success: false, error: msg }
    } finally {
      setLoading(false)
    }
  }, [])

  const logout = useCallback(() => {
    _clear()
  }, [])

  function _clear() {
    setToken(null)
    setUser(null)
    localStorage.removeItem('lb_token')
    localStorage.removeItem('lb_user')
  }

  // Role helpers
  const isAdmin  = user?.role === 'admin'
  const isStaff  = user?.role === 'staff' || user?.role === 'admin'
  const isClient = user?.role === 'client'
  const isAuthenticated = !!token && !!user
  const needsOnboarding = isClient && (!user?.onboarding_data || Object.keys(user.onboarding_data).length === 0)

  return (
    <AuthContext.Provider value={{
      token, user, loading, error,
      login, logout,
      isAdmin, isStaff, isClient,
      isAuthenticated, needsOnboarding,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
