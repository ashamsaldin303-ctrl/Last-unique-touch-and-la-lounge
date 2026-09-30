'use client'

/**
 * Cart store — zustand + localStorage persist.
 * Mirrors the original repo's CartItem shape (src/lib/cart.ts).
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

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

export const MAX_CART_ITEMS = 50
export const MAX_QUANTITY_PER_ITEM = 100

export const useCart = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      hydrated: false,
      addItem: (item) =>
        set((state) =>
          state.items.length >= MAX_CART_ITEMS
            ? state
            : { items: [...state.items, { ...item, quantity: Math.min(item.quantity, MAX_QUANTITY_PER_ITEM) }] }
        ),
      removeItem: (index) =>
        set((state) => ({ items: state.items.filter((_item, i) => i !== index) })),
      updateQuantity: (index, quantity) =>
        set((state) => {
          if (quantity < 1 || quantity > MAX_QUANTITY_PER_ITEM) return state
          const item = state.items[index]
          if (!item) return state
          const updated = [...state.items]
          const unitDayRate = item.total / (item.quantity * item.days)
          const dayRate = Number.isFinite(unitDayRate) ? unitDayRate : item.rentalPricePerDay
          updated[index] = {
            ...item,
            quantity,
            total: Math.round(dayRate * quantity * item.days * 1000) / 1000,
          }
          return { items: updated }
        }),
      clear: () => set({ items: [] }),
    }),
    {
      name: 'lut_cart',
      // Rehydrate AFTER mount (AppShell calls useCart.persist.rehydrate() in
      // an effect) so the first client render matches the SSR markup —
      // otherwise a persisted cart causes a hydration mismatch.
      skipHydration: true,
      partialize: (state) => ({ items: state.items }),
      onRehydrateStorage: () => {
        // zustand invokes this callback synchronously while create() is still
        // executing (state not yet returned) — defer the flip to a microtask
        // to avoid a TDZ ReferenceError on `useCart`.
        queueMicrotask(() => {
          useCart.setState({ hydrated: true })
        })
        return undefined
      },
    }
  )
)

/** Derived cart totals. */
export function cartTotals(items: CartItem[]) {
  const rentalTotal = items.reduce((sum, i) => sum + i.rentalPricePerDay * i.days * i.quantity, 0)
  const depositTotal = items.reduce((sum, i) => sum + i.securityDeposit * i.quantity, 0)
  return {
    count: items.reduce((sum, i) => sum + i.quantity, 0),
    rentalTotal: Math.round(rentalTotal * 1000) / 1000,
    depositTotal: Math.round(depositTotal * 1000) / 1000,
    total: Math.round((rentalTotal + depositTotal) * 1000) / 1000,
  }
}

/** Format KWD (3 decimals — Kuwaiti Dinar). */
export function formatKwd(amount: number): string {
  return amount.toFixed(3)
}
