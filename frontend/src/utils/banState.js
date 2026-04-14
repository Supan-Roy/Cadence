export const clearAuthStorage = () => {
  localStorage.removeItem('access_token')
  localStorage.removeItem('refresh_token')
  localStorage.removeItem('user_email')
  localStorage.removeItem('user_role')
  localStorage.removeItem('user_name')
  localStorage.removeItem('user_display_name')
  localStorage.removeItem('user_profile_image')
}

const collectPayloadStrings = (payload) => {
  if (payload == null) return []
  if (typeof payload === 'string') return [payload]
  if (Array.isArray(payload)) return payload.flatMap((item) => collectPayloadStrings(item))
  if (typeof payload === 'object') {
    const all = []
    Object.entries(payload).forEach(([key, value]) => {
      all.push(String(key))
      all.push(...collectPayloadStrings(value))
    })
    return all
  }
  return [String(payload)]
}

export const extractBlockedReason = (payload) => {
  const values = collectPayloadStrings(payload).filter(Boolean)
  if (values.length === 0) return ''

  const normalized = values.join(' ').toLowerCase()
  const hasBlockedSignal = normalized.includes('user_banned') || normalized.includes('blocked by admin') || normalized.includes('account is blocked') || normalized.includes('account blocked')
  if (!hasBlockedSignal) return ''

  const preferred = values.find((value) => {
    const lower = value.toLowerCase()
    return lower.includes('blocked by admin') || lower.includes('account is blocked') || lower.includes('account blocked')
  })
  return preferred || 'Your account access has been restricted.'
}

export const redirectToBlocked = (reason = '') => {
  const params = new URLSearchParams()
  if (reason) {
    params.set('reason', reason)
  }
  const query = params.toString()
  window.location.href = query ? `/blocked?${query}` : '/blocked'
}
