import React, { useEffect, useState } from 'react'
import { useCadenceGeoPricing } from '../hooks/useCadenceGeoPricing'

function PricingModal({
  open,
  onClose,
  fromLabel,
  formattedByPlanId,
  planDefinitions,
  regionKey,
}) {
  const [selectedPlanId, setSelectedPlanId] = useState('student')

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  useEffect(() => {
    if (!open) return undefined
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  useEffect(() => {
    if (!open) return
    if (!planDefinitions.some((plan) => plan.id === selectedPlanId)) {
      setSelectedPlanId(planDefinitions[0]?.id || '')
    }
  }, [open, planDefinitions, selectedPlanId])

  if (!open) return null

  const regionHint =
    regionKey && regionKey !== 'INTL' && regionKey !== 'ZZ'
      ? `Prices shown for your region (${regionKey}).`
      : 'Regional pricing defaults to USD for locations outside our localized markets.'

  return (
    <div
      className="fixed inset-0 z-[85] flex items-end justify-center bg-black/60 p-3 backdrop-blur-sm sm:items-center sm:p-6"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="cadence-pro-heading"
        className="relative max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-xl border border-white/15 bg-[#101010]/98 px-4 py-4 shadow-[0_20px_60px_rgba(0,0,0,0.7)] sm:rounded-2xl sm:px-5 sm:py-5"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full border border-white/12 bg-white/5 text-white/75 transition hover:bg-white/12"
          aria-label="Close Cadence Pro"
        >
          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
          </svg>
        </button>

        <header className="pr-8">
          <h2 id="cadence-pro-heading" className="text-lg font-bold tracking-tight text-white sm:text-xl">
            Cadence Pro
          </h2>
          <p className="mt-1 text-xs text-white/50">
            {fromLabel ? (
              <>
                From <span className="font-semibold text-white/85">{fromLabel}</span>/mo · {regionHint}
              </>
            ) : (
              regionHint
            )}
          </p>
        </header>

        <div className="mt-4 grid grid-cols-3 gap-2">
          {planDefinitions.map((plan) => (
            <button
              type="button"
              key={plan.id}
              onClick={() => setSelectedPlanId(plan.id)}
              aria-pressed={selectedPlanId === plan.id}
              className={`rounded-lg border px-2 py-2.5 text-center ${
                selectedPlanId === plan.id
                  ? 'border-[#ff3138] bg-[#ff3138]/15'
                  : 'border-white/10 bg-white/[0.04]'
              }`}
            >
              <p className="text-[10px] font-medium uppercase tracking-wide text-white/50">{plan.name}</p>
              <p className="mt-1.5 text-sm font-semibold text-white">{formattedByPlanId[plan.id]}</p>
              <p className="mt-0.5 text-[9px] text-white/35">/ mo</p>
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={onClose}
          title="Frontend preview: selection saved in UI only"
          className="mt-4 w-full rounded-lg bg-gradient-to-br from-[#ff2a33] via-[#ff171f] to-[#e20e1d] py-2.5 text-[11px] font-semibold uppercase tracking-wider text-white shadow-[0_8px_22px_rgba(226,14,29,0.4)] transition hover:brightness-110"
        >
          Continue with {planDefinitions.find((plan) => plan.id === selectedPlanId)?.name || 'Plan'}
        </button>

        <p className="mt-2 text-center text-[10px] text-white/38">Preview — billing not enabled yet.</p>
      </section>
    </div>
  )
}

/** Sidebar dock (desktop / expanded library column). Shown under Your Library routes. */
export function CadenceProSidebarDock({ pathname }) {
  const show =
    pathname === '/' ||
    pathname === '/profile'

  const geo = useCadenceGeoPricing(show)
  const [open, setOpen] = useState(false)

  const plans = geo.planDefinitions
  const fromLabelMemo = geo.fromLabel

  if (!show) return null

  return (
    <>
      <PricingModal
        open={open}
        onClose={() => setOpen(false)}
        fromLabel={fromLabelMemo}
        formattedByPlanId={geo.formattedByPlanId}
        planDefinitions={plans}
        regionKey={geo.regionKey}
      />

      <div className="pointer-events-none absolute inset-x-0 bottom-[3.35rem] z-[55] lg:bottom-[3.65rem]">
        <div className="pointer-events-auto mx-3">
          <button
            type="button"
            onClick={() => setOpen(true)}
            title={fromLabelMemo ? `From ${fromLabelMemo}/month in your region` : 'Cadence Pro plans'}
            className="w-full rounded-lg bg-gradient-to-br from-[#ff2a33] via-[#ff171f] to-[#e20e1d] py-2.5 text-center text-[11px] font-bold uppercase tracking-wide text-white shadow-[0_10px_28px_rgba(226,14,29,0.45)] transition hover:brightness-110 active:brightness-95"
          >
            Subscribe
          </button>
        </div>
      </div>
    </>
  )
}

/** Narrow layout for Profile and My Space (viewport `max-width: 1023px`). */
export function CadenceProMobileSection() {
  const [narrow, setNarrow] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia('(max-width: 1023px)').matches : false
  )

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 1023px)')
    const sync = () => setNarrow(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  const geo = useCadenceGeoPricing(narrow)
  const [open, setOpen] = useState(false)

  if (!narrow) return null

  return (
    <>
      <PricingModal
        open={open}
        onClose={() => setOpen(false)}
        fromLabel={geo.fromLabel}
        formattedByPlanId={geo.formattedByPlanId}
        planDefinitions={geo.planDefinitions}
        regionKey={geo.regionKey}
      />

      <section aria-labelledby="cadence-pro-mobile-title">
        <div className="flex items-center justify-end rounded-xl border border-white/12 bg-[#141414] px-3 py-2.5 shadow-[0_8px_24px_rgba(0,0,0,0.4)]">
          <h3 id="cadence-pro-mobile-title" className="sr-only">
            Cadence Pro
          </h3>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="shrink-0 rounded-lg bg-gradient-to-br from-[#ff2a33] via-[#ff171f] to-[#e20e1d] px-4 py-2 text-[11px] font-bold uppercase tracking-wide text-white shadow-[0_6px_22px_rgba(226,14,29,0.4)] transition hover:brightness-110"
          >
            Subscribe
          </button>
        </div>
      </section>
    </>
  )
}
