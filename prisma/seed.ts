// Seed — regenerated from the live demo database (audit r3-r1 M2 fix:
// db/custom.db is untracked, so fresh checkouts need a deterministic seed).
//
// Structure mirrors the original repo's seed (6 categories, 21 products —
// same slugs/prices/stock/images) plus a small set of demo Booking and
// ContactMessage rows so the admin dashboard has something to show.
//
// Deterministic + idempotent: every run first CLEARS the seeded tables
// (children before parents: Booking → ContactMessage → Product → Category)
// and then re-creates the rows in a fixed order, so the end state is
// identical no matter how many times it runs. SecurityLog is deliberately
// NOT cleared — it is a runtime audit trail, not demo data.
//
// Booking demo rows use dates RELATIVE TO "now" (always in the future, UTC
// midnight-anchored like every other write path) so the seed never produces
// stale past-PENDING rows (audit r3-r5 M2); one row per status showcases
// the dashboard counters. totals follow the server formula
// round3(rate × days × qty + deposit × qty).
//
// Runs standalone (`bun prisma/seed.ts`, wired via package.json
// "prisma.seed"): imports @prisma/client directly — NOT @/lib/db — because
// seed execution happens outside Next's path-alias resolution. The client
// mirrors src/lib/db.ts's minimal instantiation (PRISMA_QUERY_LOG opt-in).

import { PrismaClient } from '@prisma/client'

const prismaLogConfig: Array<'query' | 'error' | 'warn'> =
  process.env.PRISMA_QUERY_LOG === '1' ? ['query', 'error', 'warn'] : ['error', 'warn']

const prisma = new PrismaClient({ log: prismaLogConfig })

/** UTC-midnight date `days` from today (bookings anchor to UTC midnight). */
function utcDaysFromToday(days: number): Date {
  const now = new Date()
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + days))
}

// ===== Categories (6) — fixed order: LUT → LA_LOUNGE → YOUR_BIRTHDAY =====

type CategoryRow = { slug: string; brand: string; nameAr: string; nameEn: string }

const categories: CategoryRow[] = [
  // LUT
  { slug: 'chairs', brand: 'LUT', nameAr: 'كراسي', nameEn: 'Chairs' },
  { slug: 'tables', brand: 'LUT', nameAr: 'طاولات', nameEn: 'Tables' },
  { slug: 'lighting', brand: 'LUT', nameAr: 'إضاءة', nameEn: 'Lighting' },
  // LA_LOUNGE
  { slug: 'events', brand: 'LA_LOUNGE', nameAr: 'فعاليات', nameEn: 'Events' },
  { slug: 'event-furniture', brand: 'LA_LOUNGE', nameAr: 'أثاث الفعاليات', nameEn: 'Event Furniture' },
  // YOUR_BIRTHDAY
  { slug: 'decor', brand: 'YOUR_BIRTHDAY', nameAr: 'ديكور', nameEn: 'Decor' },
]

// ===== Products (21) — fixed order within each brand/category =====

type ProductRow = {
  slug: string
  brand: string
  nameAr: string
  nameEn: string
  descriptionAr: string
  descriptionEn: string
  rentalPricePerDay: number
  securityDeposit: number
  images: string[]
  model3dUrl?: string
  stock: number
  categorySlug: string
}

