/** Regional Cadence Pro pricing (amounts align with marketing tiers). */

export const CADENCE_PLAN_IDS = /** @type {const} */ (['personal', 'student', 'family'])

/** @typedef {{ id: typeof CADENCE_PLAN_IDS[number]; name: string; tagline: string; bullets: string[] }} CadencePlanDefinition */

/** @type {CadencePlanDefinition[]} */
export const CADENCE_PLAN_DEFINITIONS = [
  {
    id: 'personal',
    name: 'Personal',
    tagline: 'Full quality streaming for one listener.',
    bullets: ['Ad-lite experience', 'Unlimited playlists & skips', 'High-quality audio'],
  },
  {
    id: 'student',
    name: 'Student',
    tagline: 'Everything in Personal — priced for learners.',
    bullets: ['Eligible with student verification', 'Offline-friendly listening', 'Same library & discovery tools'],
  },
  {
    id: 'family',
    name: 'Family',
    tagline: 'Up to six members under one plan.',
    bullets: ['Separate profiles & playlists', 'Parental hints & shared billing', 'Best value per listener'],
  },
]

/** @type {Record<string, { currency: string; locale: string; amounts: number[] }>} */
const REGION_CONFIG = {
  BD: { currency: 'BDT', locale: 'en-BD', amounts: [199, 99, 349] },
  US: { currency: 'USD', locale: 'en-US', amounts: [7.99, 4.99, 14.99] },
  IN: { currency: 'INR', locale: 'en-IN', amounts: [149, 99, 299] },
  GB: { currency: 'GBP', locale: 'en-GB', amounts: [5.99, 3.99, 9.99] },
  PK: { currency: 'PKR', locale: 'en-PK', amounts: [249, 199, 499] },
  CA: { currency: 'CAD', locale: 'en-CA', amounts: [8.99, 4.99, 14.99] },
}

const DEFAULT_REGION_KEY = 'INTL'

const DEFAULT_FALLBACK_AMOUNTS = [6.99, 3.99, 9.99]

/** @returns {{ regionKey: string; currencyCode: string; locale: string; amounts: number[] }} */
export function resolveCadencePricingForCountry(countryCode) {
  const upper = typeof countryCode === 'string' ? countryCode.trim().toUpperCase() : ''

  const hit = upper.length === 2 ? REGION_CONFIG[upper] : null
  if (hit) {
    return {
      regionKey: upper,
      currencyCode: hit.currency,
      locale: hit.locale,
      amounts: hit.amounts.slice(0, 3),
    }
  }

  return {
    regionKey: DEFAULT_REGION_KEY,
    currencyCode: 'USD',
    locale: 'en-US',
    amounts: DEFAULT_FALLBACK_AMOUNTS.slice(),
  }
}

/** @param {number} amount
 * @param {string} currencyCode
 * @param {string} locale */
export function formatCadenceMoney(amount, currencyCode, locale) {
  const fractionDigits = Number.isFinite(amount) && Number.isInteger(amount) && amount >= 50 ? 0 : 2

  /** Browsers vary; BDT/PKR sometimes need a manual prefix when Intl lacks data. */
  const manualPrefix = /** @type {Record<string, string>} */ ({
    BDT: '৳',
    PKR: 'Rs ',
    INR: '₹',
    USD: '$',
    GBP: '£',
    CAD: 'CA$',
  })

  try {
    const formatted = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currencyCode,
      currencyDisplay: 'narrowSymbol',
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    }).format(amount)

    if (currencyCode === 'BDT' && formatted.replace(/\s/g, '').match(/^[\d.,]+$/)) {
      const n = fractionDigits === 0 ? String(Math.round(amount)) : String(amount)
      return `${manualPrefix.BDT}${n}`
    }

    return formatted
  } catch {
    const sym = manualPrefix[currencyCode] || `${currencyCode} `
    const n = fractionDigits === 0 ? String(Math.round(amount)) : amount.toFixed(2)
    return `${sym}${n}`
  }
}
