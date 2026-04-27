import React from 'react'
import { useNavigate } from 'react-router-dom'

function RadioFab({ hasActivePlayer = false }) {
  const navigate = useNavigate()

  return (
    <button
      type="button"
      onClick={() => navigate('/radio')}
      className={`fixed right-4 z-[72] flex h-14 w-14 items-center justify-center rounded-full border border-white/35 bg-gradient-to-br from-[#ff2a33] via-[#ff171f] to-[#e20e1d] text-white shadow-[0_12px_30px_rgba(0,0,0,0.45)] transition hover:scale-[1.03] hover:brightness-110 ${
        hasActivePlayer ? 'bottom-40 sm:bottom-24' : 'bottom-24 sm:bottom-6'
      }`}
      title="Open Radio"
      aria-label="Open Radio"
    >
      <span className="relative flex h-8 w-8 items-center justify-center">
        <span className="absolute inline-flex h-8 w-8 rounded-full border border-white/70 opacity-90" />
        <span className="absolute inline-flex h-5 w-5 rounded-full border border-white/75 opacity-90" />
        <span className="inline-flex h-2.5 w-2.5 rounded-full bg-white" />
      </span>
    </button>
  )
}

export default RadioFab
