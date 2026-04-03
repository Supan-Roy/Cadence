import React, { useEffect, useMemo, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { musicAPI, playlistAPI } from '../services/api'
import ConfirmDialog from '../components/ConfirmDialog'

function PlaylistEditor({ user, onTrackSelect }) {
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

  const existingTrackIds = useMemo(() => new Set(tracks.map((t) => t.id)), [tracks])

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
        navigate('/my-space')
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

  if (!canManagePlaylists) {
    return <Navigate to="/" replace />
  }

  return (
    <main className="pb-36 pt-4">
      <div className="mx-auto w-full max-w-6xl px-6">
        <div className="rounded-2xl border border-dark-tertiary bg-dark-secondary/70 p-6 md:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="text-3xl font-bold text-white">
              {isCreateMode ? 'Create Playlist' : 'Edit Playlist'}
            </h1>
            {!isCreateMode && (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                disabled={deleting}
                className="rounded-lg bg-red-600/80 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-500 disabled:opacity-60"
              >
                {deleting ? 'Deleting...' : 'Delete Playlist'}
              </button>
            )}
          </div>

          {error && <p className="mt-4 rounded-lg border border-red-700/60 bg-red-950/20 px-4 py-3 text-sm text-red-300">{error}</p>}
          {notice && <p className="mt-4 rounded-lg border border-emerald-700/60 bg-emerald-950/20 px-4 py-3 text-sm text-emerald-300">{notice}</p>}

          {loading ? (
            <p className="mt-6 text-sm text-gray-300">Loading playlist...</p>
          ) : (
            <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
              <section className="rounded-xl border border-white/10 bg-dark-bg/60 p-4">
                <h2 className="text-lg font-semibold text-white">Playlist Details</h2>

                <label className="mt-4 block text-sm font-semibold text-white">Title</label>
                <input
                  type="text"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="mt-2 w-full rounded-lg border border-dark-tertiary bg-dark-bg px-4 py-2.5 text-white outline-none focus:border-accent"
                  placeholder="Playlist title"
                />

                <label className="mt-4 block text-sm font-semibold text-white">Short Description</label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  className="mt-2 w-full rounded-lg border border-dark-tertiary bg-dark-bg px-4 py-2.5 text-white outline-none focus:border-accent"
                  placeholder="Describe this playlist"
                />

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

                {coverPreview && (
                  <img
                    src={coverPreview}
                    alt="Playlist cover"
                    className="mt-3 h-44 w-full rounded-lg object-cover"
                  />
                )}

                <button
                  type="button"
                  onClick={savePlaylist}
                  disabled={saving}
                  className="mt-4 rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
                >
                  {saving ? 'Saving...' : isCreateMode ? 'Create Playlist' : 'Save Changes'}
                </button>
              </section>

              <section className="rounded-xl border border-white/10 bg-dark-bg/60 p-4">
                <h2 className="text-lg font-semibold text-white">Songs in Playlist</h2>

                {tracks.length === 0 && (
                  <p className="mt-3 text-sm text-gray-400">No songs added yet.</p>
                )}

                <div className="mt-3 space-y-2 max-h-72 overflow-y-auto pr-1">
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
                        disabled={removingTrackId === track.id}
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

          <section className="mt-6 rounded-xl border border-white/10 bg-dark-bg/60 p-4">
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
