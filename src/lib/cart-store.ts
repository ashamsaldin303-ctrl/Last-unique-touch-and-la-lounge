'use client'

/**
 * Cart store — zustand + localStorage persist.
 * Mirrors the original repo's CartItem shape (src/lib/cart.ts).
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { parseDateParts, rentalDays } from '@/components/shop/format'

export interface CartItem {
  productId: string
  slug: string
  nameAr: string
  nameEn: string
  image: string
  rentalPricePerDay: number
  securityDeposit: number
  startDate: string
  endDate: string
  quantity: number
  days: number
  total: number
}

interface CartState {
  items: CartItem[]
  hydrated: boolean
  addItem: (item: CartItem) => void
  removeItem: (index: number) => void
  updateQuantity: (index: number, quantity: number) => void
  clear: () => void
}

/**
 * View-level trust gate for cart lines (moved from views/cart.tsx — single
 * lib home so views import it from the store instead of from each other).
 * localStorage can hold legacy or hand-poisoned rows (missing fields /
 * wrong types) — formatKwd/cartTotals would crash the render. Malformed
 * rows are dropped instead of breaking the page. Shared by the cart and
 * checkout pages so both render the same safe view. (Sanitizing at render
 * time complements sanitizeCartItem, which guards the persistence path.)
 */
export function isSafeCartItem(item: unknown): item is CartItem {
  if (!item || typeof item !== 'object') return false
  const it = item as Partial<CartItem>
  return (
    typeof it.productId === 'string' &&
    it.productId !== '' &&
    typeof it.slug === 'string' &&
    it.slug !== '' &&
    typeof it.nameAr === 'string' &&
    typeof it.nameEn === 'string' &&
    typeof it.image === 'string' &&
    typeof it.rentalPricePerDay === 'number' &&
    Number.isFinite(it.rentalPricePerDay) &&
    it.rentalPricePerDay >= 0 &&
    typeof it.securityDeposit === 'number' &&
    Number.isFinite(it.securityDeposit) &&
    it.securityDeposit >= 0 &&
    typeof it.startDate === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(it.startDate) &&
    typeof it.endDate === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(it.endDate) &&
    typeof it.quantity === 'number' &&
    Number.isFinite(it.quantity) &&
    it.quantity >= 1 &&
    typeof it.days === 'number' &&
    Number.isFinite(it.days) &&
    it.days >= 1 &&
    typeof it.total === 'number' &&
    Number.isFinite(it.total) &&
    it.total >= 0
  )
}

/** Persisted-cart shape version. Bump on every breaking CartItem change —
 *  payloads stored by older versions flow through `migrate` below. */
const CART_STORAGE_VERSION = 1

// Cart capacity guards. Enforced inside the store (addItem/updateQuantity);
// exported for UI steppers/badges — no external importer today (documented,
// kept as the module's public tuning surface — see worklog 3-b).
export const MAX_CART_ITEMS = 50
export const MAX_QUANTITY_PER_ITEM = 100

/**
 * Recompute a line's total for a new quantity from the STORED price
 * components — (rentalPricePerDay × days + securityDeposit) × quantity,
 * rounded to 3dp (KWD). This is the exact `cartTotals` formula, so a row's
 * total and the derived grand total can never disagree; deriving the rate
 * back from the rounded line total (previous approach) compounded ±0.001
 * drift on every quantity change. Non-finite components (corrupt
 * persistence) contribute 0 instead of poisoning the total.
 */
function withQuantity(item: CartItem, quantity: number): CartItem {
  const safe = (n: number): number => (Number.isFinite(n) ? n : 0)
  const total =
    Math.round((safe(item.rentalPricePerDay) * safe(item.days) + safe(item.securityDeposit)) * quantity * 1000) / 1000
  return { ...item, quantity, total }
}

/**
 * Sanitize a caller/persistence-supplied quantity: must be a finite integer
 * clamped to [1, MAX_QUANTITY_PER_ITEM]. Guards against NaN (which slips
 * through plain `<` / `>` comparisons), negatives and fractions from
 * hand-built items or a corrupted localStorage payload.
 */
