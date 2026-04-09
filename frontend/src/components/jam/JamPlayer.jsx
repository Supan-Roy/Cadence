import React, { useMemo, useState } from 'react'
import { imageProtectionProps } from '../../utils/imageProtection'

const BACKEND_ORIGIN = `http://${window.location.hostname}:8000`

const getMediaUrl = (path) => {
  if (!path) return ''
  if (path.startsWith('http')) return path
  return `${BACKEND_ORIGIN}${path}`
}

function JamPlayer({ track, isHost = true }) {
  const [uiProgress, setUiProgress] = useState(0)
  const title = track?.title || 'No track selected'
  const artist = track?.artist_name || track?.artist || '—'
  const coverUrl = useMemo(() => {
    const fallback = '/Cadence Playlist.png'
    const raw = track?.cover_image || ''
    return raw ? getMediaUrl(raw) : fallback
  }, [track?.cover_image])

  const ControlButton = ({ title: buttonTitle, children, className = '' }) => (
    <button
      type="button"
      title={buttonTitle}
      className={`flex h-11 w-11 items-center justify-center rounded-full bg-white/8 text-white/90 transition hover:bg-white/14 active:scale-[0.98] ${className}`}
    >
      {children}
    </button>
  )

  return (
    <section className="relative flex min-h-0 flex-col">
      <div className="pointer-events-none absolute inset-0 hidden lg:block">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_35%_20%,rgba(255,255,255,0.10),transparent_42%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_30%,rgba(29,185,84,0.07),transparent_38%)]" />
      </div>

      <div className="relative mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center px-4 py-6 sm:px-6 lg:px-10">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[auto,1fr] lg:items-start lg:gap-10">
          <div className="mx-auto w-full max-w-sm lg:mx-0">
            <img
              src={coverUrl}
              alt={title}
              className="aspect-square w-full rounded-xl object-cover shadow-[0_28px_90px_rgba(0,0,0,0.55)] ring-1 ring-white/10"
              {...imageProtectionProps}
            />

            <div className="mt-5">
              <div className="relative h-1.5 rounded-full bg-white/15">
                <div className="h-full rounded-full bg-white transition-all duration-300" style={{ width: `${uiProgress}%` }} />
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={uiProgress}
                onChange={(event) => setUiProgress(Number(event.target.value))}
                className="mt-1 w-full cursor-pointer appearance-none bg-transparent accent-white"
                aria-label="Progress (UI only)"
              />
            </div>

            <div className="mt-5 flex items-center justify-center gap-3">
              <ControlButton title="Previous">
                <svg className="h-5 w-5 fill-current" viewBox="0 0 24 24">
                  <path d="M6 6h2v12H6zm3 6 9 6V6z" />
                </svg>
              </ControlButton>

              <button
                type="button"
                title="Play / Pause"
                className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-black shadow-[0_18px_55px_rgba(0,0,0,0.55)] transition hover:scale-[1.03] hover:bg-white/95 active:scale-[0.99]"
              >
                <svg className="h-7 w-7 fill-current" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </button>

              <ControlButton title="Next">
                <svg className="h-5 w-5 fill-current" viewBox="0 0 24 24">
                  <path d="M16 6h2v12h-2zM6 18l9-6-9-6v12z" />
                </svg>
              </ControlButton>
            </div>
          </div>

          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-white/45">Now playing</p>
            <h2 className="mt-2 line-clamp-2 text-2xl font-bold leading-tight text-white sm:text-3xl">{title}</h2>
            <p className="mt-2 truncate text-sm text-white/60">{artist}</p>

            <div className="mt-5 flex items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-1.5 text-xs text-white/65">
                <span className="h-1.5 w-1.5 rounded-full bg-white/35" />
                {isHost ? 'You are host (controlling playback)' : 'Host is controlling playback'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default JamPlayer

