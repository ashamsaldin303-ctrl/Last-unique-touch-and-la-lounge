#!/bin/bash
# capture-all.sh <pc|mobile> <outdir> [subset]
# subset: comma-separated stages. Default = all. Special stages:
#   addcart       → fills rental dates on the LUT product and clicks add-to-cart
#   checkoutflow  → fills the checkout form and submits (creates order → payment)
#   payflow       → fills the card form and pays (auto-navigates to success)
# Keeps the browser alive across invocations (no close) so cart state persists
# within the cart-flow chunk.
set -u
BASE="http://localhost:3000"
MODE="${1:?usage: capture-all.sh pc|mobile outdir [subset]}"
OUT="${2:?usage: capture-all.sh pc|mobile outdir [subset]}"
SUBSET="${3:-}"

if [ "$MODE" = "pc" ]; then W=1440; H=900; STRIDE=800; else W=375; H=812; STRIDE=710; fi

mkdir -p "$OUT"
LOG="$OUT/console-errors.log"
touch "$LOG"

# JS value-setter for React controlled inputs (native setter + input/change events)
SV='(id,v)=>{const el=document.getElementById(id);if(!el)return "no:"+id;const p=(el.tagName==="TEXTAREA")?window.HTMLTextAreaElement.prototype:window.HTMLInputElement.prototype;Object.getOwnPropertyDescriptor(p,"value").set.call(el,v);el.dispatchEvent(new Event("input",{bubbles:true}));el.dispatchEvent(new Event("change",{bubbles:true}));return "ok:"+id}'

agent-browser set viewport "$W" "$H" >/dev/null 2>&1

want() { case ",$SUBSET," in *",$1,"*|",,") return 0;; *) return 1;; esac; }

cap() { # cap <name> <url> [waitms]
  local name="$1" url="$2" wt="${3:-3000}"
  agent-browser open "$url" >/dev/null 2>&1
  agent-browser wait "$wt" >/dev/null 2>&1
  local PH i y ty num maxy
  PH=$(agent-browser eval "Math.max(document.documentElement.scrollHeight, document.body.scrollHeight)" 2>/dev/null | tail -n1 | tr -dc '0-9')
  [ -z "$PH" ] && PH=$H
  [ "$PH" -lt "$H" ] && PH=$H
  maxy=$(( PH - H )); [ $maxy -lt 0 ] && maxy=0

  # pre-scroll pass: trigger lazy images + in-view animations
  y=0
  while [ $y -lt $maxy ]; do
    agent-browser eval "window.scrollTo({top: $y, behavior: 'instant'})" >/dev/null 2>&1
    agent-browser wait 380 >/dev/null 2>&1
    y=$((y + STRIDE))
  done
  agent-browser eval "window.scrollTo({top: 0, behavior: 'instant'})" >/dev/null 2>&1
  agent-browser wait 900 >/dev/null 2>&1

  # Re-measure page height AFTER the pre-scroll pass: the first measurement
  # can race a delayed SPA swap under 3D load (stale DOM → inflated height →
  # clamped duplicate bottom shots). Freeze on the settled value.
  PH2=$(agent-browser eval "Math.max(document.documentElement.scrollHeight, document.body.scrollHeight)" 2>/dev/null | tail -n1 | tr -dc '0-9')
  if [ -n "$PH2" ] && [ "$PH2" -ge "$H" ] 2>/dev/null && [ "$PH2" -lt "$PH" ]; then
    PH=$PH2
    maxy=$(( PH - H )); [ $maxy -lt 0 ] && maxy=0
  fi

  # capture pass: top → bottom (viewport segments, slight overlap)
  i=0; y=0
  while true; do
    ty=$y; [ $ty -gt $maxy ] && ty=$maxy
    agent-browser eval "window.scrollTo({top: $ty, behavior: 'instant'})" >/dev/null 2>&1
    agent-browser wait 850 >/dev/null 2>&1
    printf -v num "%02d" "$i"
    agent-browser screenshot "$OUT/${name}-${num}.png" >/dev/null 2>&1
    i=$((i+1))
    [ $ty -ge $maxy ] && break
    y=$((y + STRIDE))
  done

  echo "[$MODE] $name: ${PH}px -> ${i} shots"
  echo "=== $name (${PH}px) ===" >> "$LOG"
  agent-browser console >> "$LOG" 2>&1
  agent-browser errors >> "$LOG" 2>&1
  agent-browser console --clear >/dev/null 2>&1
  agent-browser errors --clear >/dev/null 2>&1
}

echo "### CHUNK: $MODE (${W}x${H}) subset=[${SUBSET:-ALL}] -> $OUT"

