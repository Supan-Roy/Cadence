import React, { useState } from 'react'

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
      className="flex-shrink-0 w-44 text-left group transition-smooth"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onOpen}
    >
      <div className="relative mb-4 overflow-hidden rounded-2xl bg-dark-tertiary shadow-lg">
        <img
          src={getCoverUrl(album.cover_image)}
          alt={album.name}
          className="w-full aspect-square object-cover transition-smooth group-hover:scale-[1.03]"
        />
        {isHovered && (
          <div className="play-button-overlay pointer-events-none">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white shadow-xl transition-smooth">
              <svg className="h-6 w-6 fill-current text-black" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
          </div>
        )}
      </div>

      <div className="px-1">
        <h3 className="truncate text-sm font-semibold text-white transition-colors group-hover:text-accent">
          {album.name}
        </h3>
        <p className="truncate text-[11px] text-gray-400">
          {album.album_artist || album.artist_name || 'Unknown Artist'}
        </p>
        <p className="mt-1 text-[11px] text-gray-500">
          {album.track_count} songs • {album.duration_label}
        </p>
      </div>
    </button>
  )
}

export default AlbumCard