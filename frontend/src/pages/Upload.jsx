import React, { useEffect, useMemo, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useNavigate } from 'react-router-dom'
import { musicAPI } from '../services/api'

function Upload({ user }) {
  const navigate = useNavigate()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [releaseDate, setReleaseDate] = useState('')
  const [language, setLanguage] = useState('English')
  const [genreId, setGenreId] = useState('')
  const [isPodcast, setIsPodcast] = useState(false)
  const [explicit, setExplicit] = useState(false)
  const [songType, setSongType] = useState('single')
  const [audioFile, setAudioFile] = useState(null)
  const [coverImage, setCoverImage] = useState(null)
  const [lyricsMode, setLyricsMode] = useState('none')
  const [lyricsText, setLyricsText] = useState('')
  const [lyricsFile, setLyricsFile] = useState(null)
  const [featuredArtists, setFeaturedArtists] = useState([])
  const [artistInput, setArtistInput] = useState('')
  const [artistSuggestions, setArtistSuggestions] = useState([])

  const [genres, setGenres] = useState([])
  const [loadingGenres, setLoadingGenres] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})

  const canUpload = user?.role === 'admin' || user?.role === 'artist'

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

  const submitLabel = useMemo(() => {
    if (submitting) return 'Uploading...'
    return 'Submit for Review'
  }, [submitting])

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

  const resetForm = () => {
    setTitle('')
    setDescription('')
    setReleaseDate('')
    setLanguage('English')
    setGenreId('')
    setIsPodcast(false)
    setExplicit(false)
    setSongType('single')
    setAudioFile(null)
    setCoverImage(null)
    setLyricsMode('none')
    setLyricsText('')
    setLyricsFile(null)
    setFeaturedArtists([])
    setArtistInput('')
    setArtistSuggestions([])
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

    if (!title.trim()) {
      nextFieldErrors.title = 'Title is required.'
    }

    if (!releaseDate) {
      nextFieldErrors.release_date = 'Release date is required.'
    }

    if (!language.trim()) {
      nextFieldErrors.language = 'Language is required.'
    }

    if (!genreId) {
      nextFieldErrors.genre = 'Genre is required.'
    }

    if (!audioFile) {
      nextFieldErrors.audio_file = 'Audio file is required.'
    }

    if (!coverImage) {
      nextFieldErrors.cover_image = 'Album cover is mandatory.'
    }

    if (lyricsMode === 'file' && lyricsFile && !lyricsFile.name.toLowerCase().endsWith('.lrc')) {
      nextFieldErrors.lyrics_file = 'Lyrics file must be .lrc'
    }

    if (Object.keys(nextFieldErrors).length > 0) {
      setFieldErrors(nextFieldErrors)
      setError('Please fix the highlighted required fields.')
      return
    }

    const payload = new FormData()
    payload.append('title', title.trim())
    payload.append('description', description.trim())
    payload.append('genre', genreId)
    payload.append('release_date', releaseDate)
    payload.append('language', language.trim())
    payload.append('is_podcast', String(isPodcast))
    payload.append('explicit', String(explicit))
    payload.append('song_type', songType)
    payload.append('audio_file', audioFile)
    payload.append('cover_image', coverImage)

    if (featuredArtists.length > 0) {
      payload.append('featured_artists', featuredArtists.join(', '))
    }

    if (lyricsMode === 'text' && lyricsText.trim()) {
      payload.append('lyrics_text', lyricsText.trim())
    }

    if (lyricsMode === 'file' && lyricsFile) {
      payload.append('lyrics_file', lyricsFile)
    }

    try {
      setSubmitting(true)
      await musicAPI.uploadTrack(payload)
      setSuccess('Upload submitted successfully. Your content is now pending moderation review.')
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
      <div className="mx-auto w-full max-w-5xl px-6">
        <div className="rounded-2xl border border-dark-tertiary bg-dark-secondary/70 p-6 md:p-8">
          <h1 className="text-3xl font-bold text-white">Upload Content</h1>
          <p className="mt-2 text-sm text-gray-400">
            Add songs or podcasts with cover art, genre, multi-artist credits, and optional lyrics.
          </p>

          {error && <div className="mt-4 rounded-lg border border-red-800/60 bg-red-950/25 px-4 py-3 text-sm text-red-300">{error}</div>}
          {success && <div className="mt-4 rounded-lg border border-emerald-800/60 bg-emerald-950/25 px-4 py-3 text-sm text-emerald-300">{success}</div>}

          <form onSubmit={handleSubmit} className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2">
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
              <label className="flex items-center gap-2 rounded-lg border border-dark-tertiary bg-dark-bg px-3 py-2 text-sm text-white">
                <input
                  type="checkbox"
                  checked={isPodcast}
                  onChange={(event) => setIsPodcast(event.target.checked)}
                />
                Is Podcast
              </label>
              <label className="flex items-center gap-2 rounded-lg border border-dark-tertiary bg-dark-bg px-3 py-2 text-sm text-white">
                <input
                  type="checkbox"
                  checked={explicit}
                  onChange={(event) => setExplicit(event.target.checked)}
                />
                Explicit Content
              </label>
            </div>

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
                        className="rounded-full bg-dark-tertiary px-3 py-1 text-xs text-gray-200 transition hover:bg-accent hover:text-white"
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

            <div>
              <label className="text-sm font-semibold text-white">Audio File</label>
              <input
                type="file"
                accept="audio/*"
                onChange={(event) => setAudioFile(event.target.files?.[0] || null)}
                className="mt-2 block w-full rounded-lg border border-dark-tertiary bg-dark-bg px-3 py-2 text-sm text-white"
              />
              {fieldErrors.audio_file && <p className="mt-1 text-xs text-red-400">{fieldErrors.audio_file}</p>}
            </div>

            <div>
              <label className="text-sm font-semibold text-white">Album Cover (Required)</label>
              <input
                type="file"
                accept="image/*"
                onChange={(event) => setCoverImage(event.target.files?.[0] || null)}
                className="mt-2 block w-full rounded-lg border border-dark-tertiary bg-dark-bg px-3 py-2 text-sm text-white"
              />
              {fieldErrors.cover_image && <p className="mt-1 text-xs text-red-400">{fieldErrors.cover_image}</p>}
            </div>

            <div className="md:col-span-2 rounded-xl border border-dark-tertiary bg-dark-bg/60 p-4">
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

            <div className="md:col-span-2 flex justify-end gap-3">
              <button
                type="button"
                onClick={handleCancelUpload}
                disabled={submitting}
                className="rounded-lg border border-dark-tertiary px-6 py-2.5 text-sm font-semibold text-gray-200 transition hover:bg-dark-tertiary disabled:opacity-60"
              >
                Cancel Upload
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="rounded-lg bg-accent px-6 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
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
