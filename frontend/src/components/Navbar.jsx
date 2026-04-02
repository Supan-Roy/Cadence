import React, { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

function Navbar({ user, onLogout }) {
  const navigate = useNavigate()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const menuContainerRef = useRef(null)

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (!menuContainerRef.current) return
      if (!menuContainerRef.current.contains(event.target)) {
        setIsMenuOpen(false)
      }
    }

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setIsMenuOpen(false)
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

  const displayName = user?.displayName || user?.username || 'Profile'
  const avatar = user?.profileImage
  const canUpload = user?.role === 'admin' || user?.role === 'artist'

  return (
    <nav className="sticky top-0 z-50 bg-dark-secondary bg-opacity-95 backdrop-blur border-b border-dark-tertiary">
      <div className="px-8 py-4 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
          <img src="/logo.svg" alt="Cadence Logo" className="w-10 h-10" />
          <h1 className="text-2xl font-bold text-white">Cadence</h1>
        </div>

        {/* Right Section: Profile */}
        <div ref={menuContainerRef} className="relative flex items-center gap-2">
          {canUpload && (
            <button
              type="button"
              onClick={() => navigate('/upload')}
              className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
            >
              Upload
            </button>
          )}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="flex items-center gap-3 hover:bg-dark-tertiary px-4 py-2 rounded-lg transition-colors"
            aria-expanded={isMenuOpen}
            aria-haspopup="menu"
          >
            <div className="w-10 h-10 bg-gradient-to-br from-accent to-accent/50 rounded-full flex items-center justify-center overflow-hidden">
              {avatar ? (
                <img src={avatar} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <svg className="w-5 h-5 text-white fill-current" viewBox="0 0 24 24">
                  <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                </svg>
              )}
            </div>
            <div className="text-left hidden sm:block">
              <p className="text-sm font-semibold text-white">
                {displayName}
              </p>
              <p className="text-xs text-gray-400">
                {user?.email || 'User'}
              </p>
            </div>
          </button>

          {/* Dropdown Menu */}
          {isMenuOpen && (
            <div className="absolute right-0 top-full z-50 mt-2 w-56 bg-dark-secondary border border-dark-tertiary rounded-lg shadow-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-dark-tertiary">
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
                className="w-full text-left px-4 py-3 text-sm text-gray-300 hover:bg-dark-tertiary hover:text-white transition-colors"
              >
                Profile Settings
              </button>
              <button
                onClick={handleLogout}
                className="w-full text-left px-4 py-3 text-sm text-gray-300 hover:bg-dark-tertiary hover:text-white transition-colors"
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
