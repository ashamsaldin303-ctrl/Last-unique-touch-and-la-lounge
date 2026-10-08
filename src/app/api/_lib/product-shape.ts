import { randomUUID } from 'node:crypto'
import type { Category, Product } from '@prisma/client'
import type { Prisma } from '@prisma/client'
import { z } from 'zod'
import { db } from '@/lib/db'

/**
 * Shared product/category shape for the admin products API — used by
 * GET/POST on /api/admin/products, PATCH/DELETE on /api/admin/products/[id]
 * and the /api/admin/categories routes so every response serializes through
 * ONE `serializeProduct()` (fixes audit r1-e2 F1/F3: images were missing from
 * GET and PATCH returned a divergent raw Prisma row).
 *
 * Money is KWD — a 3-decimal currency — so every exposed amount is rounded
 * to 3 decimal places (`round3`) exactly like the shop's client formatting.
 */

/** Booking statuses that block product deletion / count as "active". */
export const ACTIVE_BOOKING_STATUSES = ['PENDING', 'CONFIRMED'] as const

export const PRODUCT_BRANDS = ['LUT', 'LA_LOUNGE', 'YOUR_BIRTHDAY'] as const
export type ProductBrand = (typeof PRODUCT_BRANDS)[number]

/** Round to 3 decimal places (KWD fils). */
export function round3(n: number): number {
  return Math.round(n * 1000) / 1000
}

// ---------------------------------------------------------------------------
// Serialization
// ---------------------------------------------------------------------------

/** Product row + optional relations produced by the shared `productInclude`. */
export interface ProductWithMeta extends Product {
  category?: Category | null
  _count?: { bookings?: number }
  _bookingsCount?: number
}

/** The ONE product shape returned by every admin products endpoint. */
export interface ProductItem {
  id: string
  slug: string
  brand: string
  nameAr: string
  nameEn: string
  descriptionAr: string
  descriptionEn: string
  priceKwd: number
  depositKwd: number
  stock: number
  isActive: boolean
  categoryId: string
  categoryNameAr: string
  categoryNameEn: string
  images: string[]
  bookingsCount: number
  createdAt: string
  updatedAt: string
}

/**
 * Parse the `Product.images` JSON column defensively: any malformed JSON or
 * non-string entries collapse to `[]` instead of poisoning the response.
 */
export function safeParseImages(raw: string): string[] {
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter((entry): entry is string => typeof entry === 'string')
  } catch {
    return []
  }
}

/** Include clause every read uses — category names + active booking count. */
export const productInclude: Prisma.ProductInclude = {
  category: true,
  _count: {
    select: {
      // Single source of truth (r2 NEW-6): share ACTIVE_BOOKING_STATUSES so a
      // future status added to the list automatically counts everywhere.
      bookings: { where: { status: { in: [...ACTIVE_BOOKING_STATUSES] } } },
    },
  },
}

export function serializeProduct(product: ProductWithMeta): ProductItem {
  return {
    id: product.id,
    slug: product.slug,
    brand: product.brand,
    nameAr: product.nameAr,
    nameEn: product.nameEn,
    descriptionAr: product.descriptionAr,
    descriptionEn: product.descriptionEn,
    priceKwd: round3(product.rentalPricePerDay),
    depositKwd: round3(product.securityDeposit),
    stock: product.stock,
    isActive: product.isActive,
    categoryId: product.categoryId,
    categoryNameAr: product.category?.nameAr ?? '',
    categoryNameEn: product.category?.nameEn ?? '',
    images: safeParseImages(product.images),
    bookingsCount: product._bookingsCount ?? product._count?.bookings ?? 0,
    createdAt: product.createdAt.toISOString(),
    updatedAt: product.updatedAt.toISOString(),
  }
}

/** Category row + product count (from `_count: { select: { products: true } }`). */
export interface CategoryWithCount extends Category {
  _count?: { products?: number }
}

export interface CategoryItem {
  id: string
  nameAr: string
  nameEn: string
  brand: string
  productCount: number
}

export function serializeCategory(category: CategoryWithCount): CategoryItem {
  return {
    id: category.id,
    nameAr: category.nameAr,
    nameEn: category.nameEn,
    brand: category.brand,
    productCount: category._count?.products ?? 0,
  }
}

/** Categories (with product counts) for one brand, or for all brands. */
export async function listCategoryItems(brand?: string): Promise<CategoryItem[]> {
  const categories = await db.category.findMany({
    where: brand ? { brand } : undefined,
    orderBy: [{ brand: 'asc' }, { nameAr: 'asc' }],
    include: { _count: { select: { products: true } } },
  })
  return categories.map(serializeCategory)
}

// ---------------------------------------------------------------------------
// Slugs
// ---------------------------------------------------------------------------

