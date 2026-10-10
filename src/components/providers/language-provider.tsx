"use client";

import {
  createContext,
  useContext,
  useEffect,
  useCallback,
  useSyncExternalStore,
  type ReactNode,
} from "react";

export type Locale = "ar" | "en";

/**
 * Dual-language dictionary. Default locale is Arabic (RTL) because the
 * audience of Last Unique Touch is Kuwaiti. Switching toggles <html dir>.
 */
const dict = {
  ar: {
    dir: "rtl" as const,
    nav: {
      home: "الرئيسية",
      brands: "علاماتنا",
      products: "المقتنيات",
      experience: "التجربة",
      testimonials: "شهادات العملاء",
      contact: "تواصل",
      cta: "احجز استشارة",
    },
    hero: {
      eyebrow: "منصة كويتية · تأجير فاخر",
      titleA: "أناقةٌ تُلبَس",
      titleB: "المناسباتُ",
      titleC: "بِلمسةٍ واحدة",
      rotating: ["فاخرة", "استثنائية", "خالدة", "مُتقَنة"],
      subtitle:
        "ثلاث علاماتٍ تجمعها رؤية واحدة — أن يبدو حدثُك كما لو خُلِق ليُروى. اكتشف تشكيلة الأثاث والإضاءة والتصميم التي تحوّل المساحات إلى ذكريات.",
      ctaPrimary: "استكشف المقتنيات",
      ctaSecondary: "تعرّف على علاماتنا",
      scroll: "مرّر للاستكشاف",
      latinMark: "Est. Kuwait — Couture Rental Atelier",
    },
    marquee: [
      "أثاثٌ فاخر",
      "إضاءةٌ ساحرة",
      "فعالياتٌ لا تُنسى",
      "تخطيطٌ مُتقَن",
      "ذوقٌ استثنائي",
      "خدمةٌ راقية",
      "Since 2019",
    ],
    brands: {
      eyebrow: "علاماتنا الثلاث",
      title: "اختر تجربتك",
      subtitle: "ثلاث علاماتٍ · رحلةٌ واحدة · لمسةٌ أخيرة فريدة",
      lut: {
        index: "٠١",
        name: "Last Unique Touch",
        nameAr: "اللمسة الأخيرة الفريدة",
        category: "تأجير الأثاث الفاخر",
        desc: "تشكيلة منتقاة من الكراسي والطاولات والإضاءة الفاخرة — أكثر من 500 قطعة ترفع أي فعالية من عادية إلى استثنائية.",
        cta: "استكشف التشكيلة",
      },
      lalounge: {
        index: "٠٢",
        name: "La Lounge",
        nameAr: "لا لاونج",
        category: "تخطيط وإنتاج الفعاليات",
        desc: "متخصصو تصور وتنفيذ الفعاليات من الفكرة حتى الستارة الأخيرة — تصميم مساحات، إضاءة سينمائية، وإخراج متكامل.",
        cta: "ابدأ فعاليتك",
      },
      birthday: {
        index: "٠٣",
        name: "Your Birthday",
        nameAr: "عيد ميلادك",
        category: "حفلات وأعياد الميلاد",
        desc: "خبراء تحويل أعياد الميلاد إلى حكايات — بالونات وباكجات مخصصة وتفاصيل مرحة تجعل يومهم أسطورياً.",
        cta: "احتفل معنا",
      },
    },
    stats: [
      { value: 500, suffix: "+", label: "قطعة فاخرة" },
      { value: 350, suffix: "+", label: "فعالية ناجحة" },
      { value: 6, suffix: " سنوات", label: "من الإتقان" },
      { value: 98, suffix: "%", label: "رضا العملاء" },
    ],
    products: {
      eyebrow: "المقتنيات المنتقاة",
      title: "ذخيرة الأناقة",
      subtitle: "قطعٌ انتقاها خبراؤنا لتصنع الفرق — باليوم أو بالأسبوع",
      categories: {
        all: "الكل",
        chairs: "كراسي",
        tables: "طاولات",
        lighting: "إضاءة",
      },
      perDay: "د.ك / اليوم",
      deposit: "تأمين {amount} د.ك",
      quickView: "نظرة سريعة",
      rent: "استأجر الآن",
      outOfStock: "نافد حالياً",
      stock: "متوفر {count} قطعة",
      viewAll: "عرض الكل",
    },
    features: {
      eyebrow: "لماذا اللمسة الأخيرة؟",
      title: "التفاصيل التي لا تُشترى",
      subtitle: "أربع ركائز نبني عليها كل فعالية",
      items: [
        {
          title: "تشكيلة حُرّة",
          desc: "أكثر من 500 قطعة فاخرة منتقاة بعناية من مصادر عالمية — من كراسي لويس الشفافة إلى ثريات الكريستال.",
        },
        {
          title: "حجزٌ مرن",
          desc: "احجز باليوم أو بالأسبوع أو الشهر — أسعار شفافة والتأمين يُسترد كاملاً بعد الإرجاع.",
        },
        {
          title: "توصيلٌ وتركيب",
          desc: "فريق توصيل وتركيب احترافي يغطي جميع مناطق الكويت، مع تجهيز مسبق للموقع قبل الحدث.",
        },
        {
          title: "عرض ثلاثي الأبعاد",
          desc: "شاهد كل قطعة من كل الزوايا قبل الحجز — وخطّط مساحتك بمعاينة رقمية دقيقة.",
        },
      ],
    },
    journey: {
      eyebrow: "رحلة الحدث",
      title: "من الفكرة إلى الستارة",
      subtitle: "أربع مراحل مصممة لتريحك وتُبهر ضيوفك",
      steps: [
        {
          title: "الاستشارة",
          desc: "نستمع لرؤيتك ونفهم طابع مناسبتك وعدد الضيوف والميزانية — أول شاي علينا.",
        },
        {
          title: "التصميم والاختيار",
          desc: "نرتّب لك لوحة مفاهيم ثلاثية الأبعاد وتشكيلة مخصصة من المقتنيات بأسعار واضحة.",
        },
        {
          title: "التنفيذ والتركيب",
          desc: "فريقنا يوصل ويركّب وينسّق كل قطعة في موقعك قبل الحدث بساعات — بدون أن ترفع إصبعاً.",
        },
        {
          title: "اللمسة الأخيرة",
          desc: "جولة نهائية معك، إضاءة تُضبط على مزاجك، ثم نفكّ كل شيء بهدوء بعد انتهاء الليل.",
        },
      ],
    },
    testimonials: {
      eyebrow: "شهادات العملاء",
      title: "قالوا عن لمستنا",
      items: [
        {
          quote:
            "حوّلوا قاعة عادية إلى حفل يليق بالمجلات. الكراسي الشفافة مع الإضاءة الذهبية كانت حديث الضيوف طوال الليل.",
          name: "نورة العتيبي",
          role: "حفل زفاف — يناير",
        },
        {
          quote:
            "التعامل راقٍ من أول رسالة. وصلوا قبل الموعد، ركّبوا كل شيء بإتقان، والتأمين رجع كاملاً بعد يومين.",
          name: "عبدالله الرشيد",
          role: "مؤتمر شركة — مارس",
        },
        {
          quote:
            "باقة عيد الميلاد كانت أحلى من الصور. بناتي ما زلن يتحدثن عنها بعد شهر! لمسة عيد الميلاد فريدة فعلاً.",
          name: "مريم الصباح",
          role: "عيد ميلاد — مايو",
        },
        {
          quote:
            "استأجرت طاولة الطعام والثريا لعزيمة العائلة. وصل كل شيء نظيفاً ومغلفاً كأنه جديد. احترافية نادرة.",
          name: "فهد المطيري",
          role: "عزيمة عائلية — نوفمبر",
        },
      ],
    },
    cta: {
      eyebrow: "الخطوة الأولى",
      title: "جاهزٌ لحدثك القادم؟",
      subtitle:
        "أخبرنا عن مناسبتك وسنعود إليك خلال ساعة بخطةٍ وميزانية تناسبك",
      name: "الاسم الكامل",
      namePh: "مثال: نورة العتيبي",
      phone: "رقم الهاتف",
      phonePh: "+965 1234 5678",
      eventType: "نوع المناسبة",
      eventTypes: ["حفل زفاف", "خطوبة", "عيد ميلاد", "فعالية شركة", "عزيمة", "أخرى"],
      brand: "العلامة المفضلة",
      brands: ["Last Unique Touch", "La Lounge", "Your Birthday"],
      message: "حدثنا عن مناسبتك",
      messagePh: "التاريخ التقريبي، عدد الضيوف، الأفكار...",
      submit: "أرسل الطلب",
      submitting: "جارٍ الإرسال...",
      success: "وصلنا طلبك! سنتواصل معك خلال ساعة.",
      error: "تعذّر الإرسال — جرّب مرة أخرى أو راسلنا على واتساب.",
    },
    footer: {
      tagline: "منصة تأجير الأثاث ومعدات الفعاليات الفاخرة — الكويت",
      explore: "استكشف",
      brands: "العلامات",
      contact: "تواصل",
      rights: "© {year} اللمسة الأخيرة الفريدة — جميع الحقوق محفوظة",
      crafted: "صُنع بشغفٍ في الكويت",
      whatsapp: "راسلنا واتساب",
    },
    whatsapp: "تواصل واتساب",
    loading: "جارٍ التحميل...",
  },
  en: {
    dir: "ltr" as const,
    nav: {
      home: "Home",
      brands: "Brands",
      products: "Collection",
      experience: "Experience",
      testimonials: "Testimonials",
      contact: "Contact",
      cta: "Book a Consultation",
    },
    hero: {
      eyebrow: "Kuwaiti Platform · Luxury Rental",
      titleA: "Elegance",
      titleB: "Your Events",
      titleC: "Deserve",
      rotating: ["luxury", "the extraordinary", "timelessness", "craft"],
      subtitle:
        "Three brands, one vision — your event should feel written to be remembered. Explore the furniture, lighting and design that turn spaces into memories.",
      ctaPrimary: "Explore the Collection",
      ctaSecondary: "Meet Our Brands",
      scroll: "Scroll to explore",
      latinMark: "Est. Kuwait — Couture Rental Atelier",
    },
    marquee: [
      "Luxury furniture",
      "Enchanting lighting",
      "Unforgettable events",
      "Meticulous planning",
      "Exceptional taste",
      "Refined service",
      "Since 2019",
    ],
    brands: {
      eyebrow: "Our Three Houses",
      title: "Choose Your Experience",
      subtitle: "Three brands · one journey · one last unique touch",
      lut: {
        index: "01",
        name: "Last Unique Touch",
        nameAr: "",
        category: "Luxury Furniture Rental",
        desc: "A curated collection of chairs, tables and statement lighting — 500+ pieces that lift any event from ordinary to extraordinary.",
        cta: "Explore the Collection",
      },
      lalounge: {
        index: "02",
        name: "La Lounge",
        nameAr: "",
        category: "Event Planning & Production",
        desc: "Specialists in concepting and producing events from idea to final curtain — spatial design, cinematic lighting, full direction.",
        cta: "Start Your Event",
      },
      birthday: {
        index: "03",
        name: "Your Birthday",
        nameAr: "",
        category: "Parties & Birthdays",
        desc: "Experts at turning birthdays into legends — bespoke balloons, custom packages and playful details that make their day epic.",
        cta: "Celebrate With Us",
      },
    },
    stats: [
      { value: 500, suffix: "+", label: "luxury pieces" },
      { value: 350, suffix: "+", label: "successful events" },
      { value: 6, suffix: " yrs", label: "of craft" },
      { value: 98, suffix: "%", label: "client delight" },
    ],
    products: {
      eyebrow: "The Curated Collection",
      title: "An Armoury of Elegance",
      subtitle: "Pieces our experts chose to make the difference — by the day or the week",
      categories: { all: "All", chairs: "Chairs", tables: "Tables", lighting: "Lighting" },
      perDay: "KWD / day",
      deposit: "{amount} KWD deposit",
      quickView: "Quick view",
      rent: "Rent now",
      outOfStock: "Currently out",
      stock: "{count} in stock",
      viewAll: "View all",
    },
    features: {
      eyebrow: "Why the Last Unique Touch?",
      title: "Details Money Can't Buy",
      subtitle: "Four pillars behind every event we touch",
      items: [
        {
          title: "A Free-Spirited Collection",
          desc: "500+ luxury pieces curated from global sources — from Louis ghost chairs to crystal chandeliers.",
        },
        {
          title: "Flexible Booking",
          desc: "Rent by the day, week or month — transparent pricing with deposits fully refunded on return.",
        },
        {
          title: "Delivery & Install",
          desc: "A professional delivery and installation team covering all of Kuwait, staging your venue ahead of the event.",
        },
        {
          title: "3D Preview",
          desc: "See every piece from every angle before booking — and plan your space with precise digital previews.",
        },
      ],
    },
    journey: {
      eyebrow: "The Event Journey",
      title: "From Idea to Curtain",
      subtitle: "Four stages designed to relax you and dazzle your guests",
      steps: [
        {
          title: "Consultation",
          desc: "We listen to your vision — the mood, the guest count, the budget. First tea is on us.",
        },
        {
          title: "Design & Selection",
          desc: "You receive a 3D mood board and a bespoke collection shortlist with clear pricing.",
        },
        {
          title: "Delivery & Install",
          desc: "Our team delivers, installs and arranges every piece hours before the event — you lift nothing.",
        },
        {
          title: "The Final Touch",
          desc: "A final walk-through with you, lighting tuned to your mood, then a quiet teardown after the night.",
        },
      ],
    },
    testimonials: {
      eyebrow: "Client Voices",
      title: "What They Said",
      items: [
        {
          quote:
            "They turned an ordinary hall into a magazine-worthy wedding. The ghost chairs with golden lighting were all guests talked about.",
          name: "Noura Al-Otaibi",
          role: "Wedding — January",
        },
        {
          quote:
            "Refined from the first message. They arrived early, installed flawlessly, and the deposit was fully returned within two days.",
          name: "Abdullah Al-Rashid",
          role: "Corporate summit — March",
        },
        {
          quote:
            "The birthday package was more beautiful than the photos. My daughters still talk about it a month later!",
          name: "Mariam Al-Sabah",
          role: "Birthday — May",
        },
        {
          quote:
            "Rented the dining table and chandelier for a family dinner. Everything arrived clean and wrapped like new. Rare professionalism.",
          name: "Fahad Al-Mutairi",
          role: "Family dinner — November",
        },
      ],
    },
    cta: {
      eyebrow: "The First Step",
      title: "Ready for Your Next Event?",
      subtitle: "Tell us about your occasion and we'll return within the hour with a plan and a budget",
      name: "Full name",
      namePh: "e.g. Noura Al-Otaibi",
      phone: "Phone number",
      phonePh: "+965 1234 5678",
      eventType: "Event type",
      eventTypes: ["Wedding", "Engagement", "Birthday", "Corporate", "Dinner", "Other"],
      brand: "Preferred brand",
      brands: ["Last Unique Touch", "La Lounge", "Your Birthday"],
      message: "Tell us about your event",
      messagePh: "Approximate date, guests, ideas...",
      submit: "Send Request",
      submitting: "Sending...",
      success: "We received your request! We'll reach out within the hour.",
      error: "Could not send — try again or message us on WhatsApp.",
    },
    footer: {
      tagline: "The luxury furniture & event equipment rental platform — Kuwait",
      explore: "Explore",
      brands: "Brands",
      contact: "Contact",
      rights: "© {year} Last Unique Touch — All rights reserved",
      crafted: "Crafted with passion in Kuwait",
      whatsapp: "WhatsApp us",
    },
    whatsapp: "WhatsApp chat",
    loading: "Loading...",
  },
} as const;

