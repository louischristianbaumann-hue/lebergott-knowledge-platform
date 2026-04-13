/* ============================================================
   LoadingPulse.jsx — Mycelium-themed loading animation
   ============================================================ */

import React from 'react'

export default function LoadingPulse({ text = 'Myzelium analysieren...' }) {
  return (
    <div className="loading-pulse">
      <div className="loading-pulse__spore">
        <div className="loading-pulse__core" />
      </div>
      <div className="loading-pulse__text">{text}</div>
    </div>
  )
}
