import React from 'react'

function RadioQueue({ tracks, currentTrackId, onRemove }) {
  return (
    <section className="rounded-md border border-white/10 bg-[linear-gradient(180deg,rgba(20,20,22,0.94),rgba(7,7,8,0.98))] p-4">
      <div className="flex items-center justify-between">
        <p className="text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-white/55">Queue</p>
        <span className="text-xs text-white/50">{tracks.length} tracks</span>
      </div>

      <div className="mt-3 space-y-2">
        {tracks.map((track, index) => {
          const active = track.id === currentTrackId
          return (
            <div
              key={track.id}
              className={`flex items-center gap-3 border p-2.5 transition ${
                active
                  ? 'border-emerald-300/60 bg-emerald-500/10 shadow-[0_0_18px_rgba(16,185,129,0.2)]'
                  : 'border-white/10 bg-black/30'
              }`}
            >
              <div className="h-9 w-9 shrink-0 rounded-sm border border-white/15 bg-gradient-to-br from-[#2a2a30] to-[#17171a]" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-white">{track.title}</p>
                <p className="text-[0.68rem] uppercase tracking-[0.14em] text-white/45">Track {index + 1}</p>
              </div>
              {active && <span className="text-[0.62rem] font-semibold uppercase tracking-[0.12em] text-emerald-200">Live</span>}
              {onRemove && (
                <button
                  type="button"
                  onClick={() => onRemove(track.id)}
                  className="border border-white/20 bg-white/5 px-2 py-1 text-[0.62rem] font-semibold uppercase tracking-[0.1em] text-white/75 transition hover:border-red-300/55 hover:bg-red-500/15 hover:text-red-100"
                  aria-label={`Remove ${track.title} from queue`}
                >
                  Remove
                </button>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}

export default RadioQueue