const products: ProductRow[] = [
  // ---- LUT / chairs (5) — bombon-chair-velvet stock 0 = intentional
  // out-of-stock demo state carried over from the original repo's seed.
  {
    slug: 'louis-ghost-chair',
    brand: 'LUT',
    nameAr: 'كرسي لويس غوست',
    nameEn: 'Louis Ghost Chair',
    descriptionAr: 'كرسي شفاف أنيق من تصميم فيليب ستارك، مثالي للفعاليات الفاخرة',
    descriptionEn: 'Elegant transparent chair designed by Philippe Starck, perfect for luxury events',
    rentalPricePerDay: 5.0,
    securityDeposit: 15.0,
    images: ['/products/louis-ghost-chair.png', '/products/chivari-chair-gold.png', '/products/tiffany-chair-crystal.png'],
    model3dUrl: 'procedural-chair',
    stock: 50,
    categorySlug: 'chairs',
  },
  {
    slug: 'chivari-chair-gold',
    brand: 'LUT',
    nameAr: 'كرسي كييفاري ذهبي',
    nameEn: 'Chivari Chair Gold',
    descriptionAr: 'كرسي كييفاري ذهبي كلاسيكي للمناسبات الرسمية والأفراح',
    descriptionEn: 'Classic gold Chivari chair for formal events and weddings',
    rentalPricePerDay: 3.5,
    securityDeposit: 10.0,
    images: ['/products/chivari-chair-gold.png', '/products/louis-ghost-chair.png', '/products/monet-armchair.png'],
    stock: 100,
    categorySlug: 'chairs',
  },
  {
    slug: 'tiffany-chair-crystal',
    brand: 'LUT',
    nameAr: 'كرسي تيفاني كريستال',
    nameEn: 'Tiffany Chair Crystal',
    descriptionAr: 'كرسي تيفاني شفاف بإطار فولاذي مقاوم للصدأ، أناقة عصرية',
    descriptionEn: 'Transparent Tiffany chair with stainless steel frame, modern elegance',
    rentalPricePerDay: 4.0,
    securityDeposit: 12.0,
    images: ['/products/tiffany-chair-crystal.png', '/products/louis-ghost-chair.png', '/products/bombon-chair-velvet.png'],
    model3dUrl: 'procedural-chair',
    stock: 80,
    categorySlug: 'chairs',
  },
  {
    slug: 'monet-armchair',
    brand: 'LUT',
    nameAr: 'كرسي منته بذراعين',
    nameEn: 'Monet Armchair',
    descriptionAr: 'كرسي بذراعين بتصميم كلاسيكي وتنجيد فاخر بلون كريمي',
    descriptionEn: 'Classic armchair with luxury cream upholstery and elegant design',
    rentalPricePerDay: 6.5,
    securityDeposit: 20.0,
    images: ['/products/monet-armchair.png', '/products/bombon-chair-velvet.png', '/products/chivari-chair-gold.png'],
    stock: 30,
    categorySlug: 'chairs',
  },
  {
    slug: 'bombon-chair-velvet',
    brand: 'LUT',
    nameAr: 'كرسي بومبون مخمل',
    nameEn: 'Bombon Velvet Chair',
    descriptionAr: 'كرسي بومبون بقماش مخمل فاخر متوفر بألوان متعددة',
    descriptionEn: 'Bombon chair with luxury velvet fabric available in multiple colors',
    rentalPricePerDay: 5.5,
    securityDeposit: 18.0,
    images: ['/products/bombon-chair-velvet.png', '/products/monet-armchair.png', '/products/tiffany-chair-crystal.png'],
    stock: 0,
    categorySlug: 'chairs',
  },
  // ---- LUT / tables (5)
  {
    slug: 'round-banquet-table',
    brand: 'LUT',
    nameAr: 'طاولة بنكت دائرية',
    nameEn: 'Round Banquet Table',
    descriptionAr: 'طاولة دائرية كبيرة لجلوس 10 أشخاص، مثالية للعشاء الرسمي',
    descriptionEn: 'Large round table seating 10, ideal for formal dinners',
    rentalPricePerDay: 8.0,
    securityDeposit: 25.0,
    images: ['/products/round-banquet-table.png', '/products/dining-table-12-seater.png', '/products/marble-coffee-table.png'],
    stock: 20,
    categorySlug: 'tables',
  },
  {
    slug: 'cocktail-highboy-table',
    brand: 'LUT',
    nameAr: 'طاولة كوكتيل عالية',
    nameEn: 'Cocktail Highboy Table',
    descriptionAr: 'طاولة كوكتيل عالية أنيقة للحفلات والاستقبالات',
    descriptionEn: 'Elegant cocktail highboy table for parties and receptions',
    rentalPricePerDay: 4.0,
    securityDeposit: 12.0,
    images: ['/products/cocktail-highboy-table.png', '/products/gold-side-table.png', '/products/round-banquet-table.png'],
    stock: 40,
    categorySlug: 'tables',
  },
  {
    slug: 'marble-coffee-table',
    brand: 'LUT',
    nameAr: 'طاولة قهوة رخامية',
    nameEn: 'Marble Coffee Table',
    descriptionAr: 'طاولة قهوة بسطح رخامي فاخر وقاعدة ذهبية، لمسة من الفخامة',
    descriptionEn: 'Coffee table with luxury marble top and gold base, a touch of elegance',
    rentalPricePerDay: 7.0,
    securityDeposit: 22.0,
    images: ['/products/marble-coffee-table.png', '/products/gold-side-table.png', '/products/cocktail-highboy-table.png'],
    model3dUrl: 'procedural-table',
    stock: 15,
    categorySlug: 'tables',
  },
  {
    slug: 'dining-table-12-seater',
    brand: 'LUT',
    nameAr: 'طاولة طعام 12 شخص',
    nameEn: 'Dining Table 12 Seater',
    descriptionAr: 'طاولة طعام طويلة تتسع لـ 12 شخصاً، مثالية للعزائم الكبيرة',
    descriptionEn: 'Long dining table seating 12, perfect for large gatherings',
    rentalPricePerDay: 12.0,
    securityDeposit: 35.0,
    images: ['/products/dining-table-12-seater.png', '/products/round-banquet-table.png', '/products/marble-coffee-table.png'],
    stock: 10,
    categorySlug: 'tables',
  },
  {
    slug: 'gold-side-table',
    brand: 'LUT',
    nameAr: 'طاولة جانبية ذهبية',
    nameEn: 'Gold Side Table',
    descriptionAr: 'طاولة جانبية صغيرة بإطار ذهبي لامع، قطعة ديكور أنيقة',
    descriptionEn: 'Small side table with shiny gold frame, an elegant decor piece',
    rentalPricePerDay: 3.5,
    securityDeposit: 10.0,
    images: ['/products/gold-side-table.png', '/products/marble-coffee-table.png', '/products/cocktail-highboy-table.png'],
    stock: 25,
    categorySlug: 'tables',
  },
  // ---- LUT / lighting (5)
  {
    slug: 'crystal-chandelier',
    brand: 'LUT',
    nameAr: 'ثريا كريستال',
    nameEn: 'Crystal Chandelier',
    descriptionAr: 'ثريا كريستال فاخرة تضيف لمسة ملكية لأي فعالية',
    descriptionEn: 'Luxury crystal chandelier adding a royal touch to any event',
    rentalPricePerDay: 15.0,
    securityDeposit: 50.0,
    images: ['/products/crystal-chandelier.png', '/products/brass-lantern.png', '/products/gold-floor-lamp.png'],
    model3dUrl: 'procedural-chandelier',
    stock: 8,
    categorySlug: 'lighting',
  },
  {
    slug: 'led-uplighter',
    brand: 'LUT',
    nameAr: 'سبوت لايد ملون',
    nameEn: 'LED Uplighter',
    descriptionAr: 'إضاءة LED ملونة قابلة للتحكم عن بعد لتلوين المساحة',
    descriptionEn: 'Remote-controlled color LED uplighter for ambient lighting',
    rentalPricePerDay: 3.0,
    securityDeposit: 8.0,
    images: ['/products/led-uplighter.png', '/products/industrial-pendant-light.png', '/products/gold-floor-lamp.png'],
    stock: 60,
    categorySlug: 'lighting',
  },
  {
    slug: 'industrial-pendant-light',
    brand: 'LUT',
    nameAr: 'إنارة معلقة صناعية',
    nameEn: 'Industrial Pendant Light',
    descriptionAr: 'إنارة معلقة بتصميم صناعي عصري، مثالية للمساحات المفتوحة',
    descriptionEn: 'Pendant light with modern industrial design, perfect for open spaces',
    rentalPricePerDay: 4.5,
    securityDeposit: 14.0,
    images: ['/products/industrial-pendant-light.png', '/products/gold-floor-lamp.png', '/products/led-uplighter.png'],
    stock: 35,
    categorySlug: 'lighting',
  },
  {
    slug: 'brass-lantern',
    brand: 'LUT',
    nameAr: 'فانوس نحاسي',
    nameEn: 'Brass Lantern',
    descriptionAr: 'فانوس نحاسي كلاسيكي بلمسة تراثية، مثالي للفعاليات الرمضانية والأعراس',
    descriptionEn: 'Classic brass lantern with heritage touch, ideal for Ramadan events and weddings',
    rentalPricePerDay: 6.0,
    securityDeposit: 18.0,
    images: ['/products/brass-lantern.png', '/products/crystal-chandelier.png', '/products/industrial-pendant-light.png'],
    stock: 45,
    categorySlug: 'lighting',
  },
  {
    slug: 'gold-floor-lamp',
    brand: 'LUT',
    nameAr: 'أباجورة ذهبية أرضية',
    nameEn: 'Gold Floor Lamp',
    descriptionAr: 'أباجورة أرضية بقاعدة ذهبية وإضاءة دافئة، لمسة فخامة لأي ركن',
    descriptionEn: 'Floor lamp with gold base and warm light, a touch of luxury for any corner',
    rentalPricePerDay: 5.0,
    securityDeposit: 16.0,
    images: ['/products/gold-floor-lamp.png', '/products/industrial-pendant-light.png', '/products/brass-lantern.png'],
    model3dUrl: 'procedural-lamp',
    stock: 18,
    categorySlug: 'lighting',
  },
  // ---- LA_LOUNGE (4)
  {
    slug: 'gold-chiavari-chair',
    brand: 'LA_LOUNGE',
    nameAr: 'كرسي كيافاري ذهبي',
    nameEn: 'Gold Chiavari Chair',
    descriptionAr: 'كرسي كيافاري ذهبي أنيق للفعاليات والحفلات',
    descriptionEn: 'Elegant gold Chiavari chair for events and weddings',
    rentalPricePerDay: 8,
    securityDeposit: 20,
    images: ['/products/lalounge_modern.webp', '/products/birthday_atelier.webp'],
    stock: 100,
    categorySlug: 'event-furniture',
  },
  {
    slug: 'cocktail-table',
    brand: 'LA_LOUNGE',
    nameAr: 'طاولة كوكتيل',
    nameEn: 'Cocktail Table',
    descriptionAr: 'طاولة كوكتيل عصرية للفعاليات',
    descriptionEn: 'Modern cocktail table for events',
    rentalPricePerDay: 15,
    securityDeposit: 40,
    images: ['/products/lalounge_modern.webp', '/products/birthday_atelier.webp'],
    stock: 30,
    categorySlug: 'event-furniture',
  },
  {
    slug: 'luxury-sofa-set',
    brand: 'LA_LOUNGE',
    nameAr: 'طقم أرائك فاخر',
    nameEn: 'Luxury Sofa Set',
    descriptionAr: 'طقم أرائك فاخر للمناطق VIP في الفعاليات',
    descriptionEn: 'Luxury sofa set for VIP areas at events',
    rentalPricePerDay: 45,
    securityDeposit: 100,
    images: ['/products/lalounge_modern.webp', '/products/birthday_atelier.webp'],
    stock: 10,
    categorySlug: 'event-furniture',
  },
  {
    slug: 'red-carpet',
    brand: 'LA_LOUNGE',
    nameAr: 'سجادة حمراء',
    nameEn: 'Red Carpet',
    descriptionAr: 'سجادة حمراء فاخرة للفعاليات',
    descriptionEn: 'Luxury red carpet for events',
    rentalPricePerDay: 25,
    securityDeposit: 50,
    images: ['/products/lalounge_modern.webp', '/products/birthday_atelier.webp'],
    stock: 5,
    categorySlug: 'events',
  },
  // ---- YOUR_BIRTHDAY (2)
  {
    slug: 'balloon-arch',
    brand: 'YOUR_BIRTHDAY',
    nameAr: 'قوس بالونات عضوي',
    nameEn: 'Organic Balloon Arch',
    descriptionAr: 'قوس بالونات عضوي لحفلات أعياد الميلاد',
    descriptionEn: 'Organic balloon arch for birthday parties',
    rentalPricePerDay: 50,
    securityDeposit: 100,
    images: ['/products/birthday_atelier.webp', '/products/lalounge_modern.webp'],
    stock: 20,
    categorySlug: 'decor',
  },
  {
    slug: 'led-dance-floor',
    brand: 'YOUR_BIRTHDAY',
    nameAr: 'رقصة LED مضيئة',
    nameEn: 'LED Dance Floor',
    descriptionAr: 'رقصة LED ملونة لحفلات أعياد الميلاد',
    descriptionEn: 'Colored LED dance floor for birthday parties',
    rentalPricePerDay: 80,
    securityDeposit: 200,
    images: ['/products/birthday_atelier.webp', '/products/lalounge_modern.webp'],
    stock: 5,
    categorySlug: 'decor',
  },
]

