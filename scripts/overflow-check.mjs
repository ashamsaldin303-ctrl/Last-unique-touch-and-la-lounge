/**
 * Check horizontal overflow + key element states on every page.
 * Usage: bun scripts/overflow-check.mjs <pc|mobile>
 */
const VIEWPORTS = { pc: [1440, 900], mobile: [375, 812] }
const [label, vpArg] = process.argv[2] ? [process.argv[2], process.argv[2]] : ['pc', 'pc']
const [W, H] = VIEWPORTS[vpArg]

const ROUTES = [
  ['home', '/#/ar'],
  ['lut', '/#/ar/last-unique-touch'],
  ['lut-contact', '/#/ar/last-unique-touch/contact'],
  ['la-lounge', '/#/ar/la-lounge'],
  ['la-lounge-custom', '/#/ar/la-lounge/custom-furniture'],
  ['la-lounge-event', '/#/ar/la-lounge/event-planning'],
  ['la-lounge-plans', '/#/ar/la-lounge/ready-plans'],
  ['la-lounge-contact', '/#/ar/la-lounge/contact'],
  ['birthday', '/#/ar/your-birthday'],
  ['birthday-features', '/#/ar/your-birthday/features'],
  ['birthday-products', '/#/ar/your-birthday/products'],
  ['birthday-contact', '/#/ar/your-birthday/contact'],
  ['products', '/#/ar/products'],
  ['product-detail', '/#/ar/products/gold-floor-lamp'],
  ['cart', '/#/ar/cart'],
  ['checkout', '/#/ar/checkout'],
  ['payment', '/#/ar/checkout/payment'],
  ['checkout-success', '/#/ar/checkout/success'],
  ['about', '/#/ar/about'],
  ['contact', '/#/ar/contact'],
  ['privacy', '/#/ar/privacy'],
  ['terms', '/#/ar/terms'],
  ['refund', '/#/ar/refund'],
]

async function main() {
  // agent-browser CLI drives one shared browser; set viewport first
  const { execSync } = await import('node:child_process')
  const sh = (cmd) => execSync(cmd, { encoding: 'utf8', timeout: 30000 }).trim()

  sh(`agent-browser set viewport ${W} ${H}`)

  const results = []
  for (const [name, route] of ROUTES) {
    try {
      sh(`agent-browser open "http://localhost:3000${route}"`)
      await new Promise((r) => setTimeout(r, 2000))
      // scroll through to stabilize lazy content
      const height = parseInt(sh(`agent-browser eval "document.documentElement.scrollHeight"`).replace(/\D/g, '') || '1000')
      for (let y = 0; y < height; y += 1200) {
        sh(`agent-browser eval "window.scrollTo({top:${y},behavior:'instant'})"`)
        await new Promise((r) => setTimeout(r, 120))
      }
      sh(`agent-browser eval "window.scrollTo({top:0,behavior:'instant'})"`)
      await new Promise((r) => setTimeout(r, 300))
      const raw = sh(`agent-browser eval "JSON.stringify({sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth, dir: document.documentElement.dir})"`)
      let parsed = JSON.parse(raw)
      if (typeof parsed === 'string') parsed = JSON.parse(parsed)
      const data = parsed
      const overflowPx = data.sw - data.cw
      results.push({ name, ...data, overflowPx })
      console.log(`${overflowPx > 0 ? '⚠️ OVERFLOW' : '✓ ok'} ${name}: scrollWidth=${data.sw} clientWidth=${data.cw} dir=${data.dir}`)
    } catch (e) {
      console.log(`✗ ${name}: ${e.message.slice(0, 80)}`)
      results.push({ name, error: e.message })
    }
  }
  console.log('\n=== SUMMARY ===')
  const bad = results.filter((r) => (r.overflowPx ?? 0) > 0)
  console.log(bad.length ? `Pages with horizontal overflow: ${bad.map((b) => `${b.name}(+${b.overflowPx}px)`).join(', ')}` : 'No horizontal overflow on any page ✓')
}
main()
