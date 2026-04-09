import React, { useEffect, useMemo, useRef, useState } from 'react'

function JamChat({ messages = [], onSend, selfName }) {
  const [draft, setDraft] = useState('')
  const listRef = useRef(null)

  const safeMessages = useMemo(() => (Array.isArray(messages) ? messages.filter(Boolean) : []), [messages])

  useEffect(() => {
    if (!listRef.current) return
    listRef.current.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' })
  }, [safeMessages.length])

  const handleSubmit = (event) => {
    event.preventDefault()
    const text = draft.trim()
    if (!text) return
    onSend?.(text)
    setDraft('')
  }

  return (
    <section className="flex min-h-0 flex-col">
      <div className="flex items-center justify-between px-4 py-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/50">Chat</p>
          <p className="mt-1 text-sm font-semibold text-white">Room</p>
        </div>
        <span className="rounded-full bg-white/5 px-2.5 py-1 text-[11px] font-semibold text-white/60">Realtime UI</span>
      </div>

      <div
        ref={listRef}
        className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 pb-4 text-sm scroll-smooth"
      >
        {safeMessages.length === 0 ? (
          <div className="pt-8 text-center text-white/45">
            <p className="text-sm font-semibold text-white/65">No messages yet</p>
            <p className="mt-1 text-xs">Say hi to start the room vibe.</p>
          </div>
        ) : (
          safeMessages.map((msg) => {
            const isSelf = msg?.author && selfName && msg.author === selfName
            return (
              <div key={msg.id} className="flex gap-3">
                <div className="mt-1 h-8 w-8 shrink-0 rounded-full bg-white/10 ring-1 ring-white/10" />
                <div className="min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span className={`text-sm font-semibold ${isSelf ? 'text-white' : 'text-white/90'}`}>
                      {msg.author || 'User'}
                    </span>
                    <span className="text-[11px] text-white/35">{msg.timeLabel || ''}</span>
                  </div>
                  <p className="mt-1 whitespace-pre-wrap break-words text-white/75">{msg.text || ''}</p>
                </div>
              </div>
            )
          })
        )}
      </div>

      <form onSubmit={handleSubmit} className="border-t border-white/5 bg-black/25 px-3 py-3">
        <div className="flex items-center gap-2 rounded-xl bg-white/5 px-3 py-2 transition focus-within:bg-white/8">
          <input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Message the room…"
            className="w-full bg-transparent text-sm text-white placeholder:text-white/35 outline-none"
            aria-label="Chat message"
            autoComplete="off"
          />
          <button
            type="submit"
            disabled={!draft.trim()}
            className="rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-50"
            title="Send"
          >
            Send
          </button>
        </div>
      </form>
    </section>
  )
}

export default JamChat

