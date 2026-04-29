import React, { useMemo, useState } from 'react'
import BroadcastControls from '../components/BroadcastControls'
import RadioDeck from '../components/RadioDeck'
import RadioQueue from '../components/RadioQueue'
import SourceSelector from '../components/SourceSelector'

function RadioPage({ user }) {
  const isAdmin = user?.role === 'admin'
  const [isLive, setIsLive] = useState(false)
  const [liveMode, setLiveMode] = useState('cadence')
  const [isMicOn, setIsMicOn] = useState(false)
  const [currentTrackId] = useState('track-1')

  const queueTracks = useMemo(
    () => [
      { id: 'track-1', title: 'Neon Frequency' },
      { id: 'track-2', title: 'Midnight Carrier' },
      { id: 'track-3', title: 'Afterglow Signal' },
      { id: 'track-4', title: 'Downtempo Relay' },
    ],
    []
  )

  const currentTrack = queueTracks.find((track) => track.id === currentTrackId) || queueTracks[0]

  const deckProgress = useMemo(() => {
    if (!isLive) return 12
    if (liveMode === 'mic') return 38
    if (liveMode === 'device') return 64
    return 82
  }, [isLive, liveMode])

  const listenerCount = isLive ? 128 : 0

  return (
    <main className="pb-32 pt-2 sm:pt-4">
      <div className="mx-auto max-w-[1320px] px-0 sm:px-5">
        <div className="border border-white/10 bg-[radial-gradient(circle_at_10%_0%,rgba(34,197,94,0.08),transparent_35%),radial-gradient(circle_at_100%_0%,rgba(248,113,113,0.08),transparent_40%),linear-gradient(180deg,#121216_0%,#070708_100%)] p-3 sm:rounded-xl sm:p-6">
          <div className="mb-5 flex items-start justify-between gap-4 border-b border-white/10 pb-4">
            <div>
              <p className="text-[0.63rem] uppercase tracking-[0.28em] text-white/45">Cadence Radio Console</p>
              <h1 className="mt-2 text-3xl font-bold uppercase tracking-[0.06em] text-white sm:text-4xl">Broadcast Deck</h1>
            </div>
            {!isAdmin && (
              <span className="border border-white/15 bg-white/5 px-2.5 py-1 text-xs uppercase tracking-[0.14em] text-white/70">
                Listener View
              </span>
            )}
          </div>

          {isAdmin ? (
            <section className="grid grid-cols-1 gap-4 xl:grid-cols-[280px_minmax(0,1fr)_320px]">
              <div className="order-2 space-y-4 xl:order-1">
                <SourceSelector
                  liveMode={liveMode}
                  onModeChange={setLiveMode}
                  isMicOn={isMicOn}
                  onMicToggle={() => setIsMicOn((current) => !current)}
                />
              </div>

              <div className="order-1 xl:order-2">
                <RadioDeck isLive={isLive} currentTrack={currentTrack} progress={deckProgress} />
              </div>

              <div className="order-3 space-y-4">
                <BroadcastControls
                  isLive={isLive}
                  onStart={() => isAdmin && setIsLive(true)}
                  onStop={() => isAdmin && setIsLive(false)}
                  listeners={listenerCount}
                />
                <RadioQueue tracks={queueTracks} currentTrackId={currentTrackId} />
              </div>
            </section>
          ) : (
            <section className="mx-auto max-w-2xl border border-white/10 bg-[linear-gradient(180deg,rgba(22,22,24,0.96),rgba(8,8,9,0.98))] p-5 sm:p-7">
              <p className="text-center text-[0.62rem] uppercase tracking-[0.22em] text-white/50">Live Listening</p>
              <h2 className="mt-2 text-center text-2xl font-bold text-white sm:text-3xl">{currentTrack.title}</h2>
              <p className="mt-2 text-center text-sm text-white/65">
                {isLive ? 'Cadence Radio is live now. Tap play to listen.' : 'No live session right now. Stay tuned.'}
              </p>

              <div className="mt-6 flex items-center justify-center gap-3">
                <button
                  type="button"
                  className="h-10 w-10 border border-white/20 bg-black/35 text-lg text-white/80 transition hover:border-white/35 hover:text-white"
                  aria-label="Previous"
                >
                  &#9198;
                </button>
                <button
                  type="button"
                  className="h-16 w-16 border border-emerald-300/60 bg-emerald-400/12 text-2xl text-emerald-200 shadow-[0_0_24px_rgba(52,211,153,0.45)] transition hover:scale-105 hover:shadow-[0_0_30px_rgba(52,211,153,0.6)]"
                  aria-label={isLive ? 'Pause live stream' : 'Play live stream'}
                >
                  {isLive ? '||' : '>'}
                </button>
                <button
                  type="button"
                  className="h-10 w-10 border border-white/20 bg-black/35 text-lg text-white/80 transition hover:border-white/35 hover:text-white"
                  aria-label="Next"
                >
                  &#9197;
                </button>
              </div>

              <div className="mt-6 h-2 w-full overflow-hidden rounded-sm border border-white/10 bg-black/50">
                <div
                  className="h-full bg-[linear-gradient(90deg,rgba(34,197,94,0.85),rgba(74,222,128,0.95),rgba(187,247,208,0.9))] transition-all duration-700"
                  style={{ width: `${deckProgress}%` }}
                />
              </div>
            </section>
          )}

          <section className="mt-4 border border-white/10 bg-black/30 px-4 py-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[0.6rem] uppercase tracking-[0.2em] text-white/45">Signal Log</p>
                <p className="mt-1 truncate text-sm text-white/80">
                  {isLive
                    ? `Live via ${liveMode === 'device' ? 'Device Audio' : liveMode === 'mic' ? 'Live Mic' : 'Cadence Songs'}`
                    : 'Deck is armed and standing by for the next broadcast'}
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs uppercase tracking-[0.14em] text-white/65">
                <span className="h-2 w-2 rounded-full bg-emerald-300 shadow-[0_0_12px_rgba(110,231,183,0.8)]" />
                <span>Realtime Monitoring Active</span>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  )
}

export default RadioPage
