import React from 'react'
import OnAirIndicator from './OnAirIndicator'

function BroadcastControls({ isLive, onStart, onStop, listeners }) {
  return (
    <section className="rounded-md border border-white/10 bg-[linear-gradient(180deg,rgba(23,23,25,0.94),rgba(8,8,9,0.98))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
      <p className="text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-white/55">Broadcast Control</p>

      <div className="mt-4">
        <OnAirIndicator isLive={isLive} />
      </div>

      <div className="mt-4 space-y-2">
        <button
          type="button"
          onClick={onStart}
          className="w-full border border-emerald-300/55 bg-emerald-500/15 px-4 py-2.5 text-sm font-semibold uppercase tracking-[0.12em] text-emerald-100 shadow-[0_0_22px_rgba(16,185,129,0.25)] transition hover:bg-emerald-500/22"
        >
          Start Broadcast
        </button>
        <button
          type="button"
          onClick={onStop}
          className="w-full border border-red-300/45 bg-red-500/12 px-4 py-2.5 text-sm font-semibold uppercase tracking-[0.12em] text-red-100 transition hover:bg-red-500/20"
        >
          Stop Broadcast
        </button>
      </div>

      <div className="mt-5 rounded-sm border border-white/10 bg-black/35 p-3">
        <p className="text-[0.62rem] uppercase tracking-[0.2em] text-white/50">Listeners</p>
        <p className="mt-1 text-2xl font-bold text-white">{listeners}</p>
        <div className="mt-3 flex">
          {[0, 1, 2, 3].map((avatar) => (
            <span
              key={avatar}
              className="-mr-2 inline-flex h-8 w-8 items-center justify-center rounded-full border border-black/50 bg-gradient-to-br from-[#2f2f35] to-[#17171b] text-xs font-semibold text-white/80"
            >
              {avatar + 1}
            </span>
          ))}
        </div>
      </div>
    </section>
  )
}

export default BroadcastControls