// ===== Demo contact messages (3 — one per brand, all unread) =====

type MessageRow = {
  name: string
  email: string
  phone?: string
  subject: string
  message: string
  brand: string
}

const messages: MessageRow[] = [
  {
    name: 'سارة',
    email: 'sara@example.com',
    phone: '+965 98765432',
    subject: 'استفسار عن تأجير كراسي',
    message: 'أرغب في استئجار 100 كرسي شيفاري ذهبي لحفل زفاف نهاية الشهر القادم',
    brand: 'LUT',
  },
  {
    name: 'خالد المطيري',
    email: 'khaled@example.com',
    subject: 'استفسار عن تصنيع أثاث مخصص',
    message: 'أرغب بمعرفة تفاصيل تصنيع أثاث مخصص لمنطقة VIP في قاعة أفراح في حولي.',
    brand: 'LA_LOUNGE',
  },
  {
    name: 'سارة المطيري',
    email: 'sara@example.com',
    phone: '9650000000',
    subject: 'استفسار عن باقة عيد ميلاد',
    message: 'أرغب بمعرفة تفاصيل الباقات المتوفرة لحفل عيد ميلاد مفاجأة لزوجي في السالمية نهاية الشهر',
    brand: 'YOUR_BIRTHDAY',
  },
]

// ===== Demo bookings (4 — one per status, always-future windows) =====
// Dates are relative to the seed run (UTC midnight-anchored) so no row can
// ever be a stale past-PENDING booking; totals mirror the server formula.

