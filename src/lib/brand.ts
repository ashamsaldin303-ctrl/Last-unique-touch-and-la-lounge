/**
 * Shared brand-resolution helpers — copied from the original repo
 * (src/lib/brand.ts) so path → brand mapping behaves identically.
 */

export type BrandKey = 'lut' | 'lalounge' | 'birthday'

export function resolveBrandFromPath(pathname: string | null): BrandKey {
  if (!pathname) return 'lut'
  if (pathname.includes('/la-lounge')) return 'lalounge'
  if (pathname.includes('/your-birthday')) return 'birthday'
  return 'lut'
}

export function isHomePage(pathname: string | null): boolean {
  if (!pathname) return false
  return pathname === '/' || pathname === ''
}

/** Contact-brand enum persisted by /api/contact (mirrors the original). */
export type ContactBrand = 'LUT' | 'LA_LOUNGE' | 'YOUR_BIRTHDAY'

export const BRAND_TO_CONTACT_BRAND: Record<BrandKey, ContactBrand> = {
  lut: 'LUT',
  lalounge: 'LA_LOUNGE',
  birthday: 'YOUR_BIRTHDAY',
}
