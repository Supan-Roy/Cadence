import React, { useState } from 'react'

function TrackCard({ track, onPlay }) {
  const [isHovered, setIsHovered] = useState(false)

  const getCoverUrl = (coverPath) => {
    if (!coverPath) {
      return 'https://via.placeholder.com/200x200?text=No+Cover'
    }
    if (coverPath.startsWith('http')) {
      return coverPath
    }
    return `http://127.0.0.1:8000${coverPath}`
  }

  return (
    <div
      className="flex-shrink-0 w-48 group transition-smooth"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="relative mb-4 rounded-lg overflow-hidden bg-dark-tertiary shadow-lg">
        {/* Cover Image */}
        <img
          src={getCoverUrl(track.cover_image)}
          alt={track.title}
          className="w-full aspect-square object-cover transition-smooth group-hover:scale-105"
        />

        {/* Play Button Overlay */}
        {isHovered && (
          <div className="play-button-overlay">
            <button
              onClick={() => onPlay(track)}
              className="w-16 h-16 bg-accent rounded-full flex items-center justify-center hover:bg-opacity-90 transition-smooth shadow-xl"
            >
              <svg
                className="w-6 h-6 text-white fill-current ml-1"
                viewBox="0 0 24 24"
              >
                <path d="M8 5v14l11-7z" />
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* Track Info */}
      <div className="px-2">
        <h3 className="font-semibold text-sm text-white truncate hover:text-accent transition-colors">
          {track.title}
        </h3>
        <p className="text-xs text-gray-400 truncate">
          {track.artist_name}
        </p>
      </div>
    </div>
  )
}

export default TrackCard
