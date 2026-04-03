import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { musicAPI, playlistAPI } from '../services/api'
import { FiPlus, FiMusic, FiUser } from 'react-icons/fi'
import AlbumCard from '../components/AlbumCard'
import { formatDurationLabel, normalizeDurationSeconds } from '../utils/helpers'

const BACKEND_ORIGIN = `http://${window.location.hostname}:8000`

function MySpace({ user, onTrackSelect }) {
  const [playlists, setPlaylists] = useState([])
  const [albums, setAlbums] = useState([])
  const [followedArtists, setFollowedArtists] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const navigate = useNavigate()
  const location = useLocation()

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

  const withResolvedDurations = async (tracks) => {
    const source = Array.isArray(tracks) ? tracks : []

    return Promise.all(
      source.map(async (track) => {
        if (track?.is_podcast) return track
        if (!String(track?.album_name || '').trim()) return track
        if (normalizeDurationSeconds(track?.duration) != null) return track

        let merged = track

        try {
          const detailResponse = await musicAPI.getTrackDetail(track.id)
          merged = {
            ...track,
            ...(detailResponse.data || {}),
          }
        } catch {
          merged = track
        }

        if (normalizeDurationSeconds(merged?.duration) != null) return merged

        const probedDuration = await probeDurationFromAudio(getAudioUrl(merged?.audio_file))
        if (probedDuration == null) return merged

        return {
          ...merged,
          duration: probedDuration,
        }
      })
    )
  }

  const getPlaylistCoverUrl = (coverPath) => {
    if (!coverPath) return '/Cadence Playlist.png'
    if (coverPath.startsWith('http')) return coverPath
    return `http://${window.location.hostname}:8000${coverPath}`
  }

  const formatDuration = (seconds) => {
    const total = Math.max(0, Number(seconds) || 0)
    const hours = Math.floor(total / 3600)
    const minutes = Math.floor((total % 3600) / 60)
    const remainingSeconds = Math.floor(total % 60)
    if (hours > 0) return `${hours}h ${minutes}m ${remainingSeconds}s`
    if (minutes > 0) return `${minutes}m ${remainingSeconds}s`
    return `${remainingSeconds}s`
  }

  const groupAlbums = (tracks) => {
    const groups = new Map()

    tracks
      .filter((track) => !track.is_podcast && String(track.album_name || '').trim())
      .forEach((track) => {
        const key = String(track.album_name || '').trim().toLowerCase()
        const existing = groups.get(key)
        const releaseDate = track.release_date || ''

        if (!existing) {
          groups.set(key, {
            key,
            name: track.album_name.trim(),
            artist_name: track.artist_name || 'Unknown Artist',
            album_artist: track.album_artist || track.artist_name || 'Unknown Artist',
            cover_image: track.cover_image || '',
            tracks: [track],
            latest_release_date: releaseDate,
            total_duration: normalizeDurationSeconds(track.duration) || 0,
          })
        } else {
          existing.tracks.push(track)
          if (!existing.cover_image && track.cover_image) {
            existing.cover_image = track.cover_image
          }
          if (releaseDate && (!existing.latest_release_date || releaseDate > existing.latest_release_date)) {
            existing.latest_release_date = releaseDate
          }
          existing.total_duration += normalizeDurationSeconds(track.duration) || 0
        }
      })

    return [...groups.values()]
      .sort((a, b) => String(b.latest_release_date || '').localeCompare(String(a.latest_release_date || '')))
      .map((album) => ({
        ...album,
        track_count: album.tracks.length,
        duration_label: formatDurationLabel(album.total_duration),
      }))
  }

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        setError(null)
        const response = await playlistAPI.getMyPlaylists()
        const items = Array.isArray(response.data) ? response.data : response.data?.results || []
        setPlaylists(items)
        try {
          const uploadsResponse = await musicAPI.getMyUploads()
          const uploadsRaw = Array.isArray(uploadsResponse.data) ? uploadsResponse.data : uploadsResponse.data?.results || []
          const uploads = await withResolvedDurations(uploadsRaw)
          setAlbums(groupAlbums(uploads))
        } catch {
          setAlbums([])
        }
        setFollowedArtists([])
      } catch (err) {
        console.error('Error fetching playlists:', err.response?.data || err.message)
        setError('Failed to load playlists. Please try again.')
        setPlaylists([])
        setAlbums([])
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [location.pathname])

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-3 h-11 w-11 animate-spin rounded-full border-2 border-white/10 border-t-[#1db954]"></div>
          <p className="text-white/45">Loading My Space...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="pb-24 pt-4 sm:pt-6">
      <div className="mx-auto w-full max-w-6xl px-0 sm:px-6">
        <div className="rounded-none border-0 bg-dark-secondary/70 p-3 sm:rounded-2xl sm:border sm:border-dark-tertiary sm:p-6 md:p-8">
          <div className="mb-8">
            <p className="text-xs uppercase tracking-[0.28em] text-white/45">Library</p>
            <h1 className="mt-2 text-3xl font-bold text-white sm:text-4xl">My Space</h1>
            <p className="mt-2 text-sm text-white/55">Your playlists and albums in one place.</p>
          </div>

          {error && (
            <div className="mb-6 flex items-center justify-between rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-200">
              <span>{error}</span>
              <button
                onClick={() => {
                  setError(null)
                  setLoading(true)
                  const fetchData = async () => {
                    try {
                      const response = await playlistAPI.getMyPlaylists()
                      const items = Array.isArray(response.data) ? response.data : response.data?.results || []
                      setPlaylists(items)
                      setFollowedArtists([])
                    } catch (err) {
                      console.error('Error fetching playlists:', err.response?.data || err.message)
                      setError('Failed to load playlists. Please try again.')
                      setPlaylists([])
                    } finally {
                      setLoading(false)
                    }
                  }
                  fetchData()
                }}
                className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white transition hover:bg-white/10"
              >
                Retry
              </button>
            </div>
          )}

          <div className="mb-10">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white">Your Playlists</h2>
              <button
                onClick={() => navigate('/playlists/new')}
                className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-black transition hover:bg-white/90"
              >
                <FiPlus size={18} />
                <span>New Playlist</span>
              </button>
            </div>

            {playlists.length > 0 ? (
              <div className="space-y-2">
                {playlists.map((playlist) => (
                  <button
                    key={playlist.id}
                    onClick={() => navigate(`/playlists/${playlist.id}`)}
                    className="group flex w-full items-center gap-3 border-b border-white/5 px-2 py-3 text-left transition hover:bg-white/[0.03]"
                  >
                    <img
                      src={getPlaylistCoverUrl(playlist.cover_image)}
                      alt={playlist.name}
                      className="h-12 w-12 shrink-0 object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate text-sm font-semibold text-white">{playlist.name}</h3>
                      <p className="text-sm text-white/45">{playlist.track_count || 0} songs</p>
                    </div>
                    <span className="text-xs uppercase tracking-[0.2em] text-white/25 transition group-hover:text-white/45">Open</span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex min-h-56 items-center justify-center border border-dashed border-white/10 bg-white/[0.02] text-center">
                <div>
                  <FiMusic size={32} className="mx-auto mb-3 text-white/20" />
                  <p className="mb-4 text-white/55">No playlists yet</p>
                  <button
                    onClick={() => navigate('/playlists/new')}
                    className="rounded-full bg-[#1db954] px-6 py-2 text-sm font-semibold text-black transition hover:opacity-90"
                  >
                    Create your first playlist
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="mb-10">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white">Your Albums</h2>
            </div>

            {albums.length > 0 ? (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                {albums.map((album) => (
                  <AlbumCard
                    key={album.key}
                    album={album}
                    onOpen={() => navigate(`/albums/${encodeURIComponent(album.name)}`)}
                  />
                ))}
              </div>
            ) : (
              <div className="flex min-h-40 items-center justify-center border border-dashed border-white/10 bg-white/[0.02] text-sm text-white/45">
                No albums yet.
              </div>
            )}
          </div>

          {followedArtists && followedArtists.length > 0 && (
            <div>
              <h2 className="mb-4 text-xl font-semibold text-white">Followed Artists</h2>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                {followedArtists.map((artist) => (
                  <div
                    key={artist.id}
                    className="border border-white/8 bg-white/[0.03] p-4 transition hover:bg-white/[0.05]"
                  >
                    {artist.profile_image ? (
                      <img
                        src={artist.profile_image}
                        alt={artist.name}
                        className="mb-3 aspect-square w-full object-cover"
                      />
                    ) : (
                      <div className="mb-3 flex aspect-square w-full items-center justify-center bg-white/[0.04]">
                        <FiUser size={24} className="text-white/20" />
                      </div>
                    )}
                    <h3 className="truncate text-sm font-semibold text-white">{artist.name || artist.email}</h3>
                    <p className="mt-1 text-xs uppercase tracking-[0.18em] text-white/35">Artist</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default MySpace
