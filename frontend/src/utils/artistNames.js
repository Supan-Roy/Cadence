const SPLIT_REGEX = /\s*(?:,|;|\/|(?:\s+feat\.?\s+)|(?:\s+ft\.?\s+)|(?:\s+featuring\s+)|(?:\s+&\s+))\s*/i

export const parseArtistNames = (value) => {
  const raw = String(value || '').trim()
  if (!raw) return []

  const names = raw
    .split(SPLIT_REGEX)
    .map((item) => item.trim())
    .filter(Boolean)

  return [...new Set(names)]
}

export const trackHasArtist = (track, artistName) => {
  const normalized = String(artistName || '').trim().toLowerCase()
  if (!normalized) return false

  const candidates = [
    ...parseArtistNames(track?.artist_name),
    ...parseArtistNames(track?.artist),
    ...parseArtistNames(track?.featured_artists),
    ...parseArtistNames(track?.album_artist),
  ]

  return candidates.some((name) => name.toLowerCase() === normalized)
}
