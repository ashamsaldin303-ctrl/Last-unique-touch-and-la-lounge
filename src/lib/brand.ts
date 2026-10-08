/**
 * Shared brand-resolution helpers — copied from the original repo
 * (src/lib/brand.ts) so path → brand mapping behaves identically,
 * extended with the umbrella "neutral" house identity for the home
 * page (Task 25: the landing is a neutral page embracing all three
 * brands rather than a Last Unique Touch page).
 */

export type BrandKey = 'neutral' | 'lut' | 'lalounge' | 'birthday'

export function resolveBrandFromPath(pathname: string | null): BrandKey {
  if (!pathname) return 'neutral'
  if (pathname === '/' || pathname === '') return 'neutral'
  if (pathname.includes('/la-lounge')) return 'lalounge'
  if (pathname.includes('/your-birthday')) return 'birthday'
  return 'lut'
}

export function isHomePage(pathname: string | null): boolean {
  if (!pathname) return false
  return pathname === '/' || pathname === ''
}

/** Contact-brand enum persisted by /api/contact (mirrors the original).
 *  Unused in src today (contact.tsx hardcodes its own mapping) — documented
 *  in worklog 3-b, kept as the shared contract for future callers. */
export type ContactBrand = 'LUT' | 'LA_LOUNGE' | 'YOUR_BIRTHDAY'

export const BRAND_TO_CONTACT_BRAND: Record<BrandKey, ContactBrand> = {
  neutral: 'LUT',
  lut: 'LUT',
  lalounge: 'LA_LOUNGE',
  birthday: 'YOUR_BIRTHDAY',
}

/** Per-brand accent hex (for tri-brand moments on neutral surfaces).
 *  No importer in src today — documented in worklog 3-b, kept for the
 *  upcoming tri-brand moments. */
export const BRAND_ACCENTS: Record<BrandKey, string> = {
  neutral: '#C9A25E',
  lut: '#8B6B3D',
  lalounge: '#E6007E',
  birthday: '#F5B914',
}
