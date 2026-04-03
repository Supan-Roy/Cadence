import React, { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { userAPI } from './services/api'
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

function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [currentTrack, setCurrentTrack] = useState(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [playlist, setPlaylist] = useState([])
  const [currentTrackIndex, setCurrentTrackIndex] = useState(-1)

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
  }

  const handleTrackSelect = (track) => {
    setCurrentTrack(track)
    setIsPlaying(true)
    setCurrentTrackIndex(0)
    setPlaylist([track])
  }

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying)
  }

  const handleNext = () => {
    if (playlist.length > 0) {
      const nextIndex = (currentTrackIndex + 1) % playlist.length
      setCurrentTrackIndex(nextIndex)
      setCurrentTrack(playlist[nextIndex])
      setIsPlaying(true)
    }
  }

  const handlePrevious = () => {
    if (playlist.length > 0) {
      const prevIndex = currentTrackIndex === 0 ? playlist.length - 1 : currentTrackIndex - 1
      setCurrentTrackIndex(prevIndex)
      setCurrentTrack(playlist[prevIndex])
      setIsPlaying(true)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-bg flex items-center justify-center">
        <div className="text-center">
          <img src="/logo.svg" alt="Cadence Logo" className="w-20 h-20 mx-auto mb-6 animate-pulse" />
          <div className="w-16 h-16 border-4 border-dark-tertiary border-t-accent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading Cadence...</p>
        </div>
      </div>
    )
  }

  return (
    <Router>
      {user ? (
        <div className="flex flex-col h-screen bg-dark-bg overflow-hidden">
          {/* Navbar */}
          <Navbar user={user} onLogout={handleLogout} />

          {/* Main Content */}
          <div className="flex-1 min-h-0 px-3 pb-40 sm:pb-28 pt-3">
            <div className="grid h-full grid-cols-1 gap-3 lg:grid-cols-[300px,1fr]">
              <div className="hidden min-h-0 lg:block">
                <LibrarySidebar user={user} />
              </div>

              <div className="min-h-0 overflow-y-auto rounded-2xl border border-white/10 bg-[#0d1117]/75">
                <Routes>
                  <Route path="/" element={<Home user={user} onTrackSelect={handleTrackSelect} />} />
                  <Route
                    path="/profile"
                    element={<Profile user={user} onProfileUpdate={handleProfileUpdate} />}
                  />
                  <Route path="/upload" element={<Upload user={user} />} />
                  <Route path="/playlists/:playlistId" element={<PlaylistEditor user={user} onTrackSelect={handleTrackSelect} />} />
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
