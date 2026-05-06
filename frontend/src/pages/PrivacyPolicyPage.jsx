import React from 'react'

function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_90%_0%,rgba(59,130,246,0.12),transparent_35%),linear-gradient(180deg,#0a0a0c_0%,#050506_100%)] px-4 py-10 text-white">
      <div className="mx-auto max-w-3xl rounded-xl border border-white/10 bg-black/35 p-6 sm:p-8">
        <div className="mb-6 flex items-center gap-3">
          <img src="/logo.svg" alt="Cadence logo" className="h-10 w-10 rounded-full" />
          <div>
            <p className="text-[0.62rem] uppercase tracking-[0.22em] text-white/55">Cadence Legal</p>
            <h1 className="text-2xl font-bold">Privacy Policy</h1>
          </div>
        </div>

        <div className="space-y-5 text-sm leading-relaxed text-white/80">
          <p>This policy explains what data Cadence collects, why we collect it, and how we protect it.</p>
          <p><strong>Data we collect:</strong> account information (name, email), authentication data, profile details, uploads, playback interactions, and technical logs.</p>
          <p><strong>How we use data:</strong> to provide core service functions, improve performance, secure accounts, moderate content, and communicate essential updates.</p>
          <p><strong>Legal basis:</strong> we process data based on your consent, contract performance, legitimate interests, and legal obligations where applicable.</p>
          <p><strong>Data sharing:</strong> we do not sell personal data. We may share data with trusted service providers for hosting, analytics, security, and legal compliance.</p>
          <p><strong>Retention:</strong> we retain information only as long as needed for service operation, legal obligations, and dispute prevention.</p>
          <p><strong>Your choices:</strong> you can update profile information, request account deletion, and manage security preferences from your account tools.</p>
          <p><strong>Security:</strong> Cadence applies reasonable technical and organizational safeguards, but no system is completely risk-free.</p>
        </div>
      </div>
    </main>
  )
}

export default PrivacyPolicyPage
