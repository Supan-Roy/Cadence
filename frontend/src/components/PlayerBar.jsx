import React, { useEffect, useRef, useState } from 'react'
import { musicAPI, playlistAPI } from '../services/api'

const BACKEND_ORIGIN = `http://${window.location.hostname}:8000`

function PlayerBar({ track, isPlaying, queue = [], currentTrackIndex = 0, onPlayPause, onNext, onPrevious }) {
  const isPodcastTrack = !!track?.is_podcast
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(100)
  const [isMuted, setIsMuted] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [isLooping, setIsLooping] = useState(false)
  const [isShuffling, setIsShuffling] = useState(false)
  const [activeSection, setActiveSection] = useState('upnext')
  const [lastVolume, setLastVolume] = useState(100)
  const [lyricsState, setLyricsState] = useState({
    loading: false,
    text: '',
    source: null,
    error: '',
  })
  const lyricsCacheRef = useRef(new Map())
  const [playlistPanelOpen, setPlaylistPanelOpen] = useState(false)
  const [playlists, setPlaylists] = useState([])
  const [playlistLoading, setPlaylistLoading] = useState(false)
  const [playlistError, setPlaylistError] = useState('')
  const [playlistNotice, setPlaylistNotice] = useState('')
  const [creatingPlaylist, setCreatingPlaylist] = useState(false)
  const [addingPlaylistId, setAddingPlaylistId] = useState(null)
  const newPlaylistInputRef = useRef(null)
  const audioRef = useRef(null)
  const touchStartXRef = useRef(null)
  const touchCurrentXRef = useRef(null)

  useEffect(() => {
    if (activeSection !== 'lyrics' || isPodcastTrack || !track?.title || !track?.artist_name) return

    const lyricsKey = `${track.id || track.title}::${track.artist_name}`
    const cached = lyricsCacheRef.current.get(lyricsKey)
    if (cached) {
      setLyricsState({
        loading: false,
        text: cached.lyrics,
        source: cached.source,
        error: cached.lyrics ? '' : 'Lyrics are unavailable for this track.',
      })
      return
    }

    let cancelled = false

    setLyricsState({
      loading: true,
      text: '',
      source: null,
      error: '',
    })

    musicAPI
      .getCurrentTrackLyrics(track.title, track.artist_name)
      .then((response) => {
        if (cancelled) return
        const text = response?.data?.lyrics || ''
        const source = response?.data?.source || null
        lyricsCacheRef.current.set(lyricsKey, { lyrics: text, source })

        setLyricsState({
          loading: false,
          text,
          source,
          error: text ? '' : 'Lyrics are unavailable for this track.',
        })
      })
      .catch(() => {
        if (cancelled) return
        lyricsCacheRef.current.set(lyricsKey, { lyrics: '', source: null })
        setLyricsState({
          loading: false,
          text: '',
          source: null,
          error: 'Lyrics are unavailable for this track.',
        })
      })

    return () => {
      cancelled = true
    }
  }, [activeSection, isPodcastTrack, track?.id, track?.title, track?.artist_name])

  useEffect(() => {
    if (isPodcastTrack && activeSection === 'lyrics') {
      setActiveSection('upnext')
    }
  }, [isPodcastTrack, activeSection])

  useEffect(() => {
    if (!playlistPanelOpen) return
    loadPlaylists()
  }, [playlistPanelOpen])

  const loadPlaylists = async () => {
    if (!track?.id) return

    try {
      setPlaylistLoading(true)
      setPlaylistError('')
      const response = await playlistAPI.getMyPlaylists(track.id)
      const data = Array.isArray(response.data) ? response.data : response.data?.results || []
      setPlaylists(data)
    } catch (err) {
      setPlaylistError('Failed to load playlists.')
      setPlaylists([])
    } finally {
      setPlaylistLoading(false)
    }
  }

  const togglePlaylistPanel = () => {
    setPlaylistNotice('')
    setPlaylistError('')
    setPlaylistPanelOpen((value) => !value)
  }

  const handleCreatePlaylist = async () => {
    const name = (newPlaylistInputRef.current?.value || '').trim()
    if (!name) {
      setPlaylistError('Playlist name is required.')
      return
    }

    try {
      setCreatingPlaylist(true)
      setPlaylistError('')
      await playlistAPI.createPlaylist(name)
      if (newPlaylistInputRef.current) {
        newPlaylistInputRef.current.value = ''
      }
      await loadPlaylists()
      setPlaylistNotice('Playlist created.')
      setPlaylistPanelOpen(false)
    } catch (err) {
      const detail = err.response?.data?.name || err.response?.data?.detail || 'Failed to create playlist.'
      setPlaylistError(Array.isArray(detail) ? detail.join(', ') : String(detail))
    } finally {
      setCreatingPlaylist(false)
    }
  }

  const handleAddToPlaylist = async (playlistId) => {
    if (!track?.id) return
    if (isPodcastTrack) {
      setPlaylistError('Podcasts cannot be added to playlists.')
      return
    }

    try {
      setAddingPlaylistId(playlistId)
      setPlaylistError('')
      const response = await playlistAPI.addTrackToPlaylist(playlistId, track.id)
      const detail = response.data?.detail || 'Added to playlist.'
      setPlaylistNotice(detail)
      await loadPlaylists()
    } catch (err) {
      const detail = err.response?.data?.detail || 'Failed to add track to playlist.'
      setPlaylistError(Array.isArray(detail) ? detail.join(', ') : String(detail))
    } finally {
      setAddingPlaylistId(null)
    }
  }

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
    return null
  }

  const getCoverUrl = (coverPath) => {
    if (!coverPath) return 'https://via.placeholder.com/200x200?text=No+Cover'
    if (coverPath.startsWith('http')) return coverPath
    return `${BACKEND_ORIGIN}${coverPath}`
  }

  const getPlaylistCoverUrl = (coverPath) => {
    if (!coverPath) return '/Cadence Playlist.png'
    if (coverPath.startsWith('http')) return coverPath
    return `${BACKEND_ORIGIN}${coverPath}`
  }

  const getStreamUrl = (trackId) => {
    const token = localStorage.getItem('access_token')
    const tokenQuery = token ? `?access_token=${encodeURIComponent(token)}` : ''
    return `${BACKEND_ORIGIN}/api/music/tracks/${trackId}/stream/${tokenQuery}`
  }

  const formatTime = (time) => {
    if (isNaN(time)) return '0:00'
    const hours = Math.floor(time / 3600)
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    if (hours > 0) {
      const remainingMinutes = Math.floor((time % 3600) / 60)
      return `${hours}:${remainingMinutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
    }
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

  const handleCompactTouchStart = (event) => {
    if (!event.touches || event.touches.length === 0) return
    touchStartXRef.current = event.touches[0].clientX
    touchCurrentXRef.current = event.touches[0].clientX
  }

  const handleCompactTouchMove = (event) => {
    if (!event.touches || event.touches.length === 0) return
    touchCurrentXRef.current = event.touches[0].clientX
  }

  const handleCompactTouchEnd = () => {
    if (touchStartXRef.current == null || touchCurrentXRef.current == null) return
    const deltaX = touchCurrentXRef.current - touchStartXRef.current
    const threshold = 45

    if (Math.abs(deltaX) >= threshold) {
      if (deltaX < 0) {
        onNext?.()
      } else {
        onPrevious?.()
      }
    }

    touchStartXRef.current = null
    touchCurrentXRef.current = null
  }

  const ControlButton = ({ title, onClick, active = false, disabled = false, className = '', children }) => (
    <button
      type="button"
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center justify-center rounded-full transition focus:outline-none focus:ring-0 ${
        active ? 'bg-white text-black' : 'bg-white/10 text-white hover:bg-white/20'
      } ${disabled ? 'cursor-not-allowed opacity-50 hover:bg-white/10' : ''} ${className}`}
    >
      {children}
    </button>
  )

  const ScrollingText = ({ text, className = '', outerClassName = '' }) => {
    const containerRef = useRef(null)
    const textRef = useRef(null)
    const [shouldScroll, setShouldScroll] = useState(false)

    useEffect(() => {
      const checkOverflow = () => {
        if (!containerRef.current || !textRef.current) return
        setShouldScroll(textRef.current.scrollWidth > containerRef.current.clientWidth + 2)
      }

      checkOverflow()
      window.addEventListener('resize', checkOverflow)

      return () => {
        window.removeEventListener('resize', checkOverflow)
      }
    }, [text])

    return (
      <div ref={containerRef} className={`overflow-hidden whitespace-nowrap ${outerClassName}`}>
        <div className={`player-marquee-row ${shouldScroll ? 'is-animated' : ''}`}>
          <span ref={textRef} className={`${className} inline-block ${shouldScroll ? 'pr-8' : ''}`}>
            {text}
          </span>
          {shouldScroll && <span className={`${className} inline-block pr-8`}>{text}</span>}
        </div>
      </div>
    )
  }

  const CompactPlayer = () => (
    <div
      className="fixed bottom-[60px] sm:bottom-0 left-0 right-0 z-[70] border-t border-white/10 bg-dark-secondary/95 backdrop-blur-xl shadow-[0_-20px_60px_rgba(0,0,0,0.45)]"
      role="button"
      tabIndex={0}
      onClick={toggleExpanded}
      onTouchStart={handleCompactTouchStart}
      onTouchMove={handleCompactTouchMove}
      onTouchEnd={handleCompactTouchEnd}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          toggleExpanded()
        }
      }}
    >
      <div className="mx-auto max-w-7xl px-3 py-2 sm:px-6 sm:py-3">
        <div className="relative mb-2 sm:mb-0 sm:hidden" onClick={(event) => event.stopPropagation()}>
          <div className="h-[2px] w-full rounded-full bg-white/20">
            <div className="h-full rounded-full bg-white" style={{ width: `${progressPercent}%` }} />
          </div>
          <input
            type="range"
            min="0"
            max={duration || 0}
            value={currentTime}
            onChange={handleSeek}
            className="absolute -top-2 left-0 h-5 w-full cursor-pointer opacity-0"
          />
        </div>

        <div className="sm:hidden flex items-center gap-3">
          <img
            src={getCoverUrl(track.cover_image)}
            alt={track.title}
            className="h-14 w-14 shrink-0 rounded-xl object-cover shadow-lg ring-1 ring-white/10"
          />

          <div className="min-w-0 flex-1 overflow-hidden">
            <ScrollingText text={track.title} className="text-base font-semibold text-white" />
            <ScrollingText text={track.artist_name} className="text-sm text-gray-300" />
          </div>

          <ControlButton
            title={isPlaying ? 'Pause' : 'Play'}
            onClick={(event) => { event.stopPropagation(); onPlayPause?.() }}
            active
            className="h-12 w-12 shrink-0 bg-white text-black"
          >
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
        </div>

        <div className="hidden sm:grid sm:grid-cols-[auto,1fr,auto] sm:items-center sm:gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <img
              src={getCoverUrl(track.cover_image)}
              alt={track.title}
              className="h-14 w-14 shrink-0 rounded-xl object-cover shadow-lg ring-1 ring-white/10"
            />
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-[0.24em] text-gray-500">Now Playing</p>
              <ScrollingText text={track.title} className="text-base font-semibold text-white" />
              <ScrollingText text={track.artist_name} className="text-sm text-gray-300" />
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
    <div className="fixed inset-0 z-[60] overflow-y-auto bg-[#140007] text-white">
      <div className="absolute inset-0 bg-gradient-to-b from-[#3b0b1b] via-[#19040d] to-[#0d0307]" />
      <div className="relative mx-auto min-h-full w-full p-2 md:p-3 lg:p-4">
        <div className="mx-auto flex min-h-[calc(100vh-16px)] w-full max-w-6xl flex-col rounded-2xl bg-black/20 p-3 ring-1 ring-white/10 md:p-4 lg:max-h-[calc(100vh-32px)]">
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

        <div className="mt-2 grid grid-cols-1 gap-3 lg:grid-cols-12 lg:gap-4">
          <div className="lg:col-span-7 lg:flex lg:flex-col lg:pr-1">
            <div className="mx-auto w-full max-w-md lg:max-w-[420px]">
              <div className="aspect-square overflow-hidden rounded-2xl bg-black/20 p-2 ring-1 ring-white/10">
                <img
                  src={getCoverUrl(track.cover_image)}
                  alt={track.title}
                  className="h-full w-full rounded-xl object-cover object-center bg-black/30"
                />
              </div>
            </div>

            <div className="mx-auto mt-2 w-full max-w-xl">
              <ScrollingText text={track.title} className="text-xl font-bold leading-tight md:text-2xl" />
              <ScrollingText text={track.artist_name} className="mt-1 text-sm text-white/70 md:text-base" outerClassName="mt-1" />

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

              <div className="mt-2">
              <div className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-white/5 px-2 py-1.5 ring-1 ring-white/10">
                <ControlButton title="Shuffle" onClick={toggleShuffle} active={isShuffling} className="h-9 w-9 shrink-0">
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17 3h4v4" />
                    <path d="M21 3l-6 6" />
                    <path d="M3 7h5l4 4" />
                    <path d="M3 17h5l9-9" />
                    <path d="M17 17h4v4" />
                    <path d="M21 21l-6-6" />
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

                <ControlButton
                  title={isPodcastTrack ? 'Podcasts cannot be added' : 'Add to playlist'}
                  onClick={togglePlaylistPanel}
                  disabled={isPodcastTrack}
                  className="h-9 w-9 shrink-0"
                >
                  <svg className="h-5 w-5 fill-current" viewBox="0 0 24 24">
                    <path d="M19 11h-6V5h-2v6H5v2h6v6h2v-6h6z" />
                  </svg>
                </ControlButton>
              </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5">
            <div className="h-full rounded-xl bg-black/20 p-3 ring-1 ring-white/10 lg:flex lg:flex-col">
              <div className={`grid text-center text-xs uppercase tracking-wide text-white/60 md:text-sm ${isPodcastTrack ? 'grid-cols-2' : 'grid-cols-3'}`}>
                <button
                  type="button"
                  onClick={() => setActiveSection('upnext')}
                  className={activeSection === 'upnext' ? 'text-white' : 'hover:text-white'}
                >
                  Up Next
                </button>
                {!isPodcastTrack && (
                  <button
                    type="button"
                    onClick={() => setActiveSection('lyrics')}
                    className={activeSection === 'lyrics' ? 'text-white' : 'hover:text-white'}
                  >
                    Lyrics
                  </button>
                )}
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

              <div className="mt-3 rounded-xl bg-white/5 p-3 text-sm text-white/70 ring-1 ring-white/10 lg:max-h-[46vh] lg:overflow-y-auto">
                {activeSection === 'upnext' && (
                  queue.length > 0 ? (
                    <div className="space-y-2">
                      {queue.map((queueTrack, index) => {
                        const isCurrent = index === currentTrackIndex
                        return (
                          <div
                            key={`${queueTrack.id || queueTrack.title}-${index}`}
                            className={`flex items-center gap-3 rounded-lg px-2 py-2 ${isCurrent ? 'bg-white/10' : 'bg-transparent'}`}
                          >
                            <img
                              src={getCoverUrl(queueTrack.cover_image)}
                              alt={queueTrack.title || 'Track'}
                              className="h-10 w-10 shrink-0 rounded-md object-cover"
                            />
                            <div className="min-w-0 flex-1 text-left">
                              <p className={`truncate text-sm font-semibold ${isCurrent ? 'text-white' : 'text-white/90'}`}>
                                {queueTrack.title || 'Untitled'}
                              </p>
                              <p className="truncate text-xs text-white/60">
                                {queueTrack.artist_name || queueTrack.artist || 'Unknown Artist'}
                              </p>
                            </div>
                            {isCurrent && (
                              <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                                Now
                              </span>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <p className="text-center">Queue is empty.</p>
                  )
                )}
                {activeSection === 'lyrics' && (
                  <div className="text-left">
                    {lyricsState.loading && <p className="text-white/80">Fetching lyrics...</p>}
                    {!lyricsState.loading && lyricsState.error && <p className="text-white/70">{lyricsState.error}</p>}
                    {!lyricsState.loading && lyricsState.text && (
                      <>
                        <pre className="whitespace-pre-wrap break-words font-inherit text-sm leading-6 text-white/85">
                          {lyricsState.text}
                        </pre>
                        {lyricsState.source && (
                          <p className="mt-3 text-[11px] uppercase tracking-wide text-white/50">
                            Source: {lyricsState.source}
                          </p>
                        )}
                      </>
                    )}
                  </div>
                )}
                {activeSection === 'related' && 'Related tracks section is coming next.'}
              </div>
            </div>
          </div>
        </div>
        </div>
      </div>

      {playlistPanelOpen && (
        <div
          className="fixed inset-0 z-[80] flex items-end justify-center bg-black/55 p-3 sm:items-center sm:p-4"
        >
          <div
            className="w-full max-w-lg rounded-2xl border border-white/15 bg-[#12151e] p-4 shadow-2xl max-h-[82vh] overflow-y-auto"
            onMouseDown={(event) => event.stopPropagation()}
            onTouchStart={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <p className="text-base font-semibold text-white">Add to playlist</p>
              <button
                type="button"
                onClick={() => setPlaylistPanelOpen(false)}
                className="rounded-full bg-white/10 px-2.5 py-1 text-xs text-white hover:bg-white/20"
              >
                Close
              </button>
            </div>

            {playlistNotice && <p className="mt-2 text-xs text-emerald-300">{playlistNotice}</p>}
            {playlistError && <p className="mt-2 text-xs text-red-300">{playlistError}</p>}

            <div className="mt-3 max-h-56 space-y-2 overflow-y-auto pr-1">
              {playlistLoading && <p className="text-xs text-white/70">Loading playlists...</p>}
              {!playlistLoading && playlists.length === 0 && (
                <p className="text-xs text-white/70">No playlists yet. Create your first playlist below.</p>
              )}

              {!playlistLoading && playlists.map((playlistItem) => (
                <button
                  key={playlistItem.id}
                  type="button"
                  disabled={addingPlaylistId === playlistItem.id || !!playlistItem.has_track}
                  onClick={() => handleAddToPlaylist(playlistItem.id)}
                  className="flex w-full items-center justify-between rounded-lg bg-white/5 px-3 py-2 text-left text-sm text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <div className="flex min-w-0 items-center gap-2.5">
                    <img
                      src={getPlaylistCoverUrl(playlistItem.cover_image)}
                      alt={playlistItem.name}
                      className="h-9 w-9 shrink-0 rounded-md object-cover"
                    />
                    <span className="truncate">{playlistItem.name}</span>
                  </div>
                  <span className="ml-2 text-xs text-white/70">
                    {playlistItem.has_track ? 'Added' : `${playlistItem.track_count} tracks`}
                  </span>
                </button>
              ))}
            </div>

            <div className="mt-4 border-t border-white/10 pt-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-white/60">Create new playlist</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  ref={newPlaylistInputRef}
                  name="playlist_name"
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  inputMode="text"
                  enterKeyHint="done"
                  data-form-type="other"
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault()
                      handleCreatePlaylist()
                    }
                  }}
                  placeholder="Playlist name"
                  className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/40 outline-none focus:border-white/30"
                />
                <button
                  type="button"
                  onClick={handleCreatePlaylist}
                  disabled={creatingPlaylist}
                  className="rounded-lg bg-white px-3 py-2 text-xs font-semibold text-black transition hover:bg-white/90 disabled:opacity-60"
                >
                  {creatingPlaylist ? 'Creating...' : 'Create'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
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
