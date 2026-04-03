import React, { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { playlistAPI } from '../services/api'

function LibrarySidebar() {
  const navigate = useNavigate()
  const location = useLocation()
  const [playlists, setPlaylists] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const loadPlaylists = async () => {
      try {
        setLoading(true)
        setError('')
        const response = await playlistAPI.getMyPlaylists()
        const items = Array.isArray(response.data) ? response.data : response.data?.results || []
        setPlaylists(items)
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
    <aside className="h-full overflow-y-auto rounded-2xl border border-white/10 bg-[#0f1219]/80 p-4 shadow-[0_12px_30px_rgba(0,0,0,0.25)]">
      <h2 className="text-lg font-semibold text-white">Your Library</h2>

      <section className="mt-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-white/80">Following Artists</h3>
        </div>
        <div className="rounded-xl border border-dashed border-white/15 bg-white/[0.03] p-4 text-sm text-white/60">
          No followed artists yet.
        </div>
      </section>

      <section className="mt-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-white/80">Playlists</h3>
          <button
            type="button"
            onClick={() => navigate('/playlists/new')}
            className="rounded-md bg-white/10 px-2 py-1 text-xs text-white hover:bg-white/20"
          >
            New
          </button>
        </div>

        {loading && <p className="text-sm text-white/60">Loading playlists...</p>}
        {!loading && error && <p className="text-sm text-red-300">{error}</p>}

        {!loading && !error && playlists.length === 0 && (
          <div className="rounded-xl border border-dashed border-white/15 bg-white/[0.03] p-4 text-sm text-white/60">
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
                className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-left transition hover:bg-white/[0.08]"
              >
                <p className="truncate text-sm font-semibold text-white">{playlist.name}</p>
                <p className="text-xs text-white/60">{playlist.track_count} songs</p>
              </button>
            ))}
          </div>
        )}
      </section>
    </aside>
  )
}

export default LibrarySidebar
