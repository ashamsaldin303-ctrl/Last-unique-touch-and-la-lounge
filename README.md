# LUT Luxury — Last Unique Touch · La Lounge · Your Birthday

Luxury furniture & event equipment rental platform (Kuwait) — three brands in one experience.
منصة تأجير الأثاث والمعدات الفاخرة للفعاليات في الكويت — ثلاث علامات تجارية في تجربة واحدة.

## Brands

| Brand | Identity | Route |
|---|---|---|
| **Last Unique Touch (LUT)** | Signature red `#E62129` + gold accents | `/#/ar/lut` |
| **La Lounge** | Deep dark + magenta `#E6007E`, lounge seating | `/#/ar/la-lounge` |
| **Your Birthday** | Gold `#F5B914` + royal purple, celebrations | `/#/ar/birthday` |

Each brand keeps its own animated Three.js background (vanilla `three`, loaded via `next/dynamic` with `ssr: false`), typography scale and color system.

## Architecture

- **Hash-router SPA**: one Next.js App Router shell (`src/app/page.tsx` + `src/app/[...slug]/page.tsx`) renders client-side views from **`src/views/`** (not `src/pages/` — that directory does not exist). Routes look like `/#/ar/...` and `/#/en/...`.
- **i18n**: custom implementation (`src/lib/i18n.tsx`) reading `src/messages/{ar,en}.json`; full Arabic RTL / English LTR switching.
- **API**: `src/app/api/` — public (`products`, `contact`, `bookings`, `orders`) and admin (`/api/admin/*`, HMAC-signed session cookie + rate-limited login).
- **Data**: Prisma ORM + SQLite (`db/custom.db`, schema in `prisma/schema.prisma`).
- **UI**: Tailwind CSS 4 + shadcn/ui (New York) + Lucide icons; state via Zustand.

## Setup

```bash
bun install                # requires Node >= 20 / Bun 1.x
cp .env.example .env       # then edit values (see below); keep permissions at 600
chmod 600 .env             # .env holds secrets — never world-readable, never committed
bun run db:setup           # prisma db push (creates db/custom.db) + demo seed
bun run dev                # http://localhost:3000
```

The live SQLite database (`db/custom.db`) is **not** tracked in git — it is
runtime data that accumulates customer bookings/messages. `bun run
db:setup` creates it from `prisma/schema.prisma` and loads the deterministic
demo catalog (6 categories, 21 products, sample bookings/messages) from
`prisma/seed.ts`. Re-running `bun run db:seed` resets the demo tables to a
known state (it clears Category/Product/ContactMessage/Booking — including
real orders — but never touches SecurityLog).

### Environment variables

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | yes | SQLite file path (default `file:./db/custom.db`) |
| `ADMIN_PASSWORD` | yes | Admin login password — set a strong value |
| `ADMIN_SESSION_SECRET` | yes | HMAC-SHA256 secret for the admin session cookie (`openssl rand -hex 32`) |
| `NEXT_PUBLIC_SITE_URL` | no | Canonical site URL used for metadata (`http://localhost:3000` fallback) |
| `PRISMA_QUERY_LOG` | no | Set `1` to log every SQL query (default: errors/warnings only) |
| `TRUST_PROXY` | no | Trust `X-Forwarded-For` for rate-limit/audit IPs. `1` = always trust (rightmost hop — use behind the Caddy gateway / any trusted appending proxy). Unset = trust only outside production (`NODE_ENV != production`). In production without `1`, XFF is ignored (shared `unknown` bucket — safe default for direct exposure). `0` = never trust |

## Admin panel

Open `/#/ar/admin` (or `/#/en/admin`) and sign in with `ADMIN_PASSWORD`. The session cookie is signed with `ADMIN_SESSION_SECRET` and expires after 8 hours. Panels: orders/bookings, products, messages.

## Scripts

| Command | Description |
|---|---|
| `bun run dev` | Dev server on :3000 (logs to `dev.log`) |
| `bun run lint` | ESLint over the repo |
| `bun run typecheck` | `tsc --noEmit` (strict; app code only) |
| `bun run db:push` | Apply Prisma schema without data loss |
| `bun run db:push:force` | Same, but allows `--accept-data-loss` |
| `bun run db:seed` | Reset demo data from `prisma/seed.ts` (clears catalog + demo tables) |
| `bun run db:setup` | `db:push` + `db:seed` — full DB bootstrap for fresh checkouts |

## Deployment

```bash
bun run build    # next build + assembles .next/standalone
bun run start    # NODE_ENV=production, serves .next/standalone/server.js
```

- `output: "standalone"` is enabled; security headers (`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`) are set in `next.config.ts` for all routes, and `X-Powered-By` is disabled.
- **Proxy note**: the sandbox `Caddyfile` exposes a gateway on :81 that proxies to `localhost:3000` (plus an `XTransformPort` query convention used by the platform). This is a **sandbox-only convention — do not ship that block to production**; terminate TLS at your own reverse proxy and forward to the standalone server. Behind a trusted reverse proxy, set `TRUST_PROXY=1` so client IPs are read from `X-Forwarded-For`.
- Never commit `.env` (mode 600, gitignored); rotate `ADMIN_SESSION_SECRET` per environment. The database file lives only on the server — `db/custom.db` is gitignored and re-created via `bun run db:setup`.

## Project structure

```
src/
  app/           # App Router shell (page.tsx, [...slug], api/, globals.css)
  views/         # Hash-routed site pages (home, brand pages, cart, admin, …)
  components/    # 3d/ (Three.js backgrounds), admin/, shop/, shared/, ui/ (shadcn)
  lib/           # router, i18n, admin-auth, db, cart-store, brand
  hooks/         # use-toast, use-mobile
  messages/      # i18n strings (ar / en)
public/products/ # Product & brand imagery
prisma/          # schema.prisma + seed.ts
```

---

© Last Unique Touch · La Lounge · Your Birthday — Kuwait
