import React from 'react'

function RadioDeck({ isLive, currentTrack, progress = 0 }) {
  return (
    <section className="rounded-md border border-white/10 bg-[radial-gradient(circle_at_50%_15%,rgba(74,222,128,0.09),transparent_42%),linear-gradient(180deg,rgba(25,25,30,0.96),rgba(7,7,9,0.98))] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_30px_60px_rgba(0,0,0,0.5)]">
      <p className="text-center text-[0.65rem] font-semibold uppercase tracking-[0.24em] text-white/50">Main Deck</p>

      <div className="mx-auto mt-5 w-full max-w-[360px]">
        <div
          className="relative mx-auto aspect-square w-full rounded-full p-3 shadow-[0_0_35px_rgba(16,185,129,0.08)]"
          style={{
            background: `conic-gradient(rgba(74,222,128,0.95) ${progress * 3.6}deg, rgba(255,255,255,0.12) ${
              progress * 3.6
            }deg 360deg)`,
          }}
        >
          <div
            className={`relative flex h-full w-full items-center justify-center rounded-full border border-white/10 bg-[radial-gradient(circle,rgba(52,52,58,0.9)_0%,rgba(15,15,17,0.96)_68%)] ${
              isLive ? 'animate-deck-spin' : ''
            }`}
          >
            <div className="absolute inset-[12%] rounded-full border border-dashed border-white/10" />
            <div className="absolute inset-[26%] rounded-full border border-white/10 bg-black/35" />
            <div className="relative z-10 flex h-28 w-28 items-center justify-center rounded-md border border-white/20 bg-[linear-gradient(140deg,#161616,#2a2a2f)] p-2 shadow-[0_15px_30px_rgba(0,0,0,0.45)]">
              <div className="flex h-full w-full items-center justify-center rounded-sm bg-gradient-to-br from-[#0d4b3b] via-[#101012] to-[#2f1112]">
                <img src="/logo.svg" alt="Cadence logo" className="h-14 w-14 rounded-full object-contain" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-5 text-center">
        <p className="text-xs uppercase tracking-[0.2em] text-white/45">Now Spinning</p>
        <h2 className="mt-2 text-xl font-bold text-white sm:text-2xl">{currentTrack.title}</h2>
      </div>

      <div className="mt-5 flex items-center justify-center gap-3">
        <button
          type="button"
          className="h-10 w-10 border border-white/20 bg-black/35 text-lg text-white/85 transition hover:border-white/35 hover:text-white"
          aria-label="Previous track"
        >
          &#9198;
        </button>
        <button
          type="button"
          className="h-14 w-14 border border-emerald-300/60 bg-emerald-400/12 text-2xl text-emerald-200 shadow-[0_0_24px_rgba(52,211,153,0.45)] transition hover:scale-105 hover:shadow-[0_0_30px_rgba(52,211,153,0.6)]"
          aria-label={isLive ? 'Pause' : 'Play'}
        >
          {isLive ? '||' : '>'}
        </button>
        <button
          type="button"
          className="h-10 w-10 border border-white/20 bg-black/35 text-lg text-white/85 transition hover:border-white/35 hover:text-white"
          aria-label="Next track"
        >
          &#9197;
        </button>
      </div>

      <div className="mt-6">
        <div className="h-2 w-full overflow-hidden rounded-sm border border-white/10 bg-black/50">
          <div
            className="h-full bg-[linear-gradient(90deg,rgba(34,197,94,0.85),rgba(74,222,128,0.95),rgba(187,247,208,0.9))] transition-all duration-700"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="mt-2 flex gap-1">
          {Array.from({ length: 42 }).map((_, index) => (
            <span
              // eslint-disable-next-line react/no-array-index-key
              key={`wave-${index}`}
              className="h-5 flex-1 rounded-[1px] bg-white/10"
              style={{ opacity: index < Math.floor((progress / 100) * 42) ? 0.8 : 0.35 }}
            />
          ))}
        </div>
      </div>
    </section>
  )
}

export default RadioDeck
