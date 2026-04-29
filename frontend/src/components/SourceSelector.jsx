import React from 'react'

const SOURCE_OPTIONS = [
  { key: 'device', label: 'Device Audio' },
  { key: 'mic', label: 'Live Mic' },
  { key: 'cadence', label: 'Cadence Songs' },
]

function SourceSelector({ liveMode, onModeChange, isMicOn, onMicToggle }) {
  const fakeLevel = liveMode === 'mic' && isMicOn ? 78 : liveMode ? 42 : 10

  return (
    <section className="rounded-md border border-white/10 bg-[linear-gradient(180deg,rgba(25,25,28,0.95),rgba(9,9,10,0.95))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
      <p className="text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-white/55">Source Control</p>

      <div className="mt-4 space-y-2">
        {SOURCE_OPTIONS.map((option) => {
          const active = liveMode === option.key
          return (
            <button
              key={option.key}
              type="button"
              onClick={() => onModeChange(option.key)}
              className={`w-full border px-3 py-2.5 text-left text-sm font-semibold uppercase tracking-[0.08em] transition ${
                active
                  ? 'border-emerald-300/60 bg-emerald-400/10 text-emerald-200 shadow-[0_0_18px_rgba(52,211,153,0.22)]'
                  : 'border-white/15 bg-black/30 text-white/75 hover:border-white/30 hover:text-white'
              }`}
            >
              {option.label}
            </button>
          )
        })}
      </div>

      <div className="mt-5">
        <p className="text-[0.6rem] uppercase tracking-[0.2em] text-white/45">Input Level</p>
        <div className="mt-2 h-2.5 overflow-hidden rounded-sm border border-white/10 bg-black/45">
          <div
            className="h-full bg-[linear-gradient(90deg,#14532d_0%,#22c55e_45%,#facc15_75%,#ef4444_100%)] transition-all duration-500"
            style={{ width: `${fakeLevel}%` }}
          />
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between rounded-sm border border-white/10 bg-black/35 px-3 py-2">
        <div>
          <p className="text-[0.6rem] uppercase tracking-[0.18em] text-white/45">Mic</p>
          <p className="text-sm font-semibold text-white">{isMicOn ? 'Live' : 'Off'}</p>
        </div>
        <button
          type="button"
          onClick={onMicToggle}
          className={`border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] transition ${
            isMicOn
              ? 'border-red-400/70 bg-red-500/15 text-red-200 hover:bg-red-500/25'
              : 'border-white/20 bg-white/5 text-white/75 hover:bg-white/10'
          }`}
        >
          {isMicOn ? 'Mute' : 'Enable'}
        </button>
      </div>
    </section>
  )
}

export default SourceSelector
