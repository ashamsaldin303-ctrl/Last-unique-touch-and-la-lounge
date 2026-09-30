/**
 * Full-site design ERROR audit with VLM.
 * Usage: bun scripts/audit-vlm.mjs [pc|mobile]
 */
import ZAI from 'z-ai-web-dev-sdk'
import fs from 'fs'
import path from 'path'

const only = process.argv[2] || 'all'
const pageFilter = process.argv[3] || '' // optional page name filter
const base = '/home/z/my-project/screenshots/audit/run1'

const PAGE_CONTEXT = {
  'home': 'الصفحة الرئيسية — مُنتقي علامات فاخر فوق خلفية 3D كونية',
  'lut': 'صفحة علامة LUT (أثاث فاخر عاجي/ذهبي/أحمر)',
  'products': 'كتالوج منتجات LUT: بحث + ترتيب + حبوب تصنيفات + شبكة بطاقات + ترقيم',
  'detail-gold-floor-lamp': 'صفحة تفاصيل منتج "أباجورة ذهبية أرضية": مسار + معرض + معلومات + منتقي إيجار + شارات + مشابهة',
  'la-lounge': 'صفحة علامة La Lounge (ماجنتا #E6007E داكن فاخر)',
  'la-lounge-custom': 'صفحة أثاث مخصص La Lounge',
  'birthday': 'صفحة علامة Your Birthday (ذهبي #F5B914/بنفسجي)',
  'birthday-products': 'منتجات Your Birthday',
  'cart': 'سلة المشتريات',
  'checkout': 'صفحة الدفع/إتمام الطلب',
  'about': 'من نحن',
  'contact': 'اتصل بنا',
  'privacy': 'سياسة الخصوصية',
}

const PROMPT = (key, frame) => `أنت مدقق جودة تصميم (QA visual) من الطراز العالمي. راجع هذه اللقطة الكاملة لصفحة موقع عربي RTL فاخر لتأجير الأثاث (الكويت). الموقع يعمل، لكن المستخدم يقول أن فيه "أخطاء تصميم".

الصفحة: "${key}" — ${PAGE_CONTEXT[key] || ''} · الإطار: ${frame}

مهمتك: ابحث ONLY عن أخطاء تصميم حقيقية (BUGS) مرئية في الصورة، مثل:
1. تداخل عناصر فوق بعضها (overlap) أو نص مقصوص/مبتور (clipped text)
2. سوء محاذاة (misalignment) — عناصر ليست على خط واحد بلا سبب
3. تباعد غير متسق (مسافات مختلفة لنفس النوع من العناصر)
4. أخطاء RTL — نص/أيقونة/اتجاه سهم خاطئ الاتجاه
5. تباين ضعيف — نص يكاد يكون غير مقروء على خلفيته
6. مساحات ميتة/فارغة كبيرة بلا سبب أو عناصر "تائهة"
7. صور مشوهة/ممدودة أو مكسورة
8. أزرار/حبوب/شارات بحواف قاطعة أو غير متناسقة الأحجام
9. تضارب ألوان — لون دخيل على نظام الألوان (النظام: ذهبي/عاجي/داكن + أحمر LUT #E62129 + ماجنتا LaLounge #E6007E + ذهبي Birthday #F5B914 — الأزرق/البنفسجي الفاتح دخيل)
10. عناصر تبدو مقحمة أو عائمة بلا أساس بصري (ناقصة طبقة خلفية/حد)

أخرج النتيجة بهذا الشكل بالضبط:
## أخطاء مكتشفة
لكل خطأ:
- [شدة: عالية/متوسطة/منخفضة] (موقع تقريبي: أعلى/وسط/أسفل الصفحة + وصف المكان) الوصف الدقيق للخطأ — ما العنصر وما الخطأ وما الـ fix المقترح بجملة واحدة

إذا لم تجد أخطاء حقيقية في فئة ما، لا تذكرها. لا تخترع أخطاء (لا تدعي أخطاء RTL مثلاً إلا إن رأيت دليلاً واضحاً في الصورة). كن صارماً لكن صادقاً.

## الحكم
عدد الأخطاء حسب الشدة + سطر واحد عن الحالة العامة.`

async function vision(zai, prompt, img, tries = 5) {
  for (let i = 0; i < tries; i++) {
    try {
      return await zai.chat.completions.createVision({
        messages: [
          { role: 'user', content: [
            { type: 'text', text: prompt },
            { type: 'image_url', image_url: { url: `data:image/png;base64,${img}` } },
          ] },
        ],
        temperature: 0.2,
      })
    } catch (e) {
      if (String(e.message).includes('429') && i < tries - 1) {
        const wait = 15000 * (i + 1)
        console.log(`  429 — waiting ${wait / 1000}s...`)
        await new Promise((r) => setTimeout(r, wait))
        continue
      }
      throw e
    }
  }
}

async function main() {
  const zai = await ZAI.create()
  const dirs = only === 'all' ? ['pc', 'mobile'] : [only]
  for (const d of dirs) {
    const dir = path.join(base, d)
    if (!fs.existsSync(dir)) continue
    for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.png')).sort()) {
      const key = f.replace(/\.png$/, '')
      if (pageFilter && key !== pageFilter) continue
      const frame = d === 'pc' ? 'Desktop 1440px' : 'Mobile 375px'
      const img = fs.readFileSync(path.join(dir, f)).toString('base64')
      try {
        const res = await vision(zai, PROMPT(key, frame), img)
        const out = res.choices?.[0]?.message?.content || '(empty)'
        console.log(`\n${'='.repeat(70)}\n[${d}] ${key}\n${'='.repeat(70)}`)
        console.log(out)
        fs.appendFileSync('/home/z/my-project/screenshots/audit/vlm-errors.md',
          `\n\n# [${d}] ${key}\n\n${out}\n`)
      } catch (e) {
        console.error(`[${d}] ${key} FAILED: ${e.message}`)
      }
      await new Promise((r) => setTimeout(r, 6000)) // spacing to avoid 429
    }
  }
}
main()
