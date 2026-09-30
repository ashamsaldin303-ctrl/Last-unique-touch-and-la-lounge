#!/bin/bash
# Capture viewport screenshots of every site page at scroll positions.
# Usage: capture-pages.sh <width> <height> <stride> <outdir>
W=$1; H=$2; STRIDE=$3; OUT=$4

ROUTES=(
  "home|#/"
  "lut|#/last-unique-touch"
  "lut-contact|#/last-unique-touch/contact"
  "la-lounge|#/la-lounge"
  "la-lounge-custom|#/la-lounge/custom-furniture"
  "la-lounge-event|#/la-lounge/event-planning"
  "la-lounge-plans|#/la-lounge/ready-plans"
  "la-lounge-contact|#/la-lounge/contact"
  "birthday|#/your-birthday"
  "birthday-features|#/your-birthday/features"
  "birthday-products|#/your-birthday/products"
  "birthday-contact|#/your-birthday/contact"
  "products|#/products"
  "product-detail|#/products/gold-floor-lamp"
  "cart|#/cart"
  "checkout|#/checkout"
  "payment|#/checkout/payment"
  "checkout-success|#/checkout/success"
  "about|#/about"
  "contact|#/contact"
  "privacy|#/privacy"
  "terms|#/terms"
  "refund|#/refund"
)

# locale prefix: AR by default; pass 5th arg "en" for English locale
LOC="${5:-ar}"
# optional 6th arg: comma-separated route names to capture (subset)
ONLY="${6:-}"

mkdir -p "$OUT"
CONSOLE_LOG="$OUT/console-errors.log"
touch "$CONSOLE_LOG"

agent-browser set viewport "$W" "$H" >/dev/null 2>&1

for entry in "${ROUTES[@]}"; do
  name="${entry%%|*}"
  hash="${entry#*|}"
  url="http://localhost:3000/#/${LOC}/${hash#\#/}"

  # subset filter
  if [ -n "$ONLY" ]; then
    case ",$ONLY," in
      *",$name,"*) ;;
      *) continue ;;
    esac
  fi

  agent-browser open "$url" >/dev/null 2>&1
  agent-browser wait 2200 >/dev/null 2>&1

  PH=$(agent-browser eval "Math.max(document.documentElement.scrollHeight, document.body.scrollHeight)" 2>/dev/null | tail -n1 | tr -dc '0-9')
  if [ -z "$PH" ] || [ "$PH" -lt "$H" ]; then PH=$H; fi
  maxy=$(( PH - H )); [ $maxy -lt 0 ] && maxy=0

  # Pre-scroll pass to trigger lazy content / counters / in-view animations
  y=0
  while [ $y -lt $maxy ]; do
    agent-browser eval "window.scrollTo({top: $y, behavior: 'instant'})" >/dev/null 2>&1
    agent-browser wait 350 >/dev/null 2>&1
    y=$((y + STRIDE))
  done
  agent-browser eval "window.scrollTo({top: 0, behavior: 'instant'})" >/dev/null 2>&1
  agent-browser wait 900 >/dev/null 2>&1

  # Capture pass (top → bottom, overlapping)
  i=0
  y=0
  while true; do
    ty=$y
    [ $ty -gt $maxy ] && ty=$maxy
    agent-browser eval "window.scrollTo({top: $ty, behavior: 'instant'})" >/dev/null 2>&1
    agent-browser wait 700 >/dev/null 2>&1
    printf -v num "%02d" "$i"
    agent-browser screenshot "$OUT/${name}-${num}.png" >/dev/null 2>&1
    i=$((i+1))
    [ $ty -ge $maxy ] && break
    y=$((y + STRIDE))
  done

  # Collect console messages + page errors for this page
  echo "=== ${name} (height ${PH}px) ===" >> "$CONSOLE_LOG"
  agent-browser console >> "$CONSOLE_LOG" 2>&1
  agent-browser errors >> "$CONSOLE_LOG" 2>&1
  agent-browser console --clear >/dev/null 2>&1
  agent-browser errors --clear >/dev/null 2>&1

  echo "[done] ${name}: ${PH}px, ${i} shots"
done

echo "ALL CAPTURED → $OUT"
