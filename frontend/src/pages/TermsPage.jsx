import React from 'react'

function TermsPage() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_10%_0%,rgba(34,197,94,0.12),transparent_35%),linear-gradient(180deg,#0a0a0c_0%,#050506_100%)] px-4 py-10 text-white">
      <div className="mx-auto max-w-3xl rounded-xl border border-white/10 bg-black/35 p-6 sm:p-8">
        <div className="mb-6 flex items-center gap-3">
          <img src="/logo.svg" alt="Cadence logo" className="h-10 w-10 rounded-full" />
          <div>
            <p className="text-[0.62rem] uppercase tracking-[0.22em] text-white/55">Cadence Legal</p>
            <h1 className="text-2xl font-bold">Terms of Service</h1>
          </div>
        </div>

        <div className="space-y-5 text-sm leading-relaxed text-white/80">
          <p>By creating an account or using Cadence, you agree to these Terms. If you do not agree, do not use the service.</p>
          <p><strong>Eligibility:</strong> You must provide accurate account information and keep your login credentials secure.</p>
          <p><strong>Acceptable use:</strong> You agree not to upload unlawful, infringing, harmful, or abusive content, and not to misuse streaming, radio, or account systems.</p>
          <p><strong>Content ownership:</strong> You retain rights to your content. By uploading, you grant Cadence the rights needed to host, encode, and stream your content within the platform.</p>
          <p><strong>Service availability:</strong> Cadence may update, pause, or discontinue features at any time, including live radio tooling and playback features.</p>
          <p><strong>Account actions:</strong> We may suspend or terminate accounts for policy violations, abuse, fraud, or legal compliance requirements.</p>
          <p><strong>Liability:</strong> Cadence is provided on an “as is” basis. To the fullest extent allowed by law, Cadence is not liable for indirect or consequential damages.</p>
          <p><strong>Changes to terms:</strong> We may update these Terms. Continued use after updates means you accept the revised Terms.</p>
        </div>
      </div>
    </main>
  )
}

export default TermsPage
