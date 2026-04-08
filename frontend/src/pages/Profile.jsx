import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { musicAPI, userAPI, authAPI } from '../services/api'
import ConfirmDialog from '../components/ConfirmDialog'
import { normalizeDurationSeconds } from '../utils/helpers'
import { imageProtectionProps } from '../utils/imageProtection'

const newAlbumTrackDraftRow = () => ({
  id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
  title: '',
  artistName: '',
  audioFile: null,
  coverImage: null,
})

function Profile({ user, onProfileUpdate }) {
  const navigate = useNavigate()
  const [displayName, setDisplayName] = useState(user?.displayName || '')
  const [profileImage, setProfileImage] = useState(user?.profileImage || '')
  const [statusMessage, setStatusMessage] = useState('')
  const [deleteMessage, setDeleteMessage] = useState('')
  const [savingName, setSavingName] = useState(false)
  const [savingImage, setSavingImage] = useState(false)
  const [devices, setDevices] = useState([])
  const [devicesLoading, setDevicesLoading] = useState(false)
  const [devicesError, setDevicesError] = useState('')
  const [loggingOutDeviceId, setLoggingOutDeviceId] = useState('')
  const [uploads, setUploads] = useState([])
  const [uploadsLoading, setUploadsLoading] = useState(false)
  const [uploadsError, setUploadsError] = useState('')
  const [editingTrackId, setEditingTrackId] = useState('')
  const [savingTrackId, setSavingTrackId] = useState('')
  const [deletingTrackId, setDeletingTrackId] = useState('')
  const [pendingDeleteTrack, setPendingDeleteTrack] = useState(null)
  const [editingAlbumKey, setEditingAlbumKey] = useState('')
  const [savingAlbumKey, setSavingAlbumKey] = useState('')
  const [pendingDeleteAlbum, setPendingDeleteAlbum] = useState(null)
  const [trackForm, setTrackForm] = useState({})
  const [albumForm, setAlbumForm] = useState({})
  const [albumTrackForms, setAlbumTrackForms] = useState({})
  const [albumNewTracks, setAlbumNewTracks] = useState([newAlbumTrackDraftRow()])
  const [albumTrackIdsToDelete, setAlbumTrackIdsToDelete] = useState([])
  const [albumTrackOrder, setAlbumTrackOrder] = useState([])
  const [albumMainCoverImage, setAlbumMainCoverImage] = useState(null)
  const [musicGenres, setMusicGenres] = useState([])
  const [podcastGenres, setPodcastGenres] = useState([])
  const [deletingAccount, setDeletingAccount] = useState(false)
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
    const charCount = trimmed.length

    if (charCount > 25) {
      setStatusMessage('Display name cannot exceed 25 characters.')
      setDeleteMessage('')
      return
    }

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

  const handleDeleteAccount = async () => {
    setDeleteMessage('')
    setStatusMessage('')
    setDeletingAccount(true)

    try {
      await authAPI.requestAccountDeletion('User requested account deletion from settings')
      setDeleteMessage('Account deletion confirmation email sent. Check your email to confirm.')
    } catch (err) {
      setDeleteMessage(err.response?.data?.detail || 'Failed to request account deletion. Try again.')
    } finally {
      setDeletingAccount(false)
    }
  }

  const formatDeviceTime = (value) => {
    if (!value) return 'Unknown'
    const parsed = new Date(value)
    if (Number.isNaN(parsed.getTime())) return 'Unknown'
    return parsed.toLocaleString()
  }

  const resolveDeviceName = (device) => {
    if (device.display_name && String(device.display_name).trim()) {
      return String(device.display_name).slice(0, 70)
    }
    if (device.device_name && String(device.device_name).trim()) {
      return String(device.device_name).slice(0, 70)
    }
    if (device.user_agent && String(device.user_agent).trim()) {
      return String(device.user_agent).slice(0, 70)
    }
    return 'Unknown device'
  }

  const loadDevices = async () => {
    try {
      setDevicesLoading(true)
      setDevicesError('')
      const response = await userAPI.getDevices()
      const items = Array.isArray(response.data) ? response.data : response.data?.results || []
      setDevices(items)
    } catch (err) {
      setDevicesError('Failed to load logged-in devices.')
    } finally {
      setDevicesLoading(false)
    }
  }

  const handleLogoutDevice = async (deviceId) => {
    try {
      setLoggingOutDeviceId(deviceId)
      setDevicesError('')
      const response = await userAPI.logoutDevice(deviceId)
      const revokedCurrent = !!response.data?.revoked_current
      setStatusMessage('Device logged out successfully.')

      if (revokedCurrent) {
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        localStorage.removeItem('user_email')
        localStorage.removeItem('user_data')
        window.location.href = '/login'
        return
      }

      await loadDevices()
    } catch (err) {
      setDevicesError(err.response?.data?.detail || 'Failed to log out device.')
    } finally {
      setLoggingOutDeviceId('')
    }
  }

  useEffect(() => {
    loadDevices()
  }, [user?.email])

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

  const groupedAlbums = useMemo(() => {
    const groups = new Map()

    uploads
      .filter((track) => String(track.album_name || '').trim())
      .forEach((track) => {
        const albumName = String(track.album_name || '').trim()
        const albumArtist = String(track.album_artist || track.featured_artists || track.artist_name || '').trim()
        const key = `${albumName.toLowerCase()}::${albumArtist.toLowerCase()}`
        const existing = groups.get(key)
        const releaseDate = track.release_date || ''

        if (!existing) {
          groups.set(key, {
            key,
            name: albumName,
            album_artist: albumArtist || 'Unknown Artist',
            cover_image: track.album_cover_image || track.cover_image || '',
            trackIds: [track.id],
            tracks: [track],
            latest_release_date: releaseDate,
            total_duration: normalizeDurationSeconds(track.duration) || 0,
            genre: track.genre || '',
            language: track.language || '',
            explicit: !!track.explicit,
          })
        } else {
          existing.trackIds.push(track.id)
          existing.tracks.push(track)
          if (!existing.cover_image && (track.album_cover_image || track.cover_image)) {
            existing.cover_image = track.album_cover_image || track.cover_image
          }
          if (releaseDate && (!existing.latest_release_date || releaseDate > existing.latest_release_date)) {
            existing.latest_release_date = releaseDate
          }
          existing.total_duration += normalizeDurationSeconds(track.duration) || 0
        }
      })

    groups.forEach((album) => {
      album.tracks = [...album.tracks].sort((a, b) => {
        const orderA = Number.isFinite(Number(a.album_track_order)) ? Number(a.album_track_order) : Number.MAX_SAFE_INTEGER
        const orderB = Number.isFinite(Number(b.album_track_order)) ? Number(b.album_track_order) : Number.MAX_SAFE_INTEGER
        if (orderA !== orderB) return orderA - orderB

        const createdA = String(a.created_at || '')
        const createdB = String(b.created_at || '')
        const createdCompare = createdA.localeCompare(createdB)
        if (createdCompare !== 0) return createdCompare

        return String(a.title || '').localeCompare(String(b.title || ''))
      })

      album.trackIds = album.tracks.map((track) => track.id)
    })

    return [...groups.values()].sort((a, b) => String(b.latest_release_date || '').localeCompare(String(a.latest_release_date || '')))
  }, [uploads])

  const beginEditAlbum = (album) => {
    const initialTrackForms = (album.tracks || []).reduce((acc, track) => {
      acc[track.id] = {
        title: track.title || '',
        description: track.description || '',
        release_date: track.release_date || '',
        language: track.language || '',
        genre: track.genre || '',
        explicit: !!track.explicit,
        song_type: track.song_type || 'album',
        featured_artists: track.featured_artists || '',
        lyrics_text: track.lyrics_text || '',
      }
      return acc
    }, {})

    setEditingAlbumKey(album.key)
    setAlbumForm({
      album_name: album.name || '',
      album_artist: album.album_artist || '',
      description: album.tracks?.[0]?.description || '',
      release_date: album.latest_release_date || '',
      language: album.language || '',
      genre: album.genre || '',
      explicit: !!album.explicit,
    })
    setAlbumTrackForms(initialTrackForms)
    setAlbumNewTracks([newAlbumTrackDraftRow()])
    setAlbumTrackIdsToDelete([])
    setAlbumTrackOrder((album.tracks || []).map((track) => track.id))
    setAlbumMainCoverImage(null)
  }

  const cancelAlbumEdit = () => {
    setEditingAlbumKey('')
    setAlbumForm({})
    setAlbumTrackForms({})
    setAlbumNewTracks([newAlbumTrackDraftRow()])
    setAlbumTrackIdsToDelete([])
    setAlbumTrackOrder([])
    setAlbumMainCoverImage(null)
  }

  const updateAlbumTrackForm = (trackId, patch) => {
    setAlbumTrackForms((prev) => ({
      ...prev,
      [trackId]: {
        ...(prev[trackId] || {}),
        ...patch,
      },
    }))
  }

  const cancelTrackEdit = () => {
    setEditingTrackId('')
    setTrackForm({})
  }

  const currentGenres = trackForm.is_podcast ? podcastGenres : musicGenres

  const refreshUploads = async () => {
    const refreshed = await musicAPI.getMyUploads()
    const refreshedItems = Array.isArray(refreshed.data)
      ? refreshed.data
      : refreshed.data?.results || []
    setUploads(refreshedItems)
  }

  const addAlbumTrackDraftRow = () => {
    setAlbumNewTracks((prev) => [...prev, newAlbumTrackDraftRow()])
  }

  const removeAlbumTrackDraftRow = (rowId) => {
    setAlbumNewTracks((prev) => {
      if (prev.length <= 1) return prev
      return prev.filter((row) => row.id !== rowId)
    })
  }

  const updateAlbumTrackDraftRow = (rowId, patch) => {
    setAlbumNewTracks((prev) => prev.map((row) => (row.id === rowId ? { ...row, ...patch } : row)))
  }

  const parseArtistNames = (value) => {
    if (!value) return []
    return value
      .split(/,|;|\/|&/)
      .map((name) => name.trim())
      .filter(Boolean)
  }

  const handleAlbumEditTrackFileChange = async (rowId, file) => {
    updateAlbumTrackDraftRow(rowId, { audioFile: file })
    if (!file) return

    const filenameWithoutExt = file.name.replace(/\.[^/.]+$/, '')
    setAlbumNewTracks((prev) => prev.map((row) => {
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
        setAlbumNewTracks((prev) => prev.map((row) => {
          if (row.id !== rowId) return row
          return {
            ...row,
            title: data.title,
          }
        }))
      }

      if (data.featured_artists) {
        const parsedArtists = parseArtistNames(data.featured_artists)
        if (parsedArtists.length > 0) {
          setAlbumNewTracks((prev) => prev.map((row) => {
            if (row.id !== rowId) return row
            return {
              ...row,
              artistName: parsedArtists.join(', '),
            }
          }))
        }
      }

      if (data.album_artist) {
        setAlbumForm((prev) => ({
          ...prev,
          album_artist: String(prev.album_artist || '').trim() ? prev.album_artist : data.album_artist,
        }))
      }

      if (data.release_date) {
        setAlbumForm((prev) => ({
          ...prev,
          release_date: prev.release_date || data.release_date,
        }))
      }
    } catch {
      // Metadata extraction is optional and should never block editing.
    }
  }

  const toggleAlbumTrackDelete = (trackId) => {
    setAlbumTrackIdsToDelete((prev) => (
      prev.includes(trackId) ? prev.filter((id) => id !== trackId) : [...prev, trackId]
    ))
  }

  const moveAlbumTrack = (trackId, direction) => {
    setAlbumTrackOrder((prev) => {
      if (!Array.isArray(prev) || prev.length <= 1) return prev

      const currentIndex = prev.indexOf(trackId)
      if (currentIndex < 0) return prev

      const nextIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1
      if (nextIndex < 0 || nextIndex >= prev.length) return prev

      const next = [...prev]
      const temp = next[currentIndex]
      next[currentIndex] = next[nextIndex]
      next[nextIndex] = temp
      return next
    })
  }

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

  const saveAlbumMetadata = async () => {
    if (!editingAlbumKey) return

    const album = groupedAlbums.find((item) => item.key === editingAlbumKey)
    if (!album) return

    const draftRows = albumNewTracks.filter((row) => (
      row.title.trim() || row.artistName.trim() || row.audioFile || row.coverImage
    ))

    const incompleteRows = draftRows
      .map((row, index) => ({ row, index }))
      .filter(({ row }) => !row.title.trim() || !row.audioFile)

    if (incompleteRows.length > 0) {
      const labels = incompleteRows.map(({ index }) => index + 1).join(', ')
      setUploadsError(`Each added song needs both title and audio file (check rows: ${labels}).`)
      return
    }

    const orderedTrackIds = (albumTrackOrder.length > 0 ? albumTrackOrder : album.trackIds)
      .filter((trackId) => album.trackIds.includes(trackId))
    const remainingTrackIds = orderedTrackIds.filter((trackId) => !albumTrackIdsToDelete.includes(trackId))
    if (remainingTrackIds.length === 0 && draftRows.length === 0) {
      setUploadsError('Album cannot be empty. Add at least one song or delete the album instead.')
      return
    }

    const resolvedGenre = albumForm.genre || album.genre || musicGenres[0]?.id || ''
    if (draftRows.length > 0 && !resolvedGenre) {
      setUploadsError('Genre is required to add new songs to this album.')
      return
    }

    if (draftRows.length > 0 && !String(albumForm.release_date || '').trim()) {
      setUploadsError('Release date is required when adding new songs.')
      return
    }

    if (draftRows.length > 0 && !String(albumForm.language || '').trim()) {
      setUploadsError('Language is required when adding new songs.')
      return
    }

    try {
      setSavingAlbumKey(editingAlbumKey)
      if (remainingTrackIds.length > 0) {
        await Promise.all(
          remainingTrackIds.map((trackId, index) => (
            musicAPI.updateMyUpload(trackId, {
              title: (albumTrackForms[trackId]?.title || '').trim(),
              description: (albumTrackForms[trackId]?.description || '').trim(),
              album_name: (albumForm.album_name || '').trim(),
              album_artist: (albumForm.album_artist || '').trim(),
              genre: albumTrackForms[trackId]?.genre || albumForm.genre || '',
              release_date: albumTrackForms[trackId]?.release_date || albumForm.release_date || '',
              language: albumTrackForms[trackId]?.language || albumForm.language || '',
              explicit: !!albumTrackForms[trackId]?.explicit,
              song_type: albumTrackForms[trackId]?.song_type || 'album',
              featured_artists: (albumTrackForms[trackId]?.featured_artists || '').trim(),
              lyrics_text: (albumTrackForms[trackId]?.lyrics_text || '').trim(),
              is_podcast: false,
              album_track_order: index + 1,
            })
          ))
        )

        if (albumMainCoverImage) {
          await Promise.all(
            remainingTrackIds.map((trackId) => {
              const coverPayload = new FormData()
              coverPayload.append('album_cover_image', albumMainCoverImage)
              return musicAPI.updateMyUpload(trackId, coverPayload, true)
            })
          )
        }
      }

      if (albumTrackIdsToDelete.length > 0) {
        await Promise.all(albumTrackIdsToDelete.map((trackId) => musicAPI.deleteMyUpload(trackId)))
      }

      if (draftRows.length > 0) {
        const rowMetadata = await Promise.all(
          draftRows.map(async (row) => {
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

        for (const [index, row] of draftRows.entries()) {
          const uploadPayload = new FormData()
          uploadPayload.append('title', row.title.trim())
          uploadPayload.append('description', (albumForm.description || '').trim())
          uploadPayload.append('genre', String(resolvedGenre))
          uploadPayload.append('release_date', String(albumForm.release_date || '').trim())
          uploadPayload.append('language', String(albumForm.language || '').trim())
          uploadPayload.append('is_podcast', 'false')
          uploadPayload.append('explicit', String(!!albumForm.explicit))
          uploadPayload.append('song_type', 'album')
          uploadPayload.append('audio_file', row.audioFile)
          uploadPayload.append('album_name', (albumForm.album_name || '').trim())
          uploadPayload.append('album_artist', (albumForm.album_artist || '').trim())
          uploadPayload.append('album_track_order', String(remainingTrackIds.length + index + 1))
          if (albumMainCoverImage) {
            uploadPayload.append('album_cover_image', albumMainCoverImage)
          }

          const rowInfo = metadataByRowId.get(row.id)
          if (row.coverImage) {
            uploadPayload.append('cover_image', row.coverImage)
          } else if (albumMainCoverImage && !rowInfo?.hasEmbeddedCover) {
            uploadPayload.append('cover_image', albumMainCoverImage)
          }

          const rowArtist = row.artistName.trim() || (albumForm.album_artist || '').trim()
          if (rowArtist) {
            uploadPayload.append('featured_artists', rowArtist)
          }

          await musicAPI.uploadTrack(uploadPayload)
        }
      }

      await refreshUploads()
      const deletedCount = albumTrackIdsToDelete.length
      const addedCount = draftRows.length
      const parts = ['Album updated successfully.']
      if (deletedCount > 0) parts.push(`${deletedCount} track(s) removed.`)
      if (addedCount > 0) parts.push(`${addedCount} track(s) added.`)
      setStatusMessage(parts.join(' '))
      setUploadsError('')
      cancelAlbumEdit()
    } catch (err) {
      const data = err.response?.data
      if (typeof data === 'object' && data !== null) {
        const details = Object.entries(data)
          .map(([field, msg]) => `${field}: ${Array.isArray(msg) ? msg.join(', ') : msg}`)
          .join(' | ')
        setUploadsError(details || 'Failed to update album.')
      } else {
        setUploadsError('Failed to update album.')
      }
    } finally {
      setSavingAlbumKey('')
    }
  }

  const deleteTrack = async (track) => {
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

  const deleteAlbum = async (album) => {
    try {
      setSavingAlbumKey(album.key)
      await Promise.all(album.trackIds.map((trackId) => musicAPI.deleteMyUpload(trackId)))
      await refreshUploads()
      setStatusMessage('Album deleted successfully.')
      setUploadsError('')
    } catch (err) {
      setUploadsError('Failed to delete album.')
    } finally {
      setSavingAlbumKey('')
      setPendingDeleteAlbum(null)
    }
  }

  const statusClass = (status) => {
    if (status === 'approved') return 'text-emerald-300 bg-emerald-900/30 border-emerald-700/50'
    if (status === 'rejected') return 'text-red-300 bg-red-900/30 border-red-700/50'
    return 'text-yellow-300 bg-yellow-900/30 border-yellow-700/50'
  }

  return (
    <main className="pb-32 pt-4">
      <div className="mx-auto w-full max-w-3xl px-3 sm:px-6">
        <div className="border-0 bg-transparent p-0 sm:border sm:border-dark-tertiary sm:bg-dark-secondary/70 sm:p-6 md:p-8">
          <h1 className="text-3xl font-bold text-white">Profile Settings</h1>
          <p className="mt-2 text-sm text-gray-400">Manage your Cadence profile details.</p>

          <div className="mt-8 flex flex-col gap-4 border-0 bg-transparent p-0 sm:border sm:border-dark-tertiary sm:bg-dark-bg/60 sm:p-4 md:flex-row md:items-center md:justify-between">
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
                className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black transition hover:bg-gray-100"
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

          <form onSubmit={handleSaveName} className="mt-6 border-0 bg-transparent p-0 sm:border sm:border-dark-tertiary sm:bg-dark-bg/60 sm:p-4">
            <label htmlFor="displayName" className="text-sm font-semibold text-white">
              Display Name
            </label>
            <input
              id="displayName"
              type="text"
              value={displayName}
              maxLength={25}
              onChange={(event) => setDisplayName(event.target.value.slice(0, 25))}
              placeholder="Enter your display name"
              className="mt-2 w-full rounded-lg border border-dark-tertiary bg-dark-secondary px-4 py-2 text-white outline-none transition focus:border-accent"
            />
            <p className="mt-2 text-xs text-gray-400">
              {displayName.trim().length}/25 characters
            </p>
            <div className="mt-3 flex justify-end">
              <button
                type="submit"
                disabled={savingName}
                className="rounded-lg bg-white px-5 py-2 text-sm font-semibold text-black transition hover:bg-gray-100"
              >
                {savingName ? 'Saving...' : 'Save Name'}
              </button>
            </div>
          </form>

          <section className="mt-6 border-0 bg-transparent p-0 sm:border sm:border-dark-tertiary sm:bg-dark-bg/60 sm:p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-white">Logged In Devices</h2>
                <p className="mt-1 text-xs text-gray-400">Maximum 3 active devices per account.</p>
              </div>
              <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-white/80">{devices.length}/3</span>
            </div>

            {devicesLoading && <p className="mt-4 text-sm text-gray-400">Loading devices...</p>}
            {!devicesLoading && devicesError && <p className="mt-4 text-sm text-red-300">{devicesError}</p>}

            {!devicesLoading && !devicesError && devices.length === 0 && (
              <p className="mt-4 text-sm text-gray-400">No active device sessions found.</p>
            )}

            {!devicesLoading && !devicesError && devices.length > 0 && (
              <div className="mt-4 space-y-3">
                {devices.map((device) => (
                  <div key={device.id} className="flex flex-wrap items-center justify-between gap-3 border border-white/10 bg-white/[0.02] p-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-semibold text-white">{resolveDeviceName(device)}</p>
                        {device.is_current && (
                          <span className="rounded-full border border-white/20 bg-white/5 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-white">
                            Current
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-xs text-white/55">IP: {device.ip_address || 'Unknown'}</p>
                      <p className="mt-1 text-xs text-white/50">Last active: {formatDeviceTime(device.last_seen_at)}</p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleLogoutDevice(device.id)}
                      disabled={loggingOutDeviceId === device.id}
                      className="rounded-md border border-red-700/60 px-3 py-1.5 text-xs font-semibold text-red-300 transition hover:bg-red-900/30 disabled:opacity-60"
                    >
                      {loggingOutDeviceId === device.id ? 'Logging out...' : 'Log out'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          <div className="mt-6 border-0 bg-transparent p-0 sm:border sm:border-dark-tertiary sm:bg-dark-bg/60 sm:p-4">
            <h2 className="text-lg font-semibold text-white">Delete Account</h2>
            <p className="mt-1 text-sm text-gray-400">Permanently delete your account and all associated data.</p>
            <button
              type="button"
              onClick={handleDeleteAccount}
              disabled={deletingAccount}
              className="mt-3 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black transition hover:bg-gray-100 disabled:bg-white/50 disabled:text-black/50"
            >
              {deletingAccount ? 'Requesting deletion...' : 'Delete Account'}
            </button>
          </div>

          {statusMessage && <p className="mt-4 text-sm text-emerald-400">{statusMessage}</p>}
          {deleteMessage && <p className="mt-2 text-sm text-yellow-300">{deleteMessage}</p>}

          {canManageUploads && (
            <section className="mt-8 border-0 bg-transparent p-0 sm:border sm:border-dark-tertiary sm:bg-dark-bg/60 sm:p-4">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-xl font-semibold text-white">Your Uploaded Tracks</h2>
                <span className="text-xs text-gray-400">Edit metadata anytime</span>
              </div>

              <div className="mt-6 border-0 bg-transparent p-0 sm:border sm:border-dark-tertiary sm:bg-dark-secondary/50 sm:p-4">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-lg font-semibold text-white">Your Albums</h3>
                  <span className="text-xs text-gray-400">Album-wide edit and delete</span>
                </div>

                {uploadsLoading && <p className="mt-4 text-sm text-gray-400">Loading albums...</p>}

                {!uploadsLoading && groupedAlbums.length === 0 && (
                  <p className="mt-4 text-sm text-gray-400">No albums found yet.</p>
                )}

                <div className="mt-4 space-y-4">
                  {groupedAlbums.map((album) => {
                    const orderMap = new Map((albumTrackOrder || []).map((trackId, index) => [trackId, index]))
                    const orderedAlbumTracks = [...(album.tracks || [])].sort((a, b) => (
                      (orderMap.get(a.id) ?? Number.MAX_SAFE_INTEGER) - (orderMap.get(b.id) ?? Number.MAX_SAFE_INTEGER)
                    ))

                    return (
                    <div key={album.key} className="border-0 bg-transparent p-0 sm:border sm:border-dark-tertiary sm:bg-dark-bg/60 sm:p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <img
                            src={album.cover_image || '/Cadence Playlist.png'}
                            alt={album.name}
                            className="h-14 w-14 rounded-lg object-cover"
                            {...imageProtectionProps}
                          />
                          <div>
                            <p className="text-base font-semibold text-white">{album.name}</p>
                            <p className="text-xs text-gray-400">
                              {album.album_artist || 'Unknown Artist'} • {album.trackIds.length} tracks
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => beginEditAlbum(album)}
                            className="rounded-md border border-dark-tertiary px-3 py-1.5 text-xs font-semibold text-gray-200 transition hover:bg-dark-tertiary"
                          >
                            Edit Album
                          </button>
                          <button
                            type="button"
                            onClick={() => setPendingDeleteAlbum(album)}
                            disabled={savingAlbumKey === album.key}
                            className="rounded-md border border-red-700/60 px-3 py-1.5 text-xs font-semibold text-red-300 transition hover:bg-red-900/30 disabled:opacity-60"
                          >
                            {savingAlbumKey === album.key ? 'Deleting...' : 'Delete Album'}
                          </button>
                        </div>
                      </div>

                      {editingAlbumKey === album.key && (
                        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                          <div className="md:col-span-2">
                            <label className="text-xs font-semibold text-gray-300">Album Name</label>
                            <input
                              type="text"
                              value={albumForm.album_name || ''}
                              onChange={(event) => setAlbumForm((prev) => ({ ...prev, album_name: event.target.value }))}
                              className="mt-1 w-full rounded-md border border-dark-tertiary bg-dark-bg px-3 py-2 text-sm text-white outline-none focus:border-accent"
                            />
                          </div>

                          <div className="md:col-span-2">
                            <label className="text-xs font-semibold text-gray-300">Album Artist</label>
                            <input
                              type="text"
                              value={albumForm.album_artist || ''}
                              onChange={(event) => setAlbumForm((prev) => ({ ...prev, album_artist: event.target.value }))}
                              className="mt-1 w-full rounded-md border border-dark-tertiary bg-dark-bg px-3 py-2 text-sm text-white outline-none focus:border-accent"
                            />
                          </div>

                          <div className="md:col-span-2">
                            <label className="text-xs font-semibold text-gray-300">Description</label>
                            <textarea
                              rows={3}
                              value={albumForm.description || ''}
                              onChange={(event) => setAlbumForm((prev) => ({ ...prev, description: event.target.value }))}
                              className="mt-1 w-full rounded-md border border-dark-tertiary bg-dark-bg px-3 py-2 text-sm text-white outline-none focus:border-accent"
                              placeholder="Optional album description"
                            />
                          </div>

                          <div>
                            <label className="text-xs font-semibold text-gray-300">Release Date</label>
                            <input
                              type="date"
                              value={albumForm.release_date || ''}
                              onChange={(event) => setAlbumForm((prev) => ({ ...prev, release_date: event.target.value }))}
                              className="mt-1 w-full rounded-md border border-dark-tertiary bg-dark-bg px-3 py-2 text-sm text-white outline-none focus:border-accent"
                            />
                          </div>

                          <div>
                            <label className="text-xs font-semibold text-gray-300">Language</label>
                            <input
                              type="text"
                              value={albumForm.language || ''}
                              onChange={(event) => setAlbumForm((prev) => ({ ...prev, language: event.target.value }))}
                              className="mt-1 w-full rounded-md border border-dark-tertiary bg-dark-bg px-3 py-2 text-sm text-white outline-none focus:border-accent"
                            />
                          </div>

                          <div>
                            <label className="text-xs font-semibold text-gray-300">Genre</label>
                            <select
                              value={albumForm.genre || ''}
                              onChange={(event) => setAlbumForm((prev) => ({ ...prev, genre: event.target.value }))}
                              className="mt-1 w-full rounded-md border border-dark-tertiary bg-dark-bg px-3 py-2 text-sm text-white outline-none focus:border-accent"
                            >
                              <option value="">Keep current</option>
                              {musicGenres.map((genre) => (
                                <option key={genre.id} value={genre.id}>{genre.name}</option>
                              ))}
                            </select>
                          </div>

                          <label className="flex items-center gap-2 rounded-md border border-dark-tertiary bg-dark-bg px-3 py-2 text-xs text-white">
                            <input
                              type="checkbox"
                              checked={!!albumForm.explicit}
                              onChange={(event) => setAlbumForm((prev) => ({ ...prev, explicit: event.target.checked }))}
                            />
                            Explicit
                          </label>

                          <div className="md:col-span-2 border border-dark-tertiary bg-dark-bg/60 p-4">
                            <div className="flex items-center justify-between gap-3">
                              <p className="text-sm font-semibold text-white">Album Songs</p>
                              <button
                                type="button"
                                onClick={addAlbumTrackDraftRow}
                                className="rounded-md bg-white px-3 py-1.5 text-xs font-semibold text-black transition hover:bg-white/90"
                              >
                                + Add Song
                              </button>
                            </div>

                            {album.tracks.length > 0 && (
                              <div className="mt-3 space-y-2">
                                {orderedAlbumTracks.map((track, index) => {
                                  const markedForDelete = albumTrackIdsToDelete.includes(track.id)
                                  const isFirst = index === 0
                                  const isLast = index === orderedAlbumTracks.length - 1
                                  const trackForm = albumTrackForms[track.id] || {}
                                  return (
                                    <div
                                      key={track.id}
                                      className={`flex items-center justify-between border px-3 py-2 ${
                                        markedForDelete
                                          ? 'border-red-700/50 bg-red-900/20'
                                          : 'border-white/10 bg-dark-secondary/40'
                                      }`}
                                    >
                                      <div className="min-w-0">
                                        <p className="truncate text-sm font-medium text-white">
                                          <span className="mr-2 text-white/50">#{index + 1}</span>
                                          {trackForm.title || track.title}
                                        </p>
                                        <p className="truncate text-xs text-gray-400">{trackForm.featured_artists || track.featured_artists || track.artist_name || 'Unknown Artist'}</p>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <button
                                          type="button"
                                          onClick={() => moveAlbumTrack(track.id, 'up')}
                                          disabled={isFirst}
                                          className="rounded-md border border-white/20 px-2 py-1 text-xs font-semibold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
                                        >
                                          Up
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => moveAlbumTrack(track.id, 'down')}
                                          disabled={isLast}
                                          className="rounded-md border border-white/20 px-2 py-1 text-xs font-semibold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
                                        >
                                          Down
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => toggleAlbumTrackDelete(track.id)}
                                          className={`rounded-md border px-2.5 py-1 text-xs font-semibold transition ${
                                            markedForDelete
                                              ? 'border-white/20 text-white hover:bg-white/10'
                                              : 'border-red-700/60 text-red-300 hover:bg-red-900/30'
                                          }`}
                                        >
                                          {markedForDelete ? 'Undo Remove' : 'Remove'}
                                        </button>
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>
                            )}

                            {album.tracks.length > 0 && (
                              <div className="mt-4 space-y-3">
                                <p className="text-xs font-semibold uppercase tracking-wide text-white/70">Edit Existing Song Details</p>
                                {orderedAlbumTracks.map((track) => {
                                  const markedForDelete = albumTrackIdsToDelete.includes(track.id)
                                  const trackForm = albumTrackForms[track.id] || {}

                                  return (
                                    <div
                                      key={`fields-${track.id}`}
                                      className={`border p-3 ${markedForDelete ? 'border-red-700/40 bg-red-900/10 opacity-70' : 'border-white/10 bg-dark-secondary/40'}`}
                                    >
                                      <div className="mb-2 flex items-center justify-between">
                                        <p className="text-xs font-semibold uppercase tracking-wide text-white/70">{track.title}</p>
                                        {markedForDelete && <span className="text-[10px] font-semibold uppercase tracking-wide text-red-300">Marked for removal</span>}
                                      </div>

                                      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                        <div>
                                          <label className="text-xs font-semibold text-white">Song Title</label>
                                          <input
                                            type="text"
                                            value={trackForm.title || ''}
                                            onChange={(event) => updateAlbumTrackForm(track.id, { title: event.target.value })}
                                            className="mt-1 w-full rounded-md border border-dark-tertiary bg-dark-bg px-3 py-2 text-sm text-white outline-none focus:border-accent"
                                            disabled={markedForDelete}
                                          />
                                        </div>

                                        <div>
                                          <label className="text-xs font-semibold text-white">Song Artist</label>
                                          <input
                                            type="text"
                                            value={trackForm.featured_artists || ''}
                                            onChange={(event) => updateAlbumTrackForm(track.id, { featured_artists: event.target.value })}
                                            className="mt-1 w-full rounded-md border border-dark-tertiary bg-dark-bg px-3 py-2 text-sm text-white outline-none focus:border-accent"
                                            disabled={markedForDelete}
                                          />
                                        </div>

                                        <div className="md:col-span-2">
                                          <label className="text-xs font-semibold text-white">Description</label>
                                          <textarea
                                            rows={2}
                                            value={trackForm.description || ''}
                                            onChange={(event) => updateAlbumTrackForm(track.id, { description: event.target.value })}
                                            className="mt-1 w-full rounded-md border border-dark-tertiary bg-dark-bg px-3 py-2 text-sm text-white outline-none focus:border-accent"
                                            disabled={markedForDelete}
                                          />
                                        </div>

                                        <div>
                                          <label className="text-xs font-semibold text-white">Release Date</label>
                                          <input
                                            type="date"
                                            value={trackForm.release_date || ''}
                                            onChange={(event) => updateAlbumTrackForm(track.id, { release_date: event.target.value })}
                                            className="mt-1 w-full rounded-md border border-dark-tertiary bg-dark-bg px-3 py-2 text-sm text-white outline-none focus:border-accent"
                                            disabled={markedForDelete}
                                          />
                                        </div>

                                        <div>
                                          <label className="text-xs font-semibold text-white">Language</label>
                                          <input
                                            type="text"
                                            value={trackForm.language || ''}
                                            onChange={(event) => updateAlbumTrackForm(track.id, { language: event.target.value })}
                                            className="mt-1 w-full rounded-md border border-dark-tertiary bg-dark-bg px-3 py-2 text-sm text-white outline-none focus:border-accent"
                                            disabled={markedForDelete}
                                          />
                                        </div>

                                        <div>
                                          <label className="text-xs font-semibold text-white">Song Type</label>
                                          <select
                                            value={trackForm.song_type || 'album'}
                                            onChange={(event) => updateAlbumTrackForm(track.id, { song_type: event.target.value })}
                                            className="mt-1 w-full rounded-md border border-dark-tertiary bg-dark-bg px-3 py-2 text-sm text-white outline-none focus:border-accent"
                                            disabled={markedForDelete}
                                          >
                                            <option value="album">Album Track</option>
                                            <option value="ep">EP Track</option>
                                          </select>
                                        </div>

                                        <div>
                                          <label className="text-xs font-semibold text-white">Genre</label>
                                          <select
                                            value={trackForm.genre || ''}
                                            onChange={(event) => updateAlbumTrackForm(track.id, { genre: event.target.value })}
                                            className="mt-1 w-full rounded-md border border-dark-tertiary bg-dark-bg px-3 py-2 text-sm text-white outline-none focus:border-accent"
                                            disabled={markedForDelete}
                                          >
                                            <option value="">Select genre</option>
                                            {musicGenres.map((genre) => (
                                              <option key={genre.id} value={genre.id}>{genre.name}</option>
                                            ))}
                                          </select>
                                        </div>

                                        <label className="flex items-center gap-2 rounded-md border border-dark-tertiary bg-dark-bg px-3 py-2 text-xs text-white">
                                          <input
                                            type="checkbox"
                                            checked={!!trackForm.explicit}
                                            onChange={(event) => updateAlbumTrackForm(track.id, { explicit: event.target.checked })}
                                            disabled={markedForDelete}
                                          />
                                          Explicit
                                        </label>

                                        <div className="md:col-span-2">
                                          <label className="text-xs font-semibold text-white">Lyrics Text (optional)</label>
                                          <textarea
                                            rows={3}
                                            value={trackForm.lyrics_text || ''}
                                            onChange={(event) => updateAlbumTrackForm(track.id, { lyrics_text: event.target.value })}
                                            className="mt-1 w-full rounded-md border border-dark-tertiary bg-dark-bg px-3 py-2 text-sm text-white outline-none focus:border-accent"
                                            disabled={markedForDelete}
                                          />
                                        </div>
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>
                            )}

                            <div className="mt-4 space-y-3">
                              {albumNewTracks.map((row, index) => (
                                <div key={row.id} className="border border-white/10 bg-dark-secondary/60 p-3">
                                  <div className="mb-2 flex items-center justify-between">
                                    <p className="text-xs font-semibold uppercase tracking-wide text-white/70">New Song {index + 1}</p>
                                    <button
                                      type="button"
                                      onClick={() => removeAlbumTrackDraftRow(row.id)}
                                      disabled={albumNewTracks.length <= 1}
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
                                        onChange={(event) => updateAlbumTrackDraftRow(row.id, { title: event.target.value })}
                                        className="mt-1 w-full rounded-md border border-dark-tertiary bg-dark-bg px-3 py-2 text-sm text-white outline-none focus:border-accent"
                                        placeholder="Track title"
                                      />
                                    </div>

                                    <div>
                                      <label className="text-xs font-semibold text-white">Song Artist (optional)</label>
                                      <input
                                        type="text"
                                        value={row.artistName}
                                        onChange={(event) => updateAlbumTrackDraftRow(row.id, { artistName: event.target.value })}
                                        className="mt-1 w-full rounded-md border border-dark-tertiary bg-dark-bg px-3 py-2 text-sm text-white outline-none focus:border-accent"
                                        placeholder="Leave blank to use album artist"
                                      />
                                    </div>

                                    <div>
                                      <label className="text-xs font-semibold text-white">Audio File</label>
                                      <input
                                        type="file"
                                        accept="audio/*"
                                        onChange={(event) => handleAlbumEditTrackFileChange(row.id, event.target.files?.[0] || null)}
                                        className="mt-1 block w-full rounded-md border border-dark-tertiary bg-dark-bg px-3 py-2 text-sm text-white"
                                      />
                                    </div>

                                    <div>
                                      <label className="text-xs font-semibold text-white">Song Cover (Optional)</label>
                                      <input
                                        type="file"
                                        accept="image/*"
                                        onChange={(event) => updateAlbumTrackDraftRow(row.id, { coverImage: event.target.files?.[0] || null })}
                                        className="mt-1 block w-full rounded-md border border-dark-tertiary bg-dark-bg px-3 py-2 text-sm text-white"
                                      />
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>

                            <div className="mt-4">
                              <label className="text-xs font-semibold text-white">Main Album Cover (separate from song covers)</label>
                              <input
                                type="file"
                                accept="image/*"
                                onChange={(event) => setAlbumMainCoverImage(event.target.files?.[0] || null)}
                                className="mt-1 block w-full rounded-md border border-dark-tertiary bg-dark-bg px-3 py-2 text-sm text-white"
                              />
                            </div>
                          </div>

                          <div className="md:col-span-2 flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={cancelAlbumEdit}
                              className="rounded-md border border-dark-tertiary px-3 py-2 text-xs font-semibold text-gray-200 transition hover:bg-dark-tertiary"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={saveAlbumMetadata}
                              disabled={savingAlbumKey === album.key}
                              className="rounded-md bg-white px-3 py-2 text-xs font-semibold text-black transition hover:bg-gray-100 disabled:opacity-60"
                            >
                              {savingAlbumKey === album.key ? 'Saving...' : 'Save Album'}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )})}
                </div>
              </div>

              {uploadsLoading && <p className="mt-4 text-sm text-gray-400">Loading uploads...</p>}
              {uploadsError && <p className="mt-4 text-sm text-red-400">{uploadsError}</p>}

              {!uploadsLoading && uploads.length === 0 && (
                <p className="mt-4 text-sm text-gray-400">No uploaded tracks found yet.</p>
              )}

              <div className="mt-4 space-y-4">
                {uploads.map((track) => (
                  <div key={track.id} className="border-0 bg-transparent p-0 sm:border sm:border-dark-tertiary sm:bg-dark-secondary/60 sm:p-4">
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
                          onClick={() => setPendingDeleteTrack(track)}
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
                            className="rounded-md bg-white px-3 py-2 text-xs font-semibold text-black transition hover:bg-gray-100 disabled:opacity-60"
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

      <ConfirmDialog
        open={!!pendingDeleteTrack}
        title="Delete Track"
        message={
          pendingDeleteTrack
            ? `Delete "${pendingDeleteTrack.title}" permanently? This cannot be undone.`
            : ''
        }
        confirmText="Delete"
        cancelText="Cancel"
        confirmVariant="danger"
        loading={!!deletingTrackId}
        onCancel={() => {
          if (!deletingTrackId) setPendingDeleteTrack(null)
        }}
        onConfirm={async () => {
          if (!pendingDeleteTrack) return
          await deleteTrack(pendingDeleteTrack)
          setPendingDeleteTrack(null)
        }}
      />

      <ConfirmDialog
        open={!!pendingDeleteAlbum}
        title="Delete Album"
        message={
          pendingDeleteAlbum
            ? `Delete album "${pendingDeleteAlbum.name}" and all of its tracks permanently? This cannot be undone.`
            : ''
        }
        confirmText="Delete Album"
        cancelText="Cancel"
        confirmVariant="danger"
        loading={savingAlbumKey === pendingDeleteAlbum?.key}
        onCancel={() => {
          if (savingAlbumKey !== pendingDeleteAlbum?.key) setPendingDeleteAlbum(null)
        }}
        onConfirm={async () => {
          if (!pendingDeleteAlbum) return
          await deleteAlbum(pendingDeleteAlbum)
        }}
      />
    </main>
  )
}

export default Profile
