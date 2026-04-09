import React, { useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import JamHeader from '../components/jam/JamHeader'
import JamPlayer from '../components/jam/JamPlayer'
import JamChat from '../components/jam/JamChat'
import JamQueue from '../components/jam/JamQueue'

const buildParticipantList = (user) => {
  if (!user) return []
  const name = user.displayName || user.name || user.email || 'You'
  return [
    {
      id: user.email || 'me',
      name,
      avatarUrl: user.profileImage || '',
    },
  ]
}

function JamRoom({ user }) {
  const location = useLocation()
  const initialTrack = location.state?.track || null
  const initialQueue = location.state?.queue || (initialTrack ? [initialTrack] : [])

  const [messages, setMessages] = useState([])
  const [mobilePanel, setMobilePanel] = useState('chat')
  const [desktopPanel, setDesktopPanel] = useState('chat')

  const participants = useMemo(() => buildParticipantList(user), [user])
  const selfName = participants[0]?.name || 'You'

  const handleSend = (text) => {
    const now = new Date()
    const hh = now.getHours().toString().padStart(2, '0')
    const mm = now.getMinutes().toString().padStart(2, '0')
    const timeLabel = `${hh}:${mm}`

    setMessages((prev) => [
      ...(Array.isArray(prev) ? prev : []),
      {
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        author: selfName,
        text,
        timeLabel,
      },
    ])
  }

  const currentTrackId = initialTrack?.id || null

  return (
    <main className="flex h-full min-h-0 flex-col bg-[#000] text-white">
      <JamHeader user={user} participants={participants} />

      <div className="mx-auto flex w-full max-w-7xl min-h-0 flex-1 flex-col px-0 lg:px-4">
        {/* Desktop */}
        <div className="hidden min-h-0 flex-1 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(320px,420px)]">
          <div className="min-h-0 bg-[#121212]">
            <JamPlayer track={initialTrack} isHost />
          </div>

          {/* Side panel (tabs at lg/xl, split at 2xl) */}
          <div className="min-h-0 border-l border-white/5 bg-[#0e0e0e]">
            <div className="flex items-center justify-between border-b border-white/5 px-4 py-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setDesktopPanel('chat')}
                  className={`rounded-full px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] transition ${
                    desktopPanel === 'chat' ? 'bg-white text-black' : 'bg-white/5 text-white/70 hover:bg-white/10'
                  }`}
                >
                  Chat
                </button>
                <button
                  type="button"
                  onClick={() => setDesktopPanel('queue')}
                  className={`rounded-full px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] transition ${
                    desktopPanel === 'queue' ? 'bg-white text-black' : 'bg-white/5 text-white/70 hover:bg-white/10'
                  }`}
                >
                  Queue
                </button>
              </div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/40">Room</p>
            </div>

            <div className="hidden min-h-0 flex-1 min-[1760px]:grid min-[1760px]:grid-cols-[minmax(0,1fr)_320px]">
              <div className="min-h-0">
                <JamChat messages={messages} onSend={handleSend} selfName={selfName} />
              </div>
              <div className="min-h-0 border-l border-white/5 bg-[#0a0a0a]">
                <JamQueue queue={initialQueue} currentTrackId={currentTrackId} />
              </div>
            </div>

            <div className="min-h-0 min-[1760px]:hidden">
              {desktopPanel === 'chat' ? (
                <JamChat messages={messages} onSend={handleSend} selfName={selfName} />
              ) : (
                <JamQueue queue={initialQueue} currentTrackId={currentTrackId} />
              )}
            </div>
          </div>
        </div>

        {/* Mobile */}
        <div className="min-h-0 flex-1 lg:hidden">
          <div className="bg-[#121212]">
            <JamPlayer track={initialTrack} isHost />
          </div>

          <div className="sticky bottom-0 z-30 border-t border-white/5 bg-[#0b0b0b]/95 backdrop-blur-xl">
            <div className="mx-auto flex max-w-7xl items-center justify-between gap-2 px-3 py-2">
              <button
                type="button"
                onClick={() => setMobilePanel('chat')}
                className={`flex-1 rounded-lg px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] transition ${
                  mobilePanel === 'chat' ? 'bg-white text-black' : 'bg-white/5 text-white/70 hover:bg-white/10'
                }`}
              >
                Chat
              </button>
              <button
                type="button"
                onClick={() => setMobilePanel('queue')}
                className={`flex-1 rounded-lg px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] transition ${
                  mobilePanel === 'queue' ? 'bg-white text-black' : 'bg-white/5 text-white/70 hover:bg-white/10'
                }`}
              >
                Queue
              </button>
            </div>
          </div>

          <div className="min-h-0 border-t border-white/5 bg-[#0e0e0e]">
            {mobilePanel === 'chat' ? (
              <JamChat messages={messages} onSend={handleSend} selfName={selfName} />
            ) : (
              <JamQueue queue={initialQueue} currentTrackId={currentTrackId} />
            )}
          </div>
        </div>
      </div>
    </main>
  )
}

export default JamRoom