type BookingRow = {
  brand: string
  productSlug?: string
  startInDays: number
  endInDays: number
  status: string
  customerName: string
  customerPhone: string
  customerEmail: string
  quantity: number
  totalAmount: number
  address?: string
  city?: string
  notes?: string
  createdDaysAgo: number
}

const bookings: BookingRow[] = [
  {
    brand: 'LUT',
    productSlug: 'louis-ghost-chair',
    startInDays: 14,
    endInDays: 17,
    status: 'PENDING',
    customerName: 'عبدالله الأحمد',
    customerPhone: '+965 99887766',
    customerEmail: 'abdullah@example.com',
    quantity: 2,
    totalAmount: 60.0, // 5.0 × 3 days × 2 + 15.0 × 2
    address: 'شارع الخليج، منطقة الشرق، بناية 12',
    city: 'الكويت',
    createdDaysAgo: 3,
  },
  {
    brand: 'LA_LOUNGE',
    productSlug: 'red-carpet',
    startInDays: 7,
    endInDays: 14,
    status: 'CONFIRMED',
    customerName: 'أحمد الكندي',
    customerPhone: '96612345',
    customerEmail: 'ahmed.kuwait@example.com',
    quantity: 1,
    totalAmount: 225.0, // 25.0 × 7 days × 1 + 50.0 × 1
    address: 'منطقة السالمية، شارع 5، منزل 12',
    city: 'الكويت',
    createdDaysAgo: 2,
  },
  {
    brand: 'LUT',
    productSlug: 'louis-ghost-chair',
    startInDays: 21,
    endInDays: 23,
    status: 'CANCELLED',
    customerName: 'محمد أحمد التجريبي',
    customerPhone: '96512345678',
    customerEmail: 'test@example.com',
    quantity: 1,
    totalAmount: 25.0, // 5.0 × 2 days × 1 + 15.0 × 1
    address: 'شارع الخليج برج الفيصلية الدور 12',
    city: 'الكويت',
    createdDaysAgo: 5,
  },
  {
    // Birthday package request: no product, coordinator quotes (total 0).
    brand: 'YOUR_BIRTHDAY',
    startInDays: 10,
    endInDays: 11,
    status: 'PENDING',
    customerName: 'نورة العنزي',
    customerPhone: '96555123456',
    customerEmail: 'noura@example.com',
    quantity: 1,
    totalAmount: 0.0,
    notes: 'الباقة: احجز الباقة الفاخرة — الموقع: السالمية',
    createdDaysAgo: 1,
  },
]

