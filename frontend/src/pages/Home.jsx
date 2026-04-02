import React, { useState, useEffect } from 'react'
import { musicAPI } from '../services/api'
import TrackCard from '../components/TrackCard'

function Home({ user, onTrackSelect }) {
  const [trending, setTrending] = useState([])
  const [recommended, setRecommended] = useState([])
  const [recentlyPlayed, setRecentlyPlayed] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        setError('')

        // Fetch all sections in parallel but don't fail everything if one endpoint errors
        const [trendingResult, recommendedResult, recentResult] = await Promise.allSettled([
          musicAPI.getTrendingTracks(20),
          musicAPI.getRecommendedTracks(20),
          musicAPI.getRecentlyPlayedTracks(20),
        ])

        // Handle paginated responses
        const getTracks = (data) => {
          if (Array.isArray(data)) return data
          return data.results || []
        }

        const trendingData = trendingResult.status === 'fulfilled' ? getTracks(trendingResult.value.data) : []
        const recommendedData = recommendedResult.status === 'fulfilled' ? getTracks(recommendedResult.value.data) : []
        const recentData = recentResult.status === 'fulfilled' ? getTracks(recentResult.value.data) : []

        setTrending(trendingData)
        setRecommended(recommendedData)
        setRecentlyPlayed(recentData)

        if (trendingResult.status === 'rejected' && recommendedResult.status === 'rejected' && recentResult.status === 'rejected') {
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

  const TrackSection = ({ title, tracks, loading: sectionLoading }) => (
    <section className="mb-12">
      <h2 className="text-2xl font-bold text-white mb-6">{title}</h2>
      {sectionLoading ? (
        <div className="flex gap-4 overflow-x-auto pb-4">
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
        <div className="flex gap-6 overflow-x-auto pb-4 scrollbar-hide">
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

  return (
    <main className="pb-32 pt-2">
      <div className="px-8">

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
            {/* Trending Section */}
            <TrackSection
              title="Trending Now"
              tracks={trending}
              loading={false}
            />

            {/* Recommended Section */}
            <TrackSection
              title="Recommended For You"
              tracks={recommended}
              loading={false}
            />

            {/* Recently Played Section */}
            {recentlyPlayed.length > 0 && (
              <TrackSection
                title="Recently Played"
                tracks={recentlyPlayed}
                loading={false}
              />
            )}

            {/* No Data Message */}
            {trending.length === 0 && recommended.length === 0 && recentlyPlayed.length === 0 && (
              <div className="text-center py-20">
                <svg className="w-16 h-16 text-gray-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                </svg>
                <p className="text-gray-400 text-lg">
                  No tracks available yet. Check back soon!
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
