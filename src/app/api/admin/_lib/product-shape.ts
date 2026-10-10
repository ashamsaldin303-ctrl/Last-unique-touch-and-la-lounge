import { randomBytes } from 'node:crypto'
import type { Prisma } from '@prisma/client'

/**
 * Shared helpers for the admin product CRUD routes
 * (`/api/admin/products`, `/api/admin/products/[id]`).
 *
 * `Product.images` is stored in SQLite as a JSON string; every admin-facing
 * response parses it back into `string[]` (safe: bad JSON degrades to `[]`).
 */

/** Product row including the joined category names (the join all routes use). */
export type ProductWithCategory = Prisma.ProductGetPayload<{
  include: { category: { select: { nameAr: true; nameEn: true } } }
}>

/**
 * Parse the `images` column (JSON string of URL strings) safely.
 * Bad JSON / non-array payloads degrade to `[]`; entries that are not
 * non-empty strings are dropped.
 */
export function parseImages(raw: string): string[] {
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter((url): url is string => typeof url === 'string' && url.length > 0)
  } catch {
    return []
  }
}

/** Serialize an image URL array for storage in the `images` column. */
export function serializeImages(images: string[]): string {
  return JSON.stringify(images)
}

/** Full admin product item shape (images parsed, category names flattened). */
export function mapProductItem(product: ProductWithCategory, bookingsCount: number) {
  return {
    id: product.id,
    brand: product.brand,
    slug: product.slug,
    nameAr: product.nameAr,
    nameEn: product.nameEn,
    descriptionAr: product.descriptionAr,
    descriptionEn: product.descriptionEn,
    rentalPricePerDay: product.rentalPricePerDay,
    securityDeposit: product.securityDeposit,
    stock: product.stock,
    isActive: product.isActive,
    categoryId: product.categoryId,
    categoryAr: product.category.nameAr,
    categoryEn: product.category.nameEn,
    bookingsCount,
    images: parseImages(product.images),
    createdAt: product.createdAt,
  }
}

/**
 * Slugify an English product name: lowercase, non-alphanumerics → dashes,
 * dashes collapsed, trimmed, max 60 chars. Arabic-only names slugify to ''
 * (callers fall back to a random slug).
 */
export function slugifyNameEn(nameEn: string): string {
  return nameEn
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
    .replace(/-+$/g, '')
}

/** Short random hex suffix used for slug dedupe fallbacks. */
export function randomSuffix(): string {
  return randomBytes(4).toString('hex')
}