async function main() {
  console.log('🌱 Starting seed...')

  // --- Idempotency: clear seeded tables (children first). SecurityLog is
  // runtime audit data and is intentionally left untouched.
  await prisma.booking.deleteMany()
  await prisma.contactMessage.deleteMany()
  await prisma.product.deleteMany()
  await prisma.category.deleteMany()

  // --- Categories, in fixed order; keep the id map for products.
  const categoryIds = new Map<string, string>()
  for (const c of categories) {
    const created = await prisma.category.create({
      data: { slug: c.slug, brand: c.brand, nameAr: c.nameAr, nameEn: c.nameEn },
    })
    categoryIds.set(`${c.brand}:${c.slug}`, created.id)
  }
  console.log('✅ Categories created:', categories.length)

  // --- Products, in fixed order; keep the id map for demo bookings.
  const productIds = new Map<string, string>()
  for (const p of products) {
    const categoryId = categoryIds.get(`${p.brand}:${p.categorySlug}`)
    if (!categoryId) throw new Error(`seed: unknown category ${p.brand}:${p.categorySlug}`)
    const created = await prisma.product.create({
      data: {
        slug: p.slug,
        brand: p.brand,
        nameAr: p.nameAr,
        nameEn: p.nameEn,
        descriptionAr: p.descriptionAr,
        descriptionEn: p.descriptionEn,
        rentalPricePerDay: p.rentalPricePerDay,
        securityDeposit: p.securityDeposit,
        images: JSON.stringify(p.images),
        model3dUrl: p.model3dUrl ?? null,
        stock: p.stock,
        categoryId,
      },
    })
    productIds.set(`${p.brand}:${p.slug}`, created.id)
  }
  console.log('✅ Products created:', products.length)

  // --- Demo contact messages.
  await prisma.contactMessage.createMany({
    data: messages.map((m) => ({
      name: m.name,
      email: m.email,
      phone: m.phone ?? null,
      subject: m.subject,
      message: m.message,
      brand: m.brand,
    })),
  })
  console.log('✅ Contact messages created:', messages.length)

  // --- Demo bookings (future windows, staggered createdAt for last7 stats).
  for (const b of bookings) {
    const productId = b.productSlug
      ? (productIds.get(`${b.brand}:${b.productSlug}`) ?? null)
      : null
    if (b.productSlug && !productId) {
      throw new Error(`seed: unknown product ${b.brand}:${b.productSlug}`)
    }
    await prisma.booking.create({
      data: {
        brand: b.brand,
        productId,
        startDate: utcDaysFromToday(b.startInDays),
        endDate: utcDaysFromToday(b.endInDays),
        status: b.status,
        customerName: b.customerName,
        customerPhone: b.customerPhone,
        customerEmail: b.customerEmail,
        quantity: b.quantity,
        totalAmount: b.totalAmount,
        address: b.address ?? null,
        city: b.city ?? null,
        notes: b.notes ?? null,
        createdAt: utcDaysFromToday(-b.createdDaysAgo),
      },
    })
  }
  console.log('✅ Demo bookings created:', bookings.length)
  console.log('🌱 Seed completed!')
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
