import React, { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ParticipantAvatars from './ParticipantAvatars'

const possessive = (name) => {
  const value = (name || '').trim()
  if (!value) return 'Jam'
  if (value.toLowerCase().endsWith('s')) return `${value}' Jam`
  return `${value}'s Jam`
}

function JamHeader({ user, participants = [] }) {
  const navigate = useNavigate()
  const [copied, setCopied] = useState(false)

  const roomName = useMemo(() => possessive(user?.displayName || user?.name || ''), [user?.displayName, user?.name])
  const participantCount = Array.isArray(participants) ? participants.length : 0

  const handleInvite = async () => {
    try {
      const url = window.location.href
      await navigator.clipboard.writeText(url)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
    } catch {
      setCopied(false)
    }
  }

  return (
    <header className="sticky top-0 z-40 border-b border-white/5 bg-[#0b0b0b]/95 px-4 py-3 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/45">Listening together</p>
          <div className="mt-1 flex items-center gap-3">
            <h1 className="truncate text-lg font-semibold text-white">{roomName}</h1>
            <span className="hidden items-center gap-2 rounded-full bg-white/5 px-2.5 py-1 text-xs text-white/70 sm:inline-flex">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent/60 opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
              </span>
              Live
            </span>
          </div>
          <p className="mt-1 text-xs text-white/55">{participantCount} listener{participantCount === 1 ? '' : 's'}</p>
        </div>

        <div className="flex items-center gap-2">
          <ParticipantAvatars participants={participants} />

          <div className="hidden h-7 w-px bg-white/10 sm:block" />

          <button
            type="button"
            onClick={handleInvite}
            className="group hidden items-center gap-2 rounded-full bg-white/5 px-3 py-2 text-xs font-semibold text-white/80 transition hover:bg-white/10 sm:inline-flex"
            title="Copy invite link"
          >
            <svg className="h-4 w-4 text-white/70" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M10 13a5 5 0 0 1 0-7l1.5-1.5a5 5 0 0 1 7 7L17.5 13" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M14 11a5 5 0 0 1 0 7L12.5 19.5a5 5 0 0 1-7-7L6.5 11" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {copied ? 'Copied' : 'Invite'}
          </button>

          <button
            type="button"
            onClick={() => navigate(-1)}
            className="rounded-full bg-white px-3 py-2 text-xs font-semibold text-black transition hover:bg-gray-100"
            title="Leave jam"
          >
            Leave
          </button>
        </div>
      </div>
    </header>
  )
}

export default JamHeader

