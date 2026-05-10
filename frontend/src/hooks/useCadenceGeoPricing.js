import { useEffect, useMemo, useState } from 'react'
import {
  CADENCE_PLAN_DEFINITIONS,
  formatCadenceMoney,
  resolveCadencePricingForCountry,
} from '../utils/cadenceProPricing'

const STORAGE_KEY = 'cadence_pro_geo_v2'
const CACHE_MS = 1000 * 60 * 60 * 24

function readCachedCountryCode() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed?.countryCode || !parsed?.ts) return null
    if (Date.now() - Number(parsed.ts) > CACHE_MS) return null
    return String(parsed.countryCode).toUpperCase()
  } catch {
    return null
  }
}

function writeCachedCountryCode(code) {
  try {
    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ countryCode: code, ts: Date.now() })
    )
  } catch {}
}

async function fetchJson(url, opts = {}) {
  const response = await fetch(url, {
    credentials: 'omit',
    signal: opts.signal,
  })
  if (!response.ok) throw new Error(`Geo lookup failed (${response.status})`)
  return response.json()
}

/** Infer ISO 3166-1 alpha-2 from common geo API payloads. */
function pickCountryCode(payload) {
  if (!payload || typeof payload !== 'object') return null
  const code =
    payload.country_code ||
    payload.countryCode ||
    (typeof payload.country === 'string' && payload.country.length === 2 ? payload.country : null) ||
    payload.country_code_iso2 ||
    null
  if (!code || typeof code !== 'string') return null
  const trimmed = code.trim().toUpperCase()
  return trimmed.length === 2 ? trimmed : null
}

async function fetchGeoJsCountry(signal) {
  try {
    const data = await fetchJson('https://get.geojs.io/v1/ip/country.json', { signal })
    const c = data?.country
    if (typeof c === 'string' && c.trim().length === 2) return c.trim().toUpperCase()
  } catch {
    /* try next */
  }
  return null
}

async function fetchCountryFromIpWho(signal) {
  try {
    const data = await fetchJson('https://ipwho.is/', { signal })
    return pickCountryCode(data || {})
  } catch {
    return null
  }
}

async function fetchCountryFromIpApi(signal) {
  try {
    const data = await fetchJson('https://ipapi.co/json/', { signal })
    return pickCountryCode(data)
  } catch {
    return null
  }
}

/** Geo.js first — often more reliable where ipapi rate-limits or errors. */
async function resolveCountryCodeWithFallback(signal) {
  return (
    (await fetchGeoJsCountry(signal)) ||
    (await fetchCountryFromIpWho(signal)) ||
    (await fetchCountryFromIpApi(signal))
  )
}

/** @typedef {{ loading: boolean; error: boolean; regionKey: string; plans: typeof CADENCE_PLAN_DEFINITIONS }} CadencePricingView */

/** @param {boolean} [enabled]
 * @returns {CadencePricingView & { fromLabel: string; formattedByPlanId: Record<string, string>; planDefinitions: typeof CADENCE_PLAN_DEFINITIONS }} */
export function useCadenceGeoPricing(enabled = true) {
  const [countryCode, setCountryCode] = useState(() => readCachedCountryCode())
  const [loading, setLoading] = useState(() => !!(enabled && !readCachedCountryCode()))
  const [error, setError] = useState(false)

  useEffect(() => {
    const controller = new AbortController()

    if (!enabled) {
      setLoading(false)
      return () => controller.abort()
    }

    const cached = readCachedCountryCode()
    if (cached) {
      setCountryCode(cached)
      setLoading(false)
      return () => controller.abort()
    }

    ;(async () => {
      setLoading(true)
      setError(false)
      let deadline
      try {
        deadline = window.setTimeout(() => controller.abort(), 6000)
        const resolved = await resolveCountryCodeWithFallback(controller.signal)
        const fallback = resolved || ''
        writeCachedCountryCode(fallback || 'ZZ')
        setCountryCode((fallback || 'ZZ').toUpperCase())
      } catch (err) {
        if (err?.name !== 'AbortError') {
          setError(true)
          setCountryCode('')
        }
      } finally {
        if (deadline) window.clearTimeout(deadline)
        setLoading(false)
      }
    })()

    return () => controller.abort()
  }, [enabled])

  const view = useMemo(() => {
    const pricing =
      countryCode && countryCode !== 'ZZ'
        ? resolveCadencePricingForCountry(countryCode)
        : resolveCadencePricingForCountry('')

    /** @type {Record<string, string>} */
    const formattedByPlanId = {}

    CADENCE_PLAN_DEFINITIONS.forEach((def, idx) => {
      const amount = pricing.amounts[idx]
      formattedByPlanId[def.id] = formatCadenceMoney(
        amount ?? pricing.amounts[0],
        pricing.currencyCode,
        pricing.locale
      )
    })

    const personalAmount = pricing.amounts[0]
    const fromLabel =
      typeof personalAmount === 'number'
        ? formatCadenceMoney(personalAmount, pricing.currencyCode, pricing.locale)
        : ''

    return {
      loading,
      error,
      regionKey: pricing.regionKey,
      currencyCode: pricing.currencyCode,
      locale: pricing.locale,
      amounts: pricing.amounts,
      planDefinitions: CADENCE_PLAN_DEFINITIONS,
      formattedByPlanId,
      fromLabel,
    }
  }, [countryCode, error, loading, enabled])

  return view
}
