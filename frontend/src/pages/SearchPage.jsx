import React, { useState, useEffect } from 'react'
import { musicAPI } from '../services/api'
import { FiSearch, FiPlay } from 'react-icons/fi'

function SearchPage({ onTrackSelect }) {
  const [searchQuery, setSearchQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Continuous search with debounce
  useEffect(() => {
    let cancelled = false

    const performSearch = async () => {
      if (!searchQuery.trim()) {
        setResults([])
        return
      }

      try {
        setLoading(true)
        setError(null)

        const response = await musicAPI.searchTracks(searchQuery, 1, 50)
        if (cancelled) return
        const items = Array.isArray(response.data) ? response.data : response.data?.results || []
        setResults(items)
      } catch (err) {
        if (!cancelled) {
          console.error('Search error:', err)
          setError('Failed to search tracks')
          setResults([])
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    const timeoutId = setTimeout(performSearch, 300)
    return () => {
      cancelled = true
      clearTimeout(timeoutId)
    }
  }, [searchQuery])

  const handleTrackClick = (track) => {
    if (onTrackSelect) {
      onTrackSelect(track)
    }
  }

  return (
    <div className="p-6 pb-24">
      <div className="max-w-4xl mx-auto">
        {/* Search Header */}
        <div className="mb-6">
          {/* Search Input */}
          <div className="relative">
            <FiSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" size={20} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search for tracks, artists, albums..."
              className="w-full pl-12 pr-4 py-3 bg-dark-secondary border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
              autoFocus
            />
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-500/20 border border-red-500 rounded-lg p-4 mb-6 text-red-300">
            {error}
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="w-12 h-12 border-3 border-dark-tertiary border-t-accent rounded-full animate-spin mx-auto mb-3"></div>
              <p className="text-gray-400">Searching...</p>
            </div>
          </div>
        )}

        {/* Results */}
        {searchQuery.trim() && !loading && (
          <div>
            {results.length > 0 ? (
              <div>
                <p className="text-gray-400 mb-4">{results.length} results found</p>
                <div className="space-y-2">
                  {results.map((track) => (
                    <div
                      key={track.id}
                      className="bg-dark-secondary hover:bg-dark-secondary/80 rounded-lg p-4 flex items-center gap-4 group cursor-pointer transition-colors"
                      onClick={() => handleTrackClick(track)}
                    >
                      {/* Album Cover */}
                      {track.album_cover ? (
                        <img
                          src={track.album_cover}
                          alt={track.title}
                          className="w-12 h-12 object-cover rounded"
                        />
                      ) : (
                        <div className="w-12 h-12 bg-gradient-to-br from-accent/30 to-purple-500/30 rounded flex items-center justify-center">
                          <FiSearch size={20} className="text-gray-600" />
                        </div>
                      )}

                      {/* Track Info */}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-white truncate">{track.title}</h3>
                        <p className="text-sm text-gray-400 truncate">{track.artist_name || track.artist || 'Unknown Artist'}</p>
                      </div>

                      {/* Play Button */}
                      <button
                        className="bg-accent hover:bg-accent-hover text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleTrackClick(track)
                        }}
                      >
                        <FiPlay size={16} className="fill-current" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <FiSearch size={48} className="mx-auto mb-4 text-gray-600" />
                <p className="text-gray-400 text-lg">No tracks found</p>
                <p className="text-gray-500 text-sm mt-2">Try searching with different keywords</p>
              </div>
            )}
          </div>
        )}

        {/* Initial State */}
        {!searchQuery.trim() && !loading && (
          <div className="text-center py-20">
            <FiSearch size={48} className="mx-auto mb-4 text-gray-600" />
            <p className="text-gray-400 text-lg">Start searching</p>
            <p className="text-gray-500 text-sm mt-2">Find your favorite tracks, artists, and more</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default SearchPage
