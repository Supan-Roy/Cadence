import React, { useState, useEffect, useRef } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { playlistAPI, userAPI } from './services/api'
import Navbar from './components/Navbar'
import LibrarySidebar from './components/LibrarySidebar'
import PlayerBar from './components/PlayerBar'
import MobileNav from './components/MobileNav'
import Login from './pages/Login'
import Home from './pages/Home'
import Profile from './pages/Profile'
import Upload from './pages/Upload'
import PlaylistEditor from './pages/PlaylistEditor'
import MySpace from './pages/MySpace'
import SearchPage from './pages/SearchPage'
import AlbumDetail from './pages/AlbumDetail'
import { imageProtectionProps } from './utils/imageProtection'

function App() {
  const SIDEBAR_MIN_WIDTH = 280
  const SIDEBAR_MAX_WIDTH = 520
  const PLAYER_STATE_KEY_PREFIX = 'cadence_player_state'
  const BACKEND_ORIGIN = `http://${window.location.hostname}:8000`
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [currentTrack, setCurrentTrack] = useState(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [playlist, setPlaylist] = useState([])
  const [currentTrackIndex, setCurrentTrackIndex] = useState(-1)
  const [sidebarPlaylists, setSidebarPlaylists] = useState([])
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const raw = localStorage.getItem('sidebar_width')
    const parsed = Number(raw)
    if (!Number.isFinite(parsed)) return 360
    return Math.min(SIDEBAR_MAX_WIDTH, Math.max(SIDEBAR_MIN_WIDTH, parsed))
  })
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => localStorage.getItem('sidebar_collapsed') === '1')
  const [isResizingSidebar, setIsResizingSidebar] = useState(false)
  const restoredPlayerStateRef = useRef(false)

  const getPlayerStateStorageKey = (email) => `${PLAYER_STATE_KEY_PREFIX}:${email || 'anonymous'}`

  // Check if user is authenticated
  useEffect(() => {
    // Restore auth and fetch canonical profile from backend for cross-device consistency
    const token = localStorage.getItem('access_token')
    const userEmail = localStorage.getItem('user_email')
    const userRole = localStorage.getItem('user_role')
    const userName = localStorage.getItem('user_name')
    const storedDisplayName = localStorage.getItem('user_display_name')
    const storedProfileImage = localStorage.getItem('user_profile_image')
    
    const restoreFromLocal = () => {
      if (!token || !userEmail) return

      setUser({
        email: userEmail,
        role: userRole || 'listener',
        name: userName || '',
        displayName: storedDisplayName || userName || '',
        profileImage: storedProfileImage || '',
      })
    }

    const bootstrap = async () => {
      if (!token) {
        setLoading(false)
        return
      }

      try {
        const response = await userAPI.getProfile()
        const profile = response.data || {}

        const nextUser = {
          email: profile.email || userEmail || '',
          role: profile.role || userRole || 'listener',
          name: profile.name || '',
          displayName: profile.name || storedDisplayName || '',
          profileImage: profile.profile_image || storedProfileImage || '',
        }

        localStorage.setItem('user_email', nextUser.email)
        localStorage.setItem('user_role', nextUser.role)
        localStorage.setItem('user_name', nextUser.name || '')
        localStorage.setItem('user_display_name', nextUser.displayName || '')
        localStorage.setItem('user_profile_image', nextUser.profileImage || '')

        setUser(nextUser)
      } catch (err) {
        restoreFromLocal()
      } finally {
        setLoading(false)
      }
    }

    bootstrap()
  }, [])

  const handleLogin = (userData) => {
    const enrichedUser = {
      ...userData,
      role: userData?.role || localStorage.getItem('user_role') || 'listener',
      name: userData?.name || localStorage.getItem('user_name') || '',
      displayName: localStorage.getItem('user_display_name') || userData?.displayName || '',
      profileImage: localStorage.getItem('user_profile_image') || userData?.profileImage || '',
    }
    localStorage.setItem('user_role', enrichedUser.role)
    localStorage.setItem('user_name', enrichedUser.name || '')
    setUser(enrichedUser)
  }

  const handleProfileUpdate = (updates) => {
    setUser((prevUser) => {
      const safePrev = prevUser || {}
      const nextUser = { ...safePrev, ...updates }
      if (typeof nextUser.displayName === 'string') {
        localStorage.setItem('user_display_name', nextUser.displayName)
      }
      if (typeof nextUser.profileImage === 'string') {
        localStorage.setItem('user_profile_image', nextUser.profileImage)
      }
      if (typeof nextUser.role === 'string') {
        localStorage.setItem('user_role', nextUser.role)
      }
      if (typeof nextUser.name === 'string') {
        localStorage.setItem('user_name', nextUser.name)
      }
      return nextUser
    })
  }

  const handleLogout = () => {
    if (user?.email) {
      localStorage.removeItem(getPlayerStateStorageKey(user.email))
    }
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('user_email')
    localStorage.removeItem('user_role')
    localStorage.removeItem('user_name')
    localStorage.removeItem('user_display_name')
    localStorage.removeItem('user_profile_image')
    setUser(null)
    setCurrentTrack(null)
    setIsPlaying(false)
    setPlaylist([])
    setCurrentTrackIndex(-1)
    restoredPlayerStateRef.current = false
  }

  const handleTrackSelect = (track) => {
    setCurrentTrack(track)
    setIsPlaying(true)
    setCurrentTrackIndex(0)
    setPlaylist([track])
  }

  const handlePlayPlaylistQueue = (tracks) => {
    const queue = Array.isArray(tracks) ? tracks.filter(Boolean) : []
    if (queue.length === 0) return

    setPlaylist(queue)
    setCurrentTrackIndex(0)
    setCurrentTrack(queue[0])
    setIsPlaying(true)
  }

  const handleAddPlaylistToQueue = (tracks) => {
    const incoming = Array.isArray(tracks) ? tracks.filter(Boolean) : []
    if (incoming.length === 0) return

    setPlaylist((prev) => {
      const current = Array.isArray(prev) ? prev : []
      const currentIds = new Set(current.map((t) => t?.id).filter(Boolean))
      const toAppend = incoming.filter((t) => !t?.id || !currentIds.has(t.id))
      const nextQueue = [...current, ...toAppend]

      if (!currentTrack && nextQueue.length > 0) {
        setCurrentTrack(nextQueue[0])
        setCurrentTrackIndex(0)
        setIsPlaying(true)
      }

      return nextQueue
    })
  }

  const handlePlayPause = () => {
    setIsPlaying((value) => !value)
  }

  const handleNext = () => {
    if (playlist.length === 0) return

    setCurrentTrackIndex((prevIndex) => {
      const safeCurrentIndex = prevIndex >= 0 ? prevIndex : 0
      const nextIndex = (safeCurrentIndex + 1) % playlist.length
      setCurrentTrack(playlist[nextIndex])
      return nextIndex
    })
    setIsPlaying(true)
  }

  const handlePrevious = () => {
    if (playlist.length === 0) return

    setCurrentTrackIndex((prevIndex) => {
      const safeCurrentIndex = prevIndex >= 0 ? prevIndex : 0
      const prevTrackIndex = safeCurrentIndex === 0 ? playlist.length - 1 : safeCurrentIndex - 1
      setCurrentTrack(playlist[prevTrackIndex])
      return prevTrackIndex
    })
    setIsPlaying(true)
  }

  useEffect(() => {
    const isTypingTarget = (target) => {
      if (!(target instanceof HTMLElement)) return false
      const tagName = target.tagName?.toLowerCase()
      if (tagName === 'input' || tagName === 'textarea' || tagName === 'select') return true
      return target.isContentEditable
    }

    const handleGlobalPlayerKeydown = (event) => {
      if (!user || !currentTrack || isTypingTarget(event.target) || event.defaultPrevented) return
      if (event.repeat) return

      if (event.code === 'Space' || event.key === ' ') {
        event.preventDefault()
        handlePlayPause()
        return
      }

      if (event.key === 'ArrowRight' || event.key === 'MediaTrackNext') {
        event.preventDefault()
        handleNext()
        return
      }

      if (event.key === 'ArrowLeft' || event.key === 'MediaTrackPrevious') {
        event.preventDefault()
        handlePrevious()
      }
    }

    window.addEventListener('keydown', handleGlobalPlayerKeydown)
    return () => window.removeEventListener('keydown', handleGlobalPlayerKeydown)
  }, [user, currentTrack, handlePlayPause, handleNext, handlePrevious])

  const loadSidebarPlaylists = async () => {
    try {
      const response = await playlistAPI.getMyPlaylists()
      const items = Array.isArray(response.data) ? response.data : response.data?.results || []
      const rawPinned = localStorage.getItem('pinned_playlist_ids') || '[]'
      let pinnedIds = []
      try {
        pinnedIds = JSON.parse(rawPinned)
      } catch {
        pinnedIds = []
      }

      const pinnedSet = new Set(Array.isArray(pinnedIds) ? pinnedIds : [])
      const sorted = [...items].sort((a, b) => {
        const aPinned = pinnedSet.has(a.id)
        const bPinned = pinnedSet.has(b.id)
        if (aPinned === bPinned) return 0
        return aPinned ? -1 : 1
      })

      setSidebarPlaylists(sorted)
    } catch (err) {
      setSidebarPlaylists([])
    }
  }

  const getPlaylistCoverUrl = (coverPath) => {
    if (!coverPath) return '/Cadence Playlist.png'
    if (coverPath.startsWith('http')) return coverPath
    return `${BACKEND_ORIGIN}${coverPath}`
  }

  useEffect(() => {
    localStorage.setItem('sidebar_width', String(Math.round(sidebarWidth)))
  }, [sidebarWidth])

  useEffect(() => {
    localStorage.setItem('sidebar_collapsed', sidebarCollapsed ? '1' : '0')
  }, [sidebarCollapsed])

  useEffect(() => {
    if (!user) return
    loadSidebarPlaylists()
  }, [user?.email, sidebarCollapsed])

  useEffect(() => {
    if (!user?.email || restoredPlayerStateRef.current) return

    const raw = localStorage.getItem(getPlayerStateStorageKey(user.email))
    if (!raw) {
      restoredPlayerStateRef.current = true
      return
    }

    try {
      const parsed = JSON.parse(raw)
      const storedTrack = parsed?.currentTrack || null
      const storedQueue = Array.isArray(parsed?.playlist) ? parsed.playlist.filter(Boolean) : []
      const storedIndex = Number.isInteger(parsed?.currentTrackIndex) ? parsed.currentTrackIndex : -1

      if (storedTrack) {
        setCurrentTrack(storedTrack)

        if (storedQueue.length > 0) {
          setPlaylist(storedQueue)
          const safeIndex = storedIndex >= 0 && storedIndex < storedQueue.length ? storedIndex : 0
          setCurrentTrackIndex(safeIndex)
          if (!storedQueue[safeIndex]?.id || storedQueue[safeIndex]?.id !== storedTrack?.id) {
            const fallbackIndex = storedQueue.findIndex((item) => item?.id && item.id === storedTrack?.id)
            if (fallbackIndex >= 0) {
              setCurrentTrackIndex(fallbackIndex)
            }
          }
        } else {
          setPlaylist([storedTrack])
          setCurrentTrackIndex(0)
        }
      }
    } catch {
      localStorage.removeItem(getPlayerStateStorageKey(user.email))
    } finally {
      restoredPlayerStateRef.current = true
    }
  }, [user?.email])

  useEffect(() => {
    if (!user?.email || !restoredPlayerStateRef.current) return

    const storageKey = getPlayerStateStorageKey(user.email)
    if (!currentTrack) {
      localStorage.removeItem(storageKey)
      return
    }

    const payload = {
      currentTrack,
      playlist,
      currentTrackIndex,
      updatedAt: Date.now(),
    }
    localStorage.setItem(storageKey, JSON.stringify(payload))
  }, [user?.email, currentTrack, playlist, currentTrackIndex])

  useEffect(() => {
    if (!isResizingSidebar) return

    const handleMouseMove = (event) => {
      const viewportWidth = window.innerWidth
      const rightPadding = 120
      const maxAllowed = Math.max(SIDEBAR_MIN_WIDTH, Math.min(SIDEBAR_MAX_WIDTH, viewportWidth - rightPadding))
      const next = Math.max(SIDEBAR_MIN_WIDTH, Math.min(maxAllowed, event.clientX - 20))
      setSidebarWidth(next)
    }

    const stopResize = () => {
      setIsResizingSidebar(false)
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', stopResize)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', stopResize)
    }
  }, [isResizingSidebar])

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-bg flex items-center justify-center">
        <div className="text-center">
          <img src="/logo.svg" alt="Cadence Logo" className="w-20 h-20 mx-auto mb-6 rounded-full animate-pulse" />
          <div className="w-16 h-16 border-4 border-dark-tertiary border-t-accent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading Cadence...</p>
        </div>
      </div>
    )
  }

  const collapsedHasThumbs = sidebarCollapsed && sidebarPlaylists.length > 0
  const sidebarColumnWidth = sidebarCollapsed ? (collapsedHasThumbs ? 88 : 0) : sidebarWidth

  return (
    <Router>
      {user ? (
        <div className="flex h-screen flex-col overflow-hidden bg-[#000] text-white">
          {/* Navbar */}
          <Navbar user={user} onLogout={handleLogout} />

          {/* Main Content */}
          <div className={`flex-1 min-h-0 px-0 sm:px-4 lg:px-5 pt-0 sm:pt-3 ${currentTrack ? 'pb-40 sm:pb-28' : 'pb-20 sm:pb-6'}`}>
            <div
              className={`grid h-full grid-cols-1 lg:[grid-template-columns:var(--layout-cols)] ${sidebarCollapsed && !collapsedHasThumbs ? 'gap-0' : 'gap-0 sm:gap-4'}`}
              style={{
                '--layout-cols': `${Math.round(sidebarColumnWidth)}px minmax(0,1fr)`,
              }}
            >
              <div className="relative hidden min-h-0 lg:block">
                {sidebarCollapsed ? (
                  collapsedHasThumbs ? (
                    <div className="flex h-full flex-col items-center bg-[#121212] p-2 shadow-[0_10px_30px_rgba(0,0,0,0.3)]">
                      <button
                        type="button"
                        onClick={() => setSidebarCollapsed(false)}
                        className="mb-2 flex h-8 w-8 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white transition hover:bg-white/20"
                        title="Expand library"
                      >
                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="m8 5 8 7-8 7" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </button>

                      <div className="hide-horizontal-scrollbar flex w-full flex-1 flex-col items-center gap-2 overflow-y-auto pb-1">
                        {sidebarPlaylists.slice(0, 8).map((playlistItem) => (
                          <img
                            key={playlistItem.id}
                            src={getPlaylistCoverUrl(playlistItem.cover_image)}
                            alt={playlistItem.name}
                            title={playlistItem.name}
                            className="h-12 w-12 rounded-lg object-cover ring-1 ring-white/15"
                            {...imageProtectionProps}
                          />
                        ))}
                      </div>
                    </div>
                  ) : null
                ) : (
                  <>
                    <LibrarySidebar user={user} />
                    <button
                      type="button"
                      onClick={() => setSidebarCollapsed(true)}
                      className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full border border-white/20 bg-black/35 text-white backdrop-blur transition hover:bg-black/60"
                      title="Collapse library"
                    >
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="m16 5-8 7 8 7" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onMouseDown={() => setIsResizingSidebar(true)}
                      className="absolute -right-2 top-0 h-full w-3 cursor-col-resize bg-transparent"
                      title="Resize library"
                      aria-label="Resize library"
                    />
                  </>
                )}
              </div>

              {sidebarCollapsed && !collapsedHasThumbs && (
                <button
                  type="button"
                  onClick={() => setSidebarCollapsed(false)}
                  className="fixed left-3 top-[92px] z-30 hidden h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-black/45 text-white backdrop-blur transition hover:bg-black/65 lg:flex"
                  title="Open library"
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="m8 5 8 7-8 7" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              )}

              <div className="min-h-0 overflow-y-auto bg-[#121212]">
                <Routes>
                  <Route path="/" element={<Home user={user} onTrackSelect={handleTrackSelect} />} />
                  <Route
                    path="/profile"
                    element={<Profile user={user} onProfileUpdate={handleProfileUpdate} />}
                  />
                  <Route path="/upload" element={<Upload user={user} />} />
                  <Route
                    path="/playlists/:playlistId"
                    element={
                      <PlaylistEditor
                        user={user}
                        onTrackSelect={handleTrackSelect}
                        onPlayPlaylist={handlePlayPlaylistQueue}
                        onAddPlaylistToQueue={handleAddPlaylistToQueue}
                      />
                    }
                  />
                  <Route
                    path="/albums/:albumName"
                    element={
                      <AlbumDetail
                        onTrackSelect={handleTrackSelect}
                        onPlayPlaylist={handlePlayPlaylistQueue}
                        onAddPlaylistToQueue={handleAddPlaylistToQueue}
                      />
                    }
                  />
                  <Route path="/my-space" element={<MySpace user={user} onTrackSelect={handleTrackSelect} />} />
                  <Route path="/search" element={<SearchPage onTrackSelect={handleTrackSelect} />} />
                  <Route path="*" element={<Navigate to="/" />} />
                </Routes>
              </div>
            </div>
          </div>

          {/* Mobile Navigation (shows below player on small screens) */}
          <MobileNav />

          {/* Player Bar */}
          <PlayerBar
            track={currentTrack}
            isPlaying={isPlaying}
            queue={playlist}
            currentTrackIndex={currentTrackIndex}
            onPlayPause={handlePlayPause}
            onNext={handleNext}
            onPrevious={handlePrevious}
          />
        </div>
      ) : (
        <Routes>
          <Route path="/login" element={<Login onLogin={handleLogin} />} />
          <Route path="*" element={<Navigate to="/login" />} />
        </Routes>
      )}
    </Router>
  )
}

export default App
