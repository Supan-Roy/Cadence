/**
 * Application configuration constants
 */

// API Configuration
export const API_CONFIG = {
  BASE_URL: import.meta.env.VITE_API_BASE_URL || `http://${window.location.hostname}:8000/api`,
  TIMEOUT: 30000, // 30 seconds
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000, // 1 second
}

// App Configuration
export const APP_CONFIG = {
  NAME: 'Cadence',
  VERSION: '0.1.0',
  ENVIRONMENT: import.meta.env.MODE || 'development',
}

// Pagination
export const PAGINATION = {
  DEFAULT_LIMIT: 20,
  DEFAULT_PAGE: 1,
  PAGE_SIZES: [10, 20, 50],
}

// Cache Durations (in milliseconds)
export const CACHE_DURATION = {
  SHORT: 1 * 60 * 1000,      // 1 minute
  MEDIUM: 5 * 60 * 1000,     // 5 minutes
  LONG: 30 * 60 * 1000,      // 30 minutes
  VERY_LONG: 24 * 60 * 60 * 1000, // 24 hours
}

// Storage Keys
export const STORAGE_KEYS = {
  ACCESS_TOKEN: 'access_token',
  REFRESH_TOKEN: 'refresh_token',
  USER_EMAIL: 'user_email',
  USER_DATA: 'user_data',
  APP_PREFERENCES: 'app_preferences',
  RECENTLY_PLAYED: 'recently_played',
}

// API Endpoints
export const API_ENDPOINTS = {
  // Auth
  LOGIN: '/token/',
  REGISTER: '/auth/register/',
  REFRESH: '/token/refresh/',
  VERIFY: '/token/verify/',

  // Music
  TRACKS: '/music/tracks/',
  TRENDING: '/music/tracks/trending/',
  POPULAR: '/music/tracks/popular/',
  RECOMMENDATIONS: '/music/recommend/',
  RECENT: '/music/recent/',
  SEARCH: '/music/tracks/',

  // Podcasts
  PODCASTS: '/music/podcasts/',

  // Genres
  GENRES: '/music/genres/',

  // Moderation (admin)
  MODERATION_PENDING: '/music/moderation/pending/',
  MODERATION_APPROVE: '/music/moderation/{id}/approve/',
  MODERATION_REJECT: '/music/moderation/{id}/reject/',
}

// Error Messages
export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Network error. Please check your connection.',
  UNAUTHORIZED: 'Your session has expired. Please log in again.',
  FORBIDDEN: 'You do not have permission to perform this action.',
  NOT_FOUND: 'The resource you requested was not found.',
  SERVER_ERROR: 'Server error. Please try again later.',
  UNKNOWN_ERROR: 'An unexpected error occurred.',
}

// Success Messages
export const SUCCESS_MESSAGES = {
  LOGIN_SUCCESS: 'Logged in successfully!',
  SIGNUP_SUCCESS: 'Account created successfully!',
  LOGOUT_SUCCESS: 'Logged out successfully.',
  OPERATION_SUCCESS: 'Operation completed successfully.',
}

// UI Colors
export const COLORS = {
  DARK_BG: '#0f0f0f',
  DARK_SECONDARY: '#1a1a1a',
  DARK_TERTIARY: '#282828',
  ACCENT: '#1db954',
  TEXT_PRIMARY: '#ffffff',
  TEXT_SECONDARY: '#b3b3b3',
  TEXT_TERTIARY: '#787878',
  ERROR: '#ff4444',
  SUCCESS: '#1db954',
  WARNING: '#ffaa00',
}

// Breakpoints
export const BREAKPOINTS = {
  MOBILE: 640,
  TABLET: 768,
  DESKTOP: 1024,
  WIDE: 1280,
}

// Audio Configuration
export const AUDIO_CONFIG = {
  SUPPORTED_FORMATS: ['audio/mpeg', 'audio/ogg', 'audio/wav', 'audio/webm'],
  DEFAULT_VOLUME: 100,
  MIN_DURATION_THRESHOLD: 1000, // 1 second
}

// Throttle Limits
export const THROTTLE_LIMITS = {
  USER_RATE: '100/minute',
  ANONYMOUS_RATE: '20/minute',
  STREAM_RATE: 'unlimited', // Custom rate limiting for streams
}

// Validation Rules
export const VALIDATION = {
  PASSWORD_MIN_LENGTH: 8,
  EMAIL_PATTERN: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  TRACK_TITLE_MAX_LENGTH: 255,
  DESCRIPTION_MAX_LENGTH: 5000,
}

// Feature Flags
export const FEATURES = {
  OFFLINE_MODE: false,
  PWA_ENABLED: false,
  ANALYTICS_ENABLED: false,
  DARK_MODE_ONLY: true,
}

// Logging Configuration
export const LOG_CONFIG = {
  ENABLED: true,
  LEVEL: import.meta.env.MODE === 'production' ? 'warn' : 'debug',
  CONSOLE: true,
}

export default {
  API_CONFIG,
  APP_CONFIG,
  PAGINATION,
  CACHE_DURATION,
  STORAGE_KEYS,
  API_ENDPOINTS,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  COLORS,
  BREAKPOINTS,
  AUDIO_CONFIG,
  THROTTLE_LIMITS,
  VALIDATION,
  FEATURES,
  LOG_CONFIG,
}
