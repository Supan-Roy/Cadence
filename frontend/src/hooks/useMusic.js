import { useState, useCallback, useEffect } from 'react'
import { musicAPI } from '../services/api'

/**
 * Hook for fetching and caching music tracks
 * @param {Function} fetchFn - API function to call
 * @param {number} initialLimit - Initial fetch limit
 * @returns {Object} - { data, loading, error, refetch }
 */
export const useMusicFetch = (fetchFn, initialLimit = 20) => {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetchFn(initialLimit)
      
      // Handle paginated vs direct array responses
      const tracks = Array.isArray(response.data) 
        ? response.data 
        : response.data.results || response.data
      
      setData(tracks)
    } catch (err) {
      console.error('Error fetching tracks:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [fetchFn, initialLimit])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { data, loading, error, refetch: fetchData }
}

/**
 * Hook for playing a track
 * @returns {Object} - { currentTrack, isPlaying, play, pause, stop }
 */
export const usePlayer = () => {
  const [currentTrack, setCurrentTrack] = useState(null)
  const [isPlaying, setIsPlaying] = useState(false)

  const play = useCallback((track) => {
    setCurrentTrack(track)
    setIsPlaying(true)
  }, [])

  const pause = useCallback(() => {
    setIsPlaying(false)
  }, [])

  const stop = useCallback(() => {
    setCurrentTrack(null)
    setIsPlaying(false)
  }, [])

  const togglePlayPause = useCallback(() => {
    setIsPlaying(prev => !prev)
  }, [])

  return {
    currentTrack,
    isPlaying,
    play,
    pause,
    stop,
    togglePlayPause,
  }
}

/**
 * Hook for handling authentication
 */
export const useAuth = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    const userEmail = localStorage.getItem('user_email')

    if (token && userEmail) {
      setIsAuthenticated(true)
      setUser({ email: userEmail })
    }
    setLoading(false)
  }, [])

  const login = useCallback((userData) => {
    setIsAuthenticated(true)
    setUser(userData)
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('user_email')
    setIsAuthenticated(false)
    setUser(null)
  }, [])

  return {
    isAuthenticated,
    user,
    loading,
    login,
    logout,
  }
}

/**
 * Hook for debouncing search queries
 */
export const useDebounce = (value, delay = 500) => {
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => clearTimeout(handler)
  }, [value, delay])

  return debouncedValue
}

/**
 * Hook for infinite scroll pagination
 */
export const usePagination = (fetchFn, itemsPerPage = 20) => {
  const [items, setItems] = useState([])
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [error, setError] = useState(null)

  const loadMore = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetchFn(itemsPerPage, page)
      const newItems = Array.isArray(response.data)
        ? response.data
        : response.data.results || []

      setItems(prev => [...prev, ...newItems])
      setHasMore(newItems.length === itemsPerPage)
      setPage(prev => prev + 1)
    } catch (err) {
      console.error('Pagination error:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [fetchFn, page, itemsPerPage])

  return {
    items,
    loading,
    hasMore,
    error,
    loadMore,
    reset: () => {
      setItems([])
      setPage(1)
      setHasMore(true)
      setError(null)
    },
  }
}

export default {
  useMusicFetch,
  usePlayer,
  useAuth,
  useDebounce,
  usePagination,
}
