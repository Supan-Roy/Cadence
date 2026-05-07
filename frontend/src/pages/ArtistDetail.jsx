import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { musicAPI } from '../services/api'
import CadenceLoader from '../components/CadenceLoader'
import { imageProtectionProps } from '../utils/imageProtection'
import { isArtistFollowed, toggleFollowArtist } from '../utils/followedArtists'
import { trackHasArtist } from '../utils/artistNames'
import useDelayedLoader from '../hooks/useDelayedLoader'

const BACKEND_ORIGIN = `http://${window.location.hostname}:8000`
const DUMMY_ARTIST_IMAGE =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 240 240'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0%' stop-color='%23272a33'/><stop offset='100%' stop-color='%2311161d'/></linearGradient></defs><rect width='240' height='240' fill='url(%23g)'/><circle cx='120' cy='92' r='44' fill='%23515866'/><path d='M40 216c8-40 41-62 80-62s72 22 80 62' fill='%23515866'/></svg>"

const getImageUrl = (path) => {
  if (!path) return DUMMY_ARTIST_IMAGE
  if (String(path).startsWith('http')) return path
  return `${BACKEND_ORIGIN}${path}`
}

function ArtistDetail() {
  const navigate = useNavigate()
  const { artistName } = useParams()
  const decodedArtistName = decodeURIComponent(artistName || '')
  const normalizedArtist = decodedArtistName.trim().toLowerCase()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [tracks, setTracks] = useState([])
  const [followed, setFollowed] = useState(false)
  const showLoader = useDelayedLoader(loading, 250)

  useEffect(() => {
    setFollowed(isArtistFollowed(decodedArtistName))
  }, [decodedArtistName])

  useEffect(() => {
    const loadArtist = async () => {
      if (!normalizedArtist) {
        setError('Artist not found.')
        setTracks([])
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError('')

        const [searchResponse, allTracksResponse] = await Promise.allSettled([
          musicAPI.searchTracks(decodedArtistName, 1, 100),
          musicAPI.getTracks(1, 300),
        ])

        const searchItems = searchResponse.status === 'fulfilled'
          ? (Array.isArray(searchResponse.value.data) ? searchResponse.value.data : searchResponse.value.data?.results || [])
          : []
        const allItems = allTracksResponse.status === 'fulfilled'
          ? (Array.isArray(allTracksResponse.value.data) ? allTracksResponse.value.data : allTracksResponse.value.data?.results || [])
          : []

        const merged = [...searchItems, ...allItems]
        const seen = new Set()
        const uniqueTracks = merged.filter((track) => {
          const id = track?.id
          if (!id || seen.has(id)) return false
          seen.add(id)
          return true
        })

        const artistTracks = uniqueTracks.filter((track) => trackHasArtist(track, normalizedArtist))

        setTracks(artistTracks)
      } catch {
        setError('Failed to load artist page.')
        setTracks([])
      } finally {
        setLoading(false)
      }
    }

    loadArtist()
  }, [decodedArtistName, normalizedArtist])

  const artistPhoto = useMemo(() => {
    const profileMatch = tracks.find((track) => {
      const owner = String(track?.artist_owner_name || '').trim().toLowerCase()
      return owner === normalizedArtist && track?.artist_profile_image
    })
    if (profileMatch?.artist_profile_image) {
      return getImageUrl(profileMatch.artist_profile_image)
    }

    return DUMMY_ARTIST_IMAGE
  }, [tracks, normalizedArtist])

  const songs = useMemo(() => {
    return [...tracks].sort((a, b) => String(b.release_date || '').localeCompare(String(a.release_date || '')))
  }, [tracks])

  const albums = useMemo(() => {
    const groups = new Map()
    tracks.forEach((track) => {
      const albumName = String(track?.album_name || '').trim()
      if (!albumName) return
      const key = albumName.toLowerCase()
      if (!groups.has(key)) {
        groups.set(key, {
          name: albumName,
          cover: track.album_cover_image || track.cover_image || '',
          releaseDate: track.release_date || '',
          songs: 1,
        })
      } else {
        const existing = groups.get(key)
        existing.songs += 1
        if (!existing.cover && (track.album_cover_image || track.cover_image)) {
          existing.cover = track.album_cover_image || track.cover_image
        }
        if (String(track.release_date || '') > String(existing.releaseDate || '')) {
          existing.releaseDate = track.release_date || ''
        }
      }
    })
    return [...groups.values()].sort((a, b) => String(b.releaseDate || '').localeCompare(String(a.releaseDate || '')))
  }, [tracks])

  const openSongDestination = (track) => {
    const hasAlbum = String(track?.album_name || '').trim().length > 0
    const isSingle = String(track?.song_type || '').toLowerCase() === 'single' || !hasAlbum
    if (isSingle) {
      navigate(`/singles/${track.id}`)
      return
    }
    navigate(`/albums/${encodeURIComponent(track.album_name)}`)
  }

  const onFollowToggle = () => {
    const next = toggleFollowArtist({ name: decodedArtistName, photo: artistPhoto })
    setFollowed(next.followed)
  }

  if (loading && !showLoader) {
    return null
  }

  if (loading) {
    return <CadenceLoader message="Loading artist..." size="sm" />
  }

  return (
    <main className="pb-36 pt-0 sm:pt-4">
      <div className="mx-auto w-full max-w-6xl px-0 sm:px-6">
        <div className="rounded-none border-0 bg-dark-secondary/70 p-3 sm:rounded-2xl sm:border sm:border-dark-tertiary sm:p-6 md:p-8">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="mb-4 rounded-lg border border-white/15 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-white/10"
          >
            Back
          </button>

          {error ? (
            <p className="mt-4 rounded-lg border border-red-700/60 bg-red-950/20 px-4 py-3 text-sm text-red-300">{error}</p>
          ) : (
            <>
              <section className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-center gap-4">
                  <img
                    src={artistPhoto}
                    alt={decodedArtistName || 'Artist'}
                    className="h-20 w-20 shrink-0 rounded-full object-cover ring-1 ring-white/15 sm:h-24 sm:w-24"
                    {...imageProtectionProps}
                  />
                  <div className="min-w-0">
                    <p className="text-xs uppercase tracking-[0.24em] text-white/45">Artist</p>
                    <h1 className="truncate text-3xl font-bold text-white">{decodedArtistName || 'Unknown Artist'}</h1>
                    <p className="mt-1 text-sm text-white/65">{songs.length} songs • {albums.length} albums</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={onFollowToggle}
                  className={`inline-flex h-10 items-center justify-center rounded-full px-5 text-sm font-semibold transition ${
                    followed ? 'bg-white text-black hover:bg-white/90' : 'bg-white/10 text-white hover:bg-white/20'
                  }`}
                >
                  {followed ? 'Following' : 'Follow'}
                </button>
              </section>

              <section className="mb-8">
                <h2 className="mb-4 text-xl font-semibold text-white">Albums</h2>
                {albums.length === 0 ? (
                  <p className="text-sm text-white/50">No albums available.</p>
                ) : (
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                    {albums.map((album) => (
                      <button
                        key={album.name}
                        type="button"
                        onClick={() => navigate(`/albums/${encodeURIComponent(album.name)}`)}
                        className="group text-left"
                      >
                        <img
                          src={getImageUrl(album.cover)}
                          alt={album.name}
                          className="aspect-square w-full rounded-xl object-cover ring-1 ring-white/10"
                          {...imageProtectionProps}
                        />
                        <p className="mt-2 truncate text-sm font-semibold text-white group-hover:underline">{album.name}</p>
                        <p className="text-xs text-white/55">{album.songs} songs</p>
                      </button>
                    ))}
                  </div>
                )}
              </section>

              <section>
                <h2 className="mb-4 text-xl font-semibold text-white">All Songs</h2>
                {songs.length === 0 ? (
                  <p className="text-sm text-white/50">No songs found for this artist.</p>
                ) : (
                  <div className="space-y-2">
                    {songs.map((track) => (
                      <button
                        key={track.id}
                        type="button"
                        onClick={() => openSongDestination(track)}
                        className="flex w-full items-center gap-3 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-left transition hover:bg-white/[0.06]"
                      >
                        <img
                          src={getImageUrl(track.cover_image || track.album_cover_image)}
                          alt={track.title}
                          className="h-10 w-10 shrink-0 rounded-md object-cover"
                          {...imageProtectionProps}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-white">{track.title}</p>
                          <p className="truncate text-xs text-white/55">
                            {String(track.song_type || '').toLowerCase() === 'single' || !String(track.album_name || '').trim()
                              ? 'Single'
                              : track.album_name}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </section>
            </>
          )}
        </div>
      </div>
    </main>
  )
}

export default ArtistDetail
