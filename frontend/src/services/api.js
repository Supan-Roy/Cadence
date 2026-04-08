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
  
  signup: (email, password, role = 'listener', name = '') =>
    api.post('/auth/register/', { 
      email, 
      password,
      role,
      name,
    }),

  // Google OAuth endpoints
  getGoogleOAuthUrl: () =>
    api.get('/auth/google/'),
  
  handleGoogleOAuthCallback: (code, state) =>
    api.post('/auth/google/callback/', { code, state }),

  // Verify token is still valid
  verify: () => api.get('/token/verify/', { token: localStorage.getItem('access_token') }),

  // Email verification endpoints
  verifyEmail: (email, otp) =>
    api.post('/auth/verify-email/', { email, otp }),
  
  resendVerificationEmail: (email) =>
    api.post('/auth/resend-verification/', { email }),
  
  // Password reset endpoints
  requestPasswordReset: (email) =>
    api.post('/auth/password-reset/', { email }),
  
  confirmPasswordReset: (token, newPassword) =>
    api.post('/auth/password-reset-confirm/', { 
      token, 
      new_password: newPassword,
    }),
  
  // Account deletion endpoints
  requestAccountDeletion: (deletionReasons = '') =>
    api.post('/auth/delete-account/', { deletion_reasons: deletionReasons }),
  
  confirmAccountDeletion: (token) =>
    api.post('/auth/delete-account-confirm/', { token }),
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
  getPodcasts: (limit = 10, page = 1) =>
    api.get(`/music/podcasts/?page=${page}&limit=${limit}`),

  // Get latest release notifications (auth required)
  getLatestReleaseNotifications: (limit = 10) =>
    api.get(`/music/notifications/releases/?limit=${limit}`),
  
  // Get genres
  getGenres: (isPodcast = false) =>
    api.get(`/music/genres/?is_podcast=${isPodcast ? 'true' : 'false'}`),

  // Upload track/podcast (artist/admin)
  uploadTrack: (formData) =>
    api.post('/music/upload/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }),

  // Preview extracted metadata from audio file before upload
  extractUploadMetadata: (audioFile) => {
    const formData = new FormData()
    formData.append('audio_file', audioFile)
    return api.post('/music/upload/metadata/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
  },

  // Artist name suggestions
  getArtistSuggestions: (query = '') =>
    api.get(`/music/artists/suggest/?q=${encodeURIComponent(query)}`),

  // Album name suggestions
  getAlbumSuggestions: (query = '') =>
    api.get(`/music/albums/suggest/?q=${encodeURIComponent(query)}`),

  // Fetch lyrics for the currently playing track
  getCurrentTrackLyrics: (title, artist) =>
    api.get(`/music/lyrics/current/?title=${encodeURIComponent(title)}&artist=${encodeURIComponent(artist)}`),

  // Uploader-owned content management
  getMyUploads: () => api.get('/music/my-uploads/'),
  updateMyUpload: (trackId, data, isMultipart = false) => {
    if (isMultipart) {
      return api.patch(`/music/my-uploads/${trackId}/`, data, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })
    }

    return api.patch(`/music/my-uploads/${trackId}/`, data)
  },
  deleteMyUpload: (trackId) => api.delete(`/music/my-uploads/${trackId}/`),
}

// User endpoints
export const userAPI = {
  getProfile: () => api.get('/auth/profile/'),

  getDevices: () => api.get('/auth/devices/'),

  logoutDevice: (deviceId) => api.post(`/auth/devices/${deviceId}/logout/`),

  updateProfile: (data, isMultipart = false) => {
    if (isMultipart) {
      return api.patch('/auth/profile/', data, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })
    }

    return api.patch('/auth/profile/', data)
  },
}

// Playlist endpoints
export const playlistAPI = {
  getMyPlaylists: (trackId = null) =>
    api.get(trackId ? `/playlists/?track_id=${encodeURIComponent(trackId)}` : '/playlists/'),

  getPlaylistDetail: (playlistId, trackId = null) =>
    api.get(trackId ? `/playlists/${playlistId}/?track_id=${encodeURIComponent(trackId)}` : `/playlists/${playlistId}/`),

  createPlaylist: (name) =>
    api.post('/playlists/', { name }),

  updatePlaylist: (playlistId, data, isMultipart = false) => {
    if (isMultipart) {
      return api.patch(`/playlists/${playlistId}/`, data, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })
    }

    return api.patch(`/playlists/${playlistId}/`, data)
  },

  deletePlaylist: (playlistId) =>
    api.delete(`/playlists/${playlistId}/`),

  addTrackToPlaylist: (playlistId, trackId) =>
    api.post(`/playlists/${playlistId}/add-track/`, { track_id: trackId }),

  removeTrackFromPlaylist: (playlistId, trackId) =>
    api.post(`/playlists/${playlistId}/remove-track/`, { track_id: trackId }),
}

export default api
