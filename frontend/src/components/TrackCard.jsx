import React, { useState } from 'react'
import { imageProtectionProps } from '../utils/imageProtection'

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
      className="group w-40 flex-shrink-0 transition-transform duration-200 hover:-translate-y-0.5"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        className="relative cursor-pointer overflow-hidden rounded-xl bg-transparent"
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
          className="aspect-square w-full rounded-xl object-cover transition duration-200 group-hover:scale-[1.03]"
          {...imageProtectionProps}
        />

        {/* Play Button Overlay */}
        {isHovered && (
          <div className="play-button-overlay pointer-events-none">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-xl">
              <svg className="h-5 w-5 fill-current text-black" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
          </div>
        )}
      </div>

      {/* Track Info */}
      <div className="px-1 pt-3">
        <h3 className="truncate text-sm font-semibold text-white transition-colors hover:text-white">
          {track.title}
        </h3>
        <p className="truncate text-sm text-white/55">
          {track.artist_name}
        </p>
      </div>
    </div>
  )
}

export default TrackCard
