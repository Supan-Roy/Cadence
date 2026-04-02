import React, { useEffect, useRef, useState } from 'react'
import { musicAPI, userAPI } from '../services/api'

function Profile({ user, onProfileUpdate }) {
  const [displayName, setDisplayName] = useState(user?.displayName || '')
  const [profileImage, setProfileImage] = useState(user?.profileImage || '')
  const [statusMessage, setStatusMessage] = useState('')
  const [deleteMessage, setDeleteMessage] = useState('')
  const [savingName, setSavingName] = useState(false)
  const [savingImage, setSavingImage] = useState(false)
  const [uploads, setUploads] = useState([])
  const [uploadsLoading, setUploadsLoading] = useState(false)
  const [uploadsError, setUploadsError] = useState('')
  const [editingTrackId, setEditingTrackId] = useState('')
  const [savingTrackId, setSavingTrackId] = useState('')
  const [deletingTrackId, setDeletingTrackId] = useState('')
  const [trackForm, setTrackForm] = useState({})
  const [musicGenres, setMusicGenres] = useState([])
  const [podcastGenres, setPodcastGenres] = useState([])
  const fileInputRef = useRef(null)
  const canManageUploads = user?.role === 'artist' || user?.role === 'admin'

  const mapProfileToUser = (profile) => ({
    email: profile.email,
    role: profile.role,
    name: profile.name || '',
    displayName: profile.name || '',
    profileImage: profile.profile_image || '',
  })

  const handleSaveName = async (event) => {
    event.preventDefault()
    const trimmed = displayName.trim()
    try {
      setSavingName(true)
      const response = await userAPI.updateProfile({ name: trimmed })
      const nextUser = mapProfileToUser(response.data || {})
      setDisplayName(nextUser.displayName)
      setProfileImage(nextUser.profileImage)
      onProfileUpdate?.(nextUser)
      setStatusMessage('Name updated successfully.')
      setDeleteMessage('')
    } catch (err) {
      setStatusMessage('Failed to update name. Please try again.')
    } finally {
      setSavingName(false)
    }
  }

  const handlePickImage = () => {
    fileInputRef.current?.click()
  }

  const handleImageChange = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setStatusMessage('Please choose a valid image file.')
      return
    }

    try {
      setSavingImage(true)
      const formData = new FormData()
      formData.append('profile_image', file)
      const response = await userAPI.updateProfile(formData, true)
      const nextUser = mapProfileToUser(response.data || {})
      setDisplayName(nextUser.displayName)
      setProfileImage(nextUser.profileImage)
      onProfileUpdate?.(nextUser)
      setStatusMessage('Profile picture updated.')
      setDeleteMessage('')
    } catch (err) {
      setStatusMessage('Failed to update profile picture.')
    } finally {
      setSavingImage(false)
    }
  }

  const handleRemoveImage = async () => {
    try {
      setSavingImage(true)
      const response = await userAPI.updateProfile({ remove_profile_image: true })
      const nextUser = mapProfileToUser(response.data || {})
      setDisplayName(nextUser.displayName)
      setProfileImage(nextUser.profileImage)
      onProfileUpdate?.(nextUser)
      setStatusMessage('Profile picture removed.')
      setDeleteMessage('')
    } catch (err) {
      setStatusMessage('Failed to remove profile picture.')
    } finally {
      setSavingImage(false)
    }
  }

  const handleDeleteAccountDummy = () => {
    setDeleteMessage('Delete account is currently a placeholder. Backend action will be added later.')
    setStatusMessage('')
  }

  useEffect(() => {
    if (!canManageUploads) return

    const loadUploadsAndGenres = async () => {
      setUploadsLoading(true)
      setUploadsError('')

      try {
        const [uploadsResponse, musicGenresResponse, podcastGenresResponse] = await Promise.all([
          musicAPI.getMyUploads(),
          musicAPI.getGenres(false),
          musicAPI.getGenres(true),
        ])

        const uploadItems = Array.isArray(uploadsResponse.data)
          ? uploadsResponse.data
          : uploadsResponse.data?.results || []
        const musicItems = Array.isArray(musicGenresResponse.data)
          ? musicGenresResponse.data
          : musicGenresResponse.data?.results || []
        const podcastItems = Array.isArray(podcastGenresResponse.data)
          ? podcastGenresResponse.data
          : podcastGenresResponse.data?.results || []

        setUploads(uploadItems)
        setMusicGenres(musicItems)
        setPodcastGenres(podcastItems)
      } catch (err) {
        setUploadsError('Failed to load your uploaded tracks.')
      } finally {
        setUploadsLoading(false)
      }
    }

    loadUploadsAndGenres()
  }, [canManageUploads])

  const beginEditTrack = (track) => {
    setEditingTrackId(track.id)
    setTrackForm({
      title: track.title || '',
      description: track.description || '',
      album_name: track.album_name || '',
      release_date: track.release_date || '',
      language: track.language || '',
      is_podcast: !!track.is_podcast,
      explicit: !!track.explicit,
      song_type: track.song_type || 'single',
      genre: track.genre || '',
      featured_artists: track.featured_artists || '',
      lyrics_text: track.lyrics_text || '',
    })
  }

  const cancelTrackEdit = () => {
    setEditingTrackId('')
    setTrackForm({})
  }

  const currentGenres = trackForm.is_podcast ? podcastGenres : musicGenres

  const saveTrackMetadata = async () => {
    if (!editingTrackId) return

    try {
      setSavingTrackId(editingTrackId)
      await musicAPI.updateMyUpload(editingTrackId, trackForm)

      const refreshed = await musicAPI.getMyUploads()
      const refreshedItems = Array.isArray(refreshed.data)
        ? refreshed.data
        : refreshed.data?.results || []
      setUploads(refreshedItems)

      setStatusMessage('Track metadata updated successfully.')
      setUploadsError('')
      cancelTrackEdit()
    } catch (err) {
      const data = err.response?.data
      if (typeof data === 'object' && data !== null) {
        const details = Object.entries(data)
          .map(([field, msg]) => `${field}: ${Array.isArray(msg) ? msg.join(', ') : msg}`)
          .join(' | ')
        setUploadsError(details || 'Failed to update track metadata.')
      } else {
        setUploadsError('Failed to update track metadata.')
      }
    } finally {
      setSavingTrackId('')
    }
  }

  const deleteTrack = async (track) => {
    const confirmed = window.confirm(`Delete "${track.title}" permanently? This cannot be undone.`)
    if (!confirmed) return

    try {
      setDeletingTrackId(track.id)
      await musicAPI.deleteMyUpload(track.id)

      const refreshed = await musicAPI.getMyUploads()
      const refreshedItems = Array.isArray(refreshed.data)
        ? refreshed.data
        : refreshed.data?.results || []
      setUploads(refreshedItems)

      if (editingTrackId === track.id) {
        cancelTrackEdit()
      }

      setStatusMessage('Track deleted successfully.')
      setUploadsError('')
    } catch (err) {
      setUploadsError('Failed to delete track.')
    } finally {
      setDeletingTrackId('')
    }
  }

  const statusClass = (status) => {
    if (status === 'approved') return 'text-emerald-300 bg-emerald-900/30 border-emerald-700/50'
    if (status === 'rejected') return 'text-red-300 bg-red-900/30 border-red-700/50'
    return 'text-yellow-300 bg-yellow-900/30 border-yellow-700/50'
  }

  return (
    <main className="pb-32 pt-4">
      <div className="mx-auto w-full max-w-3xl px-6">
        <div className="rounded-2xl border border-dark-tertiary bg-dark-secondary/70 p-6 md:p-8">
          <h1 className="text-3xl font-bold text-white">Profile Settings</h1>
          <p className="mt-2 text-sm text-gray-400">Manage your Cadence profile details.</p>

          <div className="mt-8 flex flex-col gap-4 rounded-xl border border-dark-tertiary bg-dark-bg/60 p-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <div className="h-20 w-20 overflow-hidden rounded-full bg-gradient-to-br from-accent to-accent/50 ring-2 ring-dark-tertiary">
                {profileImage ? (
                  <img src={profileImage} alt="Profile" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <svg className="h-10 w-10 fill-current text-white" viewBox="0 0 24 24">
                      <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                    </svg>
                  </div>
                )}
              </div>

              <div>
                <p className="text-white font-semibold">{displayName || 'Cadence Listener'}</p>
                <p className="text-sm text-gray-400">{user?.email || 'No email available'}</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handlePickImage}
                disabled={savingImage}
                className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
              >
                {savingImage ? 'Saving...' : 'Add or Edit Picture'}
              </button>
              <button
                type="button"
                onClick={handleRemoveImage}
                disabled={savingImage}
                className="rounded-lg border border-dark-tertiary px-4 py-2 text-sm font-semibold text-gray-200 transition hover:bg-dark-tertiary"
              >
                Remove Picture
              </button>
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageChange}
            className="hidden"
          />

          <form onSubmit={handleSaveName} className="mt-6 rounded-xl border border-dark-tertiary bg-dark-bg/60 p-4">
            <label htmlFor="displayName" className="text-sm font-semibold text-white">
              Display Name
            </label>
            <input
              id="displayName"
              type="text"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              placeholder="Enter your display name"
              className="mt-2 w-full rounded-lg border border-dark-tertiary bg-dark-secondary px-4 py-2 text-white outline-none transition focus:border-accent"
            />
            <div className="mt-3 flex justify-end">
              <button
                type="submit"
                disabled={savingName}
                className="rounded-lg bg-accent px-5 py-2 text-sm font-semibold text-white transition hover:opacity-90"
              >
                {savingName ? 'Saving...' : 'Save Name'}
              </button>
            </div>
          </form>

          <div className="mt-6 rounded-xl border border-red-900/60 bg-red-950/20 p-4">
            <h2 className="text-lg font-semibold text-red-300">Danger Zone</h2>
            <p className="mt-1 text-sm text-red-200/80">Delete account is currently a dummy action for now.</p>
            <button
              type="button"
              onClick={handleDeleteAccountDummy}
              className="mt-3 rounded-lg border border-red-700 px-4 py-2 text-sm font-semibold text-red-200 transition hover:bg-red-900/30"
            >
              Delete Account (Dummy)
            </button>
          </div>

          {statusMessage && <p className="mt-4 text-sm text-emerald-400">{statusMessage}</p>}
          {deleteMessage && <p className="mt-2 text-sm text-yellow-300">{deleteMessage}</p>}

          {canManageUploads && (
            <section className="mt-8 rounded-xl border border-dark-tertiary bg-dark-bg/60 p-4">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-xl font-semibold text-white">Your Uploaded Tracks</h2>
                <span className="text-xs text-gray-400">Edit metadata anytime</span>
              </div>

              {uploadsLoading && <p className="mt-4 text-sm text-gray-400">Loading uploads...</p>}
              {uploadsError && <p className="mt-4 text-sm text-red-400">{uploadsError}</p>}

              {!uploadsLoading && uploads.length === 0 && (
                <p className="mt-4 text-sm text-gray-400">No uploaded tracks found yet.</p>
              )}

              <div className="mt-4 space-y-4">
                {uploads.map((track) => (
                  <div key={track.id} className="rounded-lg border border-dark-tertiary bg-dark-secondary/60 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-base font-semibold text-white">{track.title}</p>
                        <p className="text-xs text-gray-400">
                          {track.genre_name || 'No genre'} • {track.language || 'Unknown'} • {track.release_date || 'No date'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${statusClass(track.status)}`}>
                          {track.status}
                        </span>
                        <button
                          type="button"
                          onClick={() => beginEditTrack(track)}
                          className="rounded-md border border-dark-tertiary px-3 py-1.5 text-xs font-semibold text-gray-200 transition hover:bg-dark-tertiary"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteTrack(track)}
                          disabled={deletingTrackId === track.id}
                          className="rounded-md border border-red-700/60 px-3 py-1.5 text-xs font-semibold text-red-300 transition hover:bg-red-900/30 disabled:opacity-60"
                        >
                          {deletingTrackId === track.id ? 'Deleting...' : 'Delete'}
                        </button>
                      </div>
                    </div>

                    {track.status === 'rejected' && track.rejection_reason && (
                      <p className="mt-2 text-xs text-red-300">Reason: {track.rejection_reason}</p>
                    )}

                    {editingTrackId === track.id && (
                      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                        <div className="md:col-span-2">
                          <label className="text-xs font-semibold text-gray-300">Title</label>
                          <input
                            type="text"
                            value={trackForm.title || ''}
                            onChange={(event) => setTrackForm((prev) => ({ ...prev, title: event.target.value }))}
                            className="mt-1 w-full rounded-md border border-dark-tertiary bg-dark-bg px-3 py-2 text-sm text-white outline-none focus:border-accent"
                          />
                        </div>

                        <div className="md:col-span-2">
                          <label className="text-xs font-semibold text-gray-300">Description</label>
                          <textarea
                            rows={3}
                            value={trackForm.description || ''}
                            onChange={(event) => setTrackForm((prev) => ({ ...prev, description: event.target.value }))}
                            className="mt-1 w-full rounded-md border border-dark-tertiary bg-dark-bg px-3 py-2 text-sm text-white outline-none focus:border-accent"
                          />
                        </div>

                        <div className="md:col-span-2">
                          <label className="text-xs font-semibold text-gray-300">Album Name (optional)</label>
                          <input
                            type="text"
                            value={trackForm.album_name || ''}
                            onChange={(event) => setTrackForm((prev) => ({ ...prev, album_name: event.target.value }))}
                            className="mt-1 w-full rounded-md border border-dark-tertiary bg-dark-bg px-3 py-2 text-sm text-white outline-none focus:border-accent"
                          />
                        </div>

                        <div>
                          <label className="text-xs font-semibold text-gray-300">Release Date</label>
                          <input
                            type="date"
                            value={trackForm.release_date || ''}
                            onChange={(event) => setTrackForm((prev) => ({ ...prev, release_date: event.target.value }))}
                            className="mt-1 w-full rounded-md border border-dark-tertiary bg-dark-bg px-3 py-2 text-sm text-white outline-none focus:border-accent"
                          />
                        </div>

                        <div>
                          <label className="text-xs font-semibold text-gray-300">Language</label>
                          <input
                            type="text"
                            value={trackForm.language || ''}
                            onChange={(event) => setTrackForm((prev) => ({ ...prev, language: event.target.value }))}
                            className="mt-1 w-full rounded-md border border-dark-tertiary bg-dark-bg px-3 py-2 text-sm text-white outline-none focus:border-accent"
                          />
                        </div>

                        <div>
                          <label className="text-xs font-semibold text-gray-300">Song Type</label>
                          <select
                            value={trackForm.song_type || 'single'}
                            onChange={(event) => setTrackForm((prev) => ({ ...prev, song_type: event.target.value }))}
                            className="mt-1 w-full rounded-md border border-dark-tertiary bg-dark-bg px-3 py-2 text-sm text-white outline-none focus:border-accent"
                          >
                            <option value="single">Single</option>
                            <option value="album">Album Track</option>
                            <option value="ep">EP Track</option>
                            <option value="podcast_episode">Podcast Episode</option>
                          </select>
                        </div>

                        <div>
                          <label className="text-xs font-semibold text-gray-300">Genre</label>
                          <select
                            value={trackForm.genre || ''}
                            onChange={(event) => setTrackForm((prev) => ({ ...prev, genre: event.target.value }))}
                            className="mt-1 w-full rounded-md border border-dark-tertiary bg-dark-bg px-3 py-2 text-sm text-white outline-none focus:border-accent"
                          >
                            {currentGenres.map((genre) => (
                              <option key={genre.id} value={genre.id}>{genre.name}</option>
                            ))}
                          </select>
                        </div>

                        <div className="md:col-span-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                          <label className="flex items-center gap-2 rounded-md border border-dark-tertiary bg-dark-bg px-3 py-2 text-xs text-white">
                            <input
                              type="checkbox"
                              checked={!!trackForm.is_podcast}
                              onChange={(event) => {
                                const checked = event.target.checked
                                setTrackForm((prev) => ({
                                  ...prev,
                                  is_podcast: checked,
                                  genre: checked ? podcastGenres[0]?.id || '' : musicGenres[0]?.id || '',
                                }))
                              }}
                            />
                            Is Podcast
                          </label>

                          <label className="flex items-center gap-2 rounded-md border border-dark-tertiary bg-dark-bg px-3 py-2 text-xs text-white">
                            <input
                              type="checkbox"
                              checked={!!trackForm.explicit}
                              onChange={(event) => setTrackForm((prev) => ({ ...prev, explicit: event.target.checked }))}
                            />
                            Explicit
                          </label>
                        </div>

                        <div className="md:col-span-2">
                          <label className="text-xs font-semibold text-gray-300">Featured Artists (comma separated)</label>
                          <input
                            type="text"
                            value={trackForm.featured_artists || ''}
                            onChange={(event) => setTrackForm((prev) => ({ ...prev, featured_artists: event.target.value }))}
                            className="mt-1 w-full rounded-md border border-dark-tertiary bg-dark-bg px-3 py-2 text-sm text-white outline-none focus:border-accent"
                          />
                        </div>

                        <div className="md:col-span-2">
                          <label className="text-xs font-semibold text-gray-300">Lyrics Text (optional)</label>
                          <textarea
                            rows={4}
                            value={trackForm.lyrics_text || ''}
                            onChange={(event) => setTrackForm((prev) => ({ ...prev, lyrics_text: event.target.value }))}
                            className="mt-1 w-full rounded-md border border-dark-tertiary bg-dark-bg px-3 py-2 text-sm text-white outline-none focus:border-accent"
                          />
                        </div>

                        <div className="md:col-span-2 flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={cancelTrackEdit}
                            className="rounded-md border border-dark-tertiary px-3 py-2 text-xs font-semibold text-gray-200 transition hover:bg-dark-tertiary"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={saveTrackMetadata}
                            disabled={savingTrackId === track.id}
                            className="rounded-md bg-accent px-3 py-2 text-xs font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
                          >
                            {savingTrackId === track.id ? 'Saving...' : 'Save Metadata'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </main>
  )
}

export default Profile
