import React from 'react'

function OnAirIndicator({ isLive }) {
  return (
    <div
      className={`flex items-center gap-3 rounded-md border px-3 py-2 ${
        isLive
          ? 'border-red-400/50 bg-red-500/10 shadow-[0_0_20px_rgba(248,113,113,0.2)]'
          : 'border-white/15 bg-black/35'
      }`}
    >
      <span
        className={`inline-flex h-3 w-3 rounded-full ${
          isLive ? 'bg-red-400 animate-on-air-pulse shadow-[0_0_12px_rgba(248,113,113,0.9)]' : 'bg-white/35'
        }`}
      />
      <div>
        <p className="text-[0.63rem] uppercase tracking-[0.2em] text-white/50">Broadcast</p>
        <p className="text-sm font-semibold text-white">{isLive ? 'ON AIR' : 'OFF AIR'}</p>
      </div>
    </div>
  )
}

export default OnAirIndicator
