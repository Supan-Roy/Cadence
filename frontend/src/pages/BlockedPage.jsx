import React from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { clearAuthStorage } from '../utils/banState'

function BlockedPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const reason = searchParams.get('reason') || 'Your account access has been restricted.'
  const handleLogout = () => {
    clearAuthStorage()
    navigate('/login')
  }

  return (
    <main className="fixed inset-0 z-[130] bg-[#05070d] text-white">
      <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden px-6 py-10">
        <img
          src="/cadence_uncharted.png"
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 h-full w-full object-cover object-center"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#030711]/45 via-[#050b18]/60 to-[#02040a]/75" />

        <div className="relative z-10 w-full max-w-2xl rounded-2xl border border-red-200/25 bg-black/40 p-8 text-center backdrop-blur-sm sm:p-10">
          <div className="mb-5 flex items-center justify-center gap-2 brand-lock">
            <img src="/logo.svg" alt="Cadence logo" className="h-8 w-8 rounded-full" />
            <p className="text-lg font-semibold text-white">Cadence</p>
          </div>

          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-red-200/80">Account Blocked</p>
          <h1 className="mt-3 text-3xl font-bold text-white sm:text-4xl">Sorry, your account is blocked</h1>
          <p className="mt-4 text-sm text-white/75 sm:text-base">{reason}</p>
          <p className="mt-2 text-sm text-white/70 sm:text-base">
            We know this is frustrating. Please contact admin to review your access.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-white/90"
            >
              Go to Cadence
            </button>
            <a
              href="mailto:admin@supanroy.com"
              className="rounded-full border border-white/25 bg-white/10 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-white/20"
            >
              Contact Admin
            </a>
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-full border border-white/25 bg-black/30 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-black/45"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </main>
  )
}

export default BlockedPage
