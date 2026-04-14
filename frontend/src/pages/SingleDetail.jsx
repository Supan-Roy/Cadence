import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { musicAPI } from '../services/api'
import CadenceLoader from '../components/CadenceLoader'
import { imageProtectionProps } from '../utils/imageProtection'
import useDelayedLoader from '../hooks/useDelayedLoader'

const BACKEND_ORIGIN = `http://${window.location.hostname}:8000`

const getCoverUrl = (coverPath) => {
  if (!coverPath) return '/Cadence Playlist.png'
  if (coverPath.startsWith('http')) return coverPath
  return `${BACKEND_ORIGIN}${coverPath}`
}

function SingleDetail({ onTrackSelect }) {
  const navigate = useNavigate()
  const { trackId } = useParams()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [track, setTrack] = useState(null)
  const showLoader = useDelayedLoader(loading, 250)

  useEffect(() => {
    const loadTrack = async () => {
      if (!trackId) {
        setError('Single not found.')
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError('')
        const response = await musicAPI.getTrackDetail(trackId)
        setTrack(response.data || null)
      } catch {
        setError('Failed to load single.')
        setTrack(null)
      } finally {
        setLoading(false)
      }
    }

    loadTrack()
  }, [trackId])

  if (loading && !showLoader) return null
  if (loading) return <CadenceLoader message="Loading single..." size="sm" />

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
            <p className="mt-4 text-sm text-white/50">Single not found.</p>
          ) : (
            <section className="mx-auto max-w-md text-center">
              <p className="text-xs uppercase tracking-[0.24em] text-white/45">Single</p>
              <img
                src={getCoverUrl(track.cover_image || track.album_cover_image)}
                alt={track.title}
                className="mx-auto mt-4 aspect-square w-full rounded-2xl object-cover ring-1 ring-white/10"
                {...imageProtectionProps}
              />
              <h1 className="mt-5 text-3xl font-bold text-white">{track.title || 'Untitled Single'}</h1>
              <p className="mt-2 text-sm text-white/65">{track.artist_name || track.artist || 'Unknown Artist'}</p>
              <button
                type="button"
                onClick={() => onTrackSelect?.(track)}
                className="mt-6 inline-flex items-center gap-2 rounded-full bg-white px-5 py-2 text-sm font-semibold text-black transition hover:bg-white/90"
              >
                <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
                Play Single
              </button>
            </section>
          )}
        </div>
      </div>
    </main>
  )
}

export default SingleDetail
