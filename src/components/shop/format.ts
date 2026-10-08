/**
 * Shop date/price helpers — LUT e-commerce flow.
 *
 * Dates in CartItem / API payloads are plain 'YYYY-MM-DD' strings.
 * `new Date('YYYY-MM-DD')` parses as UTC midnight which can shift a day in
 * negative-offset timezones, so we parse the parts into a LOCAL Date before
 * calling toLocaleDateString.
 */

import { formatKwd as formatKwdMoney, roundKwd } from '@/lib/money'

const MS_PER_DAY = 1000 * 60 * 60 * 24

/** Parse 'YYYY-MM-DD' into a local Date (timezone-safe). */
export function parseDateParts(iso: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso)
  if (!m) return null
  const date = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
  return isNaN(date.getTime()) ? null : date
}

/**
 * Locale → Gulf-friendly date region. Kuwaiti users read day-first dates:
 * 'ar-KW' renders Arabic-script day/month/year and 'en-GB' renders
 * dd/mm/yyyy — both avoid the en-US month-first layout flagged in the
 * visual audit (mm/dd/yyyy is unintuitive for event scheduling in Kuwait).
 */
const DATE_REGIONS: Record<string, string> = {
  // '-u-nu-latn' pins Latin digits: ar-KW's CLDR default renders
  // Arabic-Indic numerals (٠١٢…) while every money figure is Latin
  // toFixed(3) — one panel must not mix digit systems.
  ar: 'ar-KW-u-nu-latn',
  en: 'en-GB',
}

/** Locale-aware date display (ar → Arabic script, en → dd/mm/yyyy). */
export function formatDate(iso: string, locale: string): string {
  const date = parseDateParts(iso)
  if (!date) return iso
  try {
    return date.toLocaleDateString(DATE_REGIONS[locale] ?? locale)
  } catch {
    return iso
  }
}

/**
 * Rental day count between two 'YYYY-MM-DD' dates, mirroring the orders
 * API exactly: end-exclusive counting (the end day is a return day, not a
 * billed day), clamped to the server's 1..365 window — so start === end
 * (same-day rental) counts as 1 day. A reversed or unparseable range
 * returns 0, which callers treat as "no valid selection".
 */
export function rentalDays(startIso: string, endIso: string): number {
  const start = parseDateParts(startIso)
  const end = parseDateParts(endIso)
  if (!start || !end) return 0
  const diff = end.getTime() - start.getTime()
  if (diff < 0) return 0
  return Math.min(365, Math.max(1, Math.ceil(diff / MS_PER_DAY)))
}

/** Today's date as 'YYYY-MM-DD' (local, for native date input mins). */
export function todayIso(): string {
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

/** Price summary for a rental selection. */
export function rentalPriceCalc(
  rentalPricePerDay: number,
  securityDeposit: number,
  days: number,
  quantity: number
): { days: number; rental: number; deposit: number; total: number } {
  if (days < 1) return { days: 0, rental: 0, deposit: 0, total: 0 }
  const rental = roundKwd(rentalPricePerDay * days * quantity)
  const deposit = roundKwd(securityDeposit * quantity)
  return { days, rental, deposit, total: roundKwd(rental + deposit) }
}

/**
 * Format a KWD amount for display (3 decimals, Latin digits, grouping) —
 * thin delegate to the shared money module (single client-side source of
 * truth for KWD rounding + display).
 */
export function formatKwd(amount: number, locale: 'ar' | 'en'): string {
  return formatKwdMoney(amount, locale)
}
