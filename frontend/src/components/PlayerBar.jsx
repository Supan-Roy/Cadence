import React, { useState, useRef, useEffect } from 'react'

function PlayerBar({ track, isPlaying, onPlayPause, onNext, onPrevious }) {
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(100)
  const audioRef = useRef(null)

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime)
    const handleLoadedMetadata = () => setDuration(audio.duration)
    const handleEnded = () => onNext?.()

    audio.addEventListener('timeupdate', handleTimeUpdate)
    audio.addEventListener('loadedmetadata', handleLoadedMetadata)
    audio.addEventListener('ended', handleEnded)

    if (isPlaying) {
      audio.play().catch(() => {}) // Ignore autoplay errors
    } else {
      audio.pause()
    }

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate)
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata)
      audio.removeEventListener('ended', handleEnded)
    }
  }, [track, isPlaying, onNext])

  const handleProgressChange = (e) => {
    const audio = audioRef.current
    if (audio) {
      audio.currentTime = parseFloat(e.target.value)
      setCurrentTime(parseFloat(e.target.value))
    }
  }

  const handleVolumeChange = (e) => {
    const newVolume = parseFloat(e.target.value)
    setVolume(newVolume)
    if (audioRef.current) {
      audioRef.current.volume = newVolume / 100
    }
  }

  const getCoverUrl = (coverPath) => {
    if (!coverPath) {
      return 'https://via.placeholder.com/60x60?text=No+Cover'
    }
    if (coverPath.startsWith('http')) {
      return coverPath
    }
    return `http://127.0.0.1:8000${coverPath}`
  }

  const getAudioUrl = (audioPath) => {
    if (!audioPath) return null
    if (audioPath.startsWith('http')) {
      return audioPath
    }
    return `http://127.0.0.1:8000${audioPath}`
  }

  const getStreamUrl = (trackId) => {
    return `http://127.0.0.1:8000/api/music/tracks/${trackId}/stream/`
  }

  const formatTime = (time) => {
    if (isNaN(time)) return '0:00'
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  if (!track) {
    return (
      <div className="h-24 bg-dark-secondary border-t border-dark-tertiary flex items-center justify-center">
        <p className="text-gray-500">No track selected</p>
      </div>
    )
  }

  return (
    <>
      <audio
        ref={audioRef}
        src={getStreamUrl(track.id)}
        crossOrigin="anonymous"
      />
      <div className="fixed bottom-0 left-0 right-0 bg-dark-secondary border-t border-dark-tertiary">
        {/* Progress Bar */}
        <div className="relative w-full py-2 px-0 cursor-pointer group">
          {/* Container for visual bar */}
          <div className="relative h-2 bg-dark-tertiary rounded group-hover:h-3 transition-all">
            {/* Progress Fill */}
            <div
              className="h-full bg-accent rounded transition-all"
              style={{
                width: duration > 0 ? `${(currentTime / duration) * 100}%` : '0%'
              }}
              pointerEvents="none"
            />
            {/* Seek Thumb */}
            <div
              className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
              style={{
                left: duration > 0 ? `${(currentTime / duration) * 100}%` : '0%',
                transform: 'translate(-50%, -50%)'
              }}
              pointerEvents="none"
            />
          </div>
          {/* Invisible input for interaction - larger hit area */}
          <input
            type="range"
            min="0"
            max={duration || 0}
            value={currentTime}
            onChange={handleProgressChange}
            className="absolute -top-2 left-0 right-0 w-full h-6 opacity-0 cursor-pointer z-10"
            style={{ top: '-8px' }}
          />
        </div>

        {/* Player Content */}
        <div className="px-6 py-4 grid grid-cols-3 gap-4 items-center">
          {/* Left: Track Info */}
          <div className="flex items-center gap-4 min-w-0">
            <img
              src={getCoverUrl(track.cover_image)}
              alt={track.title}
              className="w-16 h-16 rounded-lg object-cover shadow-lg"
            />
            <div className="flex-1 min-w-0">
              <h4 className="text-white font-semibold text-sm truncate">
                {track.title}
              </h4>
              <p className="text-gray-400 text-xs truncate">
                {track.artist_name}
              </p>
            </div>
          </div>

          {/* Center: Controls */}
          <div className="flex items-center justify-center gap-6">
            <button
              onClick={onPrevious}
              className="text-gray-400 hover:text-white transition-colors"
              title="Previous"
            >
              <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
              </svg>
            </button>

            <button
              onClick={onPlayPause}
              className="w-12 h-12 bg-accent rounded-full flex items-center justify-center hover:bg-opacity-90 transition-colors shadow-lg"
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? (
                <svg className="w-6 h-6 text-white fill-current" viewBox="0 0 24 24">
                  <path d="M6 3h4v18H6V3zm8 0h4v18h-4V3z" />
                </svg>
              ) : (
                <svg className="w-6 h-6 text-white fill-current ml-1" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </button>

            <button
              onClick={onNext}
              className="text-gray-400 hover:text-white transition-colors"
              title="Next"
            >
              <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                <path d="M16 18h2V6h-2zm-11-7v7l8.5-6z" />
              </svg>
            </button>
          </div>

          {/* Right: Time and Volume */}
          <div className="flex items-center justify-end gap-4">
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <span>{formatTime(currentTime)}</span>
              <span className="text-gray-600">/</span>
              <span>{formatTime(duration)}</span>
            </div>

            <div className="flex items-center gap-2 group">
              <svg className="w-4 h-4 fill-current text-gray-400 group-hover:text-white transition-colors" viewBox="0 0 24 24">
                <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.26 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
              </svg>
              <input
                type="range"
                min="0"
                max="100"
                value={volume}
                onChange={handleVolumeChange}
                className="w-20 h-1 appearance-none bg-dark-tertiary rounded-lg cursor-pointer"
              />
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default PlayerBar
