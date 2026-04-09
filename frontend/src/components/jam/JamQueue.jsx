import React, { useMemo } from 'react'
import { imageProtectionProps } from '../../utils/imageProtection'

const BACKEND_ORIGIN = `http://${window.location.hostname}:8000`

const getMediaUrl = (path) => {
  if (!path) return ''
  if (path.startsWith('http')) return path
  return `${BACKEND_ORIGIN}${path}`
}

function JamQueue({ queue = [], currentTrackId }) {
  const safeQueue = useMemo(() => (Array.isArray(queue) ? queue.filter(Boolean) : []), [queue])

  return (
    <section className="flex min-h-0 flex-col">
      <div className="flex items-center justify-between px-4 py-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/50">Queue</p>
          <p className="mt-1 text-sm font-semibold text-white">Up next</p>
        </div>
        <span className="rounded-full bg-white/5 px-2.5 py-1 text-[11px] font-semibold text-white/60">
          {safeQueue.length} track{safeQueue.length === 1 ? '' : 's'}
        </span>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-4 scroll-smooth">
        {safeQueue.length === 0 ? (
          <div className="px-3 pt-8 text-center text-white/45">
            <p className="text-sm font-semibold text-white/65">Queue is empty</p>
            <p className="mt-1 text-xs">When the host adds songs, they’ll show up here.</p>
          </div>
        ) : (
          <div className="space-y-1">
            {safeQueue.map((track, index) => {
              const id = track?.id || `${track?.title}-${index}`
              const isCurrent = currentTrackId && track?.id === currentTrackId
              const cover = track?.cover_image ? getMediaUrl(track.cover_image) : '/Cadence Playlist.png'
              return (
                <div
                  key={id}
                  className={`flex items-center gap-3 px-3 py-2 transition ${
                    isCurrent ? 'bg-white/10' : 'hover:bg-white/6'
                  }`}
                >
                  <img
                    src={cover}
                    alt={track?.title || 'Track'}
                    className="h-11 w-11 shrink-0 rounded-md object-cover ring-1 ring-white/10"
                    {...imageProtectionProps}
                  />
                  <div className="min-w-0 flex-1">
                    <p className={`truncate text-sm font-semibold ${isCurrent ? 'text-white' : 'text-white/85'}`}>
                      {track?.title || 'Untitled'}
                    </p>
                    <p className="truncate text-xs text-white/55">{track?.artist_name || track?.artist || '—'}</p>
                  </div>
                  {isCurrent && (
                    <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/80">Now</span>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </section>
  )
}

export default JamQueue

