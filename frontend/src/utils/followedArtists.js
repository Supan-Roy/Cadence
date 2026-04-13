const STORAGE_KEY = 'cadence_followed_artists'

const readFollowedArtists = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const parsed = JSON.parse(raw || '[]')
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

const writeFollowedArtists = (items) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.isArray(items) ? items : []))
}

export const getFollowedArtists = () => readFollowedArtists()

export const isArtistFollowed = (artistName) => {
  const normalized = String(artistName || '').trim().toLowerCase()
  if (!normalized) return false
  return readFollowedArtists().some((item) => String(item?.name || '').trim().toLowerCase() === normalized)
}

export const toggleFollowArtist = (artist) => {
  const normalized = String(artist?.name || '').trim().toLowerCase()
  if (!normalized) return { followed: false, items: readFollowedArtists() }

  const current = readFollowedArtists()
  const exists = current.some((item) => String(item?.name || '').trim().toLowerCase() === normalized)

  const next = exists
    ? current.filter((item) => String(item?.name || '').trim().toLowerCase() !== normalized)
    : [{ name: artist.name, photo: artist.photo || '' }, ...current]

  writeFollowedArtists(next)
  return { followed: !exists, items: next }
}