export type Dict = (typeof dict)["ar"];

interface LanguageCtx {
  locale: Locale;
  t: Dict;
  toggle: () => void;
  setLocale: (l: Locale) => void;
}

const LanguageContext = createContext<LanguageCtx | null>(null);

/**
 * localStorage-backed locale store read via useSyncExternalStore —
 * the hydration-safe pattern for external browser state (server
 * snapshot is always "ar" so SSR markup stays stable, then the
 * client reconciles to the persisted preference after mount).
 */
const LOCALE_KEY = "lut-locale";
const listeners = new Set<() => void>();

function readLocale(): Locale {
  try {
    const v = window.localStorage.getItem(LOCALE_KEY);
    return v === "en" ? "en" : "ar";
  } catch {
    return "ar";
  }
}

function writeLocale(l: Locale) {
  try {
    window.localStorage.setItem(LOCALE_KEY, l);
  } catch {
    /* storage blocked — in-memory only */
  }
  listeners.forEach((fn) => fn());
}

function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const locale = useSyncExternalStore(
    subscribe,
    () => readLocale(),
    () => "ar" as Locale
  );

  // Keep <html lang/dir> synchronized with the active locale
  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = locale === "ar" ? "rtl" : "ltr";
  }, [locale]);

  const setLocale = useCallback((l: Locale) => writeLocale(l), []);
  const toggle = useCallback(
    () => writeLocale(locale === "ar" ? "en" : "ar"),
    [locale]
  );

  return (
    <LanguageContext.Provider
      value={{ locale, t: dict[locale] as Dict, toggle, setLocale }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
}
