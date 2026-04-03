import React, { useState } from 'react'

const BACKEND_ORIGIN = `http://${window.location.hostname}:8000`

function TrackCard({ track, onPlay }) {
  const [isHovered, setIsHovered] = useState(false)

  const getCoverUrl = (coverPath) => {
    if (!coverPath) {
      return 'https://via.placeholder.com/200x200?text=No+Cover'
    }
    if (coverPath.startsWith('http')) {
      return coverPath
    }
    return `${BACKEND_ORIGIN}${coverPath}`
  }

  return (
    <div
      className="flex-shrink-0 w-40 group transition-smooth"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        className="relative mb-4 rounded-lg overflow-hidden bg-dark-tertiary shadow-lg cursor-pointer"
        onClick={() => onPlay(track)}
        role="button"
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            onPlay(track)
          }
        }}
      >
        {/* Cover Image */}
        <img
          src={getCoverUrl(track.cover_image)}
          alt={track.title}
          className="w-full aspect-square object-cover transition-smooth group-hover:scale-105"
        />

        {/* Play Button Overlay */}
        {isHovered && (
          <div className="play-button-overlay pointer-events-none">
            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center transition-smooth shadow-xl">
              <svg className="w-6 h-6 text-black fill-current" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
          </div>
        )}
      </div>

      {/* Track Info */}
      <div className="px-2">
        <h3 className="font-semibold text-xs text-white truncate hover:text-accent transition-colors">
          {track.title}
        </h3>
        <p className="text-[11px] text-gray-400 truncate">
          {track.artist_name}
        </p>
      </div>
    </div>
  )
}

export default TrackCard
