/* ============================================================
   ToastContext.jsx — Global toast notification system
   Usage: const { toast } = useToast()
          toast.success('Saved!') | toast.error('Failed') | toast.info('...')
   ============================================================ */

import React, { createContext, useCallback, useContext, useState } from 'react'
import { ToastContainer } from '../components/Toast.jsx'

const ToastCtx = createContext(null)

let _nextId = 1

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const add = useCallback((type, message, duration) => {
    const id = _nextId++
    setToasts(prev => [...prev, { id, type, message, duration }])
    return id
  }, [])

  const remove = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const toast = {
    success: (msg, dur) => add('success', msg, dur),
    error:   (msg, dur) => add('error',   msg, dur),
    info:    (msg, dur) => add('info',    msg, dur),
    warning: (msg, dur) => add('warning', msg, dur),
  }

  return (
    <ToastCtx.Provider value={{ toast }}>
      {children}
      <ToastContainer toasts={toasts} onRemove={remove} />
    </ToastCtx.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastCtx)
  if (!ctx) throw new Error('useToast must be used inside ToastProvider')
  return ctx
}