function clampQuantity(quantity: number): number {
  if (!Number.isFinite(quantity)) return 1
  const integer = Math.trunc(quantity)
  return Math.min(Math.max(integer, 1), MAX_QUANTITY_PER_ITEM)
}

/**
 * Validate + normalize one persisted cart line (migrate/merge path):
 * - keep known fields only — anything else on the object (older shape or
 *   hand-edited localStorage) is dropped;
 * - require a productId/slug, finite non-negative prices, and parseable
 *   calendar dates with end ≥ start (unparseable or reversed dates → the
 *   whole line is removed rather than loaded). A PAST startDate is
 *   intentionally tolerated here: dropping lines would destroy a saved
 *   cart, while the server re-validates the full window at order time
 *   (`invalid_dates`) and the checkout rental picker flags past windows;
 * - re-clamp the quantity and recompute days + total from the stored price
 *   fields — a persisted `days`/`total` is never trusted. `days` is always
 *   1..365 (same-day counts as 1).
 * Complements the view-level render gate `isSafeCartItem` exported below.
 */
function sanitizeCartItem(raw: unknown): CartItem | null {
  if (typeof raw !== 'object' || raw === null) return null
  const r = raw as Record<string, unknown>
  const str = (v: unknown): string | undefined => (typeof v === 'string' ? v : undefined)
  const num = (v: unknown): number | undefined =>
    typeof v === 'number' && Number.isFinite(v) ? v : undefined

  const productId = str(r.productId)
  const slug = str(r.slug)
  const startDate = str(r.startDate)
  const endDate = str(r.endDate)
  const rentalPricePerDay = num(r.rentalPricePerDay)
  const securityDeposit = num(r.securityDeposit)
  if (!productId || !slug || !startDate || !endDate) return null
  if (rentalPricePerDay === undefined || rentalPricePerDay < 0) return null
  if (securityDeposit === undefined || securityDeposit < 0) return null

  const start = parseDateParts(startDate)
  const end = parseDateParts(endDate)
  if (!start || !end || end.getTime() < start.getTime()) return null
  // 1..365 for the validated window (same-day counts as 1, end-exclusive).
  const days = rentalDays(startDate, endDate)

  const item: CartItem = {
    productId,
    slug,
    nameAr: str(r.nameAr) ?? '',
    nameEn: str(r.nameEn) ?? '',
    image: str(r.image) ?? '',
    rentalPricePerDay,
    securityDeposit,
    startDate,
    endDate,
    quantity: clampQuantity(num(r.quantity) ?? 1),
    days,
    total: 0,
  }
  return withQuantity(item, item.quantity)
}

/** Sanitize a persisted `items` array: drop invalid lines, re-clamp the
 *  rest, cap the cart length. Used by both `migrate` and `merge`. */
function normalizeItems(raw: unknown): CartItem[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map(sanitizeCartItem)
    .filter((item): item is CartItem => item !== null)
    .slice(0, MAX_CART_ITEMS)
}

