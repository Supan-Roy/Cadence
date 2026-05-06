import React from 'react'

function CookiePolicyPage() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_20%_0%,rgba(234,179,8,0.12),transparent_35%),linear-gradient(180deg,#0a0a0c_0%,#050506_100%)] px-4 py-10 text-white">
      <div className="mx-auto max-w-3xl rounded-xl border border-white/10 bg-black/35 p-6 sm:p-8">
        <div className="mb-6 flex items-center gap-3">
          <img src="/logo.svg" alt="Cadence logo" className="h-10 w-10 rounded-full" />
          <div>
            <p className="text-[0.62rem] uppercase tracking-[0.22em] text-white/55">Cadence Legal</p>
            <h1 className="text-2xl font-bold">Cookie Policy</h1>
          </div>
        </div>

        <div className="space-y-5 text-sm leading-relaxed text-white/80">
          <p>Cadence uses cookies and similar storage technologies to keep the platform working smoothly and securely.</p>
          <p><strong>Essential cookies:</strong> required for login, security, session continuity, and core playback/routing functionality.</p>
          <p><strong>Preference cookies:</strong> store user settings such as UI choices, playback state, and interface behavior for a better experience.</p>
          <p><strong>Analytics cookies:</strong> help us understand feature usage and improve reliability, performance, and product decisions.</p>
          <p><strong>Security cookies:</strong> help detect abuse, prevent fraud, and support account protection controls.</p>
          <p><strong>How to control cookies:</strong> you can manage cookies through browser settings; disabling some cookies may impact key Cadence features.</p>
          <p><strong>Policy updates:</strong> we may revise this Cookie Policy as our platform and compliance requirements evolve.</p>
        </div>
      </div>
    </main>
  )
}

export default CookiePolicyPage
