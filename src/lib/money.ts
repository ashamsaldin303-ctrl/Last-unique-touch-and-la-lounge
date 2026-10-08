/**
 * Shared KWD money helpers — the single client-side source of truth for
 * rounding and display of Kuwaiti Dinar amounts (3 decimals, the KWD minor
 * unit). Previously scattered as inline `Math.round(x*1000)/1000` and two
 * diverging formatKwd implementations (toFixed(3) vs Intl grouping).
 *
 * NOTE: server-side routes keep their own copies (client modules cannot be
 * imported from the API layer) — mirror-by-comment, same math.
 */

/** Round to 3 decimal places (KWD minor unit). */
export function round3(n: number): number {
  return Math.round(n * 1000) / 1000
}

/** Round to 3 decimals — alias matching the orders-API helper name. */
export function roundKwd(n: number): number {
  return Math.round(n * 1000) / 1000
}

/* Formatter cache — Intl.NumberFormat construction is not free and these
   are called per rendered row. Latin digits in BOTH locales (the
   '-u-nu-latn' extension pins Arabic away from Arabic-Indic numerals) so
   money figures never mix digit systems with the toFixed(3) values still
   rendered elsewhere; consistent grouping separators both locales. */
const KWD_FORMATTERS = new Map<'ar' | 'en', Intl.NumberFormat>()

function kwdFormatter(locale: 'ar' | 'en'): Intl.NumberFormat {
  let fmt = KWD_FORMATTERS.get(locale)
  if (!fmt) {
    fmt = new Intl.NumberFormat(locale === 'ar' ? 'ar-KW-u-nu-latn' : 'en-KW', {
      minimumFractionDigits: 3,
      maximumFractionDigits: 3,
    })
    KWD_FORMATTERS.set(locale, fmt)
  }
  return fmt
}

/**
 * Format a KWD amount for display: 3 decimals, grouping separators, Latin
 * digits in both locales (e.g. `1,234.500`). Non-finite input (corrupt
 * persistence) renders as 0.000 instead of poisoning the UI with NaN.
 */
export function formatKwd(value: number, locale: 'ar' | 'en'): string {
  return kwdFormatter(locale).format(Number.isFinite(value) ? value : 0)
}
