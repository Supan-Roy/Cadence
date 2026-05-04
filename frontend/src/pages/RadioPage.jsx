import React, { useEffect, useMemo, useRef, useState } from 'react'
import Hls from 'hls.js'
import BroadcastControls from '../components/BroadcastControls'
import RadioDeck from '../components/RadioDeck'
import RadioQueue from '../components/RadioQueue'
import SourceSelector from '../components/SourceSelector'
import { musicAPI, radioAPI } from '../services/api'

function formatApiError(error, fallback = 'Request failed.') {
  const data = error?.response?.data
  if (!data) return error?.message || fallback
  if (typeof data.detail === 'string') return data.detail
  if (Array.isArray(data.detail)) {
    return data.detail
      .map((entry) => (typeof entry === 'string' ? entry : JSON.stringify(entry)))
      .join(' ')
  }
  if (typeof data === 'object' && data !== null && !data.detail) {
    try {
      return JSON.stringify(data)
    } catch {
      return fallback
    }
  }
  return fallback
}

function RadioPage({ user }) {
  const isAdmin = user?.role === 'admin'
  const [isLive, setIsLive] = useState(false)
  const [liveMode, setLiveMode] = useState('cadence')
  const [isMicOn, setIsMicOn] = useState(false)
  const [queueTracks, setQueueTracks] = useState([])
  const [availableTracks, setAvailableTracks] = useState([])
  const [selectedTrackId, setSelectedTrackId] = useState('')
  const [manifestUrl, setManifestUrl] = useState('')
  const [isListening, setIsListening] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')
  const [actionError, setActionError] = useState('')
  const [isControlBusy, setIsControlBusy] = useState(false)
  const audioRef = useRef(null)
  const hlsRef = useRef(null)
  const lastAttachedManifestRef = useRef(null)

  const currentTrackId = queueTracks[0]?.id || null
  const currentTrack = queueTracks[0] || { id: null, title: 'No track queued' }

  const deckProgress = useMemo(() => {
    if (!isLive) return 12
    if (liveMode === 'mic') return 38
    if (liveMode === 'device') return 64
    return 82
  }, [isLive, liveMode])

  const listenerCount = isLive ? 128 : 0

  const startBroadcastHint = useMemo(() => {
    if (isLive) return 'Stream is ON AIR. Use Stop before starting again. If Stop failed, refresh the page — stale sessions sync automatically.'
    if (queueTracks.length === 0) return 'Add at least one Cadence song to the queue, then press Start Broadcast.'
    return ''
  }, [isLive, queueTracks.length])

  const refreshRadioStatus = async () => {
    try {
      const response = await radioAPI.getStatus()
      const payload = response?.data || {}
      const queue = Array.isArray(payload.queue) ? payload.queue : []
      const mappedQueue = queue.map((item) => ({
        id: item.id,
        title: item.track_title || 'Untitled',
        trackId: item.track,
      }))

      setQueueTracks(mappedQueue)
      setIsLive(Boolean(payload.is_live))
      setManifestUrl(payload.manifest_url || '')
      setStatusMessage(payload.is_live ? 'Broadcast signal stable.' : 'Broadcast is off air.')
    } catch {
      setStatusMessage('Unable to fetch radio status.')
    }
  }

  const loadApprovedTracks = async () => {
    if (!isAdmin) return
    try {
      const response = await musicAPI.getTracks(1, 100)
      const rows = Array.isArray(response?.data?.results) ? response.data.results : Array.isArray(response?.data) ? response.data : []
      setAvailableTracks(rows)
      if (rows.length > 0 && !selectedTrackId) {
        setSelectedTrackId(rows[0].id)
      }
    } catch {
      setStatusMessage('Unable to load Cadence songs.')
    }
  }

  useEffect(() => {
    refreshRadioStatus()
    loadApprovedTracks()
    const poller = setInterval(refreshRadioStatus, 6000)
    return () => clearInterval(poller)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin])

  useEffect(() => {
    if (isLive) return
    if (audioRef.current) {
      audioRef.current.pause()
    }
    if (hlsRef.current) {
      hlsRef.current.destroy()
      hlsRef.current = null
    }
    setIsListening(false)
    lastAttachedManifestRef.current = null
  }, [isLive])

  useEffect(() => () => {
    if (hlsRef.current) {
      hlsRef.current.destroy()
      hlsRef.current = null
    }
  }, [])

  const attachManifestToAudio = () => {
    const audio = audioRef.current
    if (!audio || !manifestUrl) return false

    const canPlayNativeHls = audio.canPlayType('application/vnd.apple.mpegurl') !== ''
    if (canPlayNativeHls) {
      if (hlsRef.current) {
        hlsRef.current.destroy()
        hlsRef.current = null
      }
      if (audio.src !== manifestUrl) {
        audio.src = manifestUrl
      }
      return true
    }

    if (Hls.isSupported()) {
      if (hlsRef.current) {
        hlsRef.current.destroy()
      }
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
      })
      hls.loadSource(manifestUrl)
      hls.attachMedia(audio)
      hlsRef.current = hls
      return true
    }

    return false
  }

  const handleStartBroadcast = async () => {
    if (isControlBusy || isLive) return
    setIsControlBusy(true)
    setActionError('')
    try {
      await radioAPI.control('start')
      await refreshRadioStatus()
    } catch (error) {
      setActionError(formatApiError(error, 'Failed to start broadcast.'))
    } finally {
      setIsControlBusy(false)
    }
  }

  const handleStopBroadcast = async () => {
    if (isControlBusy || !isLive) return
    setIsControlBusy(true)
    setActionError('')
    try {
      await radioAPI.control('stop')
      await refreshRadioStatus()
    } catch (error) {
      setActionError(formatApiError(error, 'Failed to stop broadcast.'))
    } finally {
      setIsControlBusy(false)
    }
  }

  const handleAddQueueTrack = async () => {
    if (!selectedTrackId) return
    try {
      await radioAPI.addQueueItem(selectedTrackId)
      await refreshRadioStatus()
      setStatusMessage('Track added to broadcast queue.')
    } catch (error) {
      setStatusMessage(error?.response?.data?.detail || 'Failed to add queue track.')
    }
  }

  const handleRemoveQueueTrack = async (queueItemId) => {
    try {
      await radioAPI.removeQueueItem(queueItemId)
      await refreshRadioStatus()
      setStatusMessage('Track removed from queue.')
    } catch (error) {
      setStatusMessage(error?.response?.data?.detail || 'Failed to remove queue track.')
    }
  }

  const handleToggleListenerPlayback = async () => {
    if (!manifestUrl) {
      setStatusMessage('No live stream manifest available.')
      return
    }

    const audio = audioRef.current
    if (!audio) return

    if (isListening) {
      audio.pause()
      lastAttachedManifestRef.current = null
      setIsListening(false)
      return
    }

    try {
      const attached = attachManifestToAudio()
      if (!attached) {
        setStatusMessage('Playback failed. This browser does not support HLS.')
        return
      }
      await audio.play()
      lastAttachedManifestRef.current = manifestUrl
      setIsListening(true)
    } catch {
      setStatusMessage('Playback failed. Unable to start stream.')
    }
  }

  useEffect(() => {
    if (!isLive || !manifestUrl || !isListening || !audioRef.current) {
      return
    }
    if (lastAttachedManifestRef.current === manifestUrl) {
      return
    }
    lastAttachedManifestRef.current = manifestUrl
    const ok = attachManifestToAudio()
    if (ok) {
      audioRef.current.play().catch(() => {})
    }
  }, [isLive, manifestUrl, isListening])

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
                <section className="rounded-md border border-white/10 bg-[linear-gradient(180deg,rgba(25,25,28,0.95),rgba(9,9,10,0.95))] p-4">
                  <p className="text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-white/55">Cadence Queue Input</p>
                  <select
                    value={selectedTrackId}
                    onChange={(event) => setSelectedTrackId(event.target.value)}
                    className="mt-3 w-full border border-white/15 bg-black/40 px-3 py-2 text-sm text-white outline-none transition focus:border-emerald-300/60"
                  >
                    {availableTracks.map((track) => (
                      <option key={track.id} value={track.id} className="bg-[#121214]">
                        {track.title}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={handleAddQueueTrack}
                    className="mt-3 w-full border border-emerald-300/60 bg-emerald-400/12 px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-emerald-100 transition hover:bg-emerald-500/20"
                  >
                    Add To Queue
                  </button>
                </section>
              </div>

              <div className="order-1 xl:order-2">
                <RadioDeck isLive={isLive} currentTrack={currentTrack} progress={deckProgress} />
              </div>

              <div className="order-3 space-y-4">
                <BroadcastControls
                  isLive={isLive}
                  onStart={handleStartBroadcast}
                  onStop={handleStopBroadcast}
                  listeners={listenerCount}
                  isBusy={isControlBusy}
                  canStart={queueTracks.length > 0}
                  startHint={startBroadcastHint}
                />
                <section className="rounded-md border border-white/10 bg-[linear-gradient(180deg,rgba(20,22,26,0.96),rgba(8,9,11,0.98))] p-4">
                  <p className="text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-emerald-200/85">Broadcast monitor</p>
                  <p className="mt-2 text-xs leading-relaxed text-white/65">
                    {isLive && manifestUrl
                      ? 'Hear exactly what listeners get (same HLS stream). Pause anytime — it does not affect the broadcast.'
                      : isLive && !manifestUrl
                        ? 'Stream is ON AIR but no manifest URL yet. Refresh in a moment.'
                        : 'Start the broadcast first, then play below to audition the live encode.'}
                  </p>
                  <div className="mt-4 flex items-center justify-center gap-3">
                    <button
                      type="button"
                      className="h-12 w-12 border border-white/20 bg-black/35 text-lg text-white/80 transition hover:border-white/35 hover:text-white disabled:opacity-35"
                      aria-label="Monitor previous chunk"
                      disabled
                    >
                      &#9198;
                    </button>
                    <button
                      type="button"
                      disabled={!isLive || !manifestUrl}
                      onClick={handleToggleListenerPlayback}
                      className="h-14 w-14 border border-emerald-300/55 bg-emerald-400/10 text-xl text-emerald-200 shadow-[0_0_20px_rgba(52,211,153,0.35)] transition hover:scale-105 hover:shadow-[0_0_26px_rgba(52,211,153,0.5)] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100"
                      aria-label={isListening ? 'Pause monitor' : 'Play monitor'}
                    >
                      {isListening ? '||' : '>'}
                    </button>
                    <button
                      type="button"
                      className="h-12 w-12 border border-white/20 bg-black/35 text-lg text-white/80 transition hover:border-white/35 hover:text-white disabled:opacity-35"
                      aria-label="Monitor skip"
                      disabled
                    >
                      &#9197;
                    </button>
                  </div>
                </section>
                <RadioQueue tracks={queueTracks} currentTrackId={currentTrackId} onRemove={handleRemoveQueueTrack} />
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
                  aria-label={isListening ? 'Pause live stream' : 'Play live stream'}
                  onClick={handleToggleListenerPlayback}
                >
                  {isListening ? '||' : '>'}
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

          {isAdmin && (
            <section className="mt-4 border border-white/10 bg-black/30 px-4 py-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[0.6rem] uppercase tracking-[0.2em] text-white/45">Signal Log</p>
                  <p className="mt-1 truncate text-sm text-white/80">
                    {actionError || statusMessage || (isLive
                      ? `Live via ${liveMode === 'device' ? 'Device Audio' : liveMode === 'mic' ? 'Live Mic' : 'Cadence Songs'}`
                      : 'Deck is armed and standing by for the next broadcast')}
                  </p>
                </div>
                <div className="flex items-center gap-2 text-xs uppercase tracking-[0.14em] text-white/65">
                  <span className="h-2 w-2 rounded-full bg-emerald-300 shadow-[0_0_12px_rgba(110,231,183,0.8)]" />
                  <span>Realtime Monitoring Active</span>
                </div>
              </div>
            </section>
          )}
        </div>
      </div>
      <audio ref={audioRef} preload="none" className="hidden" />
    </main>
  )
}

export default RadioPage
