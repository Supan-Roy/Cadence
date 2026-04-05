import React, { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { musicAPI } from '../services/api'

const NOTIFICATION_SEEN_KEY = 'cadence_last_seen_release_notification'

const getMediaUrl = (path) => {
  if (!path) return ''
  if (path.startsWith('http')) return path
  return `http://${window.location.hostname}:8000${path}`
}

const formatNotificationText = (item) => {
  const artist = item?.artist_name || 'Artist'
  const title = item?.release_name || 'Untitled'

  if (item?.type === 'album') {
    return {
      artist,
      verb: 'released album',
      title,
    }
  }

  if (item?.type === 'podcast') {
    return {
      artist,
      verb: 'released new podcast',
      title,
    }
  }

  return {
    artist,
    verb: 'released',
    title,
  }
}

const formatRelativeTime = (timestamp) => {
  if (!timestamp) return 'just now'

  const created = new Date(timestamp)
  const diffMs = Date.now() - created.getTime()
  if (Number.isNaN(diffMs) || diffMs < 0) return 'just now'

  const minutes = Math.floor(diffMs / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`

  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`

  return created.toLocaleDateString()
}

function Navbar({ user, onLogout }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [notifications, setNotifications] = useState([])
  const [notificationsLoading, setNotificationsLoading] = useState(false)
  const [notificationsError, setNotificationsError] = useState('')
  const [hasUnreadNotifications, setHasUnreadNotifications] = useState(false)
  const menuContainerRef = useRef(null)
  const liveSearchTimerRef = useRef(null)

  const getLatestNotificationId = (items) => {
    if (!Array.isArray(items) || items.length === 0) return ''
    return items[0]?.id || ''
  }

  const markNotificationsAsSeen = (latestId) => {
    if (!latestId) return
    localStorage.setItem(NOTIFICATION_SEEN_KEY, latestId)
    setHasUnreadNotifications(false)
  }

  const updateUnreadState = (items, markSeen = false) => {
    const latestId = getLatestNotificationId(items)
    if (!latestId) {
      setHasUnreadNotifications(false)
      return
    }

    if (markSeen) {
      markNotificationsAsSeen(latestId)
      return
    }

    const seenId = localStorage.getItem(NOTIFICATION_SEEN_KEY) || ''
    setHasUnreadNotifications(seenId !== latestId)
  }

  const fetchNotifications = async ({ showLoader = false, markSeen = false } = {}) => {
    if (showLoader) {
      setNotificationsLoading(true)
    }
    setNotificationsError('')

    try {
      const response = await musicAPI.getLatestReleaseNotifications(10)
      const items = Array.isArray(response.data) ? response.data : []
      setNotifications(items)
      updateUnreadState(items, markSeen)
    } catch {
      setNotificationsError('Failed to load notifications')
    } finally {
      if (showLoader) {
        setNotificationsLoading(false)
      }
    }
  }

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    setSearchTerm(params.get('q') || '')
  }, [location.search])

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (!menuContainerRef.current) return
      if (!menuContainerRef.current.contains(event.target)) {
        setIsMenuOpen(false)
        setIsNotificationsOpen(false)
      }
    }

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setIsMenuOpen(false)
        setIsNotificationsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleOutsideClick)
    document.addEventListener('keydown', handleEscape)

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [])

  const handleLogout = () => {
    onLogout()
    navigate('/login')
  }

  const handleSearchSubmit = (event) => {
    event.preventDefault()
    const query = searchTerm.trim()
    navigate(query ? `/?q=${encodeURIComponent(query)}` : '/', { replace: true })
  }

  useEffect(() => {
    if (location.pathname !== '/') {
      return () => {}
    }

    if (liveSearchTimerRef.current) {
      clearTimeout(liveSearchTimerRef.current)
    }

    liveSearchTimerRef.current = setTimeout(() => {
      const query = searchTerm.trim()
      const currentQuery = new URLSearchParams(location.search).get('q') || ''
      const nextPath = query ? `/?q=${encodeURIComponent(query)}` : '/'

      if (query !== currentQuery) {
        navigate(nextPath, { replace: true })
      }
    }, 250)

    return () => {
      if (liveSearchTimerRef.current) {
        clearTimeout(liveSearchTimerRef.current)
      }
    }
  }, [searchTerm, navigate, location.pathname, location.search])

  useEffect(() => {
    if (!user) return () => {}

    fetchNotifications({ showLoader: false, markSeen: false })

    const intervalId = setInterval(() => {
      fetchNotifications({ showLoader: false, markSeen: false })
    }, 60000)

    return () => {
      clearInterval(intervalId)
    }
  }, [user])

  const displayName = user?.displayName || user?.username || 'Profile'
  const avatar = user?.profileImage
  const canUpload = user?.role === 'admin' || user?.role === 'artist'

  const handleNotificationToggle = () => {
    const nextOpen = !isNotificationsOpen
    setIsNotificationsOpen(nextOpen)
    setIsMenuOpen(false)

    if (nextOpen) {
      const currentLatestId = getLatestNotificationId(notifications)
      markNotificationsAsSeen(currentLatestId)
      fetchNotifications({ showLoader: true, markSeen: true })
    }
  }

  const handleNotificationClick = (item) => {
    if (item?.target_type === 'album' && item?.target_album_name) {
      navigate(`/albums/${encodeURIComponent(item.target_album_name)}`)
      setIsNotificationsOpen(false)
      return
    }

    if (item?.target_type === 'track' && item?.target_track_id) {
      navigate(`/tracks/${item.target_track_id}`)
      setIsNotificationsOpen(false)
    }
  }

  return (
    <nav className="sticky top-0 z-50 border-b border-white/5 bg-[#0b0b0b]/95 px-3 py-3 backdrop-blur-xl">
      <div className="grid grid-cols-[auto,1fr,auto] items-center gap-3 px-0 md:px-1">
        <div
          className="flex shrink-0 cursor-pointer items-center gap-2"
          onClick={() => navigate('/')}
          role="button"
          tabIndex={0}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault()
              navigate('/')
            }
          }}
        >
          <img src="/logo.svg" alt="Cadence Logo" draggable={false} className="brand-lock h-8 w-8 rounded-full" />
          <h1 className="brand-lock text-lg font-semibold text-white">Cadence</h1>
        </div>

        <form onSubmit={handleSearchSubmit} className="hidden md:block">
          <div className="mx-auto flex w-full max-w-[460px] items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-white/80 transition focus-within:border-white/20 focus-within:bg-white/10">
            <svg className="h-4 w-4 shrink-0 text-white/70" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" strokeLinecap="round" />
            </svg>
            <input
              type="text"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search songs, podcasts and artists"
              className="w-full bg-transparent text-sm text-white placeholder:text-white/50 focus:outline-none"
            />
          </div>
        </form>

        <div ref={menuContainerRef} className="relative ml-auto flex items-center gap-2">
          {canUpload && (
            <button
              type="button"
              onClick={() => navigate('/upload')}
              className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-black transition hover:bg-gray-100"
            >
              Upload
            </button>
          )}

          <div className="relative">
            <button
              type="button"
              title="Notifications"
              onClick={handleNotificationToggle}
              className="relative flex h-9 w-9 items-center justify-center rounded-full bg-white/5 text-white/80 transition hover:bg-white/10"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M15 17h5l-1.4-1.4a2 2 0 0 1-.6-1.4V11a6 6 0 1 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M9.5 17a2.5 2.5 0 0 0 5 0" strokeLinecap="round" />
              </svg>
              {hasUnreadNotifications && (
                <span className="absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-[#0b0b0b]" />
              )}
            </button>

            {isNotificationsOpen && (
              <div className="fixed left-1/2 top-[4.5rem] z-50 w-[92vw] max-w-[420px] -translate-x-1/2 overflow-hidden border border-white/10 bg-[#121212] shadow-[0_20px_40px_rgba(0,0,0,0.45)] sm:absolute sm:left-auto sm:right-0 sm:top-full sm:mt-2 sm:w-[360px] sm:max-w-[360px] sm:translate-x-0">
                <div className="border-b border-white/10 px-4 py-3">
                  <p className="text-sm font-semibold text-white">Notifications</p>
                  <p className="text-xs text-white/50">Latest releases</p>
                </div>

                {notificationsLoading ? (
                  <div className="px-4 py-6 text-center text-sm text-white/60">Loading notifications...</div>
                ) : notificationsError ? (
                  <div className="px-4 py-6 text-center text-sm text-red-300">{notificationsError}</div>
                ) : notifications.length === 0 ? (
                  <div className="px-4 py-6 text-center text-sm text-white/50">No release notifications yet.</div>
                ) : (
                  <div className="max-h-[340px] overflow-y-auto sm:max-h-[420px]">
                    {notifications.map((item) => {
                      const coverImage = getMediaUrl(item.cover_image)
                      const text = formatNotificationText(item)

                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => handleNotificationClick(item)}
                          className="flex w-full items-center gap-3 border-b border-white/5 px-4 py-3 text-left transition hover:bg-white/5 last:border-b-0"
                        >
                          <div className="h-11 w-11 shrink-0 overflow-hidden rounded-md bg-white/10">
                            {coverImage ? (
                              <img src={coverImage} alt={item.release_name || 'Release cover'} className="h-full w-full object-cover" />
                            ) : (
                              <img src="/Cadence Playlist.png" alt="Release cover" className="h-full w-full object-cover" />
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <p className="line-clamp-2 text-xs leading-5 text-white/90">
                              <span className="font-semibold text-white">{text.artist}</span>{' '}
                              <span>{text.verb}</span>{' '}
                              <span className="font-semibold text-white">{text.title}</span>
                            </p>
                            <p className="mt-1 text-[11px] uppercase tracking-[0.12em] text-white/45">{formatRelativeTime(item.created_at)}</p>
                          </div>

                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          <button
            onClick={() => {
              setIsMenuOpen(!isMenuOpen)
              setIsNotificationsOpen(false)
            }}
            className="flex items-center gap-2 rounded-full bg-white/5 px-2 py-1 pr-3 transition hover:bg-white/10"
            aria-expanded={isMenuOpen}
            aria-haspopup="menu"
          >
            <div className="h-8 w-8 overflow-hidden rounded-full bg-gradient-to-br from-accent to-accent/50 flex items-center justify-center">
              {avatar ? (
                <img src={avatar} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <svg className="w-4 h-4 text-white fill-current" viewBox="0 0 24 24">
                  <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                </svg>
              )}
            </div>
            <div className="hidden text-left sm:block">
              <p className="text-xs font-semibold text-white">
                {displayName}
              </p>
            </div>
          </button>

          {/* Dropdown Menu */}
          {isMenuOpen && (
            <div className="absolute right-0 top-full z-50 mt-2 w-56 overflow-hidden bg-[#121212] shadow-[0_20px_40px_rgba(0,0,0,0.45)]">
              <div className="border-b border-white/5 px-4 py-3">
                <p className="text-sm font-semibold text-white">
                  {displayName}
                </p>
                <p className="text-xs text-gray-400">
                  {user?.email || 'user@cadence.music'}
                </p>
              </div>
              <button
                onClick={() => {
                  setIsMenuOpen(false)
                  navigate('/profile')
                }}
                className="w-full px-4 py-3 text-left text-sm text-gray-300 transition-colors hover:bg-white/10 hover:text-white"
              >
                Profile Settings
              </button>
              <button
                onClick={handleLogout}
                className="w-full px-4 py-3 text-left text-sm text-gray-300 transition-colors hover:bg-white/10 hover:text-white"
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  )
}

export default Navbar
