import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { playlistAPI } from '../services/api'
import { FiPlus, FiMusic, FiUser } from 'react-icons/fi'

function MySpace({ user, onTrackSelect }) {
  const [playlists, setPlaylists] = useState([])
  const [followedArtists, setFollowedArtists] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        setError(null)
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
  }, [location.pathname])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="w-12 h-12 border-3 border-dark-tertiary border-t-accent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-gray-400">Loading My Space...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 pb-24">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">My Space</h1>
          <p className="text-gray-400">Your playlists and followed artists</p>
        </div>

        {error && (
          <div className="bg-red-500/20 border border-red-500 rounded-lg p-4 mb-6 text-red-300 flex items-center justify-between">
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
              className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        {/* Playlists Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-white">Your Playlists</h2>
            <button
              onClick={() => navigate('/playlists/new')}
              className="flex items-center gap-2 bg-accent hover:bg-accent-hover text-white px-4 py-2 rounded-lg transition-colors"
            >
              <FiPlus size={18} />
              <span className="text-sm font-medium">New Playlist</span>
            </button>
          </div>

          {playlists.length > 0 ? (
            <div className="space-y-2">
              {playlists.map((playlist) => (
                <button
                  key={playlist.id}
                  onClick={() => navigate(`/playlists/${playlist.id}`)}
                  className="w-full bg-dark-secondary hover:bg-dark-secondary/80 rounded-lg p-2.5 transition-colors text-left group cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    {playlist.cover_image ? (
                      <img
                        src={playlist.cover_image}
                        alt={playlist.name}
                        className="h-12 w-12 shrink-0 rounded-md object-cover group-hover:opacity-80 transition-opacity"
                      />
                    ) : (
                      <div className="h-12 w-12 shrink-0 bg-gradient-to-br from-accent/30 to-purple-500/30 rounded-md flex items-center justify-center">
                        <FiMusic size={18} className="text-gray-600" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <h3 className="font-semibold text-white truncate">{playlist.name}</h3>
                      <p className="text-xs text-gray-400">{playlist.track_count || 0} songs</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="bg-dark-secondary rounded-lg p-8 text-center">
              <FiMusic size={32} className="mx-auto mb-3 text-gray-600" />
              <p className="text-gray-400 mb-4">No playlists yet</p>
              <button
                onClick={() => navigate('/playlists/new')}
                className="bg-accent hover:bg-accent-hover text-white px-6 py-2 rounded-lg transition-colors inline-block"
              >
                Create your first playlist
              </button>
            </div>
          )}
        </div>

        {/* Followed Artists Section */}
        {followedArtists && followedArtists.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold text-white mb-4">Followed Artists</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {followedArtists.map((artist) => (
                <div
                  key={artist.id}
                  className="bg-dark-secondary rounded-lg p-4 text-center hover:bg-dark-secondary/80 transition-colors cursor-pointer"
                >
                  {artist.profile_image ? (
                    <img
                      src={artist.profile_image}
                      alt={artist.name}
                      className="w-full aspect-square object-cover rounded-lg mb-3"
                    />
                  ) : (
                    <div className="w-full aspect-square bg-gradient-to-br from-accent/30 to-purple-500/30 rounded-lg mb-3 flex items-center justify-center">
                      <FiUser size={24} className="text-gray-600" />
                    </div>
                  )}
                  <h3 className="font-semibold text-white truncate">{artist.name || artist.email}</h3>
                  <p className="text-xs text-gray-400 mt-1">Artist</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default MySpace
