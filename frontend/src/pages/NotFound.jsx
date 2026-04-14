import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'

function NotFound() {
  const navigate = useNavigate()
  const [bgImageAvailable, setBgImageAvailable] = useState(true)

  return (
    <main className="fixed inset-0 z-[120] bg-[#05070d] text-white">
      <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden px-6 py-10">
        {bgImageAvailable ? (
          <img
            src="/cadence_uncharted.png"
            alt=""
            aria-hidden="true"
            onError={() => setBgImageAvailable(false)}
            className="pointer-events-none absolute inset-0 h-full w-full object-cover object-center"
          />
        ) : null}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#030711]/45 via-[#050b18]/55 to-[#02040a]/70" />

        <div className="relative z-10 w-full max-w-2xl rounded-2xl border border-white/10 bg-white/[0.04] p-8 text-center backdrop-blur-sm sm:p-10">
          <div className="mb-5 flex items-center justify-center gap-2 brand-lock">
            <img src="/logo.svg" alt="Cadence logo" className="h-8 w-8 rounded-full" />
            <p className="text-lg font-semibold text-white">Cadence</p>
          </div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-sky-200/70">404</p>
          <h1 className="mt-3 text-3xl font-bold text-white sm:text-4xl">
            There is no Melody here
          </h1>
          <p className="mt-4 text-sm text-white/70 sm:text-base">
            This page drifted off into the night. You can go to Cadence and keep the music going.
          </p>

          <div className="mt-8 flex items-center justify-center">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-white/90"
            >
              Go to Cadence
            </button>
          </div>
        </div>
      </div>
    </main>
  )
}

export default NotFound
