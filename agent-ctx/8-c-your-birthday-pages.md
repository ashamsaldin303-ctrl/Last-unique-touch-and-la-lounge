# Task 8-c — Your Birthday Pages (birthday brand, 4 pages + shared modal)

## What was built

| File | Route | Contents |
|---|---|---|
| `src/components/birthday/booking-modal.tsx` | (shared component) | Radix Dialog booking modal: focus trap + Escape + focus restore (built into Radix), zod validation (name≥3 / phone≥7 / location≥2 / eventDate required, email optional), POST `/api/bookings/birthday` incl. `selectedPackage`, success state + 3s auto-close + form reset, all error codes → `yourBirthday.booking.errors.*` toasts (network on fetch throw) |
| `src/pages/birthday.tsx` | `/your-birthday` | Hero (white/purple gradient, 6 floating CSS balloons w/ strings `animate-float-soft`, 22 confetti pieces w/ inline `<style>` keyframes + reduced-motion, tagline badge, giant `font-display` gold-gradient title with simplified **text-scramble** cycling `scrambleWords` every ~2.5s via `textContent`, subtitle, cta1→modal / cta2→features, scroll hint) · 3 service cards (🎂/🎈/🎵 medallions, ex1–ex4 chips) · featured products live from API (shimmer skeletons, outOfStock overlay, perDay + formatKwd, viewAll) · 6-tile gallery (EXP // 0N, purple overlay, hover zoom) · 3 testimonials (5 gold stars) · deep-purple CTA band w/ gold text + balloon accents → modal |
| `src/pages/birthday-features.tsx` | `/your-birthday/features` | Back button → landing, `PageHeader`, 6 service cards grid (1/2/3 cols, circular gold-ring medallions, hover rotate+lift), bookNow → shared booking modal |
| `src/pages/birthday-products.tsx` | `/your-birthday/products` | `PageHeader`, live YOUR_BIRTHDAY products (balloon-arch 50, led-dance-floor 80), card: image/name/desc/price+deposit/outOfStock; "استأجر الآن" expands inline rental form (start=today+1, end=today+2, quantity stepper capped at stock, days/total summary) → `useCart().addItem` with `total=(rate*days+deposit)*qty` → toast `product.addedToCart` + `ToastAction` viewCart → `/cart`; loading/error/empty states |
| `src/pages/birthday-contact.tsx` | `/your-birthday/contact` | 2/1 grid: zod-validated form (inline per-field errors from `contact.form.errors.*`) posting `brand:'YOUR_BIRTHDAY'` + success/sendAnother + 4 info cards (gold medallions) + festive note card |

## Conventions used (for later agents)
- Message arrays read directly: `(locale === 'ar' ? arMessages : enMessages).yourBirthday.hero.scrambleWords as string[]` — wrapped in `useMemo([locale])` for a stable effect dep.
- Toast actions MUST be React elements: `action: (<ToastAction altText={...} onClick={...}>{label}</ToastAction>)` — passing a plain object crashes React.
- Avoid synchronous `setState` inside `useEffect` (react-hooks/set-state-in-effect rule): initial loading state via `useState(true)`, async-only updates in effects, sync resets only in event handlers.
- Scroll-reveal (`Reveal`) sections are invisible (opacity 0) in automated full-page screenshots until scrolled — verify via DOM (`querySelectorAll('.reveal.revealed').length`), not screenshots.
- Booking API contract: POST `/api/bookings/birthday` `{name, phone, email?, location, eventDate, notes?, selectedPackage?}` → `{ok:true, bookingId}` / `{error: invalid_input|invalid_event_date|event_date_out_of_range|internal_error}`.

## Verification
- `bunx eslint` on all 5 files: clean. `tsc --noEmit`: no errors in these files.
- agent-browser (isolated session): real booking submitted (success state shown), cart add persisted `lut_cart` (total 280.000 = 80×1+200), toast with view-cart action, Escape closes modal, contact form submit → success, inline validation alerts, EN+AR locales both work, VLM screenshot reviews OK.
- `curl /` = 200; dev.log clean.
