import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { musicAPI } from '../services/api'
import CadenceLoader from '../components/CadenceLoader'
import { formatDurationLabel } from '../utils/helpers'
import { imageProtectionProps } from '../utils/imageProtection'
import useDelayedLoader from '../hooks/useDelayedLoader'

const BACKEND_ORIGIN = `http://${window.location.hostname}:8000`

const getCoverUrl = (coverPath) => {
  if (!coverPath) return '/Cadence Playlist.png'
  if (coverPath.startsWith('http')) return coverPath
  return `${BACKEND_ORIGIN}${coverPath}`
}

function TrackDetail({ onTrackSelect }) {
  const navigate = useNavigate()
  const { trackId } = useParams()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [track, setTrack] = useState(null)
  const showLoader = useDelayedLoader(loading, 250)

  useEffect(() => {
    const loadTrack = async () => {
      if (!trackId) {
        setError('Track not found.')
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError('')
        const response = await musicAPI.getTrackDetail(trackId)
        setTrack(response.data || null)
      } catch {
        setError('Failed to load this title.')
        setTrack(null)
      } finally {
        setLoading(false)
      }
    }

    loadTrack()
  }, [trackId])

  if (loading && !showLoader) {
    return null
  }

  if (loading) {
    return <CadenceLoader message="Loading title..." size="sm" />
  }

  return (
    <main className="pb-36 pt-0 sm:pt-4">
      <div className="mx-auto w-full max-w-4xl px-0 sm:px-6">
        <div className="rounded-none border-0 bg-dark-secondary/70 p-3 sm:rounded-2xl sm:border sm:border-dark-tertiary sm:p-6 md:p-8">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="mb-4 rounded-lg border border-white/15 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-white/10"
          >
            Back
          </button>

          {error ? (
            <p className="mt-4 rounded-lg border border-red-700/60 bg-red-950/20 px-4 py-3 text-sm text-red-300">{error}</p>
          ) : !track ? (
            <p className="mt-4 text-sm text-gray-400">Title not found.</p>
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-[220px,1fr]">
              <img
                src={getCoverUrl(track.cover_image)}
                alt={track.title || 'Track'}
                className="aspect-square w-full rounded-xl object-cover ring-1 ring-white/10"
                {...imageProtectionProps}
              />

              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-white/45">{track.is_podcast ? 'Podcast' : 'Title'}</p>
                <h1 className="mt-2 text-3xl font-bold text-white">{track.title || 'Untitled'}</h1>
                <p className="mt-2 text-sm text-white/70">{track.artist_name || 'Unknown Artist'}</p>

                <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-white/60">
                  {track.album_name ? (
                    <span className="rounded-full border border-white/15 px-2 py-1">Album: {track.album_name}</span>
                  ) : null}
                  {track.release_date ? (
                    <span className="rounded-full border border-white/15 px-2 py-1">Released: {track.release_date}</span>
                  ) : null}
                  {track.duration ? (
                    <span className="rounded-full border border-white/15 px-2 py-1">Duration: {formatDurationLabel(track.duration)}</span>
                  ) : null}
                </div>

                {track.description ? (
                  <p className="mt-5 text-sm leading-6 text-white/75">{track.description}</p>
                ) : null}

                <div className="mt-6">
                  <button
                    type="button"
                    onClick={() => onTrackSelect?.(track)}
                    className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2 text-sm font-semibold text-black transition hover:bg-white/90"
                  >
                    <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                    Play Now
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}

export default TrackDetail