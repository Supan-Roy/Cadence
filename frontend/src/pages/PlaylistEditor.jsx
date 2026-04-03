import React, { useEffect, useMemo, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { musicAPI, playlistAPI } from '../services/api'
import ConfirmDialog from '../components/ConfirmDialog'

function PlaylistEditor({ user, onTrackSelect, onPlayPlaylist, onAddPlaylistToQueue }) {
  const navigate = useNavigate()
  const { playlistId } = useParams()
  const isCreateMode = playlistId === 'new'

  const [loading, setLoading] = useState(!isCreateMode)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [coverFile, setCoverFile] = useState(null)
  const [coverPreview, setCoverPreview] = useState('')
  const [tracks, setTracks] = useState([])

  const [search, setSearch] = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [addingTrackId, setAddingTrackId] = useState(null)
  const [removingTrackId, setRemovingTrackId] = useState(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isEditing, setIsEditing] = useState(isCreateMode)
  const [showActionsMenu, setShowActionsMenu] = useState(false)
  const [isPinned, setIsPinned] = useState(false)
  const [shuffleEnabled, setShuffleEnabled] = useState(false)

  const canManagePlaylists = !!user

  const loadPlaylist = async () => {
    if (isCreateMode) return

    try {
      setLoading(true)
      setError('')
      const response = await playlistAPI.getPlaylistDetail(playlistId)
      const data = response.data || {}
      setName(data.name || '')
      setDescription(data.description || '')
      setCoverPreview(data.cover_image || '')
      setTracks(Array.isArray(data.tracks) ? data.tracks : [])
    } catch (err) {
      setError('Failed to load playlist.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPlaylist()
  }, [playlistId])

  useEffect(() => {
    setIsEditing(isCreateMode)
  }, [isCreateMode, playlistId])

  useEffect(() => {
    if (isCreateMode || !playlistId) return
    const raw = localStorage.getItem('pinned_playlist_ids') || '[]'
    try {
      const parsed = JSON.parse(raw)
      setIsPinned(Array.isArray(parsed) && parsed.includes(playlistId))
    } catch {
      setIsPinned(false)
    }
  }, [playlistId, isCreateMode])

  useEffect(() => {
    let cancelled = false

    const searchTracks = async () => {
      try {
        const response = search.trim()
          ? await musicAPI.searchTracks(search.trim(), 1, 16)
          : await musicAPI.getTrendingTracks(16, 1)

        if (cancelled) return
        const items = Array.isArray(response.data) ? response.data : response.data?.results || []
        setSuggestions(items)
      } catch (err) {
        if (!cancelled) {
          setSuggestions([])
        }
      }
    }

    const timeoutId = setTimeout(searchTracks, 240)
    return () => {
      cancelled = true
      clearTimeout(timeoutId)
    }
  }, [search])

  useEffect(() => {
    if (!notice) return
    const timeoutId = setTimeout(() => setNotice(''), 1500)
    return () => clearTimeout(timeoutId)
  }, [notice])

  const existingTrackIds = useMemo(() => new Set(tracks.map((t) => t.id)), [tracks])
  const totalDurationSeconds = useMemo(
    () => tracks.reduce((sum, item) => sum + (Number(item.duration) || 0), 0),
    [tracks]
  )
  const creatorName = user?.displayName || user?.name || user?.email?.split('@')?.[0] || 'Unknown'

  const formatDuration = (seconds) => {
    const total = Math.max(0, Number(seconds) || 0)
    const hours = Math.floor(total / 3600)
    const minutes = Math.floor((total % 3600) / 60)
    const remainingSeconds = Math.floor(total % 60)
    if (hours > 0) {
      return `${hours}h ${minutes}m ${remainingSeconds}s`
    }
    if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`
    }
    return `${remainingSeconds}s`
  }

  const savePlaylist = async () => {
    const cleanName = name.trim()
    if (!cleanName) {
      setError('Playlist title is required.')
      return
    }

    try {
      setSaving(true)
      setError('')
      setNotice('')

      const formData = new FormData()
      formData.append('name', cleanName)
      formData.append('description', description.trim())
      if (coverFile) {
        formData.append('cover_image', coverFile)
      }

      if (isCreateMode) {
        const created = await playlistAPI.createPlaylist(cleanName)
        const createdId = created.data?.id

        if (description.trim() || coverFile) {
          if (createdId) {
            await playlistAPI.updatePlaylist(createdId, formData, true)
          }
        }

        if (createdId) {
          navigate(`/playlists/${createdId}`)
          return
        }
      } else {
        await playlistAPI.updatePlaylist(playlistId, formData, true)
        setNotice('Playlist updated.')
        setIsEditing(false)
        await loadPlaylist()
        return
      }
    } catch (err) {
      const details = err.response?.data
      if (typeof details === 'object' && details !== null) {
        const text = Object.entries(details)
          .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : String(v)}`)
          .join(' | ')
        setError(text || 'Failed to save playlist.')
      } else {
        setError('Failed to save playlist.')
      }
    } finally {
      setSaving(false)
    }
  }

  const deletePlaylist = async () => {
    if (isCreateMode) return

    try {
      setDeleting(true)
      await playlistAPI.deletePlaylist(playlistId)
      navigate('/')
    } catch (err) {
      setError('Failed to delete playlist.')
    } finally {
      setDeleting(false)
    }
  }

  const addTrack = async (trackId, isPodcast = false) => {
    if (isCreateMode || !playlistId) {
      setError('Save playlist first before adding tracks.')
      return
    }
    if (isPodcast) {
      setError('Podcasts cannot be added to playlists.')
      return
    }

    try {
      setAddingTrackId(trackId)
      setError('')
      await playlistAPI.addTrackToPlaylist(playlistId, trackId)
      await loadPlaylist()
    } catch (err) {
      setError('Failed to add song to playlist.')
    } finally {
      setAddingTrackId(null)
    }
  }

  const removeTrack = async (trackId) => {
    if (isCreateMode || !playlistId) return

    try {
      setRemovingTrackId(trackId)
      setError('')
      await playlistAPI.removeTrackFromPlaylist(playlistId, trackId)
      await loadPlaylist()
    } catch (err) {
      setError('Failed to remove song from playlist.')
    } finally {
      setRemovingTrackId(null)
    }
  }

  const playAllTracks = () => {
    if (!tracks.length) {
      setError('No songs in this playlist yet.')
      return
    }

    const playbackTracks = shuffleEnabled
      ? [...tracks].sort(() => Math.random() - 0.5)
      : tracks

    setError('')
    onPlayPlaylist?.(playbackTracks)
  }

  const addAllToQueue = () => {
    if (!tracks.length) {
      setError('No songs in this playlist yet.')
      return
    }
    setError('')
    onAddPlaylistToQueue?.(tracks)
    setNotice('Playlist added to queue.')
    setShowActionsMenu(false)
  }

  const togglePinPlaylist = () => {
    if (isCreateMode || !playlistId) return
    const raw = localStorage.getItem('pinned_playlist_ids') || '[]'
    let parsed = []
    try {
      parsed = JSON.parse(raw)
    } catch {
      parsed = []
    }

    const current = Array.isArray(parsed) ? parsed : []
    const exists = current.includes(playlistId)
    const next = exists ? current.filter((id) => id !== playlistId) : [playlistId, ...current]
    localStorage.setItem('pinned_playlist_ids', JSON.stringify(next))
    setIsPinned(!exists)
    setNotice(exists ? 'Playlist unpinned.' : 'Playlist pinned to top.')
    setShowActionsMenu(false)
  }

  const sharePlaylistDummy = () => {
    setNotice('Share link is coming soon.')
  }

  if (!canManagePlaylists) {
    return <Navigate to="/" replace />
  }

  return (
    <main className="pb-36 pt-0 sm:pt-4">
      {notice && (
        <div className="pointer-events-none fixed inset-x-0 bottom-24 z-50 flex justify-center px-4 sm:inset-auto sm:right-6 sm:top-6 sm:bottom-auto sm:px-0">
          <div className="w-full max-w-sm rounded-lg border border-emerald-600/60 bg-emerald-950/95 px-4 py-2.5 text-sm font-medium text-emerald-200 shadow-2xl sm:w-auto">
            {notice}
          </div>
        </div>
      )}

      <div className="mx-auto w-full max-w-6xl px-0 sm:px-6">
        <div className="rounded-none border-0 bg-dark-secondary/70 p-3 sm:rounded-2xl sm:border sm:border-dark-tertiary sm:p-6 md:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {(isCreateMode || isEditing) && (
              <h1 className="text-3xl font-bold text-white">
                {isCreateMode ? 'Create Playlist' : 'Edit Playlist'}
              </h1>
            )}
            {!isCreateMode && isEditing && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditing(false)
                    setError('')
                    setNotice('')
                    loadPlaylist()
                  }}
                  className="rounded-lg border border-white/20 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={deleting}
                  className="rounded-lg bg-red-600/80 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-500 disabled:opacity-60"
                >
                  {deleting ? 'Deleting...' : 'Delete Playlist'}
                </button>
              </div>
            )}
          </div>

          {error && <p className="mt-4 rounded-lg border border-red-700/60 bg-red-950/20 px-4 py-3 text-sm text-red-300">{error}</p>}

          {loading ? (
            <p className="mt-6 text-sm text-gray-300">Loading playlist...</p>
          ) : (
            <div className="mt-4 sm:mt-6 grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-2">
              <section className="rounded-none border-0 bg-transparent p-0 sm:rounded-xl sm:border sm:border-white/10 sm:bg-dark-bg/60 sm:p-4">
                {(isEditing || isCreateMode) && (
                  <h2 className="text-lg font-semibold text-white">{name || 'Playlist'}</h2>
                )}
                <img
                  src={coverPreview || '/Cadence Playlist.png'}
                  alt="Playlist cover"
                  className={`mt-3 rounded-lg ${
                    (isCreateMode || isEditing)
                      ? 'h-44 w-full object-cover'
                      : 'mx-auto w-full max-w-[15rem] aspect-square object-cover'
                  }`}
                />

                {(isCreateMode || isEditing) ? (
                  <>
                    <label className="mt-4 block text-sm font-semibold text-white">Title</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      maxLength={40}
                      className="mt-2 w-full rounded-lg border border-dark-tertiary bg-dark-bg px-4 py-2.5 text-white outline-none focus:border-accent"
                      placeholder="Playlist title"
                    />
                    <p className="mt-1 text-xs text-gray-400">{name.length}/40</p>

                    <label className="mt-4 block text-sm font-semibold text-white">Short Description</label>
                    <textarea
                      rows={3}
                      value={description}
                      onChange={(event) => setDescription(event.target.value)}
                      maxLength={80}
                      className="mt-2 w-full rounded-lg border border-dark-tertiary bg-dark-bg px-4 py-2.5 text-white outline-none focus:border-accent"
                      placeholder="Describe this playlist"
                    />
                    <p className="mt-1 text-xs text-gray-400">{description.length}/80</p>

                    <label className="mt-4 block text-sm font-semibold text-white">Cover Photo</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(event) => {
                        const file = event.target.files?.[0] || null
                        setCoverFile(file)
                        if (file) {
                          setCoverPreview(URL.createObjectURL(file))
                        }
                      }}
                      className="mt-2 block w-full rounded-lg border border-dark-tertiary bg-dark-bg px-3 py-2 text-sm text-white"
                    />

                    <button
                      type="button"
                      onClick={savePlaylist}
                      disabled={saving}
                      className="mt-4 rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
                    >
                      {saving ? 'Saving...' : isCreateMode ? 'Create Playlist' : 'Save Changes'}
                    </button>
                  </>
                ) : (
                  <>
                    <p className="mt-4 text-center text-3xl font-bold text-white">{name || 'Untitled Playlist'}</p>
                    <p className="mt-2 text-center text-sm text-gray-400">
                      {creatorName} • {tracks.length} songs • {formatDuration(totalDurationSeconds)}
                    </p>
                    <p className="mt-2 text-center text-sm text-gray-300 whitespace-pre-wrap">{description || 'No description.'}</p>

                    <div className="mt-5 flex items-center justify-center gap-3">
                      <button
                        type="button"
                        onClick={() => setShuffleEnabled((prev) => !prev)}
                        className={`flex h-11 w-11 items-center justify-center rounded-full transition ${
                          shuffleEnabled
                            ? 'bg-white text-black hover:bg-white/90'
                            : 'bg-white/10 text-white hover:bg-white/20'
                        }`}
                        title={shuffleEnabled ? 'Unshuffle playback' : 'Shuffle playback'}
                      >
                        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M17 3h4v4" />
                          <path d="M21 3l-5 5" />
                          <path d="M3 7h5l4 4" />
                          <path d="M3 17h5l9-9" />
                          <path d="M17 17h4v4" />
                          <path d="M21 21l-5-5" />
                        </svg>
                      </button>

                      <button
                        type="button"
                        onClick={() => setIsEditing(true)}
                        className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
                        title="Edit"
                      >
                        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M12 20h9" strokeLinecap="round" strokeLinejoin="round" />
                          <path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5Z" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </button>

                      <button
                        type="button"
                        onClick={playAllTracks}
                        className="flex h-16 w-16 items-center justify-center rounded-full bg-white text-black transition hover:bg-white/90"
                        title="Play"
                      >
                        <svg className="ml-0.5 h-7 w-7 fill-current" viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      </button>

                      <button
                        type="button"
                        onClick={sharePlaylistDummy}
                        className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
                        title="Share"
                      >
                        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="18" cy="5" r="3" />
                          <circle cx="6" cy="12" r="3" />
                          <circle cx="18" cy="19" r="3" />
                          <path d="m8.59 13.51 6.83 3.98M15.41 6.51 8.59 10.49" strokeLinecap="round" />
                        </svg>
                      </button>

                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setShowActionsMenu((prev) => !prev)}
                          className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
                          title="More actions"
                        >
                          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                            <circle cx="5" cy="12" r="2" />
                            <circle cx="12" cy="12" r="2" />
                            <circle cx="19" cy="12" r="2" />
                          </svg>
                        </button>

                        {showActionsMenu && (
                          <div className="absolute right-0 z-20 mt-2 w-48 rounded-lg border border-white/15 bg-[#101521] p-1.5 shadow-2xl">
                            <button
                              type="button"
                              onClick={() => {
                                setShowDeleteConfirm(true)
                                setShowActionsMenu(false)
                              }}
                              className="w-full rounded-md px-3 py-2 text-left text-sm text-red-300 transition hover:bg-white/10"
                            >
                              Delete playlist
                            </button>
                            <button
                              type="button"
                              onClick={togglePinPlaylist}
                              className="w-full rounded-md px-3 py-2 text-left text-sm text-white transition hover:bg-white/10"
                            >
                              {isPinned ? 'Unpin playlist' : 'Pin playlist to top'}
                            </button>
                            <button
                              type="button"
                              onClick={addAllToQueue}
                              className="w-full rounded-md px-3 py-2 text-left text-sm text-white transition hover:bg-white/10"
                            >
                              Add to queue
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </section>

              <section className="rounded-none border-0 bg-transparent p-0 sm:rounded-xl sm:border sm:border-white/10 sm:bg-dark-bg/60 sm:p-4">
                <h2 className="text-lg font-semibold text-white">Songs in Playlist</h2>

                {tracks.length === 0 && (
                  <p className="mt-3 text-sm text-gray-400">No songs added yet.</p>
                )}

                <div className="mt-3 space-y-2 pr-1">
                  {tracks.map((track) => (
                    <div key={track.id} className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2">
                      <button
                        type="button"
                        onClick={() => onTrackSelect?.(track)}
                        className="min-w-0 text-left"
                      >
                        <p className="truncate text-sm font-semibold text-white">{track.title}</p>
                        <p className="truncate text-xs text-gray-400">{track.artist_name}</p>
                      </button>
                      <button
                        type="button"
                        onClick={() => removeTrack(track.id)}
                        disabled={!isEditing || removingTrackId === track.id}
                        className="rounded-md bg-red-600/80 px-2 py-1 text-xs text-white transition hover:bg-red-500 disabled:opacity-60"
                      >
                        {removingTrackId === track.id ? 'Removing...' : 'Remove'}
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          )}

          {(isCreateMode || isEditing) && (
          <section className="mt-4 sm:mt-6 rounded-none border-0 bg-transparent p-0 sm:rounded-xl sm:border sm:border-white/10 sm:bg-dark-bg/60 sm:p-4">
            <h2 className="text-lg font-semibold text-white">Add Songs</h2>
            <p className="mt-1 text-sm text-gray-400">Search songs or use suggestions below.</p>

            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by title"
              className="mt-3 w-full rounded-lg border border-dark-tertiary bg-dark-bg px-4 py-2.5 text-white outline-none focus:border-accent"
            />

            <div className="mt-4 grid grid-cols-1 gap-2 md:grid-cols-2">
              {suggestions.map((track) => (
                <div key={track.id} className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-white">{track.title}</p>
                    <p className="truncate text-xs text-gray-400">{track.artist_name}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => addTrack(track.id, !!track.is_podcast)}
                    disabled={isCreateMode || existingTrackIds.has(track.id) || addingTrackId === track.id || !!track.is_podcast}
                    className="rounded-md bg-white px-2 py-1 text-xs font-semibold text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {track.is_podcast
                      ? 'Podcast'
                      : existingTrackIds.has(track.id)
                      ? 'Added'
                      : addingTrackId === track.id
                        ? 'Adding...'
                        : 'Add'}
                  </button>
                </div>
              ))}
            </div>
          </section>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={showDeleteConfirm}
        title="Delete Playlist"
        message="Delete this playlist permanently? This cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        confirmVariant="danger"
        loading={deleting}
        onCancel={() => {
          if (!deleting) setShowDeleteConfirm(false)
        }}
        onConfirm={async () => {
          await deletePlaylist()
          setShowDeleteConfirm(false)
        }}
      />
    </main>
  )
}

export default PlaylistEditor
