import React, { useState, useEffect } from 'react'
import { musicAPI } from '../services/api'
import { FiSearch, FiPlay } from 'react-icons/fi'
import CadenceLoader from '../components/CadenceLoader'
import { imageProtectionProps } from '../utils/imageProtection'
import useDelayedLoader from '../hooks/useDelayedLoader'

const MAX_SEARCH_CHARS = 40

function SearchPage({ onTrackSelect }) {
  const [searchQuery, setSearchQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const showLoader = useDelayedLoader(loading, 250)

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
    <div className="pb-24 pt-4 sm:pt-6">
      <div className="mx-auto w-full max-w-6xl px-0 sm:px-6">
        <div className="rounded-none border-0 bg-dark-secondary/70 p-3 sm:rounded-2xl sm:border sm:border-dark-tertiary sm:p-6 md:p-8">
          <div className="mb-6">
            <p className="text-xs uppercase tracking-[0.28em] text-white/45">Search</p>
            <h1 className="mt-2 text-3xl font-bold text-white sm:text-4xl">Find tracks, artists, and albums</h1>
            <p className="mt-2 max-w-2xl text-sm text-white/55">
              Search fades into the background here. The result list stays compact and playback-first.
            </p>
          </div>

          <div className="relative mb-8">
            <FiSearch className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white/35" size={20} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value.slice(0, MAX_SEARCH_CHARS))}
              maxLength={MAX_SEARCH_CHARS}
              placeholder="Search for tracks, artists, albums..."
              className="w-full rounded-full border border-white/10 bg-[#0d1117] py-3 pl-12 pr-4 text-white outline-none transition placeholder:text-white/30 focus:border-white/20 focus:bg-[#111720]"
              autoFocus
            />
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-200">
            {error}
          </div>
        )}

        {/* Loading State */}
        {loading && showLoader && (
          <CadenceLoader message="Loading search..." size="sm" />
        )}

        {/* Results */}
        {searchQuery.trim() && !loading && (
          <div className="space-y-4">
            {results.length > 0 ? (
              <div>
                <p className="mb-4 text-sm text-white/45">{results.length} results found</p>
                <div className="space-y-2">
                  {results.map((track) => (
                    <div
                      key={track.id}
                      className="group flex cursor-pointer items-center gap-4 border-b border-white/5 px-2 py-3 transition hover:bg-white/[0.03]"
                      onClick={() => handleTrackClick(track)}
                    >
                      {track.album_cover ? (
                        <img
                          src={track.album_cover}
                          alt={track.title}
                          className="h-12 w-12 object-cover"
                          {...imageProtectionProps}
                        />
                      ) : (
                        <div className="flex h-12 w-12 items-center justify-center bg-white/5">
                          <FiSearch size={18} className="text-white/20" />
                        </div>
                      )}

                      <div className="flex-1 min-w-0">
                        <h3 className="truncate text-sm font-semibold text-white">{track.title}</h3>
                        <p className="truncate text-sm text-white/45">{track.artist_name || track.artist || 'Unknown Artist'}</p>
                      </div>

                      <button
                        className="flex h-10 w-10 items-center justify-center rounded-full bg-[#1db954] text-black opacity-0 transition-opacity group-hover:opacity-100"
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
              <div className="py-16 text-center">
                <FiSearch size={48} className="mx-auto mb-4 text-white/15" />
                <p className="text-lg text-white/70">No tracks found</p>
                <p className="mt-2 text-sm text-white/40">Try searching with different keywords</p>
              </div>
            )}
          </div>
        )}

        {/* Initial State */}
        {!searchQuery.trim() && !loading && (
          <div className="py-20 text-center">
            <FiSearch size={48} className="mx-auto mb-4 text-white/15" />
            <p className="text-lg text-white/70">Start searching</p>
            <p className="mt-2 text-sm text-white/40">Find your favorite tracks, artists, and more</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default SearchPage
