import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext.jsx'
import { ToastProvider } from './context/ToastContext.jsx'
import LoginPage from './pages/LoginPage.jsx'
import LebergottApp from './pages/LebergottApp.jsx'
import MarcelDashboard from './pages/MarcelDashboard.jsx'
import StaffView from './pages/StaffView.jsx'
import OnboardingFlow from './pages/OnboardingFlow.jsx'
import Dashboard from './pages/Dashboard.jsx'
import AnalysisView from './pages/AnalysisView.jsx'
import LandingPage from './pages/LandingPage.jsx'

// ── Error Boundary ────────────────────────────────────────────────────────

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info)
  }

  render() {
    if (!this.state.hasError) return this.props.children
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: '#faf9f5', fontFamily: "'DM Sans', sans-serif",
      }}>
        <div style={{
          textAlign: 'center', maxWidth: 400, padding: '40px 24px',
          background: '#fff', borderRadius: 16,
          border: '1px solid rgba(197,165,90,0.25)',
          boxShadow: '0 4px 24px rgba(26,58,42,0.08)',
        }}>
          <div style={{ fontSize: '2rem', marginBottom: 16 }}>🌿</div>
          <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1a3a2a', fontFamily: "'Playfair Display', serif", marginBottom: 8 }}>
            Ein Fehler ist aufgetreten
          </div>
          <div style={{ fontSize: '0.78rem', color: '#6a6860', marginBottom: 24, lineHeight: 1.6 }}>
            Die Anwendung konnte nicht geladen werden. Bitte laden Sie die Seite neu.
          </div>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '10px 24px', borderRadius: 8, border: 'none',
              background: '#1a3a2a', color: '#faf9f5', fontSize: '0.82rem',
              fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
            }}
          >
            Seite neu laden
          </button>
        </div>
      </div>
    )
  }
}

// ── Protected Route Guards ────────────────────────────────────────────────

function RequireAuth({ children }) {
  const { isAuthenticated } = useAuth()
  return isAuthenticated ? children : <Navigate to="/" replace />
}

function RequireAdmin({ children }) {
  const { isAuthenticated, isAdmin } = useAuth()
  if (!isAuthenticated) return <Navigate to="/" replace />
  if (!isAdmin)         return <Navigate to="/lebergott" replace />
  return children
}

function RequireStaff({ children }) {
  const { isAuthenticated, isStaff } = useAuth()
  if (!isAuthenticated) return <Navigate to="/" replace />
  if (!isStaff)         return <Navigate to="/lebergott" replace />
  return children
}

// ── App Routes ────────────────────────────────────────────────────────────

function AppRoutes() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/"         element={<LoginPage />} />
      <Route path="/landing"  element={<LandingPage />} />

      {/* Authenticated — any role */}
      <Route path="/lebergott" element={
        <RequireAuth><LebergottApp /></RequireAuth>
      } />
      <Route path="/onboarding" element={
        <RequireAuth><OnboardingFlow /></RequireAuth>
      } />

      {/* Staff + Admin */}
      <Route path="/staff" element={
        <RequireStaff><StaffView /></RequireStaff>
      } />

      {/* Admin only */}
      <Route path="/admin" element={
        <RequireAdmin><MarcelDashboard /></RequireAdmin>
      } />

      {/* Legacy / internal routes */}
      <Route path="/dashboard"     element={<Dashboard />} />
      <Route path="/analysis/:id"  element={<AnalysisView />} />

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </ToastProvider>
    </ErrorBoundary>
  )
}