/**
 * Slugify a display name: lowercase, strip non-ASCII (Arabic has no safe
 * transliteration here — stripping is the documented fallback), collapse
 * separators to single dashes, cap at the 80-char column budget, and fall
 * back to `item` when nothing usable remains.
 */
export function slugify(input: string): string {
  const base = input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '')
    .slice(0, 80)
    .replace(/-+$/, '')
  return base.length > 0 ? base : 'item'
}

/**
 * Find a slug unique for the caller's scope: try the base slug, then
 * `-2`..`-50` numeric suffixes, then a random 6-hex suffix. The caller
 * still maps a P2002 unique-constraint race to 409.
 */
export async function findAvailableSlug(
  base: string,
  exists: (candidate: string) => Promise<boolean>,
): Promise<string> {
  for (let i = 0; i < 50; i += 1) {
    const candidate = i === 0 ? base : `${base}-${i + 1}`
    if (!(await exists(candidate))) return candidate
  }
  return `${base}-${randomUUID().slice(0, 6)}`
}

// ---------------------------------------------------------------------------
// Input validation (zod)
// ---------------------------------------------------------------------------

/** Relative image URL only: `/uploads/…` or `/products/…`, no traversal. */
const imageSchema = z
  .string()
  .max(300)
  .regex(/^\/(uploads|products)\/[A-Za-z0-9._-]+$/)
  .refine((value) => !value.includes('..'))

/**
 * Boolean/null guard before numeric coercion (audit r2 NEW-5): a bare
 * `z.coerce.number()` maps `true`→1 / `false`→0 (and `null`→0), so a buggy
 * client could silently misprice a product (`priceKwd: true` → 1 KWD).
 * Rewriting boolean/null inputs to `undefined` makes the inner coerced number
 * fail with a validation error → 400 instead of coercing. `.finite()` keeps
 * rejecting `Infinity`/`NaN` (e.g. `"1e309"`) before the range refine runs.
 */
const rejectBooleanLike = (value: unknown): unknown =>
  typeof value === 'boolean' || value === null ? undefined : value

const priceKwdSchema = z
  .preprocess(rejectBooleanLike, z.coerce.number().finite())
  .refine((value) => value > 0 && value <= 99999)
  .transform(round3)

const depositKwdSchema = z
  .preprocess(rejectBooleanLike, z.coerce.number().finite())
  .refine((value) => value >= 0 && value <= 99999)
  .transform(round3)

/**
 * Full product input (POST create). `categoryId` is validated against the
 * database (existence + brand match) by the routes, not by zod.
 */
export const productInputSchema = z
  .object({
    nameAr: z.string().trim().min(1).max(120),
    nameEn: z.string().trim().min(1).max(120),
    descriptionAr: z.string().max(5000).optional(),
    descriptionEn: z.string().max(5000).optional(),
    slug: z.string().regex(/^[a-z0-9-]{1,80}$/).optional(),
    brand: z.enum(PRODUCT_BRANDS),
    categoryId: z.string().min(1).optional(),
    priceKwd: priceKwdSchema,
    depositKwd: depositKwdSchema,
    // Same boolean/null rejection as the money fields (r2 NEW-5: `stock: true`
    // previously coerced to 1). `.optional()` stays OUTSIDE the preprocess so
    // an absent key still parses as undefined while a present boolean fails.
    stock: z
      .preprocess(rejectBooleanLike, z.coerce.number().int().min(0).max(9999))
      .optional(),
    images: z.array(imageSchema).max(10).optional(),
  })
  .strict()

/**
 * Partial product input (PATCH). Superset of the create schema: every field
 * optional + `isActive` so the legacy deployed panel's `{ isActive?, stock? }`
 * minimal patch keeps working until the rebuilt UI lands.
 */
export const productPatchSchema = productInputSchema.partial().extend({
  isActive: z.boolean().optional(),
})

/**
 * Map a zod failure to `{ field: code }` details for the 400
 * `{ error: 'validation', details }` contract shape. Codes are stable
 * strings (`min` / `max` / `format` / `invalid_type` / `invalid`).
 */
export function validationDetails(error: z.ZodError): Record<string, string> {
  const details: Record<string, string> = {}
  for (const issue of error.issues) {
    const first = issue.path[0]
    const field = typeof first === 'string' ? first : '_body'
    if (details[field] === undefined) details[field] = issueCode(issue.code)
  }
  return details
}

function issueCode(code: string): string {
  switch (code) {
    case 'invalid_type':
      return 'invalid_type'
    case 'too_small':
      return 'min'
    case 'too_big':
      return 'max'
    case 'invalid_format':
    case 'invalid_string':
      return 'format'
    default:
      return 'invalid'
  }
}
