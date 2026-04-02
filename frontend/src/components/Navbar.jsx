import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'

function Navbar({ user, onLogout }) {
  const navigate = useNavigate()
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const handleLogout = () => {
    onLogout()
    navigate('/login')
  }

  return (
    <nav className="sticky top-0 z-50 bg-dark-secondary bg-opacity-95 backdrop-blur border-b border-dark-tertiary">
      <div className="px-8 py-4 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
          <img src="/logo.svg" alt="Cadence Logo" className="w-10 h-10" />
          <h1 className="text-2xl font-bold text-white">Cadence</h1>
        </div>

        {/* Right Section: Profile */}
        <div className="relative">
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="flex items-center gap-3 hover:bg-dark-tertiary px-4 py-2 rounded-lg transition-colors"
          >
            <div className="w-10 h-10 bg-gradient-to-br from-accent to-accent/50 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 text-white fill-current" viewBox="0 0 24 24">
                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
              </svg>
            </div>
            <div className="text-left hidden sm:block">
              <p className="text-sm font-semibold text-white">
                {user?.username || 'Profile'}
              </p>
              <p className="text-xs text-gray-400">
                {user?.email || 'User'}
              </p>
            </div>
          </button>

          {/* Dropdown Menu */}
          {isMenuOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-dark-secondary border border-dark-tertiary rounded-lg shadow-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-dark-tertiary">
                <p className="text-sm font-semibold text-white">
                  {user?.email || 'Cadence User'}
                </p>
                <p className="text-xs text-gray-400">
                  {user?.email || 'user@cadence.music'}
                </p>
              </div>
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
