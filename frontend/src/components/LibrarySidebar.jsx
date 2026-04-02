import React from 'react'

function LibrarySidebar() {
  return (
    <aside className="h-full overflow-y-auto rounded-2xl border border-white/10 bg-[#0f1219]/80 p-4 shadow-[0_12px_30px_rgba(0,0,0,0.25)]">
      <h2 className="text-lg font-semibold text-white">Your Library</h2>

      <section className="mt-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-white/80">Following Artists</h3>
        </div>
        <div className="rounded-xl border border-dashed border-white/15 bg-white/[0.03] p-4 text-sm text-white/60">
          No followed artists yet.
        </div>
      </section>

      <section className="mt-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-white/80">Playlists</h3>
        </div>
        <div className="rounded-xl border border-dashed border-white/15 bg-white/[0.03] p-4 text-sm text-white/60">
          Playlist logic coming soon.
        </div>
      </section>
    </aside>
  )
}

export default LibrarySidebar
