import React from 'react'

const initialFromName = (name) => {
  const value = (name || '').trim()
  if (!value) return '?'
  return value[0].toUpperCase()
}

function ParticipantAvatars({ participants = [], maxVisible = 5 }) {
  const safeParticipants = Array.isArray(participants) ? participants.filter(Boolean) : []
  const visible = safeParticipants.slice(0, Math.max(0, maxVisible))
  const remaining = Math.max(0, safeParticipants.length - visible.length)

  return (
    <div className="flex items-center">
      <div className="flex -space-x-2">
        {visible.map((participant) => {
          const label = participant?.name || 'Participant'
          const avatarUrl = participant?.avatarUrl || ''
          return (
            <div
              key={participant?.id || label}
              className="h-8 w-8 overflow-hidden rounded-full ring-2 ring-[#0b0b0b] bg-white/10"
              title={label}
              aria-label={label}
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt={label} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-xs font-semibold text-white/80">
                  {initialFromName(label)}
                </div>
              )}
            </div>
          )
        })}
      </div>
      {remaining > 0 && (
        <div className="ml-2 rounded-full bg-white/10 px-2 py-1 text-[11px] font-semibold text-white/70">
          +{remaining}
        </div>
      )}
    </div>
  )
}

export default ParticipantAvatars

