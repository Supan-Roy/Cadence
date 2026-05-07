const STORAGE_KEY = 'cadence_followed_artists'
const BACKEND_ORIGIN = `http://${window.location.hostname}:8000`
export const DUMMY_ARTIST_IMAGE =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 240 240'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0%' stop-color='%23272a33'/><stop offset='100%' stop-color='%2311161d'/></linearGradient></defs><rect width='240' height='240' fill='url(%23g)'/><circle cx='120' cy='92' r='44' fill='%23515866'/><path d='M40 216c8-40 41-62 80-62s72 22 80 62' fill='%23515866'/></svg>"

export const resolveFollowedArtistPhoto = (path) => {
  const value = String(path || '').trim()
  if (!value || value === '/Cadence Playlist.png') return DUMMY_ARTIST_IMAGE
  if (value.startsWith('http') || value.startsWith('data:')) return value
  if (value.startsWith('/')) return `${BACKEND_ORIGIN}${value}`
  return value
}

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

export const getFollowedArtists = () => (
  readFollowedArtists().map((item) => ({
    ...item,
    photo: resolveFollowedArtistPhoto(item?.photo || item?.profile_image || ''),
  }))
)

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
    : [{ name: artist.name, photo: resolveFollowedArtistPhoto(artist.photo || artist.profile_image || '') }, ...current]

  writeFollowedArtists(next)
  return { followed: !exists, items: next }
}
