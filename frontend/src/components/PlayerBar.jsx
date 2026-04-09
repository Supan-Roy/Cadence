import React, { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { musicAPI, playlistAPI } from '../services/api'
import { imageProtectionProps } from '../utils/imageProtection'

const BACKEND_ORIGIN = `http://${window.location.hostname}:8000`

const LRC_TIMESTAMP_REGEX = /^\[(\d{1,2}):(\d{2})(?:\.(\d{1,3}))?\]\s?(.*)$/

const parseTimestampedLyrics = (lyricsText) => {
  if (!lyricsText) return []

  return lyricsText
    .split(/\r?\n/)
    .map((rawLine, index) => {
      const line = rawLine.trimEnd()
      const match = line.match(LRC_TIMESTAMP_REGEX)
      if (!match) return null

      const minutes = Number.parseInt(match[1], 10)
      const seconds = Number.parseInt(match[2], 10)
      const millisRaw = match[3] || '0'
      const text = (match[4] || '').trim()
      const millis = Number.parseInt(millisRaw.padEnd(3, '0').slice(0, 3), 10)

      if (Number.isNaN(minutes) || Number.isNaN(seconds) || Number.isNaN(millis)) {
        return null
      }

      return {
        id: `${minutes}:${seconds}:${millis}-${index}`,
        time: minutes * 60 + seconds + millis / 1000,
        text,
      }
    })
    .filter(Boolean)
    .sort((a, b) => a.time - b.time)
}

const getActiveLyricIndex = (timestampedLines, timeInSeconds) => {
  if (!timestampedLines.length) return -1

  for (let index = timestampedLines.length - 1; index >= 0; index -= 1) {
    if (timeInSeconds >= timestampedLines[index].time) {
      return index
    }
  }

  return -1
}

function PlayerBar({ track, isPlaying, queue = [], currentTrackIndex = 0, onPlayPause, onNext, onPrevious, onClose }) {
  const navigate = useNavigate()
  const isPodcastTrack = !!track?.is_podcast
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(100)
  const [isMuted, setIsMuted] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [isLooping, setIsLooping] = useState(false)
  const [isShuffling, setIsShuffling] = useState(false)
  const [activeSection, setActiveSection] = useState('upnext')
  const [mobilePanelSection, setMobilePanelSection] = useState(null)
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
  const touchStartYRef = useRef(null)
  const touchCurrentYRef = useRef(null)
  const touchStartedOnInteractiveRef = useRef(false)
  const suppressCompactClickRef = useRef(false)
  const mobileCoverTapRef = useRef({ time: 0, side: null })
  const activeLyricLineRef = useRef(null)

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
    if (isPodcastTrack && mobilePanelSection === 'lyrics') {
      setMobilePanelSection('upnext')
    }
  }, [isPodcastTrack, mobilePanelSection])

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

  const timestampedLyrics = parseTimestampedLyrics(lyricsState.text)
  const hasTimestampedLyrics = timestampedLyrics.length > 0
  const activeLyricIndex = hasTimestampedLyrics ? getActiveLyricIndex(timestampedLyrics, currentTime) : -1

  useEffect(() => {
    if (!hasTimestampedLyrics || activeLyricIndex < 0 || !activeLyricLineRef.current) return
    activeLyricLineRef.current.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }, [hasTimestampedLyrics, activeLyricIndex])

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

  const seekBySeconds = (offsetSeconds) => {
    const audio = audioRef.current
    if (!audio) return

    const maxDuration = Number.isFinite(duration) && duration > 0 ? duration : (Number.isFinite(audio.duration) ? audio.duration : 0)
    const nextTime = Math.max(0, Math.min(maxDuration || 0, audio.currentTime + offsetSeconds))
    audio.currentTime = nextTime
    setCurrentTime(nextTime)
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
  const closeExpanded = () => {
    setMobilePanelSection(null)
    setIsExpanded(false)
  }
  const toggleLoop = () => setIsLooping((value) => !value)
  const toggleShuffle = () => setIsShuffling((value) => !value)
  const closeMobilePanel = () => setMobilePanelSection(null)

  const handleCompactTouchStart = (event) => {
    if (!event.touches || event.touches.length === 0) return
    touchStartedOnInteractiveRef.current = isCompactInteractiveTarget(event.target)
    touchStartXRef.current = event.touches[0].clientX
    touchCurrentXRef.current = event.touches[0].clientX
    touchStartYRef.current = event.touches[0].clientY
    touchCurrentYRef.current = event.touches[0].clientY
  }

  const handleCompactTouchMove = (event) => {
    if (!event.touches || event.touches.length === 0) return
    touchCurrentXRef.current = event.touches[0].clientX
    touchCurrentYRef.current = event.touches[0].clientY
  }

  const handleCompactTouchEnd = () => {
    if (touchStartedOnInteractiveRef.current) {
      touchStartXRef.current = null
      touchCurrentXRef.current = null
      touchStartYRef.current = null
      touchCurrentYRef.current = null
      touchStartedOnInteractiveRef.current = false
      return
    }

    if (
      touchStartXRef.current == null ||
      touchCurrentXRef.current == null ||
      touchStartYRef.current == null ||
      touchCurrentYRef.current == null
    ) return

    const deltaX = touchCurrentXRef.current - touchStartXRef.current
    const deltaY = touchCurrentYRef.current - touchStartYRef.current
    const horizontalThreshold = 65
    const verticalDismissThreshold = 85
    const absX = Math.abs(deltaX)
    const absY = Math.abs(deltaY)

    if (absX < 12 && absY < 12) {
      touchStartXRef.current = null
      touchCurrentXRef.current = null
      touchStartYRef.current = null
      touchCurrentYRef.current = null
      touchStartedOnInteractiveRef.current = false
      return
    }

    if (deltaY >= verticalDismissThreshold && absY > absX + 22) {
      onClose?.()
      suppressCompactClickRef.current = true
      touchStartXRef.current = null
      touchCurrentXRef.current = null
      touchStartYRef.current = null
      touchCurrentYRef.current = null
      touchStartedOnInteractiveRef.current = false
      return
    }

    if (absX >= horizontalThreshold && absX > absY + 16) {
      if (deltaX < 0) {
        onNext?.()
      } else {
        onPrevious?.()
      }
      suppressCompactClickRef.current = true
    }

    touchStartXRef.current = null
    touchCurrentXRef.current = null
    touchStartYRef.current = null
    touchCurrentYRef.current = null
    touchStartedOnInteractiveRef.current = false
  }

  const isCompactInteractiveTarget = (target) => {
    if (!(target instanceof Element)) return false
    return !!target.closest('[data-compact-interactive="true"]')
  }

  const handleCompactContainerClick = (event) => {
    if (suppressCompactClickRef.current) {
      suppressCompactClickRef.current = false
      return
    }
    if (isCompactInteractiveTarget(event.target)) return
    toggleExpanded()
  }

  const getMobileCoverSide = (event) => {
    const target = event.currentTarget
    if (!(target instanceof Element)) return null

    const rect = target.getBoundingClientRect()
    const clientX = event.clientX ?? event.changedTouches?.[0]?.clientX
    if (typeof clientX !== 'number') return null

    return clientX >= rect.left + rect.width / 2 ? 'right' : 'left'
  }

  const handleMobileCoverActivated = (event) => {
    const side = getMobileCoverSide(event)
    if (!side) return

    if (typeof event.preventDefault === 'function') {
      event.preventDefault()
    }

    seekBySeconds(side === 'right' ? 10 : -10)
  }

  const handleMobileCoverTouchEnd = (event) => {
    const side = getMobileCoverSide(event)
    if (!side) return

    const now = Date.now()
    const lastTap = mobileCoverTapRef.current
    const isDoubleTap = lastTap.side === side && now - lastTap.time < 300

    if (isDoubleTap) {
      handleMobileCoverActivated(event)
      mobileCoverTapRef.current = { time: 0, side: null }
      return
    }

    mobileCoverTapRef.current = { time: now, side }
  }

  const ControlButton = ({ title, onClick, active = false, disabled = false, className = '', children, ...rest }) => (
    <button
      type="button"
      title={title}
      onClick={onClick}
      disabled={disabled}
      onMouseDown={(event) => event.stopPropagation()}
      onPointerDown={(event) => event.stopPropagation()}
      className={`flex items-center justify-center rounded-full transition focus:outline-none focus:ring-0 ${
        active ? 'bg-white text-black' : 'bg-white/10 text-white hover:bg-white/20'
      } ${disabled ? 'cursor-not-allowed opacity-50 hover:bg-white/10' : ''} ${className}`}
      {...rest}
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
      onClick={handleCompactContainerClick}
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
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation()
            onClose?.()
          }}
          onMouseDown={(event) => event.stopPropagation()}
          onPointerDown={(event) => event.stopPropagation()}
          className="absolute right-5 top-3 z-10 hidden h-7 w-7 items-center justify-center rounded-full bg-white/10 text-white/85 transition hover:bg-white/20 sm:flex"
          title="Close player"
          data-compact-interactive="true"
          aria-label="Close player"
        >
          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M6 6l12 12M18 6 6 18" strokeLinecap="round" />
          </svg>
        </button>

        <div
          className="relative mb-2 sm:mb-0 sm:hidden"
          data-compact-interactive="true"
          onClick={(event) => event.stopPropagation()}
          onMouseDown={(event) => event.stopPropagation()}
          onPointerDown={(event) => event.stopPropagation()}
        >
          <div className="h-[2px] w-full rounded-full bg-white/20">
            <div className="h-full rounded-full bg-white" style={{ width: `${progressPercent}%` }} />
          </div>
          <input
            type="range"
            min="0"
            max={duration || 0}
            value={currentTime}
            onChange={handleSeek}
            onMouseDown={(event) => event.stopPropagation()}
            onPointerDown={(event) => event.stopPropagation()}
            className="absolute -top-2 left-0 h-5 w-full cursor-pointer opacity-0"
          />
        </div>

        <div className="sm:hidden flex items-center gap-3">
          <img
            src={getCoverUrl(track.cover_image)}
            alt={track.title}
            className="h-14 w-14 shrink-0 rounded-xl object-cover shadow-lg ring-1 ring-white/10"
            {...imageProtectionProps}
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
            data-compact-interactive="true"
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
              {...imageProtectionProps}
            />
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-[0.24em] text-gray-500">Now Playing</p>
              <ScrollingText text={track.title} className="text-base font-semibold text-white" />
              <ScrollingText text={track.artist_name} className="text-sm text-gray-300" />
            </div>
          </div>

          <div
            className="min-w-0 px-2 sm:px-4"
            data-compact-interactive="true"
            onMouseDown={(event) => event.stopPropagation()}
            onPointerDown={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between text-xs text-gray-400">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
            <div className="relative mt-2 w-full">
              <div className="relative h-1.5 rounded-full bg-white/25">
                <div className="h-full rounded-full bg-white" style={{ width: `${progressPercent}%` }} />
              </div>
              <input
                type="range"
                min="0"
                max={duration || 0}
                value={currentTime}
                onChange={handleSeek}
                onClick={(event) => event.stopPropagation()}
                onMouseDown={(event) => event.stopPropagation()}
                onPointerDown={(event) => event.stopPropagation()}
                className="absolute left-0 top-0 h-8 w-full cursor-pointer opacity-0"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 text-white" data-compact-interactive="true">
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

            <ControlButton
              title="Start Jam"
              onClick={(event) => {
                event.stopPropagation()
                navigate('/jam', { state: { track, queue, currentTrackIndex } })
              }}
              className="h-11 w-11"
            >
              <svg className="block h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 18V6l12-2v12" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="7" cy="18" r="2" />
                <circle cx="19" cy="16" r="2" />
              </svg>
            </ControlButton>
          </div>
        </div>
      </div>
    </div>
  )

  const ExpandedPlayer = () => {
    const relatedTracks = queue.filter((_, index) => index !== currentTrackIndex).slice(0, 8)

    const renderPanelContent = (section) => (
      <div className="h-full overflow-y-auto px-4 pb-4 pt-3 text-sm text-white/75">
        {section === 'upnext' && (
          queue.length > 0 ? (
            <div className="space-y-1.5">
              {queue.map((queueTrack, index) => {
                const isCurrent = index === currentTrackIndex
                return (
                  <div key={`${queueTrack.id || queueTrack.title}-${index}`} className={`flex items-center gap-3 px-2.5 py-2.5 ${isCurrent ? 'bg-white/10' : ''}`}>
                    <img src={getCoverUrl(queueTrack.cover_image)} alt={queueTrack.title || 'Track'} className="h-10 w-10 shrink-0 object-cover" {...imageProtectionProps} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-white/90">{queueTrack.title || 'Untitled'}</p>
                      <p className="truncate text-xs text-white/55">{queueTrack.artist_name || queueTrack.artist || 'Unknown Artist'}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="py-6 text-center text-white/70">Queue is empty.</p>
          )
        )}

        {section === 'lyrics' && (
          <div className="bg-[#090909] px-2 py-1">
            {lyricsState.loading && <p className="py-6 text-white/80">Fetching lyrics...</p>}
            {!lyricsState.loading && lyricsState.error && <p className="py-6 text-white/70">{lyricsState.error}</p>}
            {!lyricsState.loading && lyricsState.text && !hasTimestampedLyrics && (
              <pre className="whitespace-pre-wrap break-words font-inherit text-sm leading-8 text-white/92">{lyricsState.text}</pre>
            )}
            {!lyricsState.loading && hasTimestampedLyrics && (
              <div className="space-y-2 pb-10 pt-6">
                {timestampedLyrics.map((line, index) => {
                  const isActive = index === activeLyricIndex
                  return (
                    <p
                      key={line.id}
                      ref={isActive ? activeLyricLineRef : null}
                      className={`transition-all duration-300 ${isActive ? 'text-white text-lg font-semibold' : 'text-white/45 text-sm'}`}
                    >
                      {line.text || '...'}
                    </p>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {section === 'related' && (
          relatedTracks.length > 0 ? (
            <div className="space-y-1.5">
              {relatedTracks.map((relatedTrack, index) => (
                <div key={`${relatedTrack.id || relatedTrack.title}-${index}`} className="flex items-center gap-3 px-2.5 py-2.5">
                  <img src={getCoverUrl(relatedTrack.cover_image)} alt={relatedTrack.title || 'Track'} className="h-10 w-10 shrink-0 object-cover" {...imageProtectionProps} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-white/90">{relatedTrack.title || 'Untitled'}</p>
                    <p className="truncate text-xs text-white/55">{relatedTrack.artist_name || relatedTrack.artist || 'Unknown Artist'}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="py-6 text-center text-white/70">Related tracks will appear here.</p>
          )
        )}
      </div>
    )

    return (
      <div className="fixed inset-0 z-[60] overflow-hidden text-white">
        <div className="pointer-events-none absolute inset-0 bg-[#0b0b0b] lg:hidden" />
        <div className="pointer-events-none absolute inset-0 hidden overflow-hidden lg:block">
          <img
            src={getCoverUrl(track.cover_image)}
            alt={track.title}
            className="h-full w-full scale-110 object-cover blur-3xl"
            {...imageProtectionProps}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/78 to-black/92" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_35%_20%,rgba(255,255,255,0.14),transparent_46%)]" />
        </div>

        <div className="relative mx-auto flex h-[100dvh] w-full max-w-7xl flex-col overflow-hidden px-5 py-6 sm:px-8 lg:h-screen lg:px-10 lg:py-8">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-[0.28em] text-white/65">Now Playing</p>
            <button
              type="button"
              onClick={closeExpanded}
              onMouseDown={(event) => event.stopPropagation()}
              onPointerDown={(event) => event.stopPropagation()}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
              title="Close"
            >
              <svg className="h-5 w-5 fill-current" viewBox="0 0 24 24">
                <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          <div className="mt-4 flex min-h-0 flex-1 flex-col lg:hidden">
            <div className="min-h-0 flex-1 space-y-4 overflow-hidden">
              {mobilePanelSection !== 'lyrics' && (
                <div
                  className="mx-auto w-full max-w-xs touch-manipulation"
                  onDoubleClick={handleMobileCoverActivated}
                  onTouchEnd={handleMobileCoverTouchEnd}
                >
                  <img
                    src={getCoverUrl(track.cover_image)}
                    alt={track.title}
                    className="aspect-square w-full rounded-xl object-cover"
                    {...imageProtectionProps}
                  />
                </div>
              )}

              {mobilePanelSection === 'lyrics' && (
                <div className="rounded-xl bg-[#090909] p-3">
                  {lyricsState.loading && <p className="py-6 text-white/80">Fetching lyrics...</p>}
                  {!lyricsState.loading && lyricsState.error && <p className="py-6 text-white/70">{lyricsState.error}</p>}
                  {!lyricsState.loading && lyricsState.text && !hasTimestampedLyrics && (
                    <pre className="max-h-[44dvh] overflow-y-auto whitespace-pre-wrap break-words font-inherit text-sm leading-8 text-white/92">{lyricsState.text}</pre>
                  )}
                  {!lyricsState.loading && hasTimestampedLyrics && (
                    <div className="max-h-[44dvh] space-y-2 overflow-y-auto pb-8 pt-3">
                      {timestampedLyrics.map((line, index) => {
                        const isActive = index === activeLyricIndex
                        return (
                          <p
                            key={line.id}
                            ref={isActive ? activeLyricLineRef : null}
                            className={`transition-all duration-300 ${isActive ? 'text-white text-lg font-semibold' : 'text-white/45 text-sm'}`}
                          >
                            {line.text || '...'}
                          </p>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}

              <div>
                <ScrollingText text={track.title} className="text-2xl font-bold leading-tight" />
                <ScrollingText text={track.artist_name} className="mt-2 text-sm text-white/65" outerClassName="mt-2" />
              </div>
            </div>

            <div className="mt-3">
              <div className="relative h-1.5 rounded-full bg-white/20">
                <div className="h-full rounded-full bg-white" style={{ width: `${progressPercent}%` }} />
              </div>
              <input
                type="range"
                min="0"
                max={duration || 0}
                value={currentTime}
                onChange={handleSeek}
                className="-mt-3 h-7 w-full cursor-pointer opacity-0"
              />
              <div className="-mt-1 flex items-center justify-between text-xs text-white/70">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-center gap-2">
              <ControlButton title="Shuffle" onClick={toggleShuffle} active={isShuffling} className="h-10 w-10 bg-white/10">
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 3h4v4" />
                  <path d="M21 3l-6 6" />
                  <path d="M3 7h5l4 4" />
                  <path d="M3 17h5l9-9" />
                  <path d="M17 17h4v4" />
                  <path d="M21 21l-6-6" />
                </svg>
              </ControlButton>

              <ControlButton title="Previous" onClick={onPrevious} className="h-11 w-11 bg-white/10">
                <svg className="h-5 w-5 fill-current" viewBox="0 0 24 24">
                  <path d="M6 6h2v12H6zm3 6 9 6V6z" />
                </svg>
              </ControlButton>

              <ControlButton title={isPlaying ? 'Pause' : 'Play'} onClick={onPlayPause} active className="h-14 w-14 bg-white text-black">
                {isPlaying ? (
                  <svg className="block h-7 w-7 fill-current" viewBox="0 0 24 24">
                    <path d="M6 3h4v18H6V3zm8 0h4v18h-4V3z" />
                  </svg>
                ) : (
                  <svg className="block h-7 w-7 fill-current" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                )}
              </ControlButton>

              <ControlButton title="Next" onClick={onNext} className="h-11 w-11 bg-white/10">
                <svg className="h-5 w-5 fill-current" viewBox="0 0 24 24">
                  <path d="M16 6h2v12h-2zM6 18l9-6-9-6v12z" />
                </svg>
              </ControlButton>

              <ControlButton title="Loop" onClick={toggleLoop} active={isLooping} className="h-10 w-10 bg-white/10">
                <svg className="h-5 w-5 fill-current" viewBox="0 0 24 24">
                  <path d="M7 7h11l-2.5-2.5L17 3l5 5-5 5-1.5-1.5L18 9H7a2 2 0 0 0-2 2v1H3v-1a4 4 0 0 1 4-4zm10 10H6l2.5 2.5L7 21l-5-5 5-5 1.5 1.5L6 15h11a2 2 0 0 0 2-2v-1h2v1a4 4 0 0 1-4 4z" />
                </svg>
              </ControlButton>
            </div>

            <section className={`mt-4 flex flex-col rounded-xl p-3 ${activeSection === 'lyrics' ? 'bg-[#090909]' : 'bg-black/40'}`}>
              <div className={`grid ${isPodcastTrack ? 'grid-cols-2' : 'grid-cols-3'} gap-4 border-b border-white/10 pb-2 text-left`}>
                <button
                  type="button"
                  onClick={() => {
                    setActiveSection('upnext')
                    setMobilePanelSection('upnext')
                  }}
                  className={`relative pb-2 text-xs font-medium uppercase tracking-[0.12em] transition ${activeSection === 'upnext' ? 'text-white' : 'text-white/60'}`}
                >
                  Up Next
                  <span className={`absolute bottom-0 left-0 h-[2px] bg-white transition-all duration-300 ${activeSection === 'upnext' ? 'w-full' : 'w-0'}`} />
                </button>
                {!isPodcastTrack && (
                  <button
                    type="button"
                    onClick={() => {
                      setActiveSection('lyrics')
                      setMobilePanelSection('lyrics')
                    }}
                    className={`relative pb-2 text-xs font-medium uppercase tracking-[0.12em] transition ${activeSection === 'lyrics' ? 'text-white' : 'text-white/60'}`}
                  >
                    Lyrics
                    <span className={`absolute bottom-0 left-0 h-[2px] bg-white transition-all duration-300 ${activeSection === 'lyrics' ? 'w-full' : 'w-0'}`} />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setActiveSection('related')
                    setMobilePanelSection('related')
                  }}
                  className={`relative pb-2 text-xs font-medium uppercase tracking-[0.12em] transition ${activeSection === 'related' ? 'text-white' : 'text-white/60'}`}
                >
                  Related
                  <span className={`absolute bottom-0 left-0 h-[2px] bg-white transition-all duration-300 ${activeSection === 'related' ? 'w-full' : 'w-0'}`} />
                </button>
              </div>

            </section>
          </div>

          <div className="mt-8 hidden grid-cols-1 gap-10 lg:grid xl:grid-cols-[minmax(0,0.92fr)_minmax(0,1.2fr)_minmax(0,0.95fr)] xl:items-center">
            <section className="flex items-center justify-center xl:min-h-[72vh]">
              <div className="w-full max-w-sm">
                <img
                  src={getCoverUrl(track.cover_image)}
                  alt={track.title}
                  className="aspect-square w-full rounded-2xl object-cover shadow-[0_28px_90px_rgba(0,0,0,0.55)]"
                  {...imageProtectionProps}
                />
              </div>
            </section>

            <section className="flex flex-col justify-center gap-8 xl:min-h-[72vh]">
              <div>
                <ScrollingText text={track.title} className="text-3xl font-bold leading-tight sm:text-4xl lg:text-5xl" />
                <ScrollingText text={track.artist_name} className="mt-3 text-base text-white/68 sm:text-lg" outerClassName="mt-3" />
              </div>

              <div>
                <div className="group relative w-full">
                  <div className="relative h-1.5 rounded-full bg-white/20">
                    <div className="h-full rounded-full bg-white transition-all duration-300" style={{ width: `${progressPercent}%` }} />
                  </div>
                  <input
                    type="range"
                    min="0"
                    max={duration || 0}
                    value={currentTime}
                    onChange={handleSeek}
                    className="absolute left-0 top-0 h-7 w-full cursor-pointer opacity-0"
                  />
                </div>
                <div className="mt-2 flex items-center justify-between text-sm text-white/72">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>

              <div className="flex items-center justify-center gap-2 sm:gap-3">
                <ControlButton title="Shuffle" onClick={toggleShuffle} active={isShuffling} className="h-10 w-10 bg-transparent hover:bg-white/12">
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17 3h4v4" />
                    <path d="M21 3l-6 6" />
                    <path d="M3 7h5l4 4" />
                    <path d="M3 17h5l9-9" />
                    <path d="M17 17h4v4" />
                    <path d="M21 21l-6-6" />
                  </svg>
                </ControlButton>

                <ControlButton title="Previous" onClick={onPrevious} className="h-11 w-11 bg-transparent hover:bg-white/12">
                  <svg className="h-5 w-5 fill-current" viewBox="0 0 24 24">
                    <path d="M6 6h2v12H6zm3 6 9 6V6z" />
                  </svg>
                </ControlButton>

                <ControlButton
                  title={isPlaying ? 'Pause' : 'Play'}
                  onClick={onPlayPause}
                  active
                  className="h-16 w-16 bg-white text-black shadow-[0_14px_40px_rgba(0,0,0,0.45)] md:h-20 md:w-20"
                >
                  {isPlaying ? (
                    <svg className="block h-8 w-8 fill-current md:h-9 md:w-9" viewBox="0 0 24 24">
                      <path d="M6 3h4v18H6V3zm8 0h4v18h-4V3z" />
                    </svg>
                  ) : (
                    <svg className="block h-8 w-8 fill-current md:h-9 md:w-9" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  )}
                </ControlButton>

                <ControlButton title="Next" onClick={onNext} className="h-11 w-11 bg-transparent hover:bg-white/12">
                  <svg className="h-5 w-5 fill-current" viewBox="0 0 24 24">
                    <path d="M16 6h2v12h-2zM6 18l9-6-9-6v12z" />
                  </svg>
                </ControlButton>

                <ControlButton title="Loop" onClick={toggleLoop} active={isLooping} className="h-10 w-10 bg-transparent hover:bg-white/12">
                  <svg className="h-5 w-5 fill-current" viewBox="0 0 24 24">
                    <path d="M7 7h11l-2.5-2.5L17 3l5 5-5 5-1.5-1.5L18 9H7a2 2 0 0 0-2 2v1H3v-1a4 4 0 0 1 4-4zm10 10H6l2.5 2.5L7 21l-5-5 5-5 1.5 1.5L6 15h11a2 2 0 0 0 2-2v-1h2v1a4 4 0 0 1-4 4z" />
                  </svg>
                </ControlButton>

                <ControlButton
                  title={isPodcastTrack ? 'Podcasts cannot be added' : 'Add to playlist'}
                  onClick={togglePlaylistPanel}
                  disabled={isPodcastTrack}
                  className="h-10 w-10 bg-transparent hover:bg-white/12"
                >
                  <svg className="h-5 w-5 fill-current" viewBox="0 0 24 24">
                    <path d="M19 11h-6V5h-2v6H5v2h6v6h2v-6h6z" />
                  </svg>
                </ControlButton>
              </div>

              <div className="flex items-center justify-center gap-3 text-white/90">
                <button
                  type="button"
                  onClick={handleMuteToggle}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 transition hover:bg-white/20"
                  title={isMuted || volume === 0 ? 'Unmute' : 'Mute'}
                >
                  {isMuted || volume === 0 ? (
                    <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                      <path d="M14 3.23v2.06a7.001 7.001 0 0 1 0 13.42v2.06A9.003 9.003 0 0 0 14 3.23zM3 9v6h4l5 5V4L7 9H3z" />
                      <path d="m16.5 8.5 6 6-1.41 1.41-6-6z" />
                    </svg>
                  ) : (
                    <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
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
                  className="h-1.5 w-36 cursor-pointer appearance-none rounded-full bg-white/15 accent-white"
                />
                <span className="w-9 text-right text-xs font-medium text-white/70">{volume}%</span>
              </div>
            </section>

            <section className={`${activeSection === 'lyrics' ? 'bg-[#090909]' : 'bg-black/22'} p-4 backdrop-blur-sm xl:min-h-[72vh] xl:p-5`}>
              <div className={`grid ${isPodcastTrack ? 'grid-cols-2' : 'grid-cols-3'} gap-6 border-b border-white/10 pb-3 text-left`}>
                <button
                  type="button"
                  onClick={() => setActiveSection('upnext')}
                  className={`relative pb-2 text-sm font-medium tracking-[0.12em] uppercase transition ${activeSection === 'upnext' ? 'text-white' : 'text-white/55 hover:text-white/85'}`}
                >
                  Up Next
                  <span className={`absolute bottom-0 left-0 h-[2px] bg-white transition-all duration-300 ${activeSection === 'upnext' ? 'w-full' : 'w-0'}`} />
                </button>
                {!isPodcastTrack && (
                  <button
                    type="button"
                    onClick={() => setActiveSection('lyrics')}
                    className={`relative pb-2 text-sm font-medium tracking-[0.12em] uppercase transition ${activeSection === 'lyrics' ? 'text-white' : 'text-white/55 hover:text-white/85'}`}
                  >
                    Lyrics
                    <span className={`absolute bottom-0 left-0 h-[2px] bg-white transition-all duration-300 ${activeSection === 'lyrics' ? 'w-full' : 'w-0'}`} />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setActiveSection('related')}
                  className={`relative pb-2 text-sm font-medium tracking-[0.12em] uppercase transition ${activeSection === 'related' ? 'text-white' : 'text-white/55 hover:text-white/85'}`}
                >
                  Related
                  <span className={`absolute bottom-0 left-0 h-[2px] bg-white transition-all duration-300 ${activeSection === 'related' ? 'w-full' : 'w-0'}`} />
                </button>
              </div>

              <div className={`relative mt-4 pr-1 ${activeSection === 'lyrics' ? '' : 'max-h-[44vh] overflow-y-auto xl:max-h-[60vh]'}`}>
                {activeSection === 'upnext' && (
                  queue.length > 0 ? (
                    <div className="space-y-1.5">
                      {queue.map((queueTrack, index) => {
                        const isCurrent = index === currentTrackIndex
                        return (
                          <div
                            key={`${queueTrack.id || queueTrack.title}-${index}`}
                            className={`flex items-center gap-3 px-2 py-2.5 transition ${isCurrent ? 'bg-white/12' : 'hover:bg-white/8'}`}
                          >
                            <img
                              src={getCoverUrl(queueTrack.cover_image)}
                              alt={queueTrack.title || 'Track'}
                              className="h-10 w-10 shrink-0 object-cover"
                              {...imageProtectionProps}
                            />
                            <div className="min-w-0 flex-1 text-left">
                              <p className={`truncate text-sm font-semibold ${isCurrent ? 'text-white' : 'text-white/85'}`}>
                                {queueTrack.title || 'Untitled'}
                              </p>
                              <p className="truncate text-xs text-white/55">
                                {queueTrack.artist_name || queueTrack.artist || 'Unknown Artist'}
                              </p>
                            </div>
                            {isCurrent && <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/85">Now</span>}
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <p className="pt-8 text-center text-white/70">Queue is empty.</p>
                  )
                )}

                {activeSection === 'lyrics' && (
                  <div className="max-h-[60vh] overflow-y-auto bg-[#090909] p-4 text-left xl:max-h-[62vh]">
                    {lyricsState.loading && <p className="pt-8 text-white/80">Fetching lyrics...</p>}
                    {!lyricsState.loading && lyricsState.error && <p className="pt-8 text-white/70">{lyricsState.error}</p>}
                    {!lyricsState.loading && lyricsState.text && (
                      <>
                        <pre className="whitespace-pre-wrap break-words font-inherit text-base leading-9 text-white/95">
                          {lyricsState.text}
                        </pre>
                        {lyricsState.source && (
                          <p className="mt-4 text-[11px] uppercase tracking-wide text-white/50">
                            Source: {lyricsState.source}
                          </p>
                        )}
                      </>
                    )}
                  </div>
                )}

                {activeSection === 'related' && (
                  relatedTracks.length > 0 ? (
                    <div className="space-y-1.5">
                      {relatedTracks.map((relatedTrack, index) => (
                        <div key={`${relatedTrack.id || relatedTrack.title}-${index}`} className="flex items-center gap-3 px-2 py-2.5 transition hover:bg-white/8">
                          <img
                            src={getCoverUrl(relatedTrack.cover_image)}
                            alt={relatedTrack.title || 'Track'}
                            className="h-10 w-10 shrink-0 object-cover"
                            {...imageProtectionProps}
                          />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-white/90">{relatedTrack.title || 'Untitled'}</p>
                            <p className="truncate text-xs text-white/55">{relatedTrack.artist_name || relatedTrack.artist || 'Unknown Artist'}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="pt-8 text-center text-white/70">Related tracks will appear here.</p>
                  )
                )}

                {activeSection !== 'lyrics' && (
                  <>
                    <div className="pointer-events-none absolute inset-x-0 top-0 h-8 bg-gradient-to-b from-black/35 to-transparent" />
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-black/35 to-transparent" />
                  </>
                )}
              </div>
            </section>
          </div>
        </div>

        {mobilePanelSection && (
          <div className="fixed inset-0 z-[75] flex flex-col bg-[#0b0b0b] lg:hidden">
            <div className="border-b border-white/10 bg-[#121212] px-4 py-3">
              <div className="flex items-center gap-3">
                <img
                  src={getCoverUrl(track.cover_image)}
                  alt={track.title}
                  className="h-12 w-12 rounded-lg object-cover"
                  {...imageProtectionProps}
                />
                <div className="min-w-0 flex-1">
                  <ScrollingText text={track.title} className="text-base font-semibold text-white" />
                  <ScrollingText text={track.artist_name} className="text-xs text-white/70" />
                </div>
                <button
                  type="button"
                  onClick={closeMobilePanel}
                  className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium text-white"
                >
                  Close
                </button>
              </div>

              <div className={`mt-3 grid ${isPodcastTrack ? 'grid-cols-2' : 'grid-cols-3'} gap-2 border-t border-white/10 pt-2`}>
                <button
                  type="button"
                  onClick={() => {
                    setActiveSection('upnext')
                    setMobilePanelSection('upnext')
                  }}
                  className={`rounded-md py-2 text-xs font-semibold uppercase tracking-[0.1em] ${mobilePanelSection === 'upnext' ? 'bg-white text-black' : 'bg-white/10 text-white/80'}`}
                >
                  Up Next
                </button>
                {!isPodcastTrack && (
                  <button
                    type="button"
                    onClick={() => {
                      setActiveSection('lyrics')
                      setMobilePanelSection('lyrics')
                    }}
                    className={`rounded-md py-2 text-xs font-semibold uppercase tracking-[0.1em] ${mobilePanelSection === 'lyrics' ? 'bg-white text-black' : 'bg-white/10 text-white/80'}`}
                  >
                    Lyrics
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setActiveSection('related')
                    setMobilePanelSection('related')
                  }}
                  className={`rounded-md py-2 text-xs font-semibold uppercase tracking-[0.1em] ${mobilePanelSection === 'related' ? 'bg-white text-black' : 'bg-white/10 text-white/80'}`}
                >
                  Related
                </button>
              </div>
            </div>

            <div className="min-h-0 flex-1">
              {renderPanelContent(mobilePanelSection)}
            </div>
          </div>
        )}

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
  }

  return (
    <>
      <audio ref={audioRef} src={getStreamUrl(track.id)} crossOrigin="anonymous" />
      {isExpanded ? <ExpandedPlayer /> : <CompactPlayer />}
    </>
  )
}

export default PlayerBar
