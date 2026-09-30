/**
 * Targeted VLM verification of specific suspected defects.
 */
import ZAI from 'z-ai-web-dev-sdk'
import fs from 'fs'

const PC = '/home/z/my-project/screenshots/pc'
const MO = '/home/z/my-project/screenshots/mobile'

const CHECKS = [
  { id: 'A-lalounge-contact-inputs', imgs: [`${MO}/la-lounge-contact-00.png`, `${MO}/la-lounge-contact-01.png`], q: 'Describe the contact form fields (الاسم الكامل، البريد الإلكتروني، رقم الهاتف، الموضوع، الرسالة). Are the input fields clearly VISIBLE with visible borders or background contrast against the page, or are they invisible/empty dark boxes with no visible boundary? Answer precisely: visible or invisible, and describe what you see for each field.' },
  { id: 'B-lalounge-testimonials', imgs: [`${PC}/la-lounge-03.png`, `${MO}/la-lounge-05.png`], q: 'Focus on the testimonials section (آراء العملاء). Is there a testimonial card with actual text, a customer name, and star rating visible? What is the large semi-transparent number (09/99) — part of a stats band, a watermark, or a broken element? Quote any visible testimonial text.' },
  { id: 'C-contact-map', imgs: [`${PC}/contact-01.png`, `${PC}/contact-02.png`], q: 'Look at the top portion of these screenshots. Is there a map embed or a large image? Does any element visually bleed off the left/top edge of the viewport, or is everything within the page container? Describe exactly what you see including what the grey/large rectangle is.' },
  { id: 'D-home-stats', imgs: [`${PC}/home-01.png`], q: 'Look at the statistics band (numbers like +500, +2000, 15, 5). Are the numbers and their labels readable with sufficient contrast? Quote the exact numbers and labels you see and rate readability 1-10.' },
  { id: 'E-lut-hero', imgs: [`${PC}/lut-00.png`], q: 'Transcribe EXACTLY the hero heading and the Arabic subheading below it, character by character. Is the Arabic subheading coherent and correctly rendered, or garbled?' },
  { id: 'F-birthday-hero', imgs: [`${MO}/birthday-00.png`], q: 'Transcribe EXACTLY the large hero heading. Is any part of the heading text visually cut off / clipped / truncated at the edges? Is it fully readable?' },
  { id: 'G-birthday-tilt-cards', imgs: [`${MO}/birthday-06.png`], q: 'Look at the product/showcase cards (e.g. titles like كراسي العرائس الملكية، قاعة الرقص المضيئة). Are the card titles fully visible within their cards, or are they clipped at the bottom edge of the card (cut-off Arabic letter descenders)? Answer per card.' },
  { id: 'H-checkout-success-rtl', imgs: [`${MO}/checkout-success-00.png`], q: 'In the list of actions (ماذا تريد أن تفعل الآن؟), where are the icons positioned relative to the text — on the right side of the text or on the left side? Is the text right-aligned (correct for Arabic RTL)? Describe the visual arrangement precisely.' },
  { id: 'I-refund-whitebox', imgs: [`${MO}/refund-06.png`], q: 'There is a white/light box in this screenshot. Is it a stuck modal/overlay covering content, or a normal content card that is part of the page layout? Describe its position, borders, and whether anything appears broken or stuck.' },
  { id: 'J-terms-homebtn', imgs: [`${MO}/terms-08.png`], q: 'Look for a home/back-to-home button (الرئيسية with a house icon) between the white content area and the dark footer. Does it look properly styled (bordered pill button) or broken/floating without context? Is there awkward excessive whitespace around it?' },
  { id: 'K-home-navbar', imgs: [`${MO}/home-00.png`], q: 'Transcribe EXACTLY the brand name / logo text in the top navigation bar, character by character. Also transcribe any other navbar items (menu labels, EN button).' },
  { id: 'L-lalounge-plans-gap', imgs: [`${PC}/la-lounge-plans-02.png`, `${PC}/la-lounge-plans-03.png`], q: 'Is there an excessive, unusual empty vertical gap (300px+) between the last plan cards and the next section/CTA? Or is the spacing normal and consistent with the rest of the page? Estimate the gap in pixels if unusual.' },
  { id: 'M-lalounge-event-badges', imgs: [`${MO}/la-lounge-event-01.png`], q: 'Look at the numbered circular badges (1,2,3,4,5) on the service cards. Do they overlap/hide any actual TEXT content of the cards, or do they sit on the card edge/corner decoratively? Does any text get cut off by the badges?' },
  { id: 'N-lut-contact-footer-link', imgs: [`${MO}/lut-contact-03.png`], q: 'In the footer, is the "Your Birthday" link text truncated/cut off (like "Your Bi..."), or fully visible? Is anything overlapping it?' },
]

async function main() {
  const zai = await ZAI.create()
  const only = process.argv[2] // optional: run only specific check ids (comma-separated)
  const checks = only ? CHECKS.filter((c) => only.split(',').includes(c.id)) : CHECKS
  const out = {}
  for (const check of checks) {
    const content = [{ type: 'text', text: `You are verifying a specific suspected UI defect on an Arabic RTL luxury website. Answer ONLY the question, precisely, based ONLY on what is visible. Question: ${check.q}` }]
    for (const img of check.imgs) {
      const buf = fs.readFileSync(img)
      content.push({ type: 'image_url', image_url: { url: `data:image/png;base64,${buf.toString('base64')}` } })
    }
    for (let attempt = 1; attempt <= 4; attempt++) {
      try {
        const res = await zai.chat.completions.createVision({
          messages: [{ role: 'user', content }],
          thinking: { type: 'disabled' },
          temperature: 0,
        })
        const text = res.choices[0]?.message?.content || ''
        out[check.id] = text
        console.log(`\n########## ${check.id} ##########\n${text}\n`)
        break
      } catch (err) {
        console.log(`✗ ${check.id} attempt ${attempt}: ${err.message.slice(0, 100)}`)
        await new Promise((r) => setTimeout(r, 6000 * attempt))
      }
    }
    await new Promise((r) => setTimeout(r, 1500))
  }
  fs.writeFileSync('/home/z/my-project/screenshots/targeted-verdicts.json', JSON.stringify(out, null, 2, ))
  console.log('\nSaved → screenshots/targeted-verdicts.json')
}
main().catch((e) => { console.error(e); process.exit(1) })
