import React, { useEffect, useMemo, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useNavigate } from 'react-router-dom'
import { musicAPI } from '../services/api'

const newAlbumTrackRow = () => ({
  id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
  title: '',
  artistName: '',
  audioFile: null,
  coverImage: null,
})

function Upload({ user }) {
  const navigate = useNavigate()
  const [uploadMode, setUploadMode] = useState('single')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [releaseDate, setReleaseDate] = useState('')
  const [language, setLanguage] = useState('English')
  const [genreId, setGenreId] = useState('')
  const [isPodcast, setIsPodcast] = useState(false)
  const [explicit, setExplicit] = useState(false)
  const [songType, setSongType] = useState('single')
  const [albumName, setAlbumName] = useState('')
  const [albumArtist, setAlbumArtist] = useState('')
  const [audioFile, setAudioFile] = useState(null)
  const [coverImage, setCoverImage] = useState(null)
  const [albumCoverImage, setAlbumCoverImage] = useState(null)
  const [albumTracks, setAlbumTracks] = useState([newAlbumTrackRow()])
  const [lyricsMode, setLyricsMode] = useState('none')
  const [lyricsText, setLyricsText] = useState('')
  const [lyricsFile, setLyricsFile] = useState(null)
  const [featuredArtists, setFeaturedArtists] = useState([])
  const [artistInput, setArtistInput] = useState('')
  const [artistSuggestions, setArtistSuggestions] = useState([])
  const [albumSuggestions, setAlbumSuggestions] = useState([])
  const [metadataDetecting, setMetadataDetecting] = useState(false)
  const [embeddedCoverFound, setEmbeddedCoverFound] = useState(false)

  const [genres, setGenres] = useState([])
  const [loadingGenres, setLoadingGenres] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})

  const canUpload = user?.role === 'admin' || user?.role === 'artist'

  useEffect(() => {
    if (uploadMode === 'album') {
      setIsPodcast(false)
      setSongType('album')
      setLyricsMode('none')
    }
  }, [uploadMode])

  useEffect(() => {
    const loadGenres = async () => {
      try {
        setLoadingGenres(true)
        const response = await musicAPI.getGenres(isPodcast)
        const items = Array.isArray(response.data) ? response.data : response.data?.results || []
        setGenres(items)

        if (!items.find((item) => item.id === genreId)) {
          setGenreId(items[0]?.id || '')
        }
      } catch (err) {
        setError('Failed to load genres.')
      } finally {
        setLoadingGenres(false)
      }
    }

    loadGenres()
  }, [isPodcast, genreId])

  useEffect(() => {
    let cancelled = false

    const loadSuggestions = async () => {
      try {
        const response = await musicAPI.getArtistSuggestions(artistInput)
        if (!cancelled) {
          const list = Array.isArray(response.data) ? response.data : []
          setArtistSuggestions(list)
        }
      } catch (err) {
        if (!cancelled) {
          setArtistSuggestions([])
        }
      }
    }

    if (artistInput.trim().length === 0) {
      setArtistSuggestions([])
      return () => {
        cancelled = true
      }
    }

    const timeoutId = setTimeout(loadSuggestions, 220)
    return () => {
      cancelled = true
      clearTimeout(timeoutId)
    }
  }, [artistInput])

  useEffect(() => {
    let cancelled = false

    const loadAlbumSuggestions = async () => {
      try {
        const response = await musicAPI.getAlbumSuggestions(albumName)
        if (!cancelled) {
          const list = Array.isArray(response.data) ? response.data : []
          setAlbumSuggestions(list)
        }
      } catch (err) {
        if (!cancelled) {
          setAlbumSuggestions([])
        }
      }
    }

    if (albumName.trim().length === 0) {
      setAlbumSuggestions([])
      return () => {
        cancelled = true
      }
    }

    const timeoutId = setTimeout(loadAlbumSuggestions, 220)
    return () => {
      cancelled = true
      clearTimeout(timeoutId)
    }
  }, [albumName])

  const submitLabel = useMemo(() => {
    if (submitting) return 'Uploading...'
    if (uploadMode === 'album') return 'Upload Album'
    return 'Submit for Review'
  }, [submitting, uploadMode])

  const addArtist = (name) => {
    const value = name.trim()
    if (!value) return
    if (featuredArtists.some((artist) => artist.toLowerCase() === value.toLowerCase())) {
      setArtistInput('')
      return
    }
    setFeaturedArtists((prev) => [...prev, value])
    setArtistInput('')
    setArtistSuggestions([])
  }

  const removeArtist = (name) => {
    setFeaturedArtists((prev) => prev.filter((artist) => artist !== name))
  }

  const onArtistInputKeyDown = (event) => {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault()
      addArtist(artistInput)
    }
  }

  const parseArtistNames = (value) => {
    if (!value) return []
    return value
      .split(/,|;|\/|&/) 
      .map((name) => name.trim())
      .filter(Boolean)
  }

  const handleAudioFileChange = async (event) => {
    const file = event.target.files?.[0] || null
    setAudioFile(file)
    setEmbeddedCoverFound(false)

    if (!file) return

    // Always default title from selected filename.
    const filenameWithoutExt = file.name.replace(/\.[^/.]+$/, '')
    setTitle(filenameWithoutExt)

    try {
      setMetadataDetecting(true)
      const response = await musicAPI.extractUploadMetadata(file)
      const data = response.data || {}

      if (data.album_name) {
        setAlbumName(data.album_name)
      }

      if (data.release_date) {
        setReleaseDate(data.release_date)
      }

      if (data.featured_artists) {
        const parsedArtists = parseArtistNames(data.featured_artists)
        if (parsedArtists.length > 0) {
          setFeaturedArtists(parsedArtists)
        }
      }

      if (data.has_embedded_cover) {
        setEmbeddedCoverFound(true)
      }
    } catch (err) {
      // Metadata extraction failure should not block upload.
      setEmbeddedCoverFound(false)
    } finally {
      setMetadataDetecting(false)
    }
  }

  const handleAlbumTrackFileChange = async (rowId, file) => {
    updateAlbumTrackRow(rowId, { audioFile: file })
    if (!file) return

    const filenameWithoutExt = file.name.replace(/\.[^/.]+$/, '')
    setAlbumTracks((prev) => prev.map((row) => {
      if (row.id !== rowId) return row
      return {
        ...row,
        title: row.title.trim() ? row.title : filenameWithoutExt,
      }
    }))

    try {
      const response = await musicAPI.extractUploadMetadata(file)
      const data = response.data || {}

      if (data.title) {
        setAlbumTracks((prev) => prev.map((row) => {
          if (row.id !== rowId) return row
          return {
            ...row,
            title: data.title,
          }
        }))
      }

      if (data.album_artist) {
        setAlbumArtist((current) => current.trim() ? current : data.album_artist)
      }

      if (data.album_name && !albumName.trim()) {
        setAlbumName(data.album_name)
      }

      if (data.release_date && !releaseDate) {
        setReleaseDate(data.release_date)
      }

      if (data.featured_artists) {
        const parsedArtists = parseArtistNames(data.featured_artists)
        if (parsedArtists.length > 0) {
          setAlbumTracks((prev) => prev.map((row) => {
            if (row.id !== rowId) return row
            return { ...row, artistName: parsedArtists.join(', ') }
          }))
        }
      }
    } catch {
      // Metadata is optional for album rows.
    }
  }

  const addAlbumTrackRow = () => {
    setAlbumTracks((prev) => [...prev, newAlbumTrackRow()])
  }

  const removeAlbumTrackRow = (trackId) => {
    setAlbumTracks((prev) => {
      if (prev.length <= 1) return prev
      return prev.filter((row) => row.id !== trackId)
    })
  }

  const updateAlbumTrackRow = (trackId, patch) => {
    setAlbumTracks((prev) => prev.map((row) => (row.id === trackId ? { ...row, ...patch } : row)))
  }

  const resetForm = () => {
    setUploadMode('single')
    setTitle('')
    setDescription('')
    setReleaseDate('')
    setLanguage('English')
    setGenreId('')
    setIsPodcast(false)
    setExplicit(false)
    setSongType('single')
    setAlbumName('')
    setAlbumArtist('')
    setAudioFile(null)
    setCoverImage(null)
    setAlbumCoverImage(null)
    setAlbumTracks([newAlbumTrackRow()])
    setLyricsMode('none')
    setLyricsText('')
    setLyricsFile(null)
    setFeaturedArtists([])
    setArtistInput('')
    setArtistSuggestions([])
    setAlbumSuggestions([])
    setMetadataDetecting(false)
    setEmbeddedCoverFound(false)
    setError('')
    setSuccess('')
  }

  const handleCancelUpload = () => {
    resetForm()
    navigate('/')
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setSuccess('')
    setFieldErrors({})

    const nextFieldErrors = {}

    if (uploadMode === 'single' && !title.trim()) {
      nextFieldErrors.title = 'Title is required.'
    }

    if (uploadMode === 'album' && !albumName.trim()) {
      nextFieldErrors.album_name = 'Album name is required.'
    }

    if (uploadMode === 'album' && !albumArtist.trim()) {
      nextFieldErrors.album_artist = 'Album artist is required.'
    }

    if (!language.trim()) {
      nextFieldErrors.language = 'Language is required.'
    }

    if (!genreId) {
      nextFieldErrors.genre = 'Genre is required.'
    }

    if (uploadMode === 'single' && !audioFile) {
      nextFieldErrors.audio_file = 'Audio file is required.'
    }

    if (uploadMode === 'album') {
      const rowsWithMissing = albumTracks
        .filter((row) => !row.title.trim() || !row.audioFile)
        .map((row, index) => index + 1)

      if (rowsWithMissing.length > 0) {
        nextFieldErrors.album_tracks = `Each song row needs title and audio file (check rows: ${rowsWithMissing.join(', ')}).`
      }

      if (!releaseDate) {
        nextFieldErrors.release_date = 'Release date is required for album uploads.'
      }
    }

    if (lyricsMode === 'file' && lyricsFile && !lyricsFile.name.toLowerCase().endsWith('.lrc')) {
      nextFieldErrors.lyrics_file = 'Lyrics file must be .lrc'
    }

    if (Object.keys(nextFieldErrors).length > 0) {
      setFieldErrors(nextFieldErrors)
      setError('Please fix the highlighted required fields.')
      return
    }

    try {
      setSubmitting(true)

      if (uploadMode === 'album') {
        let uploadedCount = 0
        const rowMetadata = await Promise.all(
          albumTracks.map(async (row) => {
            if (row.coverImage || !row.audioFile) {
              return { id: row.id, hasEmbeddedCover: false }
            }

            try {
              const response = await musicAPI.extractUploadMetadata(row.audioFile)
              return {
                id: row.id,
                hasEmbeddedCover: !!response.data?.has_embedded_cover,
              }
            } catch {
              return { id: row.id, hasEmbeddedCover: false }
            }
          })
        )
        const metadataByRowId = new Map(rowMetadata.map((item) => [item.id, item]))

        for (const row of albumTracks) {
          const payload = new FormData()
          payload.append('title', row.title.trim())
          payload.append('description', description.trim())
          payload.append('genre', genreId)
          payload.append('release_date', releaseDate)
          payload.append('language', language.trim())
          payload.append('is_podcast', 'false')
          payload.append('explicit', String(explicit))
          payload.append('song_type', 'album')
          payload.append('audio_file', row.audioFile)
          payload.append('album_artist', albumArtist.trim())
          if (albumCoverImage) {
            payload.append('album_cover_image', albumCoverImage)
          }

          const rowInfo = metadataByRowId.get(row.id)

          if (row.coverImage) {
            payload.append('cover_image', row.coverImage)
          } else if (albumCoverImage && !rowInfo?.hasEmbeddedCover) {
            payload.append('cover_image', albumCoverImage)
          }

          const resolvedRowArtist = row.artistName.trim() || albumArtist.trim()
          if (resolvedRowArtist) {
            payload.append('featured_artists', resolvedRowArtist)
          }

          payload.append('album_name', albumName.trim())

          await musicAPI.uploadTrack(payload)
          uploadedCount += 1
        }

        setSuccess(`Album upload complete. ${uploadedCount} song(s) submitted for review.`)
      } else {
        const payload = new FormData()
        payload.append('title', title.trim())
        payload.append('description', description.trim())
        payload.append('genre', genreId)
        if (releaseDate) {
          payload.append('release_date', releaseDate)
        }
        payload.append('language', language.trim())
        payload.append('is_podcast', String(isPodcast))
        payload.append('explicit', String(explicit))
        payload.append('song_type', songType)
        payload.append('audio_file', audioFile)
        if (coverImage) {
          payload.append('cover_image', coverImage)
        }

        if (featuredArtists.length > 0) {
          payload.append('featured_artists', featuredArtists.join(', '))
        }

        if (albumName.trim()) {
          payload.append('album_name', albumName.trim())
        }

        if (lyricsMode === 'text' && lyricsText.trim()) {
          payload.append('lyrics_text', lyricsText.trim())
        }

        if (lyricsMode === 'file' && lyricsFile) {
          payload.append('lyrics_file', lyricsFile)
        }

        await musicAPI.uploadTrack(payload)
        setSuccess('Upload submitted successfully. Your content is now pending moderation review.')
      }

      resetForm()
      setFieldErrors({})
    } catch (err) {
      const responseData = err.response?.data
      if (typeof responseData === 'object' && responseData !== null) {
        const inlineErrors = {}
        Object.entries(responseData).forEach(([field, message]) => {
          inlineErrors[field] = Array.isArray(message) ? message.join(', ') : String(message)
        })
        setFieldErrors(inlineErrors)
        const joined = Object.entries(responseData)
          .map(([field, message]) => {
            const normalized = Array.isArray(message) ? message.join(', ') : String(message)
            return `${field}: ${normalized}`
          })
          .join(' | ')
        setError(joined || 'Upload failed.')
      } else {
        setError('Upload failed. Please check your form and try again.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  if (!canUpload) {
    return <Navigate to="/" replace />
  }

  return (
    <main className="pb-36 pt-4">
      <div className="mx-auto w-full max-w-7xl px-6 lg:px-10">
        <div className="border border-dark-tertiary bg-dark-secondary/70 p-7 md:p-10">
          <h1 className="text-3xl font-bold text-white">Upload Content</h1>
          <p className="mt-2 text-sm text-gray-400">
            Add songs or podcasts with genre, multi-artist credits, and optional lyrics. Cover is optional if audio already includes embedded artwork.
          </p>

          {error && <div className="mt-4 rounded-lg border border-red-800/60 bg-red-950/25 px-4 py-3 text-sm text-red-300">{error}</div>}
          {success && <div className="mt-4 rounded-lg border border-emerald-800/60 bg-emerald-950/25 px-4 py-3 text-sm text-emerald-300">{success}</div>}

          <div className="mt-5 border border-dark-tertiary bg-dark-bg/60 p-4">
            <p className="text-sm font-semibold text-white">Upload Mode</p>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setUploadMode('single')}
                className={`rounded-lg border px-4 py-2.5 text-left text-sm transition ${
                  uploadMode === 'single'
                    ? 'border-white bg-white text-black'
                    : 'border-white/70 bg-white/85 text-black hover:bg-white'
                }`}
              >
                Current Song / Podcast
              </button>
              <button
                type="button"
                onClick={() => setUploadMode('album')}
                className={`rounded-lg border px-4 py-2.5 text-left text-sm transition ${
                  uploadMode === 'album'
                    ? 'border-white bg-white text-black'
                    : 'border-white/70 bg-white/85 text-black hover:bg-white'
                }`}
              >
                Upload Entire Album
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2">
            {uploadMode === 'single' && (
              <div className="md:col-span-2">
                <label className="text-sm font-semibold text-white">Title</label>
                <input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  type="text"
                  className="mt-2 w-full rounded-lg border border-dark-tertiary bg-dark-bg px-4 py-2.5 text-white outline-none transition focus:border-accent"
                  placeholder="Track or episode title"
                />
                {fieldErrors.title && <p className="mt-1 text-xs text-red-400">{fieldErrors.title}</p>}
              </div>
            )}

            {uploadMode === 'album' && (
              <div className="md:col-span-2">
                <label className="text-sm font-semibold text-white">Album Name</label>
                <input
                  value={albumName}
                  onChange={(event) => setAlbumName(event.target.value)}
                  type="text"
                  list="album-suggestions"
                  className="mt-2 w-full rounded-lg border border-dark-tertiary bg-dark-bg px-4 py-2.5 text-white outline-none transition focus:border-accent"
                  placeholder="Album title"
                />
                <datalist id="album-suggestions">
                  {albumSuggestions.map((album) => (
                    <option key={album} value={album} />
                  ))}
                </datalist>
                {fieldErrors.album_name && <p className="mt-1 text-xs text-red-400">{fieldErrors.album_name}</p>}
              </div>
            )}

            <div className="md:col-span-2">
              <label className="text-sm font-semibold text-white">Description</label>
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                rows={4}
                className="mt-2 w-full rounded-lg border border-dark-tertiary bg-dark-bg px-4 py-2.5 text-white outline-none transition focus:border-accent"
                placeholder="Optional description"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-white">Release Date</label>
              <input
                type="date"
                value={releaseDate}
                onChange={(event) => setReleaseDate(event.target.value)}
                className="mt-2 w-full rounded-lg border border-dark-tertiary bg-dark-bg px-4 py-2.5 text-white outline-none transition focus:border-accent"
              />
              <p className="mt-1 text-xs text-gray-500">Optional if embedded date metadata exists in audio.</p>
              {fieldErrors.release_date && <p className="mt-1 text-xs text-red-400">{fieldErrors.release_date}</p>}
            </div>

            <div>
              <label className="text-sm font-semibold text-white">Language</label>
              <input
                type="text"
                value={language}
                onChange={(event) => setLanguage(event.target.value)}
                className="mt-2 w-full rounded-lg border border-dark-tertiary bg-dark-bg px-4 py-2.5 text-white outline-none transition focus:border-accent"
                placeholder="English"
              />
              {fieldErrors.language && <p className="mt-1 text-xs text-red-400">{fieldErrors.language}</p>}
            </div>

            {uploadMode === 'single' && (
              <div>
                <label className="text-sm font-semibold text-white">Song Type</label>
                <select
                  value={songType}
                  onChange={(event) => setSongType(event.target.value)}
                  className="mt-2 w-full rounded-lg border border-dark-tertiary bg-dark-bg px-4 py-2.5 text-white outline-none transition focus:border-accent"
                >
                  <option value="single">Single</option>
                  <option value="album">Album Track</option>
                  <option value="ep">EP Track</option>
                  <option value="podcast_episode">Podcast Episode</option>
                </select>
              </div>
            )}

            {uploadMode === 'single' && (
              <div>
                <label className="text-sm font-semibold text-white">Album Name (Optional)</label>
                <input
                  value={albumName}
                  onChange={(event) => setAlbumName(event.target.value)}
                  type="text"
                  list="album-suggestions"
                  className="mt-2 w-full rounded-lg border border-dark-tertiary bg-dark-bg px-4 py-2.5 text-white outline-none transition focus:border-accent"
                  placeholder="Type album name or choose suggestion"
                />
                <datalist id="album-suggestions">
                  {albumSuggestions.map((album) => (
                    <option key={album} value={album} />
                  ))}
                </datalist>
              </div>
            )}

            <div>
              <label className="text-sm font-semibold text-white">Genre</label>
              <select
                value={genreId}
                onChange={(event) => setGenreId(event.target.value)}
                disabled={loadingGenres}
                className="mt-2 w-full rounded-lg border border-dark-tertiary bg-dark-bg px-4 py-2.5 text-white outline-none transition focus:border-accent disabled:opacity-60"
              >
                {genres.map((genre) => (
                  <option key={genre.id} value={genre.id}>
                    {genre.name}
                  </option>
                ))}
              </select>
              {fieldErrors.genre && <p className="mt-1 text-xs text-red-400">{fieldErrors.genre}</p>}
            </div>

            <div className="md:col-span-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {uploadMode === 'single' && (
                <label className="flex items-center gap-2 rounded-lg border border-dark-tertiary bg-dark-bg px-3 py-2 text-sm text-white">
                  <input
                    type="checkbox"
                    checked={isPodcast}
                    onChange={(event) => setIsPodcast(event.target.checked)}
                  />
                  Is Podcast
                </label>
              )}
              <label className="flex items-center gap-2 rounded-lg border border-dark-tertiary bg-dark-bg px-3 py-2 text-sm text-white">
                <input
                  type="checkbox"
                  checked={explicit}
                  onChange={(event) => setExplicit(event.target.checked)}
                />
                Explicit Content
              </label>
            </div>

            {uploadMode === 'single' ? (
              <div className="md:col-span-2">
                <label className="text-sm font-semibold text-white">Additional Artists</label>
                <input
                  value={artistInput}
                  onChange={(event) => setArtistInput(event.target.value)}
                  onKeyDown={onArtistInputKeyDown}
                  type="text"
                  className="mt-2 w-full rounded-lg border border-dark-tertiary bg-dark-bg px-4 py-2.5 text-white outline-none transition focus:border-accent"
                  placeholder="Type artist name and press Enter"
                />

                {artistSuggestions.length > 0 && (
                  <div className="mt-2 rounded-lg border border-dark-tertiary bg-dark-bg/90 p-2">
                    <div className="flex flex-wrap gap-2">
                      {artistSuggestions.map((suggestion) => (
                        <button
                          key={suggestion}
                          type="button"
                          onClick={() => addArtist(suggestion)}
                          className="rounded-full bg-white px-3 py-1 text-xs text-black transition hover:bg-gray-100"
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {featuredArtists.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {featuredArtists.map((artist) => (
                      <span key={artist} className="inline-flex items-center gap-2 rounded-full bg-accent/20 px-3 py-1 text-xs text-accent">
                        {artist}
                        <button
                          type="button"
                          onClick={() => removeArtist(artist)}
                          className="text-accent/80 transition hover:text-white"
                        >
                          x
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="md:col-span-2">
                <label className="text-sm font-semibold text-white">Album Artist</label>
                <input
                  value={albumArtist}
                  onChange={(event) => setAlbumArtist(event.target.value)}
                  type="text"
                  className="mt-2 w-full rounded-lg border border-dark-tertiary bg-dark-bg px-4 py-2.5 text-white outline-none transition focus:border-accent"
                  placeholder="Original album artist"
                />
                {fieldErrors.album_artist && <p className="mt-1 text-xs text-red-400">{fieldErrors.album_artist}</p>}
              </div>
            )}

            {uploadMode === 'single' ? (
              <>
                <div>
                  <label className="text-sm font-semibold text-white">Audio File</label>
                  <input
                    type="file"
                    accept="audio/*"
                    onChange={handleAudioFileChange}
                    className="mt-2 block w-full rounded-lg border border-dark-tertiary bg-dark-bg px-3 py-2 text-sm text-white"
                  />
                  {metadataDetecting && <p className="mt-1 text-xs text-gray-400">Detecting embedded metadata...</p>}
                  {fieldErrors.audio_file && <p className="mt-1 text-xs text-red-400">{fieldErrors.audio_file}</p>}
                </div>

                <div>
                  <label className="text-sm font-semibold text-white">Album Cover (Optional if embedded in audio)</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(event) => setCoverImage(event.target.files?.[0] || null)}
                    className="mt-2 block w-full rounded-lg border border-dark-tertiary bg-dark-bg px-3 py-2 text-sm text-white"
                  />
                  {embeddedCoverFound && !coverImage && (
                    <p className="mt-1 text-xs text-emerald-400">Embedded cover detected in audio. You can still upload a custom cover to replace it.</p>
                  )}
                  {coverImage && embeddedCoverFound && (
                    <p className="mt-1 text-xs text-gray-400">Custom cover selected. This will replace embedded cover art.</p>
                  )}
                  {fieldErrors.cover_image && <p className="mt-1 text-xs text-red-400">{fieldErrors.cover_image}</p>}
                </div>
              </>
            ) : (
              <>
                <div className="md:col-span-2 border border-dark-tertiary bg-dark-bg/60 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-white">Album Songs</p>
                    <button
                      type="button"
                      onClick={addAlbumTrackRow}
                      className="rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-black transition hover:bg-white/90"
                    >
                      + Add Song
                    </button>
                  </div>
                  {fieldErrors.album_tracks && <p className="mt-2 text-xs text-red-400">{fieldErrors.album_tracks}</p>}

                  <div className="mt-3 space-y-3">
                    {albumTracks.map((row, index) => (
                      <div key={row.id} className="border border-white/10 bg-dark-secondary/60 p-3">
                        <div className="mb-2 flex items-center justify-between">
                          <p className="text-xs font-semibold uppercase tracking-wide text-white/70">Song {index + 1}</p>
                          <button
                            type="button"
                            onClick={() => removeAlbumTrackRow(row.id)}
                            disabled={albumTracks.length <= 1}
                            className="rounded-md border border-red-700/60 px-2 py-1 text-xs text-red-300 transition hover:bg-red-900/30 disabled:opacity-50"
                          >
                            Remove
                          </button>
                        </div>

                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                          <div>
                            <label className="text-xs font-semibold text-white">Song Title</label>
                            <input
                              type="text"
                              value={row.title}
                              onChange={(event) => updateAlbumTrackRow(row.id, { title: event.target.value })}
                              className="mt-1 w-full rounded-lg border border-dark-tertiary bg-dark-bg px-3 py-2 text-sm text-white outline-none focus:border-accent"
                              placeholder="Track title"
                            />
                          </div>

                          <div>
                            <label className="text-xs font-semibold text-white">Song Artist (optional)</label>
                            <input
                              type="text"
                              value={row.artistName}
                              onChange={(event) => updateAlbumTrackRow(row.id, { artistName: event.target.value })}
                              className="mt-1 w-full rounded-lg border border-dark-tertiary bg-dark-bg px-3 py-2 text-sm text-white outline-none focus:border-accent"
                              placeholder="Leave blank to use album artist"
                            />
                          </div>

                          <div>
                            <label className="text-xs font-semibold text-white">Audio File</label>
                            <input
                              type="file"
                              accept="audio/*"
                              onChange={(event) => handleAlbumTrackFileChange(row.id, event.target.files?.[0] || null)}
                              className="mt-1 block w-full rounded-lg border border-dark-tertiary bg-dark-bg px-3 py-2 text-sm text-white"
                            />
                          </div>

                          <div className="md:col-span-2">
                            <label className="text-xs font-semibold text-white">Song Cover (Optional, overrides album cover)</label>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(event) => updateAlbumTrackRow(row.id, { coverImage: event.target.files?.[0] || null })}
                              className="mt-1 block w-full rounded-lg border border-dark-tertiary bg-dark-bg px-3 py-2 text-sm text-white"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="text-sm font-semibold text-white">Main Album Cover (separate from song cover)</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(event) => setAlbumCoverImage(event.target.files?.[0] || null)}
                    className="mt-2 block w-full rounded-lg border border-dark-tertiary bg-dark-bg px-3 py-2 text-sm text-white"
                  />
                  <p className="mt-1 text-xs text-gray-400">Used as a fallback only when a song has no custom cover and no embedded artwork is found.</p>
                </div>
              </>
            )}

            {uploadMode === 'single' && (
              <div className="md:col-span-2 border border-dark-tertiary bg-dark-bg/60 p-4">
              <div className="flex flex-wrap items-center gap-4">
                <p className="text-sm font-semibold text-white">Lyrics (Optional)</p>
                <label className="flex items-center gap-2 text-sm text-gray-300">
                  <input
                    type="radio"
                    name="lyrics-mode"
                    checked={lyricsMode === 'none'}
                    onChange={() => setLyricsMode('none')}
                  />
                  None
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-300">
                  <input
                    type="radio"
                    name="lyrics-mode"
                    checked={lyricsMode === 'text'}
                    onChange={() => setLyricsMode('text')}
                  />
                  Add Text
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-300">
                  <input
                    type="radio"
                    name="lyrics-mode"
                    checked={lyricsMode === 'file'}
                    onChange={() => setLyricsMode('file')}
                  />
                  Upload LRC
                </label>
              </div>

              {lyricsMode === 'text' && (
                <textarea
                  value={lyricsText}
                  onChange={(event) => setLyricsText(event.target.value)}
                  rows={6}
                  className="mt-3 w-full rounded-lg border border-dark-tertiary bg-dark-secondary px-4 py-2.5 text-white outline-none transition focus:border-accent"
                  placeholder="Paste lyrics text here"
                />
              )}

              {lyricsMode === 'file' && (
                <>
                  <input
                    type="file"
                    accept=".lrc"
                    onChange={(event) => setLyricsFile(event.target.files?.[0] || null)}
                    className="mt-3 block w-full rounded-lg border border-dark-tertiary bg-dark-secondary px-3 py-2 text-sm text-white"
                  />
                  {fieldErrors.lyrics_file && <p className="mt-1 text-xs text-red-400">{fieldErrors.lyrics_file}</p>}
                </>
              )}
              </div>
            )}

            <div className="md:col-span-2 flex justify-end gap-3">
              <button
                type="button"
                onClick={handleCancelUpload}
                disabled={submitting}
                className="rounded-lg border border-white px-6 py-2.5 text-sm font-semibold text-black bg-white transition hover:bg-gray-100 disabled:opacity-60"
              >
                Cancel Upload
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="rounded-lg bg-white px-6 py-2.5 text-sm font-semibold text-black transition hover:bg-gray-100 disabled:opacity-60"
              >
                {submitLabel}
              </button>
            </div>
          </form>
        </div>
      </div>
    </main>
  )
}

export default Upload
