import React, { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { playlistAPI } from '../services/api'
import { imageProtectionProps } from '../utils/imageProtection'
import { getFollowedArtists } from '../utils/followedArtists'

const BACKEND_ORIGIN = `http://${window.location.hostname}:8000`

function LibrarySidebar() {
  const navigate = useNavigate()
  const location = useLocation()
  const [playlists, setPlaylists] = useState([])
  const [followedArtists, setFollowedArtists] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const getPlaylistCoverUrl = (coverPath) => {
    if (!coverPath) return '/Cadence Playlist.png'
    if (coverPath.startsWith('http')) return coverPath
    return `${BACKEND_ORIGIN}${coverPath}`
  }

  useEffect(() => {
    const loadPlaylists = async () => {
      setFollowedArtists(getFollowedArtists())
      try {
        setLoading(true)
        setError('')
        const response = await playlistAPI.getMyPlaylists()
        const items = Array.isArray(response.data) ? response.data : response.data?.results || []
        const rawPinned = localStorage.getItem('pinned_playlist_ids') || '[]'
        let pinnedIds = []
        try {
          pinnedIds = JSON.parse(rawPinned)
        } catch {
          pinnedIds = []
        }

        const pinnedSet = new Set(Array.isArray(pinnedIds) ? pinnedIds : [])
        const sorted = [...items].sort((a, b) => {
          const aPinned = pinnedSet.has(a.id)
          const bPinned = pinnedSet.has(b.id)
          if (aPinned === bPinned) return 0
          return aPinned ? -1 : 1
        })

        setPlaylists(sorted)
      } catch (err) {
        setPlaylists([])
        setError('Failed to load playlists.')
      } finally {
        setLoading(false)
      }
    }

    loadPlaylists()
  }, [location.pathname])

  return (
    <aside className="h-full overflow-y-auto bg-[#121212] p-5 shadow-[0_14px_36px_rgba(0,0,0,0.28)]">
      <h2 className="text-3xl font-semibold text-white">Your Library</h2>

      <section className="mt-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-white/80">Following Artists</h3>
        </div>
        {followedArtists.length === 0 ? (
          <div className="bg-white/[0.03] p-5 text-base text-white/60">
            No followed artists yet.
          </div>
        ) : (
          <div className="space-y-2">
            {followedArtists.slice(0, 8).map((artist) => (
              <button
                key={artist.name}
                type="button"
                onClick={() => navigate(`/artists/${encodeURIComponent(artist.name)}`)}
                className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition hover:bg-white/[0.05]"
              >
                <img
                  src={artist.photo || '/Cadence Playlist.png'}
                  alt={artist.name}
                  className="h-10 w-10 rounded-full object-cover ring-1 ring-white/10"
                  {...imageProtectionProps}
                />
                <span className="truncate text-sm font-medium text-white/85">{artist.name}</span>
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="mt-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-white/80">Playlists</h3>
          <button
            type="button"
            onClick={() => navigate('/playlists/new')}
            className="px-2 py-1 text-xs text-white/70 transition hover:text-white"
          >
            New
          </button>
        </div>

        {loading && <p className="text-sm text-white/60">Loading playlists...</p>}
        {!loading && error && <p className="text-sm text-red-300">{error}</p>}

        {!loading && !error && playlists.length === 0 && (
          <div className="bg-white/[0.03] p-4 text-sm text-white/60">
            No playlists yet.
          </div>
        )}

        {!loading && !error && playlists.length > 0 && (
          <div className="space-y-2">
            {playlists.map((playlist) => (
              <button
                key={playlist.id}
                type="button"
                onClick={() => navigate(`/playlists/${playlist.id}`)}
                className="w-full px-3 py-2.5 text-left transition hover:bg-white/[0.05]"
              >
                <div className="flex items-center gap-3">
                  <img
                    src={getPlaylistCoverUrl(playlist.cover_image)}
                    alt={playlist.name}
                    className="h-11 w-11 shrink-0 rounded-md object-cover"
                    {...imageProtectionProps}
                  />
                  <div className="min-w-0">
                    <p className="truncate text-base font-semibold text-white">{playlist.name}</p>
                    <p className="text-sm text-white/60">{playlist.track_count} songs</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </section>
    </aside>
  )
}

export default LibrarySidebar
