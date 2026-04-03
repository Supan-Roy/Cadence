import React from 'react'
import { useNavigate } from 'react-router-dom'
import { FiHome, FiSearch, FiUser } from 'react-icons/fi'

function MobileNav() {
  const navigate = useNavigate()

  return (
    <div className="grid grid-cols-3 gap-1 px-3 py-2 bg-dark-bg border-t border-white/10 fixed bottom-0 left-0 right-0 z-[60] sm:hidden">
      {/* Home Button */}
      <button
        onClick={() => navigate('/')}
        className="flex flex-col items-center justify-center py-2 transition-opacity hover:opacity-80"
      >
        <FiHome size={18} className="text-white" />
        <span className="text-xs mt-0.5 text-white/70">Home</span>
      </button>

      {/* Search Button */}
      <button
        onClick={() => navigate('/search')}
        className="flex flex-col items-center justify-center py-2 transition-opacity hover:opacity-80"
      >
        <FiSearch size={18} className="text-white" />
        <span className="text-xs mt-0.5 text-white/70">Search</span>
      </button>

      {/* My Space Button */}
      <button
        onClick={() => navigate('/my-space')}
        className="flex flex-col items-center justify-center py-2 transition-opacity hover:opacity-80"
      >
        <FiUser size={18} className="text-white" />
        <span className="text-xs mt-0.5 text-white/70">My Space</span>
      </button>
    </div>
  )
}

export default MobileNav
