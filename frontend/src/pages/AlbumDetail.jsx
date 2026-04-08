import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { musicAPI } from '../services/api'
import { imageProtectionProps } from '../utils/imageProtection'

const BACKEND_ORIGIN = `http://${window.location.hostname}:8000`

function AlbumDetail({ onTrackSelect, onPlayPlaylist, onAddPlaylistToQueue }) {
  const navigate = useNavigate()
  const { albumName } = useParams()
  const decodedAlbumName = decodeURIComponent(albumName || '')

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [tracks, setTracks] = useState([])
  const [isShuffling, setIsShuffling] = useState(false)

  const normalizeDurationSeconds = (value) => {
    if (value === null || value === undefined || value === '') return null
    const parsed = Number(value)
    if (!Number.isFinite(parsed) || parsed < 0) return null
    // Some sources may report milliseconds; normalize to seconds for display.
    return parsed > 100000 ? parsed / 1000 : parsed
  }

  const getAudioUrl = (audioPath) => {
    if (!audioPath) return ''
    if (audioPath.startsWith('http')) return audioPath
    return `${BACKEND_ORIGIN}${audioPath}`
  }

  const probeDurationFromAudio = (audioUrl) => new Promise((resolve) => {
    if (!audioUrl) {
      resolve(null)
      return
    }

    const audio = new Audio()
    audio.preload = 'metadata'

    const finalize = (value) => {
      audio.removeEventListener('loadedmetadata', onLoaded)
      audio.removeEventListener('error', onError)
      clearTimeout(timeoutId)
      audio.src = ''
      resolve(value)
    }

    const onLoaded = () => finalize(normalizeDurationSeconds(audio.duration))
    const onError = () => finalize(null)
    const timeoutId = setTimeout(() => finalize(null), 5000)

    audio.addEventListener('loadedmetadata', onLoaded)
    audio.addEventListener('error', onError)
    audio.src = audioUrl
  })

  const getCoverUrl = (coverPath) => {
    if (!coverPath) return '/Cadence Playlist.png'
    if (coverPath.startsWith('http')) return coverPath
    return `${BACKEND_ORIGIN}${coverPath}`
  }

  const formatDuration = (seconds) => {
    const total = Math.max(0, Number(seconds) || 0)
    const hours = Math.floor(total / 3600)
    const minutes = Math.floor((total % 3600) / 60)
    const remainingSeconds = Math.floor(total % 60)
    if (hours > 0) {
      return `${hours}h ${minutes}m ${remainingSeconds}s`
    }
    if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`
    }
    return `${remainingSeconds}s`
  }

  const formatTrackTime = (seconds) => {
    const normalized = normalizeDurationSeconds(seconds)
    if (normalized == null) return '--:--'
    const total = Math.floor(normalized)
    const minutes = Math.floor(total / 60)
    const secs = total % 60
    return `${minutes}:${String(secs).padStart(2, '0')}`
  }

  const loadAlbum = async () => {
    if (!decodedAlbumName) {
      setError('Album not found.')
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError('')
      const response = await musicAPI.searchTracks(decodedAlbumName, 1, 100)
      const items = Array.isArray(response.data) ? response.data : response.data?.results || []
      const filtered = items.filter((track) => {
        const trackAlbum = String(track.album_name || '').trim().toLowerCase()
        return trackAlbum === decodedAlbumName.trim().toLowerCase() && !track.is_podcast
      })

      let albumTracks = filtered

      if (albumTracks.length === 0) {
        try {
          const uploadsResponse = await musicAPI.getMyUploads()
          const uploads = Array.isArray(uploadsResponse.data) ? uploadsResponse.data : uploadsResponse.data?.results || []
          albumTracks = uploads.filter((track) => {
            const trackAlbum = String(track.album_name || '').trim().toLowerCase()
            return trackAlbum === decodedAlbumName.trim().toLowerCase() && !track.is_podcast
          })
        } catch {
          albumTracks = []
        }
      }

      const missingDurationTracks = albumTracks.filter((track) => track.duration == null)
      const enrichedTracks = missingDurationTracks.length > 0
        ? await Promise.all(
            albumTracks.map(async (track) => {
              if (track.duration != null) return track
              try {
                const detailResponse = await musicAPI.getTrackDetail(track.id)
                return {
                  ...track,
                  ...(detailResponse.data || {}),
                }
              } catch {
                return track
              }
            })
          )
        : albumTracks

      const durationCompletedTracks = await Promise.all(
        enrichedTracks.map(async (track) => {
          if (normalizeDurationSeconds(track.duration) != null) return track
          const probedDuration = await probeDurationFromAudio(getAudioUrl(track.audio_file))
          if (probedDuration == null) return track
          return {
            ...track,
            duration: probedDuration,
          }
        })
      )

      const sorted = [...durationCompletedTracks].sort((a, b) => {
        const orderA = Number.isFinite(Number(a.album_track_order)) ? Number(a.album_track_order) : Number.MAX_SAFE_INTEGER
        const orderB = Number.isFinite(Number(b.album_track_order)) ? Number(b.album_track_order) : Number.MAX_SAFE_INTEGER
        if (orderA !== orderB) return orderA - orderB

        const createdA = String(a.created_at || '')
        const createdB = String(b.created_at || '')
        const createdCompare = createdA.localeCompare(createdB)
        if (createdCompare !== 0) return createdCompare

        return String(a.title || '').localeCompare(String(b.title || ''))
      })
      setTracks(sorted)
    } catch (err) {
      setError('Failed to load album.')
      setTracks([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAlbum()
  }, [decodedAlbumName])

  const albumArtist = useMemo(() => tracks[0]?.album_artist || tracks[0]?.artist_name || 'Unknown Artist', [tracks])
  const albumCover = useMemo(() => {
    return (
      tracks.find((track) => track.album_cover_image)?.album_cover_image ||
      tracks.find((track) => track.cover_image)?.cover_image ||
      tracks[0]?.album_cover_image ||
      tracks[0]?.cover_image ||
      ''
    )
  }, [tracks])
  const totalDurationSeconds = useMemo(
    () => tracks.reduce((sum, item) => sum + (normalizeDurationSeconds(item.duration) || 0), 0),
    [tracks]
  )

  const playAlbum = () => {
    if (!tracks.length) return
    onPlayPlaylist?.(tracks)
  }

  const playShuffle = () => {
    if (!tracks.length) return
    const shuffled = [...tracks].sort(() => Math.random() - 0.5)
    setIsShuffling(true)
    onPlayPlaylist?.(shuffled)
  }

  const addToQueue = () => {
    if (!tracks.length) return
    onAddPlaylistToQueue?.(tracks)
  }

  return (
    <main className="pb-36 pt-0 sm:pt-4">
      <div className="mx-auto w-full max-w-6xl px-0 sm:px-6">
        <div className="rounded-none border-0 bg-dark-secondary/70 p-3 sm:rounded-2xl sm:border sm:border-dark-tertiary sm:p-6 md:p-8">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="mb-4 rounded-lg border border-white/15 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-white/10"
          >
            Back
          </button>

          {loading ? (
            <p className="mt-4 text-sm text-gray-300">Loading album...</p>
          ) : error ? (
            <p className="mt-4 rounded-lg border border-red-700/60 bg-red-950/20 px-4 py-3 text-sm text-red-300">{error}</p>
          ) : tracks.length === 0 ? (
            <p className="mt-4 text-sm text-gray-400">No tracks found for this album.</p>
          ) : (
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)] lg:gap-10">
              <aside className="text-center lg:sticky lg:top-6 lg:text-left lg:self-start">
                <div className="mx-auto w-full max-w-[13rem] sm:max-w-[14.5rem] lg:mx-0 lg:max-w-[15rem]">
                  <div className="aspect-square overflow-hidden rounded-2xl bg-black/20 ring-1 ring-white/10">
                    <img
                      src={getCoverUrl(albumCover)}
                      alt={decodedAlbumName}
                      className="h-full w-full object-cover"
                      {...imageProtectionProps}
                    />
                  </div>
                </div>

                <div className="mt-5">
                  <p className="text-xs uppercase tracking-[0.28em] text-white/50">Album</p>
                  <h1 className="mt-2 text-xl font-bold text-white sm:text-3xl lg:text-2xl">{decodedAlbumName}</h1>
                  <p className="mt-2 text-xs text-gray-300 sm:text-sm lg:text-xs">
                    {albumArtist} • {tracks.length} songs • {formatDuration(totalDurationSeconds)}
                  </p>

                  <div className="mt-5 flex flex-wrap items-center justify-center gap-2 lg:justify-start sm:gap-3">
                    <button
                      type="button"
                      onClick={playAlbum}
                      className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-black transition hover:bg-white/90 sm:h-10 sm:w-auto sm:justify-start sm:gap-2 sm:px-4"
                    >
                      <svg className="h-4 w-4 fill-current sm:h-4 sm:w-4" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                      <span className="hidden text-xs font-semibold sm:inline">Play</span>
                    </button>

                    <button
                      type="button"
                      onClick={playShuffle}
                      className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20 sm:h-10 sm:w-auto sm:justify-start sm:gap-2 sm:px-4"
                    >
                      <svg className="h-4 w-4 sm:h-4 sm:w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17 3h4v4" />
                        <path d="M21 3l-6 6" />
                        <path d="M3 7h5l4 4" />
                        <path d="M3 17h5l9-9" />
                        <path d="M17 17h4v4" />
                        <path d="M21 21l-6-6" />
                      </svg>
                      <span className="hidden text-xs font-semibold sm:inline">Shuffle</span>
                    </button>

                    <button
                      type="button"
                      onClick={addToQueue}
                      className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20 sm:h-10 sm:w-auto sm:justify-start sm:gap-2 sm:px-4"
                    >
                      <svg className="h-4 w-4 fill-current sm:h-4 sm:w-4" viewBox="0 0 24 24">
                        <path d="M19 11h-6V5h-2v6H5v2h6v6h2v-6h6z" />
                      </svg>
                      <span className="hidden text-xs font-semibold sm:inline">Add to Queue</span>
                    </button>

                    <button
                      type="button"
                      className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20 sm:h-10 sm:w-auto sm:justify-start sm:gap-2 sm:px-4"
                    >
                      <svg className="h-4 w-4 sm:h-4 sm:w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="18" cy="5" r="3" />
                        <circle cx="6" cy="12" r="3" />
                        <circle cx="18" cy="19" r="3" />
                        <path d="m8.59 13.51 6.83 3.98M15.41 6.51 8.59 10.49" strokeLinecap="round" />
                      </svg>
                      <span className="hidden text-xs font-semibold sm:inline">Share</span>
                    </button>
                  </div>
                </div>
              </aside>

              <section className="rounded-xl border border-white/10 bg-dark-bg/60 p-4 sm:p-5 lg:max-h-[70vh] lg:overflow-y-auto">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <h2 className="text-lg font-semibold text-white">Tracks</h2>
                </div>

                <div className="space-y-2">
                  {tracks.map((track, index) => (
                    <button
                      key={track.id}
                      type="button"
                      onClick={() => onTrackSelect?.(track)}
                      className="flex w-full items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-2 text-left transition hover:bg-white/[0.06] sm:gap-3 sm:px-3 sm:py-2.5"
                    >
                      <span className="w-5 shrink-0 text-center text-[10px] font-semibold text-white/40 sm:w-6 sm:text-xs">
                        {String(index + 1).padStart(2, '0')}
                      </span>
                      <img
                        src={getCoverUrl(track.cover_image)}
                        alt={track.title}
                        className="h-9 w-9 shrink-0 rounded-md object-cover sm:h-11 sm:w-11"
                        {...imageProtectionProps}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-semibold text-white sm:text-sm">{track.title}</p>
                        <p className="truncate text-[11px] text-gray-400 sm:text-xs">{track.artist_name}</p>
                      </div>
                      <span className="shrink-0 rounded-full bg-white/5 px-2 py-1 text-[10px] font-medium text-gray-300 sm:text-xs">
                        {formatTrackTime(track.duration)}
                      </span>
                    </button>
                  ))}
                </div>
              </section>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}

export default AlbumDetail