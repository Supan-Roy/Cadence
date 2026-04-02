import React, { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { authAPI } from './services/api'
import Navbar from './components/Navbar'
import PlayerBar from './components/PlayerBar'
import Login from './pages/Login'
import Home from './pages/Home'

function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [currentTrack, setCurrentTrack] = useState(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [playlist, setPlaylist] = useState([])
  const [currentTrackIndex, setCurrentTrackIndex] = useState(-1)

  // Check if user is authenticated
  useEffect(() => {
    // Just restore from localStorage on refresh
    const token = localStorage.getItem('access_token')
    const userEmail = localStorage.getItem('user_email')
    
    if (token && userEmail) {
      setUser({ email: userEmail })
    }
    
    setLoading(false)
  }, [])

  const handleLogin = (userData) => {
    setUser(userData)
  }

  const handleLogout = () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('user_email')
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
          <div className="flex-1 overflow-y-auto">
            <Routes>
              <Route path="/" element={<Home onTrackSelect={handleTrackSelect} />} />
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </div>

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
