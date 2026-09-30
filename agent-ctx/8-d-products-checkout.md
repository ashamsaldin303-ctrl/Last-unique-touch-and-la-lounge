# Task 8-d — Products & Checkout subagent

**Task ID:** 8-d
**Scope:** LUT e-commerce flow — 6 pages + shared shop components
**Owned paths:** `src/pages/{products,product-detail,cart,checkout,payment,checkout-success}.tsx` + `src/components/shop/*`

## Files written

### Pages (all `'use client'` default exports)
| File | Route | What it does |
|---|---|---|
| `src/pages/products.tsx` | `/products` | Catalog: debounced search (300ms), category pills, sort select, useResultCount, 2/3/4-col grid, shimmer skeletons, empty state, pagination with animated transitions, error+retry |
| `src/pages/product-detail.tsx` | `/products/[slug]` (prop `{ slug }`) | Breadcrumbs, gallery w/ fade transitions + thumbnails + 3D badge, info (price/deposit/description), RentalPicker, TrustBadges, related products, skeleton + not-found states |
| `src/pages/cart.tsx` | `/cart` | Hydration guard, empty state, item rows (period text, qty stepper, remove w/ exit animation), summary card from `cartTotals`, CTAs |
| `src/pages/checkout.tsx` | `/checkout` | zod + RHF form (checkout.form.errors.*), terms checkbox → /terms, POST /api/orders (flat payload, no totals), sessionStorage `lut_last_order`, snake-key error mapping (toast + inline), navigate to success |
| `src/pages/payment.tsx` | `/checkout/payment` | Display-only flow: reads `lut_last_order` (missing → redirect /cart), order info + displayNote, card form UI (4-4-4-4 spaces, MM/YY, CVV), payOnConfirmation card, trust badges, simulated processing → animated check → success |
| `src/pages/checkout-success.tsx` | `/checkout/success` | Animated SVG circle+check draw, orderId `#{id}` from sessionStorage, 5 next-steps (staggered), goHome + browseMore CTAs |

### Shared components (`src/components/shop/`)
- `product-card.tsx` — lux-card hover lift, image scale + gold sheen veil + diagonal sweep, 3D badge (products.badge3d), out-of-stock overlay, category badge, price `formatKwd` + products.perDay, rentNow CTA anchor
- `rental-picker.tsx` — native date inputs, 400ms-debounced `checkAvailability`, colored status badges (green available / red unavailable+error), quantity capped at `availableStock ?? stock`, price summary (priceSummary.rental {rate}/{days}/{qty}/{amount}), add-to-cart + toast w/ viewCart action
- `quantity-stepper.tsx` — 44px a11y stepper (compact mode for cart rows)
- `totals-block.tsx` — TotalsBlock + GrandTotalRow (shared by cart/checkout/payment)
- `trust-badges.tsx` — product.trustBadges.* (Truck, ShieldCheck, RotateCcw, Award)
- `format.ts` — timezone-safe date parsing + `formatDate(iso, locale)` (toLocaleDateString), `rentalDays`, `todayIso`, `rentalPriceCalc`
- `use-cart-hydrated.ts` — **see bug note below**

## ⚠️ Foundation bug found (NOT fixed — lib is read-only for this agent)

`src/lib/cart-store.ts` `hydrated` flag never becomes `true`:
- zustand persist (v5, localStorage) rehydrates **synchronously at module scope**.
- `onRehydrateStorage`'s post-hydration callback calls `useCart.setState({...})` while
  `create()` is still executing → the `useCart` const is in its temporal dead zone →
  ReferenceError is swallowed by zustand's `toThenable` (both the then AND catch paths),
  so `hydrated: true` never lands.
- Consequence: any page gating on `hydrated` renders its skeleton forever.

**Workaround (in my scope):** `useCartHydrated()` = `storeHydrated || mountedOnClient`
(via `useSyncExternalStore` client-mount detection). Items ARE restored synchronously
before first client render, so client-mount is a sound gate; if the lib is fixed the
store flag takes over automatically.

**Suggested root fix for the lib owner (one line, API unchanged):**
```ts
onRehydrateStorage: () => (state) => {
  state?.markHydrated?.()
  queueMicrotask(() => useCart.setState({ hydrated: true }))
}
```

## Other notes
- `checkAvailability` lib types return `{ available, availableStock }`; the API also returns `stock` — ignored, matches the lib contract.
- Checkout POST body is flat (`{ customerName, ..., items: [{ productId, startDate, endDate, quantity, days }] }`) per the API schema; server recomputes prices.
- Lint: 0 errors, 1 benign warning (`react-hooks/incompatible-library` on RHF `watch()` — needed for locale-reactive required-vs-format error messages).
- Verified E2E in headless browser: filters/search/sort/pagination, dates→availability→add-to-cart→cart→checkout→POST→success, payment simulate→success, EN locale, payment redirect guard, checkout empty state. No console/page errors. `GET /` 200.
