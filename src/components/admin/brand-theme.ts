'use client'

/**
 * Brand-theme tokens for the ADMIN multi-page back office (Task 38).
 *
 * The three houses each get their own admin page
 * (#/ar/admin/lut · #/ar/admin/la-lounge · #/ar/admin/birthday).
 * All admin pages keep the neutral «maison» identity (data-brand="neutral"
 * on <html>) — the per-brand accent below is applied LOCALLY through inline
 * styles so the warm-dark champagne surfaces stay coherent while each page
 * still breathes its brand's color.
 *
 * `Brand` is imported from products-dialog so the admin area has ONE
 * source of truth for the Prisma brand enum shape.
 */

import { Armchair, Cake, Sofa, type LucideIcon } from 'lucide-react'
import type { Brand } from '@/components/admin/products-dialog'

export type { Brand }

/** The three houses, in stable overview-card order. */
export const ADMIN_BRANDS: readonly Brand[] = ['LUT', 'LA_LOUNGE', 'YOUR_BIRTHDAY']

export interface AdminBrandMeta {
  /** Route path inside the admin area (hash-router path, locale-stripped). */
  adminPath: string
  /** Public storefront path (used by the "view storefront" link). */
  sitePath: string
  /** Brand accent (hex) — the project's known identity colors. */
  accent: string
  /** Lighter accent tint for text on dark surfaces. */
  accentText: string
  /** Accent at ~12% alpha for soft fills. */
  accentSoft: string
  /** Accent at ~35% alpha for borders. */
  accentBorder: string
  /** i18n key — display name (shared with the storefront brand pills). */
  labelKey: string
  /** i18n key — one-line admin tagline per house. */
  taglineKey: string
  /** Monogram letter used in the fallback tile. */
  monogram: string
  icon: LucideIcon
}

export const ADMIN_BRAND_META: Record<Brand, AdminBrandMeta> = {
  LUT: {
    adminPath: '/admin/lut',
    sitePath: '/last-unique-touch',
    accent: '#C9A25E',
    accentText: '#E5C878',
    accentSoft: 'rgba(201,162,94,0.12)',
    accentBorder: 'rgba(201,162,94,0.38)',
    labelKey: 'products.brandFilter.lut',
    taglineKey: 'admin.brands.lut.tagline',
    monogram: 'L',
    icon: Armchair,
  },
  LA_LOUNGE: {
    adminPath: '/admin/la-lounge',
    sitePath: '/la-lounge',
    accent: '#E6007E',
    accentText: '#FF8AC8',
    accentSoft: 'rgba(230,0,126,0.13)',
    accentBorder: 'rgba(230,0,126,0.40)',
    labelKey: 'products.brandFilter.lalounge',
    taglineKey: 'admin.brands.lalounge.tagline',
    monogram: 'LL',
    icon: Sofa,
  },
  YOUR_BIRTHDAY: {
    adminPath: '/admin/birthday',
    sitePath: '/your-birthday',
    accent: '#F5B914',
    accentText: '#FFD666',
    accentSoft: 'rgba(245,185,20,0.13)',
    accentBorder: 'rgba(245,185,20,0.40)',
    labelKey: 'products.brandFilter.birthday',
    taglineKey: 'admin.brands.birthday.tagline',
    monogram: 'YB',
    icon: Cake,
  },
}