export const useCart = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      hydrated: false,
      addItem: (item) =>
        set((state) => {
          const quantity = clampQuantity(item.quantity)
          // Same product rented for the same window → merge into the
          // existing line (quantities add up) instead of pushing a duplicate
          // row. Matching is intentionally on productId + dates only; the
          // stored line keeps its name/image/price snapshot. Stale snapshots
          // are safe BY CONTRACT: POST /api/orders recomputes every price,
          // duration and total from the DB at order time (client totals are
          // advisory only), so an outdated snapshot can never overcharge.
          const matchIndex = state.items.findIndex(
            (line) =>
              line.productId === item.productId &&
              line.startDate === item.startDate &&
              line.endDate === item.endDate
          )
          if (matchIndex !== -1) {
            const existing = state.items[matchIndex]
            const merged = [...state.items]
            merged[matchIndex] = withQuantity(
              existing,
              Math.min(existing.quantity + quantity, MAX_QUANTITY_PER_ITEM)
            )
            return { items: merged }
          }
          if (state.items.length >= MAX_CART_ITEMS) return state
          return { items: [...state.items, { ...item, quantity }] }
        }),
      removeItem: (index) =>
        set((state) => ({ items: state.items.filter((_item, i) => i !== index) })),
      updateQuantity: (index, quantity) =>
        set((state) => {
          // NaN passes `<`/`>` guards — require a finite integer explicitly.
          if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QUANTITY_PER_ITEM) {
            return state
          }
          const item = state.items[index]
          if (!item) return state
          const updated = [...state.items]
          updated[index] = withQuantity(item, quantity)
          return { items: updated }
        }),
      clear: () => set({ items: [] }),
    }),
    {
      name: 'lut_cart',
      // Persisted shape contract. Payloads from older versions flow
      // through `migrate`; EVERY rehydrate (initial, migrate, cross-tab)
      // is re-sanitized in `merge` — a stale or corrupted localStorage
      // can never load a bad line even without a version bump.
      version: CART_STORAGE_VERSION,
      // Rehydrate AFTER mount (AppShell calls useCart.persist.rehydrate() in
      // an effect) so the first client render matches the SSR markup —
      // otherwise a persisted cart causes a hydration mismatch.
      skipHydration: true,
      partialize: (state) => ({ items: state.items }),
      // Pre-version (0) carts stored before the version field existed:
      // drop unknown fields, re-clamp quantities, re-validate dates
      // (invalid lines are removed) and recompute days/totals.
      migrate: (persisted) => ({
        items: normalizeItems((persisted as { items?: unknown } | undefined)?.items),
      }),
      // Belt-and-braces: re-sanitize on every rehydrate (also re-clamps
      // quantities that only addItem/updateQuantity clamp on write).
      merge: (persistedState, currentState) => ({
        ...currentState,
        items: normalizeItems((persistedState as { items?: unknown } | undefined)?.items),
      }),
      onRehydrateStorage: () => {
        // zustand invokes this callback synchronously while create() is still
        // executing (state not yet returned) — defer the flip to a microtask
        // to avoid a TDZ ReferenceError on `useCart`.
        queueMicrotask(() => {
          useCart.setState({ hydrated: true })
        })
        // zustand swallows rehydration errors (e.g. corrupt `lut_cart` JSON)
        // unless the returned callback surfaces them — log so a corrupted
        // store (which silently renders as an empty cart) is diagnosable.
        return (_state, error) => {
          if (error) console.error('[cart-store] rehydration failed — treating stored cart as empty:', error)
        }
      },
    }
  )
)

/* Cross-tab sync: a cart write in ANOTHER tab fires the `storage` event
   here — rehydrate so both tabs converge (last write wins; `merge`
   re-sanitizes the incoming payload). Registered once per JS realm: the
   global flag keeps dev HMR re-evaluation from stacking listeners. */
if (typeof window !== 'undefined') {
  const globalFlags = globalThis as typeof globalThis & { __lutCartStorageSync?: boolean }
  if (!globalFlags.__lutCartStorageSync) {
    globalFlags.__lutCartStorageSync = true
    window.addEventListener('storage', (event) => {
      if (event.key === 'lut_cart') void useCart.persist.rehydrate()
    })
  }
}

/** Derived cart totals. Non-finite line values (corrupt persistence)
 * contribute 0 instead of poisoning every sum with NaN. */
export function cartTotals(items: CartItem[]) {
  const safe = (n: number): number => (Number.isFinite(n) ? n : 0)
  const rentalTotal = items.reduce((sum, i) => sum + safe(i.rentalPricePerDay) * safe(i.days) * safe(i.quantity), 0)
  const depositTotal = items.reduce((sum, i) => sum + safe(i.securityDeposit) * safe(i.quantity), 0)
  return {
    count: items.reduce((sum, i) => sum + safe(i.quantity), 0),
    rentalTotal: Math.round(rentalTotal * 1000) / 1000,
    depositTotal: Math.round(depositTotal * 1000) / 1000,
    total: Math.round((rentalTotal + depositTotal) * 1000) / 1000,
  }
}
