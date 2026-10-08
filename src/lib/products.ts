/**
 * Client-side product types + fetchers.
 * Types mirror the original repo's ProductWithImages (src/lib/products.ts).
 */

export type Brand = 'LUT' | 'LA_LOUNGE' | 'YOUR_BIRTHDAY'

/** Catalog-wide brand filter value ('ALL' = unified storefront). */
export type BrandFilter = Brand | 'ALL'

export interface CategoryDTO {
  id: string
  brand: string
  slug: string
  nameAr: string
  nameEn: string
}

export interface ProductDTO {
  id: string
  /** Prisma brand enum — 'LUT' | 'LA_LOUNGE' | 'YOUR_BIRTHDAY'. */
  brand: Brand
  slug: string
  nameAr: string
  nameEn: string
  descriptionAr: string
  descriptionEn: string
  rentalPricePerDay: number
  securityDeposit: number
  images: string[]
  model3dUrl: string | null
  stock: number
  isActive: boolean
  categoryId: string
  category?: CategoryDTO | null
}

export type ProductSort = 'newest' | 'price-asc' | 'price-desc'

/** Runtime `unknown` → record guard used to validate API envelopes. */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

export interface ProductsResponse {
  products: ProductDTO[]
  total: number
  page: number
  totalPages: number
  categories: CategoryDTO[]
}

export function localizedName(p: { nameAr: string; nameEn: string }, locale: string): string {
  return locale === 'ar' ? p.nameAr : p.nameEn
}

export function localizedDescription(p: { descriptionAr: string; descriptionEn: string }, locale: string): string {
  return locale === 'ar' ? p.descriptionAr : p.descriptionEn
}

export async function fetchProducts(opts: {
  brand: BrandFilter
  category?: string
  search?: string
  sort?: ProductSort
  page?: number
}): Promise<ProductsResponse> {
  const params = new URLSearchParams({ brand: opts.brand })
  if (opts.category) params.set('category', opts.category)
  if (opts.search) params.set('search', opts.search)
  if (opts.sort) params.set('sort', opts.sort)
  if (opts.page) params.set('page', String(opts.page))
  const res = await fetch(`/api/products?${params.toString()}`)
  if (!res.ok) throw new Error('failed to fetch products')
  // Envelope check: `res.json()` is `any` (unsound), so validate the shape
  // before casting — every consumer wraps this call in .catch → error state.
  const data: unknown = await res.json()
  if (
    !isRecord(data) ||
    !Array.isArray(data.products) ||
    typeof data.total !== 'number' ||
    typeof data.page !== 'number' ||
    typeof data.totalPages !== 'number' ||
    !Array.isArray(data.categories)
  ) {
    throw new Error('failed to fetch products')
  }
  // Interfaces lack implicit index signatures, so TS insists on the
  // `unknown` hop — safe here because the envelope above was just validated.
  return data as unknown as ProductsResponse
}

/**
 * Fetch a product by slug across ALL brands (brand param optional).
 * The storefronts link products by slug only — the product's own brand
 * drives theming and the related-products rail.
 *
 * Returns null on any failure (HTTP, network, malformed body) — the sole
 * consumer (product-detail.tsx) has no .catch, so this must never reject;
 * null renders the localized not-found state.
 */
export async function fetchProductBySlug(slug: string, brand?: Brand): Promise<ProductDTO | null> {
  const qs = brand ? `?brand=${brand}` : ''
  try {
    const res = await fetch(`/api/products/slug/${encodeURIComponent(slug)}${qs}`)
    if (!res.ok) return null
    const data: unknown = await res.json()
    if (!isRecord(data) || !isRecord(data.product)) return null
    // Double cast justified by the record check above (TS2352 otherwise).
    return data.product as unknown as ProductDTO
  } catch {
    // Network/JSON failure — never reject (see contract above).
    return null
  }
}

export async function fetchRelatedProducts(productId: string, brand: Brand): Promise<ProductDTO[]> {
  try {
    const res = await fetch(`/api/products/related/${encodeURIComponent(productId)}?brand=${brand}`)
    if (!res.ok) return []
    const data: unknown = await res.json()
    if (!isRecord(data) || !Array.isArray(data.products)) return []
    return data.products as ProductDTO[]
  } catch {
    // Related rail is a background enhancement — never reject (the consumer
    // chains `.then` without `.catch`).
    return []
  }
}

export async function checkAvailability(
  productId: string,
  start: string,
  end: string,
  quantity = 1
): Promise<{ available: boolean; availableStock: number }> {
  const res = await fetch(
    `/api/products/${encodeURIComponent(productId)}/availability?start=${start}&end=${end}&quantity=${quantity}`
  )
  if (!res.ok) throw new Error('availability check failed')
  // Malformed 200s must not read as "available" — the picker's catch shows
  // an explicit error state instead of letting garbage pass the gate.
  const data: unknown = await res.json()
  if (!isRecord(data) || typeof data.available !== 'boolean') {
    throw new Error('availability check failed')
  }
  return data as { available: boolean; availableStock: number }
}

/** Format KWD (3 decimals). */
export function formatKwd(amount: number): string {
  return amount.toFixed(3)
}
