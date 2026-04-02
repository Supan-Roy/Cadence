/**
 * Utility functions for Cadence frontend
 */

const BACKEND_ORIGIN = `http://${window.location.hostname}:8000`

/**
 * Format time from seconds to MM:SS format
 */
export const formatTime = (seconds) => {
  if (isNaN(seconds) || seconds === null) return '0:00'
  
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

/**
 * Convert backend cover image path to full URL
 */
export const getCoverUrl = (coverPath) => {
  if (!coverPath) {
    return 'https://via.placeholder.com/200x200?text=No+Cover'
  }
  
  if (coverPath.startsWith('http')) {
    return coverPath
  }
  
  return `${BACKEND_ORIGIN}/${coverPath}`
}

/**
 * Truncate text with ellipsis
 */
export const truncateText = (text, maxLength = 50) => {
  if (!text) return ''
  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text
}

/**
 * Check if device is mobile
 */
export const isMobile = () => {
  return window.matchMedia('(max-width: 640px)').matches
}

/**
 * Parse error response from backend
 */
export const parseError = (error) => {
  if (error.response?.data?.detail) {
    return error.response.data.detail
  }
  
  if (error.response?.data) {
    const data = error.response.data
    if (typeof data === 'object') {
      const errors = Object.entries(data)
        .map(([key, value]) => {
          const message = Array.isArray(value) ? value.join(', ') : value
          return `${key}: ${message}`
        })
        .join(' | ')
      return errors
    }
    return JSON.stringify(data)
  }
  
  return error.message || 'An error occurred'
}

/**
 * Sort tracks by date (newest first)
 */
export const sortByNewest = (tracks) => {
  return [...tracks].sort((a, b) => {
    const dateA = new Date(a.release_date || a.created_at)
    const dateB = new Date(b.release_date || b.created_at)
    return dateB - dateA
  })
}

/**
 * Group tracks by genre
 */
export const groupByGenre = (tracks) => {
  return tracks.reduce((acc, track) => {
    const genre = track.genre || 'Other'
    if (!acc[genre]) {
      acc[genre] = []
    }
    acc[genre].push(track)
    return acc
  }, {})
}

/**
 * Debounce function
 */
export const debounce = (func, wait) => {
  let timeout
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout)
      func(...args)
    }
    clearTimeout(timeout)
    timeout = setTimeout(later, wait)
  }
}

/**
 * Throttle function
 */
export const throttle = (func, limit) => {
  let inThrottle
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args)
      inThrottle = true
      setTimeout(() => (inThrottle = false), limit)
    }
  }
}

/**
 * Cache wrapper for API calls
 */
export class APICache {
  constructor(duration = 5 * 60 * 1000) { // 5 minutes default
    this.cache = new Map()
    this.duration = duration
  }

  set(key, value) {
    this.cache.set(key, {
      value,
      timestamp: Date.now(),
    })
  }

  get(key) {
    const item = this.cache.get(key)
    if (!item) return null

    const age = Date.now() - item.timestamp
    if (age > this.duration) {
      this.cache.delete(key)
      return null
    }

    return item.value
  }

  clear() {
    this.cache.clear()
  }

  has(key) {
    return this.get(key) !== null
  }
}

/**
 * Local storage helpers
 */
export const storage = {
  setJSON: (key, value) => {
    localStorage.setItem(key, JSON.stringify(value))
  },

  getJSON: (key, defaultValue = null) => {
    const value = localStorage.getItem(key)
    try {
      return value ? JSON.parse(value) : defaultValue
    } catch {
      return defaultValue
    }
  },

  remove: (key) => {
    localStorage.removeItem(key)
  },

  clear: () => {
    localStorage.clear()
  },
}

/**
 * Validation helpers
 */
export const validators = {
  email: (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return re.test(email)
  },

  password: (password) => {
    return password && password.length >= 8
  },

  url: (url) => {
    try {
      new URL(url)
      return true
    } catch {
      return false
    }
  },
}

export default {
  formatTime,
  getCoverUrl,
  truncateText,
  isMobile,
  parseError,
  sortByNewest,
  groupByGenre,
  debounce,
  throttle,
  APICache,
  storage,
  validators,
}
