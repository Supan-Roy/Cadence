import axios from 'axios'

const FALLBACK_HOST = typeof window !== 'undefined' ? window.location.hostname : '127.0.0.1'
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || `http://${FALLBACK_HOST}:8000/api`

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Add token to requests if it exists
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Handle token refresh or logout on 401
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    // Try to refresh token on 401
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true
      const refresh_token = localStorage.getItem('refresh_token')

      if (refresh_token) {
        try {
          const response = await axios.post(`${API_BASE_URL}/token/refresh/`, {
            refresh: refresh_token,
          })
          const { access } = response.data
          localStorage.setItem('access_token', access)

          // Retry original request
          originalRequest.headers.Authorization = `Bearer ${access}`
          return api(originalRequest)
        } catch (refreshErr) {
          // Refresh failed, logout user
          localStorage.removeItem('access_token')
          localStorage.removeItem('refresh_token')
          window.location.href = '/login'
        }
      } else {
        // No refresh token, logout
        localStorage.removeItem('access_token')
        window.location.href = '/login'
      }
    }

    return Promise.reject(error)
  }
)

// Auth endpoints
export const authAPI = {
  // Use Django Simple JWT endpoints
  login: (email, password) =>
    api.post('/token/', { email, password }),
  
  refreshToken: (refresh_token) =>
    api.post('/token/refresh/', { refresh: refresh_token }),
  
  signup: (email, password, role = 'listener') =>
    api.post('/auth/register/', { 
      email, 
      password,
      role,
    }),

  // Verify token is still valid
  verify: () => api.get('/token/verify/', { token: localStorage.getItem('access_token') }),
}

// Music endpoints
export const musicAPI = {
  // Get trending tracks (cached, public)
  getTrendingTracks: (limit = 20, page = 1) =>
    api.get(`/music/tracks/trending/?limit=${limit}&page=${page}`),
  
  // Get recommended tracks (user-specific, auth required)
  getRecommendedTracks: (limit = 20, page = 1) =>
    api.get(`/music/recommend/?limit=${limit}&page=${page}`),
  
  // Get recently played tracks (user-specific, auth required)
  getRecentlyPlayedTracks: (limit = 20, page = 1) =>
    api.get(`/music/recent/?limit=${limit}&page=${page}`),
  
  // Get track details (public)
  getTrackDetail: (id) =>
    api.get(`/music/tracks/${id}/`),
  
  // Get audio stream URL for track (auth required, logs play history)
  getTrackStream: (id) =>
    api.get(`/music/tracks/${id}/stream/`),
  
  // Get all approved tracks with pagination (public)
  getTracks: (page = 1, limit = 10) =>
    api.get(`/music/tracks/?page=${page}&limit=${limit}`),
  
  // Search tracks (public)
  searchTracks: (query, page = 1, limit = 10) =>
    api.get(`/music/tracks/?search=${query}&page=${page}&limit=${limit}`),
  
  // Get popular tracks (public)
  getPopularTracks: (page = 1, limit = 20) =>
    api.get(`/music/tracks/popular/?page=${page}&limit=${limit}`),
  
  // Get podcasts (public)
  getPodcasts: (page = 1, limit = 10) =>
    api.get(`/music/podcasts/?page=${page}&limit=${limit}`),
  
  // Get genres
  getGenres: (isPodcast = false) =>
    api.get(`/music/genres/?is_podcast=${isPodcast ? 'true' : 'false'}`),
}

// User endpoints
export const userAPI = {
  // User registration already handled by authAPI.signup
  // Add future endpoints here like:
  // getProfile: () => api.get('/auth/profile/'),
  // updateProfile: (data) => api.put('/auth/profile/', data),
}

export default api
