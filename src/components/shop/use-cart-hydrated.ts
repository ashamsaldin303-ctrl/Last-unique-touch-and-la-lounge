'use client'

/**
 * useCartHydrated — reliable "cart is ready" gate for the shop pages.
 *
 * The store opts into `skipHydration: true` and AppShell calls
 * `useCart.persist.rehydrate()` inside a mount effect (after hydration),
 * so the first client render matches SSR. The `hydrated` flag flips in a
 * microtask right after rehydrate() — until then pages render a loading
 * state instead of flashing an empty cart.
 */

import { useCart } from '@/lib/cart-store'

export function useCartHydrated(): boolean {
  return useCart((s) => s.hydrated)
}