# ---------- public pages ----------
want home           && cap home          "$BASE/#/ar"                          3500
want lut            && cap lut           "$BASE/#/ar/last-unique-touch"        3500
want lut-contact    && cap lut-contact   "$BASE/#/ar/last-unique-touch/contact" 3000
want la-lounge      && cap la-lounge     "$BASE/#/ar/la-lounge"                3500
want la-lounge-custom    && cap la-lounge-custom    "$BASE/#/ar/la-lounge/custom-furniture" 3000
want la-lounge-event     && cap la-lounge-event     "$BASE/#/ar/la-lounge/event-planning"    3000
want la-lounge-plans     && cap la-lounge-plans     "$BASE/#/ar/la-lounge/ready-plans"       3000
want la-lounge-contact   && cap la-lounge-contact   "$BASE/#/ar/la-lounge/contact"            3000
want birthday       && cap birthday      "$BASE/#/ar/your-birthday"            3500
want birthday-features   && cap birthday-features   "$BASE/#/ar/your-birthday/features"   3000
want birthday-products   && cap birthday-products   "$BASE/#/ar/your-birthday/products"   3000
want birthday-contact    && cap birthday-contact    "$BASE/#/ar/your-birthday/contact"     3000
want products       && cap products      "$BASE/#/ar/products"                 3500
want product-lut    && cap product-lut      "$BASE/#/ar/products/gold-floor-lamp"   3500
want product-lalounge && cap product-lalounge "$BASE/#/ar/products/red-carpet"        3500
want product-birthday && cap product-birthday "$BASE/#/ar/products/led-dance-floor"   3500
want home-en        && cap home-en       "$BASE/#/en"                          3500
want about          && cap about         "$BASE/#/ar/about"                    2500
want contact        && cap contact       "$BASE/#/ar/contact"                  2500
want privacy        && cap privacy       "$BASE/#/ar/privacy"                  2500
want terms          && cap terms         "$BASE/#/ar/terms"                    2500
want refund         && cap refund        "$BASE/#/ar/refund"                   2500

# ---------- purchase golden path ----------
want cart-empty && cap cart-empty "$BASE/#/ar/cart" 2500

if want addcart; then
  agent-browser open "$BASE/#/ar/products/gold-floor-lamp" >/dev/null 2>&1
  agent-browser wait 3000 >/dev/null 2>&1
  D1=$(date -d "+2 days" +%F)
  D2=$(date -d "+6 days" +%F)
  agent-browser eval "($SV)('rental-start','$D1')" >/dev/null 2>&1
  agent-browser eval "($SV)('rental-end','$D2')" >/dev/null 2>&1
  agent-browser wait 2200 >/dev/null 2>&1
  agent-browser eval "document.querySelectorAll('button').forEach(b=>{if(b.textContent.includes('أضف للسلة'))b.click()}); 'add-clicked'" >/dev/null 2>&1
  agent-browser wait 1600 >/dev/null 2>&1
  echo "[$MODE] addcart: done"
fi

want cart-filled && cap cart-filled "$BASE/#/ar/cart" 2500
want checkout    && cap checkout    "$BASE/#/ar/checkout" 3000

if want checkoutflow; then
  agent-browser open "$BASE/#/ar/checkout" >/dev/null 2>&1
  agent-browser wait 3000 >/dev/null 2>&1
  agent-browser eval "($SV)('customerName','محمد العبدالله')" >/dev/null 2>&1
  agent-browser eval "($SV)('customerPhone','91234567')" >/dev/null 2>&1
  agent-browser eval "($SV)('customerEmail','mohammed@example.com')" >/dev/null 2>&1
  agent-browser eval "($SV)('address','شارع الخليج - كيفان')" >/dev/null 2>&1
  agent-browser eval "($SV)('city','الكويت')" >/dev/null 2>&1
  agent-browser eval "var t=document.getElementById('terms'); if(t&&!t.checked){t.click()}; 'terms-ok'" >/dev/null 2>&1
  agent-browser wait 700 >/dev/null 2>&1
  agent-browser eval "document.querySelectorAll('button[type=submit]').forEach(b=>b.click()); 'submitted'" >/dev/null 2>&1
  agent-browser wait 3800 >/dev/null 2>&1
  echo "[$MODE] checkoutflow: submitted -> payment"
fi

want payment && cap payment "$BASE/#/ar/checkout/payment" 3000

if want payflow; then
  agent-browser open "$BASE/#/ar/checkout/payment" >/dev/null 2>&1
  agent-browser wait 3000 >/dev/null 2>&1
  agent-browser eval "($SV)('cardNumber','4242 4242 4242 4242')" >/dev/null 2>&1
  agent-browser eval "($SV)('cardName','MOHAMMED ALABDALLAH')" >/dev/null 2>&1
  agent-browser eval "($SV)('expiry','12/28')" >/dev/null 2>&1
  agent-browser eval "($SV)('cvv','123')" >/dev/null 2>&1
  agent-browser wait 600 >/dev/null 2>&1
  agent-browser eval "document.querySelectorAll('button').forEach(b=>{if(b.textContent.includes('ادفع'))b.click()}); 'pay-clicked'" >/dev/null 2>&1
  agent-browser wait 4600 >/dev/null 2>&1
  echo "[$MODE] payflow: paid -> success"
fi

want checkout-success && cap checkout-success "$BASE/#/ar/checkout/success" 3000

echo "### CHUNK DONE [$MODE] subset=[${SUBSET:-ALL}]"
