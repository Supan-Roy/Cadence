import React, { useMemo, useState } from 'react'

function RadioPage({ user }) {
  const isAdmin = user?.role === 'admin'
  const [isLive, setIsLive] = useState(false)
  const [liveMode, setLiveMode] = useState('')
  const [deviceFiles, setDeviceFiles] = useState([])
  const [isMicOn, setIsMicOn] = useState(false)

  const nowPlayingLabel = useMemo(() => {
    if (!isLive) return 'Nothing is playing right now.'
    if (liveMode === 'device') return 'Broadcasting from device storage playlist.'
    if (liveMode === 'mic') return 'Live mic session is on air.'
    if (liveMode === 'cadence') return 'Streaming Cadence song queue.'
    return 'Live stream is active.'
  }, [isLive, liveMode])

  const handleDeviceFiles = (event) => {
    const files = Array.from(event.target.files || [])
    setDeviceFiles(files)
  }

  return (
    <main className="pb-36 pt-3">
      <div className="mx-auto max-w-6xl px-0 sm:px-6">
        <div className="rounded-none border-0 bg-dark-secondary/70 p-3 sm:rounded-2xl sm:border sm:border-dark-tertiary sm:p-6 md:p-8">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-white/45">Cadence Radio</p>
              <h1 className="mt-2 text-3xl font-bold text-white sm:text-4xl">Radio</h1>
              <p className="mt-2 text-sm text-white/60">
                Frontend preview for live radio streaming controls and listener experience.
              </p>
            </div>
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${isLive ? 'bg-emerald-500/20 text-emerald-300' : 'bg-white/10 text-white/65'}`}>
              {isLive ? 'LIVE' : 'OFF AIR'}
            </span>
          </div>

          <section className="rounded-xl border border-white/10 bg-[radial-gradient(circle_at_70%_10%,rgba(56,189,248,0.12),transparent_38%),radial-gradient(circle_at_20%_20%,rgba(244,114,182,0.14),transparent_40%),rgba(0,0,0,0.22)] p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-white/45">Now playing</p>
                <p className="mt-3 text-lg font-semibold text-white">{nowPlayingLabel}</p>
                {!isLive && (
                  <p className="mt-2 text-sm text-white/60">
                    Nothing is live right now. Please check back soon for the next broadcast.
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2 rounded-full border border-white/15 bg-black/25 px-3 py-1.5">
                <span className={`h-2 w-2 rounded-full ${isLive ? 'bg-emerald-400' : 'bg-white/35'}`} />
                <span className="text-xs font-semibold tracking-[0.14em] text-white/75">{isLive ? 'ON AIR' : 'STANDBY'}</span>
              </div>
            </div>
          </section>

          {!isAdmin ? (
            <section className="mt-6 rounded-xl border border-white/10 bg-black/20 p-4 sm:p-5">
              <h2 className="text-lg font-semibold text-white">Listener Mode</h2>
              <p className="mt-2 text-sm text-white/65">
                Only admins can manage radio broadcasts. You can listen when a stream goes live.
              </p>
            </section>
          ) : (
            <section className="mt-6 space-y-4">
              <div className="rounded-xl border border-white/10 bg-black/20 p-4 sm:p-5">
                <h2 className="text-lg font-semibold text-white">Radio Jockey Dashboard</h2>
                <p className="mt-2 text-sm text-white/65">
                  Select a source and start broadcast. This is frontend-only UI for now.
                </p>

                <div className="mt-4 flex flex-wrap gap-2">
                  {[
                    { key: 'device', label: 'Device Audio Files', icon: '🎵' },
                    { key: 'mic', label: 'Live Mic Stream', icon: '🎙️' },
                    { key: 'cadence', label: 'Cadence Songs', icon: '📻' },
                  ].map((option) => (
                    <button
                      key={option.key}
                      type="button"
                      onClick={() => setLiveMode(option.key)}
                      className={`rounded-[999px] border px-4 py-2.5 text-sm font-semibold transition ${
                        liveMode === option.key
                          ? 'border-white/80 bg-white text-black shadow-[0_8px_25px_rgba(255,255,255,0.28)]'
                          : 'border-white/25 bg-white/10 text-white hover:bg-white/20'
                      }`}
                    >
                      <span className="mr-1">{option.icon}</span>
                      {option.label}
                    </button>
                  ))}
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setIsLive(true)}
                    disabled={!liveMode}
                    className="rounded-[999px] border border-emerald-300/60 bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-black shadow-[0_10px_26px_rgba(16,185,129,0.35)] transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Start Broadcast
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsLive(false)}
                    className="rounded-[999px] border border-white/30 bg-white/10 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-white/20"
                  >
                    Stop Broadcast
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                <div className="rounded-xl border border-white/10 bg-black/20 p-4 sm:p-5">
                  <h3 className="text-base font-semibold text-white">Device Storage Stream</h3>
                  <p className="mt-1 text-sm text-white/65">Upload/select audio files from your device to go live.</p>
                  <input
                    type="file"
                    multiple
                    accept="audio/*"
                    onChange={handleDeviceFiles}
                    className="mt-3 block w-full cursor-pointer rounded-lg border border-white/15 bg-white/5 p-2 text-sm text-white file:mr-3 file:rounded-full file:border-0 file:bg-white file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-black"
                  />
                  <p className="mt-2 text-xs text-white/55">
                    {deviceFiles.length > 0 ? `${deviceFiles.length} audio file(s) selected.` : 'No audio files selected.'}
                  </p>
                </div>

                <div className="rounded-xl border border-white/10 bg-black/20 p-4 sm:p-5">
                  <h3 className="text-base font-semibold text-white">Live Mic Stream</h3>
                  <p className="mt-1 text-sm text-white/65">Use your device microphone for RJ live talking.</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setIsMicOn(true)}
                      className="rounded-[999px] border border-white/70 bg-white px-4 py-2.5 text-sm font-semibold text-black shadow-[0_8px_20px_rgba(255,255,255,0.2)] transition hover:bg-white/90"
                    >
                      Enable Mic
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsMicOn(false)}
                      className="rounded-[999px] border border-white/30 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/20"
                    >
                      Mute Mic
                    </button>
                  </div>
                  <p className="mt-2 text-xs text-white/55">Mic status: {isMicOn ? 'On' : 'Off'}</p>
                </div>

                <div className="rounded-xl border border-white/10 bg-black/20 p-4 sm:p-5">
                  <h3 className="text-base font-semibold text-white">Cadence Song Stream</h3>
                  <p className="mt-1 text-sm text-white/65">
                    Play tracks from Cadence library as live radio programming.
                  </p>
                  <div className="mt-3 rounded-lg border border-dashed border-white/15 bg-white/[0.03] p-4 text-sm text-white/60">
                    Song picker / queue manager UI will connect here in backend phase.
                  </div>
                </div>
              </div>
            </section>
          )}
        </div>
      </div>
    </main>
  )
}

export default RadioPage
