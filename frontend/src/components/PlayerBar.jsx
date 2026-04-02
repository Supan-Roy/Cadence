import React, { useEffect, useRef, useState } from 'react'

const BACKEND_ORIGIN = `http://${window.location.hostname}:8000`

function PlayerBar({ track, isPlaying, onPlayPause, onNext, onPrevious }) {
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(100)
  const [isMuted, setIsMuted] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [isLooping, setIsLooping] = useState(false)
  const [isShuffling, setIsShuffling] = useState(false)
  const [activeSection, setActiveSection] = useState('upnext')
  const [lastVolume, setLastVolume] = useState(100)
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

    audio.volume = isMuted ? 0 : volume / 100
    audio.muted = isMuted
    audio.loop = isLooping

    if (isPlaying) {
      audio.play().catch(() => {})
    } else {
      audio.pause()
    }

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate)
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata)
      audio.removeEventListener('ended', handleEnded)
    }
  }, [track, isPlaying, onNext, volume, isMuted, isLooping])

  if (!track) {
    return (
      <div className="h-24 flex items-center justify-center border-t border-dark-tertiary bg-dark-secondary">
        <p className="text-gray-500">No track selected</p>
      </div>
    )
  }

  const getCoverUrl = (coverPath) => {
    if (!coverPath) return 'https://via.placeholder.com/200x200?text=No+Cover'
    if (coverPath.startsWith('http')) return coverPath
    return `${BACKEND_ORIGIN}${coverPath}`
  }

  const getStreamUrl = (trackId) => `${BACKEND_ORIGIN}/api/music/tracks/${trackId}/stream/`

  const formatTime = (time) => {
    if (isNaN(time)) return '0:00'
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0

  const handleSeek = (event) => {
    const audio = audioRef.current
    if (!audio) return
    const value = parseFloat(event.target.value)
    audio.currentTime = value
    setCurrentTime(value)
  }

  const handleVolumeChange = (event) => {
    const newVolume = parseFloat(event.target.value)
    setVolume(newVolume)
    setLastVolume(newVolume)
    setIsMuted(newVolume === 0)
    if (audioRef.current) {
      audioRef.current.volume = newVolume / 100
      audioRef.current.muted = newVolume === 0
    }
  }

  const handleMuteToggle = () => {
    const audio = audioRef.current
    if (!audio) return

    if (isMuted || volume === 0) {
      const restoredVolume = lastVolume > 0 ? lastVolume : 100
      setVolume(restoredVolume)
      setIsMuted(false)
      audio.muted = false
      audio.volume = restoredVolume / 100
    } else {
      setLastVolume(volume)
      setVolume(0)
      setIsMuted(true)
      audio.muted = true
      audio.volume = 0
    }
  }

  const toggleExpanded = () => setIsExpanded((value) => !value)
  const toggleLoop = () => setIsLooping((value) => !value)
  const toggleShuffle = () => setIsShuffling((value) => !value)

  const ControlButton = ({ title, onClick, active = false, className = '', children }) => (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={`flex items-center justify-center rounded-full transition focus:outline-none focus:ring-0 ${
        active ? 'bg-white text-black' : 'bg-white/10 text-white hover:bg-white/20'
      } ${className}`}
    >
      {children}
    </button>
  )

  const CompactPlayer = () => (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/10 bg-dark-secondary/95 backdrop-blur-xl shadow-[0_-20px_60px_rgba(0,0,0,0.45)]"
      role="button"
      tabIndex={0}
      onClick={toggleExpanded}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          toggleExpanded()
        }
      }}
    >
      <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6">
        <div className="grid grid-cols-[auto,1fr,auto] items-center gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <img
              src={getCoverUrl(track.cover_image)}
              alt={track.title}
              className="h-14 w-14 shrink-0 rounded-xl object-cover shadow-lg ring-1 ring-white/10"
            />
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-[0.24em] text-gray-500">Now Playing</p>
              <h4 className="truncate text-base font-semibold text-white">{track.title}</h4>
              <p className="truncate text-sm text-gray-300">{track.artist_name}</p>
            </div>
          </div>

          <div className="min-w-0 px-2 sm:px-4">
            <div className="flex items-center justify-between text-xs text-gray-400">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
            <div className="group relative mt-2 w-full">
              <div className="relative h-2 rounded-full bg-white/10 transition-all group-hover:h-3">
                <div className="h-full rounded-full bg-white transition-all" style={{ width: `${progressPercent}%` }} />
                <div
                  className="absolute top-1/2 h-4 w-4 -translate-y-1/2 rounded-full bg-white shadow-lg"
                  style={{ left: `${progressPercent}%`, transform: 'translate(-50%, -50%)' }}
                />
              </div>
              <input
                type="range"
                min="0"
                max={duration || 0}
                value={currentTime}
                onChange={handleSeek}
                onClick={(event) => event.stopPropagation()}
                className="absolute left-0 top-0 h-8 w-full cursor-pointer opacity-0"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 text-white">
            <ControlButton title="Previous" onClick={(event) => { event.stopPropagation(); onPrevious?.() }} className="h-11 w-11">
              <svg className="h-5 w-5 fill-current" viewBox="0 0 24 24">
                <path d="M6 6h2v12H6zm3 6 9 6V6z" />
              </svg>
            </ControlButton>

            <ControlButton title={isPlaying ? 'Pause' : 'Play'} onClick={(event) => { event.stopPropagation(); onPlayPause?.() }} active className="h-12 w-12 bg-white text-black">
              {isPlaying ? (
                <svg className="block h-6 w-6 fill-current" viewBox="0 0 24 24">
                  <path d="M6 3h4v18H6V3zm8 0h4v18h-4V3z" />
                </svg>
              ) : (
                <svg className="block h-6 w-6 fill-current" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </ControlButton>

            <ControlButton title="Next" onClick={(event) => { event.stopPropagation(); onNext?.() }} className="h-11 w-11">
              <svg className="block h-5 w-5 fill-current" viewBox="0 0 24 24">
                <path d="M16 6h2v12h-2zM6 18l9-6-9-6v12z" />
              </svg>
            </ControlButton>
          </div>
        </div>
      </div>
    </div>
  )

  const ExpandedPlayer = () => (
    <div className="fixed inset-0 z-[60] overflow-y-auto bg-[#140007] text-white lg:overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-[#3b0b1b] via-[#19040d] to-[#0d0307]" />
      <div className="relative mx-auto min-h-full w-full p-2 md:p-3 lg:p-4">
        <div className="mx-auto flex min-h-[calc(100vh-16px)] w-full max-w-6xl flex-col rounded-2xl bg-black/20 p-3 ring-1 ring-white/10 md:p-4 lg:h-[calc(100vh-32px)] lg:min-h-0 lg:overflow-hidden">
        <div className="flex items-center justify-between">
          <p className="text-xs uppercase tracking-[0.28em] text-white/60">Now Playing</p>
          <button
            type="button"
            onClick={toggleExpanded}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
            title="Close"
          >
            <svg className="h-5 w-5 fill-current" viewBox="0 0 24 24">
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="mt-2 grid grid-cols-1 gap-3 lg:min-h-0 lg:flex-1 lg:grid-cols-12 lg:gap-4">
          <div className="lg:col-span-7 lg:flex lg:min-h-0 lg:flex-col lg:overflow-y-auto lg:pr-1">
            <div className="mx-auto w-full max-w-md lg:max-w-[420px]">
              <div className="overflow-hidden rounded-2xl bg-black/20 p-2 ring-1 ring-white/10">
                <img
                  src={getCoverUrl(track.cover_image)}
                  alt={track.title}
                  className="h-auto max-h-[42vh] w-full rounded-xl object-contain bg-black/30 lg:max-h-[46vh] lg:object-contain lg:bg-black/20"
                />
              </div>
            </div>

            <div className="mx-auto mt-2 w-full max-w-xl lg:min-h-0">
              <h3 className="truncate text-xl font-bold leading-tight md:text-2xl">{track.title}</h3>
              <p className="mt-1 truncate text-sm text-white/70 md:text-base">{track.artist_name}</p>

              <div className="mt-3">
                <div className="group relative w-full">
                  <div className="relative h-1.5 rounded-full bg-white/20">
                    <div className="h-full rounded-full bg-white" style={{ width: `${progressPercent}%` }} />
                    <div
                      className="absolute top-1/2 h-4 w-4 -translate-y-1/2 rounded-full bg-white shadow-lg"
                      style={{ left: `${progressPercent}%`, transform: 'translate(-50%, -50%)' }}
                    />
                  </div>
                  <input
                    type="range"
                    min="0"
                    max={duration || 0}
                    value={currentTime}
                    onChange={handleSeek}
                    className="absolute left-0 top-0 h-8 w-full cursor-pointer opacity-0"
                  />
                </div>
                <div className="mt-2 flex items-center justify-between text-sm text-white/80 md:text-base">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>

              <div className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-xl bg-white/5 px-2 py-1.5 ring-1 ring-white/10">
                <ControlButton title="Shuffle" onClick={toggleShuffle} active={isShuffling} className="h-9 w-9 shrink-0">
                  <svg className="h-5 w-5 fill-current" viewBox="0 0 24 24">
                    <path d="M16 3h5v5h-2V6.41l-4.29 4.3-1.42-1.42L17.59 5H16V3zM4 6h4.59l7.7 7.71 2.3-2.3V16h-4.59L6.3 8.29 4 8V6zm0 10h2.3l2.59-2.59 1.42 1.42L8.59 17H4v-1zm15-1.41V13h2v5h-5v-2h1.59l-4.3-4.29 1.42-1.42L19 14.59z" />
                  </svg>
                </ControlButton>

                <ControlButton title="Previous" onClick={onPrevious} className="h-10 w-10 shrink-0">
                  <svg className="h-5 w-5 fill-current" viewBox="0 0 24 24">
                    <path d="M6 6h2v12H6zm3 6 9 6V6z" />
                  </svg>
                </ControlButton>

                <ControlButton title={isPlaying ? 'Pause' : 'Play'} onClick={onPlayPause} active className="h-12 w-12 shrink-0 bg-white text-black md:h-14 md:w-14">
                  {isPlaying ? (
                    <svg className="block h-6 w-6 fill-current" viewBox="0 0 24 24">
                      <path d="M6 3h4v18H6V3zm8 0h4v18h-4V3z" />
                    </svg>
                  ) : (
                    <svg className="block h-6 w-6 fill-current" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  )}
                </ControlButton>

                <ControlButton title="Next" onClick={onNext} className="h-10 w-10 shrink-0">
                  <svg className="h-5 w-5 fill-current" viewBox="0 0 24 24">
                    <path d="M16 6h2v12h-2zM6 18l9-6-9-6v12z" />
                  </svg>
                </ControlButton>

                <ControlButton title="Loop" onClick={toggleLoop} active={isLooping} className="h-9 w-9 shrink-0">
                  <svg className="h-5 w-5 fill-current" viewBox="0 0 24 24">
                    <path d="M7 7h11l-2.5-2.5L17 3l5 5-5 5-1.5-1.5L18 9H7a2 2 0 0 0-2 2v1H3v-1a4 4 0 0 1 4-4zm10 10H6l2.5 2.5L7 21l-5-5 5-5 1.5 1.5L6 15h11a2 2 0 0 0 2-2v-1h2v1a4 4 0 0 1-4 4z" />
                  </svg>
                </ControlButton>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 lg:min-h-0">
            <div className="h-full rounded-xl bg-black/20 p-3 ring-1 ring-white/10 lg:flex lg:flex-col lg:overflow-hidden">
              <div className="grid grid-cols-3 text-center text-xs uppercase tracking-wide text-white/60 md:text-sm">
                <button
                  type="button"
                  onClick={() => setActiveSection('upnext')}
                  className={activeSection === 'upnext' ? 'text-white' : 'hover:text-white'}
                >
                  Up Next
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSection('lyrics')}
                  className={activeSection === 'lyrics' ? 'text-white' : 'hover:text-white'}
                >
                  Lyrics
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSection('related')}
                  className={activeSection === 'related' ? 'text-white' : 'hover:text-white'}
                >
                  Related
                </button>
              </div>

              <div className="mt-3 flex items-center justify-end gap-2 rounded-xl bg-white/5 px-2 py-1.5 ring-1 ring-white/10">
                <button
                  type="button"
                  onClick={handleMuteToggle}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10"
                  title={isMuted || volume === 0 ? 'Unmute' : 'Mute'}
                >
                  {isMuted || volume === 0 ? (
                    <svg className="h-4 w-4 fill-current text-white" viewBox="0 0 24 24">
                      <path d="M14 3.23v2.06a7.001 7.001 0 0 1 0 13.42v2.06A9.003 9.003 0 0 0 14 3.23zM3 9v6h4l5 5V4L7 9H3z" />
                      <path d="m16.5 8.5 6 6-1.41 1.41-6-6z" />
                    </svg>
                  ) : (
                    <svg className="h-4 w-4 fill-current text-white" viewBox="0 0 24 24">
                      <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3a4.5 4.5 0 0 0-2.5-4.03v8.06A4.5 4.5 0 0 0 16.5 12zm-2.5-8.77v2.06a7.001 7.001 0 0 1 0 13.42v2.06A9.003 9.003 0 0 0 14 3.23z" />
                    </svg>
                  )}
                </button>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={volume}
                  onChange={handleVolumeChange}
                  className="h-1.5 w-24 cursor-pointer appearance-none rounded-full bg-white/15 accent-white"
                />
                <span className="w-8 text-right text-[10px] font-medium text-white">{volume}%</span>
              </div>

              <div className="mt-3 rounded-xl bg-white/5 p-3 text-center text-sm text-white/70 ring-1 ring-white/10 lg:flex-1 lg:overflow-y-auto">
                {activeSection === 'upnext' && 'Current queue will appear here.'}
                {activeSection === 'lyrics' && 'Lyrics view is coming next.'}
                {activeSection === 'related' && 'Related tracks section is coming next.'}
              </div>
            </div>
          </div>
        </div>
        </div>
      </div>
    </div>
  )

  return (
    <>
      <audio ref={audioRef} src={getStreamUrl(track.id)} crossOrigin="anonymous" />
      {isExpanded ? <ExpandedPlayer /> : <CompactPlayer />}
    </>
  )
}

export default PlayerBar
