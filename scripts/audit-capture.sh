#!/usr/bin/env bash
# Full-site design audit capture: PC 1440x900 + Mobile 375x812
# Captures full-page screenshots of all main user-visible pages.
# Usage: ./scripts/audit-capture.sh <dir-suffix>
set -u
SUFFIX="${1:-run}"
BASE_DIR="/home/z/my-project/screenshots/audit/${SUFFIX}"
mkdir -p "${BASE_DIR}/pc" "${BASE_DIR}/mobile"
BASE_URL="http://localhost:3000"

# name|hashpath
PC_PAGES=(
  "home|/ar"
  "lut|/ar/last-unique-touch"
  "products|/ar/products"
  "detail-gold-floor-lamp|/ar/products/gold-floor-lamp"
  "la-lounge|/ar/la-lounge"
  "la-lounge-custom|/ar/la-lounge/custom-furniture"
  "birthday|/ar/your-birthday"
  "birthday-products|/ar/your-birthday/products"
  "cart|/ar/cart"
  "checkout|/ar/checkout"
  "about|/ar/about"
  "contact|/ar/contact"
  "privacy|/ar/privacy"
)

MOBILE_PAGES=(
  "home|/ar"
  "lut|/ar/last-unique-touch"
  "products|/ar/products"
  "detail-gold-floor-lamp|/ar/products/gold-floor-lamp"
  "la-lounge|/ar/la-lounge"
  "birthday|/ar/your-birthday"
  "cart|/ar/cart"
  "checkout|/ar/checkout"
)

capture_full () {
  local kind="$1" w="$2" h="$3" name="$4" path="$5"
  agent-browser set viewport "$w" "$h" >/dev/null 2>&1
  agent-browser open "${BASE_URL}/#${path}" >/dev/null 2>&1
  agent-browser wait --load networkidle >/dev/null 2>&1
  sleep 1.8
  # trigger lazy loads + reveal animations
  agent-browser eval "window.scrollTo({top: document.body.scrollHeight, behavior: 'instant'})" >/dev/null 2>&1
  sleep 1.0
  agent-browser eval "window.scrollTo({top: 0, behavior: 'instant'})" >/dev/null 2>&1
  sleep 1.2
  agent-browser screenshot --full "${BASE_DIR}/${kind}/${name}.png" >/dev/null 2>&1
  echo "  [${kind}] ${name} done"
}

echo "=== PC 1440x900 ==="
for entry in "${PC_PAGES[@]}"; do
  name="${entry%%|*}"; path="${entry#*|}"
  capture_full pc 1440 900 "$name" "$path"
done

echo "=== Mobile 375x812 ==="
for entry in "${MOBILE_PAGES[@]}"; do
  name="${entry%%|*}"; path="${entry#*|}"
  capture_full mobile 375 812 "$name" "$path"
done

echo "=== Console errors check ==="
agent-browser errors 2>/dev/null | head -20
echo "=== Done → ${BASE_DIR} ==="
