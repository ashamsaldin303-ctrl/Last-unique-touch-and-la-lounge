/**
 * Client-side product types + fetchers.
 * Types mirror the original repo's ProductWithImages (src/lib/products.ts).
 */

export type Brand = 'LUT' | 'LA_LOUNGE' | 'YOUR_BIRTHDAY'

export interface CategoryDTO {
  id: string
  brand: string
  slug: string
  nameAr: string
  nameEn: string
}

export interface ProductDTO {
  id: string
  brand: string
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
  brand: Brand
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
  return res.json()
}

export async function fetchProductBySlug(slug: string, brand: Brand): Promise<ProductDTO | null> {
  const res = await fetch(`/api/products/slug/${encodeURIComponent(slug)}?brand=${brand}`)
  if (!res.ok) return null
  const data = await res.json()
  return data.product ?? null
}

export async function fetchRelatedProducts(productId: string, brand: Brand): Promise<ProductDTO[]> {
  const res = await fetch(`/api/products/related/${encodeURIComponent(productId)}?brand=${brand}`)
  if (!res.ok) return []
  const data = await res.json()
  return data.products ?? []
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
  return res.json()
}

/** Format KWD (3 decimals). */
export function formatKwd(amount: number): string {
  return amount.toFixed(3)
}
