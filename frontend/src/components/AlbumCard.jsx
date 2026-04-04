import React, { useState } from 'react'
import { imageProtectionProps } from '../utils/imageProtection'

const BACKEND_ORIGIN = `http://${window.location.hostname}:8000`

function AlbumCard({ album, onOpen }) {
  const [isHovered, setIsHovered] = useState(false)

  const getCoverUrl = (coverPath) => {
    if (!coverPath) {
      return '/Cadence Playlist.png'
    }
    if (coverPath.startsWith('http')) {
      return coverPath
    }
    return `${BACKEND_ORIGIN}${coverPath}`
  }

  return (
    <button
      type="button"
      className="group w-44 flex-shrink-0 text-left transition-transform duration-200 hover:-translate-y-0.5"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onOpen}
    >
      <div className="relative overflow-hidden rounded-xl bg-transparent">
        <img
          src={getCoverUrl(album.cover_image)}
          alt={album.name}
          className="aspect-square w-full rounded-xl object-cover transition duration-200 group-hover:scale-[1.03]"
          {...imageProtectionProps}
        />
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

      <div className="px-1 pt-3">
        <h3 className="truncate text-sm font-semibold text-white transition-colors group-hover:text-white">
          {album.name}
        </h3>
        <p className="truncate text-sm text-white/55">
          {album.album_artist || album.artist_name || 'Unknown Artist'}
        </p>
        <p className="mt-1 text-xs text-white/40">
          {album.track_count} songs • {album.duration_label}
        </p>
      </div>
    </button>
  )
}

export default AlbumCard