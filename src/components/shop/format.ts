/**
 * Shop date/price helpers — LUT e-commerce flow.
 *
 * Dates in CartItem / API payloads are plain 'YYYY-MM-DD' strings.
 * `new Date('YYYY-MM-DD')` parses as UTC midnight which can shift a day in
 * negative-offset timezones, so we parse the parts into a LOCAL Date before
 * calling toLocaleDateString.
 */

const MS_PER_DAY = 1000 * 60 * 60 * 24

/** Parse 'YYYY-MM-DD' into a local Date (timezone-safe). */
export function parseDateParts(iso: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso)
  if (!m) return null
  const date = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
  return isNaN(date.getTime()) ? null : date
}

/** Locale-aware date display (ar → Arabic script, en → Latin). */
export function formatDate(iso: string, locale: string): string {
  const date = parseDateParts(iso)
  if (!date) return iso
  try {
    return date.toLocaleDateString(locale)
  } catch {
    return iso
  }
}

/** Rental day count between two 'YYYY-MM-DD' dates (min 1, like the original). */
export function rentalDays(startIso: string, endIso: string): number {
  const start = parseDateParts(startIso)
  const end = parseDateParts(endIso)
  if (!start || !end) return 0
  const diff = Math.ceil((end.getTime() - start.getTime()) / MS_PER_DAY)
  return Math.max(0, diff)
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
  const rental = Math.round(rentalPricePerDay * days * quantity * 1000) / 1000
  const deposit = Math.round(securityDeposit * quantity * 1000) / 1000
  return { days, rental, deposit, total: Math.round((rental + deposit) * 1000) / 1000 }
}
