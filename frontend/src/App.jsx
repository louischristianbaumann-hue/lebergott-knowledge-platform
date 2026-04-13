import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext.jsx'
import LoginPage from './pages/LoginPage.jsx'
import LebergottApp from './pages/LebergottApp.jsx'
import MarcelDashboard from './pages/MarcelDashboard.jsx'
import StaffView from './pages/StaffView.jsx'
import OnboardingFlow from './pages/OnboardingFlow.jsx'
import Dashboard from './pages/Dashboard.jsx'
import AnalysisView from './pages/AnalysisView.jsx'
import LandingPage from './pages/LandingPage.jsx'

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
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  )
}
