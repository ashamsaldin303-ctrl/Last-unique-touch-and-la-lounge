# LUT Luxury — Last Unique Touch · La Lounge · Your Birthday

منصة تأجير الأثاث والمعدات الفاخرة للفعاليات في الكويت — ثلاث علامات تجارية في تجربة واحدة.
Luxury furniture & event equipment rental platform (Kuwait) — three brands in one experience.

---

## Brands | العلامات الثلاث

| Brand | Identity | Route |
|---|---|---|
| **Last Unique Touch (LUT)** | Signature red `#E62129` + gold accents, ivory surfaces | `/#/ar/lut` |
| **La Lounge** | Deep dark + vivid magenta `#E6007E`, lounge seating & mood lighting | `/#/ar/la-lounge` |
| **Your Birthday** | Gold `#F5B914` + royal purple, celebration setups | `/#/ar/birthday` |

Each brand keeps its **own animated 3D background** (Three.js particles/flow fields), typography scale and color system — never mixed.

## Features | الميزات

- **Multi-page hash routing** (`/#/ar/...` and `/#/en/...`) with full **Arabic RTL / English LTR** switching
- **Product catalog** served from Prisma/SQLite through `/api/products` (15+ products, KWD pricing)
- **Per-brand product lines** with rich detail pages (specs, gallery, availability)
- **Booking / request modals** with keyboard (`Esc`) and overlay-click close
- **UI Upgrade Kit** (`src/components/shared/upgrade/`): TiltCard, MagneticButton, AnimatedCounter, SectionHeading, StatsBand, ProcessSteps, TestimonialsSection, ScrollProgress, BackToTop
- **Motion design**: shine-sweep, glow-border, card-lift, icon-ring, line-draw, stat-pop, glass-panel — all disabled automatically under `prefers-reduced-motion`
- Zero blue/indigo anywhere — strict brand palettes only

## Tech Stack | التقنيات

- **Next.js 16** (App Router) + **TypeScript 5**
- **Tailwind CSS 4** + **shadcn/ui** (New York) + Lucide icons
- **Prisma ORM** + SQLite
- **Three.js** (r3f) animated backgrounds
- **Zustand** / **TanStack Query** available

## Getting Started | التشغيل

```bash
# 1. Install dependencies
bun install        # or npm install

# 2. Configure the database URL
cp .env.example .env

# 3. Push the schema and (re)generate the client
bun run db:push
bun run db:generate

# 4. Start the dev server
bun run dev        # http://localhost:3000
```

> The repository already ships a seeded `db/custom.db` — products are available immediately.

## Project Structure | بنية المشروع

```
src/
  app/            # Next.js App Router (/, api routes, globals.css)
  pages/          # Hash-routed site pages (home, lut, la-lounge, birthday, products)
  components/
    shared/upgrade/   # Animation & layout upgrade kit
  messages/       # i18n strings (ar / en)
public/products/ # Product & background imagery
prisma/          # Schema (SQLite)
```

## Notes | ملاحظات

- `messages/` (root) and `src/messages/` must stay **in sync** — both are read at different stages.
- All 3D backgrounds are core assets: optimize, never remove.
- Brand colors are sacred: LUT red/gold, La Lounge magenta, Birthday gold/purple.

---

© Last Unique Touch · La Lounge · Your Birthday — Kuwait
