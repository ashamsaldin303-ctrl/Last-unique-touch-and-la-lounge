# Task 8-b — La Lounge pages subagent

## Task
بناء صفحات La Lounge الخمس (landing / custom-furniture / event-planning / ready-plans / contact) داخل `/home/z/my-project/src/pages/`، بنفس بنية ومحتوى مستودع الأصل `/tmp/la-lounge-repo` مع تطوير بصري (شاركول داكن + ماجنتا #E6007E، بدون أزرق/إندیغو).

## Files written (all 'use client', default export, no props)
1. `src/pages/la-lounge.tsx` — hero blueprint بملء الشاشة (hero-bg-grid + orbs ماجنتا + SVG خطوط تُرسم نفسها عبر pathLength في framer-motion)، وسم العلامة ضخم font-display مع توهج ماجنتا للكلمة الأخيرة، أزرار btn-lux، تلميح تمرير ناطع، قسم خدمات 3 بطاقات glass-card lux-card مع ميداليات أيقونات ماجنتا (Armchair/ClipboardList/Sparkles) وقوائم أمثلة (نقاط ذهبية→ماجنتا) وأزرار "اعرف المزيد"، وCTA band → contact.
2. `src/pages/la-lounge-custom-furniture.tsx` — PageHeader + تايم‌لاين 5 خطوات (عقد مرقّمة ماجنتا موصولة بخط أفقي/رأسي يتحرك scaleX/scaleY عند الظهور، RTL-aware transformOrigin) + شبكة 6 بطاقات أمثلة بصور المنتجات الحقيقية (object-contain على خلفية drafting-board مع شبكة رفيعة + monogram رقمي) + CTA.
3. `src/pages/la-lounge-event-planning.tsx` — PageHeader + تايم‌لاين 5 مراحل + 3 بطاقات سيناريوهات برؤوس متدرجة ماجنتا وأيقونات watermark + عرض قبل/بعد (بطاقتان لكل زوج: "قبل" باهتة grayscale، "بينهما" سهم ماجنتا متحرك يهتز باتجاه القراءة، "بعد" بتوهج ماجنتا وظل rgba(230,0,126,0.35)) + CTA.
4. `src/pages/la-lounge-ready-plans.tsx` — PageHeader + 4 بطاقات خطط (رؤوس متدرجة كالأصل مع ميدالية أيقونة وprice badge، قائمة includes بأيقونات Check، صف priceLabel/price، زر طلب btn-lux). المصفوفات includes[4] تُحلّ مباشرة من `@/messages/{ar,en}.json` بمفتاح locale لأن `t()` يحوّل المصفوفات إلى JSON string.
5. `src/pages/la-lounge-contact.tsx` — نسخة La Lounge داكنة من تخطيط contact الأصلي (نموذج 2/3 + بطاقات معلومات 1/3): react-hook-form + zodResolver، POST /api/contact مع `brand:'LA_LOUNGE'`، خرائط أخطاء invalid_input/rate_limited/internal_error → contact.form.errors.*، صف الهاتف يُعرض فقط إذا خلا phoneValue من XXX (نفس قاعدة isRealNumber الأصلية)، روابط واتساب/إنستغرام، Toast عند النجاح.

## Decisions
- كل النصوص من `t()` فقط (laLounge.*/laLoungeCustomFurniture.*/laLoungeEventPlanning.*/laLoungeReadyPlans.*/contact.*/brandSelector.lalounge.name) — لا نصوص صلبة.
- ArrowIcon = ArrowLeft للعربية / ArrowRight للإنجليزية؛ الخصائص المنطقية (start/end، insetInlineStart) لكل الاتجاهات.
- الخطوط المتصلة للتايملاین: framer-motion whileInView مع transformOrigin حسب dir.
- حد أدنى 44px للأهداف (min-h-11/min-h-12)، aria-invalid/describedby/role=alert في النموذج، sr-only غير مطلوب للعلامات المرئية.
- لم أعدّل أي ملف غير ملفاتي الخمسة.

## Verification
- lint: نظيف لملفاتي (الأخطاء المتبقية في ملفات وكلاء آخرين: about/products/product-detail/birthday-products/rental-picker).
- GET / → 200، dev.log نظيف.
- اختبار متصفح (جلسة معزولة): الصفحات الخمس تُعرض بالعربية والإنجليزية، زر الميزات يُمرّر للخدمات (scrollY=836)، "Learn More" ينتقل للصفحة الصحيحة، صور الأمثلة الست 200، إرسال النموذج خزّن رسالة بـ brand=LA_LOUNGE في SQLite وظهرت حالة النجاح.
- خطأ Hydration واحد في Navbar المشترك (اختلاف SSR/hash-router) من بنية الوكيل 2 — خارج نطاق ملفاتي.
