/**
 * Shared product catalog — mirrors the original project's seed data
 * (15 LUT pieces: 5 chairs / 5 tables / 5 lighting) with KWD pricing.
 * Served via /api/products and imported by the storefront section.
 */

export type ProductCategory = "chairs" | "tables" | "lighting";

export interface Product {
  id: string;
  slug: string;
  nameAr: string;
  nameEn: string;
  descriptionAr: string;
  descriptionEn: string;
  rentalPricePerDay: number;
  securityDeposit: number;
  image: string;
  category: ProductCategory;
  stock: number;
  is3d: boolean;
}

export const PRODUCTS: Product[] = [
  // ===== Chairs (5) =====
  {
    id: "p1",
    slug: "louis-ghost-chair",
    nameAr: "كرسي لويس غوست",
    nameEn: "Louis Ghost Chair",
    descriptionAr:
      "كرسي شفاف أنيق من تصميم فيليب ستارك، مثالي للفعاليات الفاخرة — شفافيته تمنح المساحة اتساعاً وذوقاً لا يُضاهى.",
    descriptionEn:
      "Elegant transparent chair designed by Philippe Starck, perfect for luxury events — its clarity lends the space unmatched breadth and taste.",
    rentalPricePerDay: 5,
    securityDeposit: 15,
    image: "/products/louis-ghost-chair.png",
    category: "chairs",
    stock: 50,
    is3d: true,
  },
  {
    id: "p2",
    slug: "chivari-chair-gold",
    nameAr: "كرسي شيافاري ذهبي",
    nameEn: "Chivari Chair Gold",
    descriptionAr:
      "كرسي شيافاري ذهبي كلاسيكي للمناسبات الرسمية والأعراس — الأيقونة الذهبية لطاولات العروس.",
    descriptionEn:
      "Classic gold Chivari chair for formal events and weddings — the golden icon of head tables.",
    rentalPricePerDay: 3.5,
    securityDeposit: 10,
    image: "/products/chivari-chair-gold.png",
    category: "chairs",
    stock: 100,
    is3d: false,
  },
  {
    id: "p3",
    slug: "tiffany-chair-crystal",
    nameAr: "كرسي تيفاني كريستال",
    nameEn: "Tiffany Chair Crystal",
    descriptionAr:
      "كرسي تيفاني شفاف بإطار فولاذي مقاوم للصدأ، أناقة عصرية تناسب حفلات الكوكتيل والاستقبالات.",
    descriptionEn:
      "Transparent Tiffany chair with stainless steel frame, modern elegance for cocktail receptions.",
    rentalPricePerDay: 4,
    securityDeposit: 12,
    image: "/products/tiffany-chair-crystal.png",
    category: "chairs",
    stock: 80,
    is3d: true,
  },
  {
    id: "p4",
    slug: "monet-armchair",
    nameAr: "كرسي مونيه بذراعين",
    nameEn: "Monet Armchair",
    descriptionAr:
      "كرسي بذراعين بتصميم كلاسيكي وتنجيد فاخر بلون كريمي — قطعة الديكور التي تُكمل جلسات الضيافة الراقية.",
    descriptionEn:
      "Classic armchair with luxury cream upholstery — the décor piece that completes refined lounges.",
    rentalPricePerDay: 6.5,
    securityDeposit: 20,
    image: "/products/monet-armchair.png",
    category: "chairs",
    stock: 30,
    is3d: false,
  },
  {
    id: "p5",
    slug: "bombon-chair-velvet",
    nameAr: "كرسي بومبون مخمل",
    nameEn: "Bombon Velvet Chair",
    descriptionAr:
      "كرسي بومبون بقماش مخمل فاخر متوفر بألوان متعددة — لمسة دفء وملمس ملكي لجلسات المداخل.",
    descriptionEn:
      "Bombon chair in luxurious velvet, multiple colours — royal warmth for entrance settings.",
    rentalPricePerDay: 5.5,
    securityDeposit: 18,
    image: "/products/bombon-chair-velvet.png",
    category: "chairs",
    stock: 0,
    is3d: false,
  },
  // ===== Tables (5) =====
  {
    id: "p6",
    slug: "round-banquet-table",
    nameAr: "طاولة بنكيت دائرية",
    nameEn: "Round Banquet Table",
    descriptionAr:
      "طاولة دائرية كبيرة تتسع لعشرة أشخاص، مثالية للعشاء الرسمي — قلب صالة الولائم.",
    descriptionEn:
      "Large round table seating ten, ideal for formal dinners — the heart of the banquet hall.",
    rentalPricePerDay: 8,
    securityDeposit: 25,
    image: "/products/round-banquet-table.png",
    category: "tables",
    stock: 20,
    is3d: true,
  },
  {
    id: "p7",
    slug: "cocktail-highboy-table",
    nameAr: "طاولة كوكتيل عالية",
    nameEn: "Cocktail Highboy Table",
    descriptionAr:
      "طاولة كوكتيل عالية أنيقة للحفلات والاستقبالات — رفيقة وقوف الضيوف وكؤوس الترحيب.",
    descriptionEn:
      "Elegant cocktail highboy for parties and receptions — companion to standing guests and welcome drinks.",
    rentalPricePerDay: 4,
    securityDeposit: 12,
    image: "/products/cocktail-highboy-table.png",
    category: "tables",
    stock: 40,
    is3d: false,
  },
  {
    id: "p8",
    slug: "marble-coffee-table",
    nameAr: "طاولة قهوة رخامية",
    nameEn: "Marble Coffee Table",
    descriptionAr:
      "طاولة قهوة بسطح رخامي فاخر وقاعدة ذهبية، لمسة فخامة تلفت الأنظار في كل جلسة.",
    descriptionEn:
      "Coffee table with luxury marble top and gold base — an eye-catching touch in every lounge.",
    rentalPricePerDay: 7,
    securityDeposit: 22,
    image: "/products/marble-coffee-table.png",
    category: "tables",
    stock: 15,
    is3d: true,
  },
  {
    id: "p9",
    slug: "dining-table-12-seater",
    nameAr: "طاولة طعام ١٢ شخصاً",
    nameEn: "Dining Table 12 Seater",
    descriptionAr:
      "طاولة طعام طويلة تتسع لاثني عشر شخصاً، مثالية للعزائم الكبيرة وجلسات العائلة الممتدة.",
    descriptionEn:
      "Long dining table seating twelve, perfect for large gatherings and extended family evenings.",
    rentalPricePerDay: 12,
    securityDeposit: 35,
    image: "/products/dining-table-12-seater.png",
    category: "tables",
    stock: 10,
    is3d: false,
  },
  {
    id: "p10",
    slug: "gold-side-table",
    nameAr: "طاولة جانبية ذهبية",
    nameEn: "Gold Side Table",
    descriptionAr:
      "طاولة جانبية صغيرة بإطار ذهبي لامع، قطعة ديكور أنيقة بجانب الأرائك والمداخل.",
    descriptionEn:
      "Small side table with polished gold frame, an elegant accent beside sofas and entrances.",
    rentalPricePerDay: 3.5,
    securityDeposit: 10,
    image: "/products/gold-side-table.png",
    category: "tables",
    stock: 25,
    is3d: false,
  },
  // ===== Lighting (5) =====
  {
    id: "p11",
    slug: "crystal-chandelier",
    nameAr: "ثريا كريستال",
    nameEn: "Crystal Chandelier",
    descriptionAr:
      "ثريا كريستال فاخرة تضيف لمسة ملكية لأي فعالية — نجمة قاعة الرقص بلا منازع.",
    descriptionEn:
      "Luxury crystal chandelier adding a royal touch to any event — the undisputed star of the ballroom.",
    rentalPricePerDay: 15,
    securityDeposit: 50,
    image: "/products/crystal-chandelier.png",
    category: "lighting",
    stock: 8,
    is3d: true,
  },
  {
    id: "p12",
    slug: "led-uplighter",
    nameAr: "إضاءة LED ملونة",
    nameEn: "LED Uplighter",
    descriptionAr:
      "إضاءة LED ملونة قابلة للتحكم عن بعد لتلوين الجدران والأعمدة بست عشرة ألف لون.",
    descriptionEn:
      "Remote-controlled colour LED uplighters for washing walls and columns in sixteen thousand hues.",
    rentalPricePerDay: 3,
    securityDeposit: 8,
    image: "/products/led-uplighter.png",
    category: "lighting",
    stock: 60,
    is3d: false,
  },
  {
    id: "p13",
    slug: "industrial-pendant-light",
    nameAr: "إنارة معلقة صناعية",
    nameEn: "Industrial Pendant Light",
    descriptionAr:
      "إنارة معلقة بتصميم صناعي عصري، مثالية للمساحات المفتوحة وفعاليات الطابع العصري.",
    descriptionEn:
      "Pendant light with modern industrial design, perfect for open spaces and contemporary events.",
    rentalPricePerDay: 4.5,
    securityDeposit: 14,
    image: "/products/industrial-pendant-light.png",
    category: "lighting",
    stock: 35,
    is3d: false,
  },
  {
    id: "p14",
    slug: "brass-lantern",
    nameAr: "فانوس نحاسي",
    nameEn: "Brass Lantern",
    descriptionAr:
      "فانوس نحاسي كلاسيكي بلمسة تراثية، مثالي للفعاليات الرمضانية والأعراس الشعبية.",
    descriptionEn:
      "Classic brass lantern with a heritage touch, ideal for Ramadan events and traditional weddings.",
    rentalPricePerDay: 6,
    securityDeposit: 18,
    image: "/products/brass-lantern.png",
    category: "lighting",
    stock: 45,
    is3d: false,
  },
  {
    id: "p15",
    slug: "gold-floor-lamp",
    nameAr: "أباجورة ذهبية أرضية",
    nameEn: "Gold Floor Lamp",
    descriptionAr:
      "أباجورة أرضية بقاعدة ذهبية وإضاءة دافئة، لمسة فخامة لأركان الجلسات ومناطق الاسترخاء.",
    descriptionEn:
      "Floor lamp with gold base and warm light, a touch of luxury for lounge corners.",
    rentalPricePerDay: 5,
    securityDeposit: 16,
    image: "/products/gold-floor-lamp.png",
    category: "lighting",
    stock: 18,
    is3d: true,
  },
];

export const CATEGORY_LABELS: Record<ProductCategory, { ar: string; en: string }> = {
  chairs: { ar: "كراسي", en: "Chairs" },
  tables: { ar: "طاولات", en: "Tables" },
  lighting: { ar: "إضاءة", en: "Lighting" },
};

export const CONTACT_INFO = {
  phone: "+965 9726 2611",
  whatsapp: "96597262611",
  email: "info@lastuniquetouch.com",
  instagram: "https://instagram.com/last.unique.touch",
  addressAr: "الكويت",
  addressEn: "Kuwait",
};
