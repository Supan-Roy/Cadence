import React from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { FiHome, FiSearch, FiUser } from 'react-icons/fi'

function MobileNav() {
  const navigate = useNavigate()
  const location = useLocation()

  const isHome = location.pathname === '/'
  const isSearch = location.pathname.startsWith('/search')
  const isMySpace = location.pathname.startsWith('/my-space') || location.pathname.startsWith('/playlists')

  const buttonClass = (active) =>
    `flex flex-col items-center justify-center py-2 transition-opacity ${active ? 'opacity-100' : 'opacity-45 hover:opacity-70'}`

  const iconClass = (active) => (active ? 'text-white' : 'text-white/70')
  const labelClass = (active) => `text-xs mt-0.5 ${active ? 'text-white' : 'text-white/55'}`

  return (
    <div className="grid grid-cols-3 gap-1 px-3 py-2 bg-dark-bg border-t border-white/10 fixed bottom-0 left-0 right-0 z-[60] sm:hidden">
      {/* Home Button */}
      <button
        onClick={() => navigate('/')}
        className={buttonClass(isHome)}
      >
        <FiHome size={18} className={iconClass(isHome)} />
        <span className={labelClass(isHome)}>Home</span>
      </button>

      {/* Search Button */}
      <button
        onClick={() => navigate('/search')}
        className={buttonClass(isSearch)}
      >
        <FiSearch size={18} className={iconClass(isSearch)} />
        <span className={labelClass(isSearch)}>Search</span>
      </button>

      {/* My Space Button */}
      <button
        onClick={() => navigate('/my-space')}
        className={buttonClass(isMySpace)}
      >
        <FiUser size={18} className={iconClass(isMySpace)} />
        <span className={labelClass(isMySpace)}>My Space</span>
      </button>
    </div>
  )
}

export default MobileNav
