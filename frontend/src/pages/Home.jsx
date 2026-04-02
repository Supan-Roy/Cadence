import React, { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { musicAPI } from '../services/api'
import TrackCard from '../components/TrackCard'

function Home({ user, onTrackSelect }) {
  const location = useLocation()
  const query = new URLSearchParams(location.search).get('q')?.trim() || ''
  const [activeTab, setActiveTab] = useState('all')
  const [trending, setTrending] = useState([])
  const [recommended, setRecommended] = useState([])
  const [recentlyPlayed, setRecentlyPlayed] = useState([])
  const [podcasts, setPodcasts] = useState([])
  const [searchResults, setSearchResults] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        setError('')

        // Fetch all sections in parallel but don't fail everything if one endpoint errors
        const [trendingResult, recommendedResult, recentResult, podcastsResult] = await Promise.allSettled([
          musicAPI.getTrendingTracks(20),
          musicAPI.getRecommendedTracks(20),
          musicAPI.getRecentlyPlayedTracks(20),
          musicAPI.getPodcasts(20),
        ])

        // Handle paginated responses
        const getTracks = (data) => {
          if (Array.isArray(data)) return data
          return data.results || []
        }

        const trendingData = trendingResult.status === 'fulfilled' ? getTracks(trendingResult.value.data) : []
        const recommendedData = recommendedResult.status === 'fulfilled' ? getTracks(recommendedResult.value.data) : []
        const recentData = recentResult.status === 'fulfilled' ? getTracks(recentResult.value.data) : []
        const podcastsData = podcastsResult.status === 'fulfilled' ? getTracks(podcastsResult.value.data) : []

        setTrending(trendingData)
        setRecommended(recommendedData)
        setRecentlyPlayed(recentData)
        setPodcasts(podcastsData)

        if (
          trendingResult.status === 'rejected' &&
          recommendedResult.status === 'rejected' &&
          recentResult.status === 'rejected' &&
          podcastsResult.status === 'rejected'
        ) {
          setError('Failed to load tracks. Please try again.')
        }
      } catch (err) {
        console.error('Error fetching tracks:', err)
        setError('Failed to load tracks. Please try again.')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [user?.email, user?.name, user?.displayName])

  useEffect(() => {
    const fetchSearchResults = async () => {
      if (!query) {
        setSearchResults([])
        return
      }

      try {
        const response = await musicAPI.searchTracks(query, 1, 30)
        const items = Array.isArray(response.data) ? response.data : response.data?.results || []
        setSearchResults(items)
      } catch (err) {
        console.error('Error searching tracks:', err)
        setSearchResults([])
      }
    }

    fetchSearchResults()
  }, [query])

  const TrackSection = ({ title, tracks, loading: sectionLoading }) => {
    const railRef = useRef(null)
    const [canGoPrev, setCanGoPrev] = useState(false)
    const [canGoNext, setCanGoNext] = useState(false)

    useEffect(() => {
      const element = railRef.current
      if (!element) return

      const updateButtons = () => {
        const maxScrollLeft = element.scrollWidth - element.clientWidth
        setCanGoPrev(element.scrollLeft > 0)
        setCanGoNext(element.scrollLeft < maxScrollLeft - 2)
      }

      updateButtons()
      element.addEventListener('scroll', updateButtons)
      window.addEventListener('resize', updateButtons)

      return () => {
        element.removeEventListener('scroll', updateButtons)
        window.removeEventListener('resize', updateButtons)
      }
    }, [tracks])

    const slideByCards = (direction) => {
      const element = railRef.current
      if (!element) return

      const cardStep = 216
      const slideAmount = cardStep * 3 * direction
      element.scrollBy({ left: slideAmount, behavior: 'smooth' })
    }

    return (
      <section className="mb-12">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-2xl font-bold text-white">{title}</h2>
          {!sectionLoading && tracks.length > 0 && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => slideByCards(-1)}
                disabled={!canGoPrev}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-white/5 text-white transition enabled:hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
                aria-label={`Previous in ${title}`}
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="m15 18-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => slideByCards(1)}
                disabled={!canGoNext}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-white/5 text-white transition enabled:hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
                aria-label={`Next in ${title}`}
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="m9 6 6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
          )}
        </div>

        {sectionLoading ? (
          <div className="flex gap-4 overflow-hidden pb-4">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="flex-shrink-0 w-48 animate-pulse"
              >
                <div className="w-full aspect-square bg-dark-tertiary rounded-lg mb-4"></div>
                <div className="h-4 bg-dark-tertiary rounded mb-2"></div>
                <div className="h-3 bg-dark-tertiary rounded w-3/4"></div>
              </div>
            ))}
          </div>
        ) : tracks.length === 0 ? (
          <div className="text-gray-400 text-center py-8">
            No tracks available
          </div>
        ) : (
          <div ref={railRef} className="hide-horizontal-scrollbar flex gap-6 overflow-x-auto overflow-y-hidden pb-4">
            {tracks.map((track) => (
              <TrackCard
                key={track.id}
                track={track}
                onPlay={onTrackSelect}
              />
            ))}
          </div>
        )}
      </section>
    )
  }

  const musicTrending = trending.filter((track) => !track.is_podcast)
  const musicRecommended = recommended.filter((track) => !track.is_podcast)
  const musicRecentlyPlayed = recentlyPlayed.filter((track) => !track.is_podcast)
  const podcastRecentlyPlayed = recentlyPlayed.filter((track) => !!track.is_podcast)

  const showAllTab = activeTab === 'all'
  const showMusicTab = activeTab === 'music'
  const showPodcastTab = activeTab === 'podcast'
  const searchMusicResults = searchResults.filter((track) => !track.is_podcast)
  const searchPodcastResults = searchResults.filter((track) => !!track.is_podcast)
  const filteredSearchResults = showMusicTab
    ? searchMusicResults
    : showPodcastTab
      ? searchPodcastResults
      : searchResults

  const tabButtonClass = (tabName) => {
    const isActive = activeTab === tabName
    return `rounded-full px-4 py-2 text-sm font-semibold transition ${
      isActive
        ? 'bg-white text-black'
        : 'bg-dark-tertiary text-gray-300 hover:bg-dark-secondary hover:text-white'
    }`
  }

  return (
    <main className="pb-32 pt-2">
      <div className="px-8">
        <div className="mb-8 flex flex-wrap items-center gap-3 pt-2">
          <button type="button" onClick={() => setActiveTab('all')} className={tabButtonClass('all')}>
            All
          </button>
          <button type="button" onClick={() => setActiveTab('music')} className={tabButtonClass('music')}>
            Music
          </button>
          <button type="button" onClick={() => setActiveTab('podcast')} className={tabButtonClass('podcast')}>
            Podcast
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-8 p-4 bg-red-900/20 border border-red-800/50 rounded-lg">
            <p className="text-red-400">{error}</p>
          </div>
        )}

        {/* Loading State */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block">
              <div className="w-12 h-12 border-4 border-dark-tertiary border-t-accent rounded-full animate-spin"></div>
            </div>
            <p className="text-gray-400 mt-4">Loading your music...</p>
          </div>
        ) : (
          <>
            {query && (
              <TrackSection
                title={`Search Results: ${query}`}
                tracks={filteredSearchResults}
                loading={false}
              />
            )}

            {(showAllTab || showMusicTab) && (
              <TrackSection
                title="Trending Now"
                tracks={showMusicTab ? musicTrending : trending}
                loading={false}
              />
            )}

            {(showAllTab || showMusicTab) && (
              <TrackSection
                title="Recommended For You"
                tracks={showMusicTab ? musicRecommended : recommended}
                loading={false}
              />
            )}

            {(showAllTab || showPodcastTab) && (
              <TrackSection
                title="Podcasts"
                tracks={podcasts}
                loading={false}
              />
            )}

            {(showAllTab || showMusicTab) && (showMusicTab ? musicRecentlyPlayed.length > 0 : recentlyPlayed.length > 0) && (
              <TrackSection
                title="Recently Played"
                tracks={showMusicTab ? musicRecentlyPlayed : recentlyPlayed}
                loading={false}
              />
            )}

            {showPodcastTab && podcastRecentlyPlayed.length > 0 && (
              <TrackSection
                title="Recently Played Podcasts"
                tracks={podcastRecentlyPlayed}
                loading={false}
              />
            )}

            {/* No Data Message */}
            {((!query && showAllTab && trending.length === 0 && recommended.length === 0 && recentlyPlayed.length === 0 && podcasts.length === 0) ||
              (!query && showMusicTab && musicTrending.length === 0 && musicRecommended.length === 0 && musicRecentlyPlayed.length === 0) ||
              (!query && showPodcastTab && podcasts.length === 0 && podcastRecentlyPlayed.length === 0) ||
              (query && filteredSearchResults.length === 0)) && (
              <div className="text-center py-20">
                <svg className="w-16 h-16 text-gray-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                </svg>
                <p className="text-gray-400 text-lg">
                  {query
                    ? 'No matching songs or podcasts found.'
                    : showPodcastTab
                      ? 'No podcasts available yet. Check back soon!'
                      : 'No tracks available yet. Check back soon!'}
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  )
}

export default Home
