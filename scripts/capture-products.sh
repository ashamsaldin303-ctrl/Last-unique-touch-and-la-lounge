#!/usr/bin/env bash
# Capture products page + product detail pages (PC 1440x900 + Mobile 375x812)
# Usage: ./scripts/capture-products.sh <before|after>
set -u
STAGE="${1:-before}"
BASE_DIR="/home/z/my-project/screenshots/products-focus/${STAGE}"
mkdir -p "${BASE_DIR}/pc" "${BASE_DIR}/mobile"

# Slugs to capture for detail pages
DETAIL_SLUGS=("gold-floor-lamp" "crystal-chandelier")

capture_page () {
  local dir="${BASE_DIR}/$1"
  local viewport_w="$2"
  local viewport_h="$3"
  local name="$4"
  local url="$5"
  agent-browser set viewport "$viewport_w" "$viewport_h" >/dev/null 2>&1
  agent-browser open "$url" >/dev/null 2>&1
  agent-browser wait --load networkidle >/dev/null 2>&1
  sleep 1.6   # let reveal animations finish & counters settle
  # scroll to bottom to trigger lazy loads, then back to top
  agent-browser eval "window.scrollTo({top: document.body.scrollHeight})" >/dev/null 2>&1
  sleep 0.8
  agent-browser eval "window.scrollTo({top: 0})" >/dev/null 2>&1
  sleep 0.9
  # sequential viewport screenshots
  local i=0
  local y=0
  local doc_h
  doc_h=$(agent-browser eval "document.body.scrollHeight" 2>/dev/null | tail -1 | tr -dc '0-9')
  [ -z "${doc_h}" ] && doc_h=$((viewport_h * 3))
  local step=$((viewport_h - 120))
  while [ "$y" -lt "$doc_h" ]; do
    agent-browser eval "window.scrollTo({top: ${y}})" >/dev/null 2>&1
    sleep 0.45
    agent-browser screenshot "${dir}/${name}-$(printf '%02d' "$i").png" >/dev/null 2>&1
    i=$((i+1))
    y=$((y + step))
  done
  # final bottom shot
  agent-browser eval "window.scrollTo({top: document.body.scrollHeight})" >/dev/null 2>&1
  sleep 0.5
  agent-browser screenshot "${dir}/${name}-$(printf '%02d' "$i").png" >/dev/null 2>&1
  echo "  [${1}] ${name}: $((i+1)) shots (doc ${doc_h}px)"
}

echo "== PC 1440x900 =="
capture_page pc 1440 900 "products"    "http://localhost:3000/#/ar/products"
for slug in "${DETAIL_SLUGS[@]}"; do
  capture_page pc 1440 900 "product-${slug}" "http://localhost:3000/#/ar/products/${slug}"
done

echo "== Mobile 375x812 =="
capture_page mobile 375 812 "products"    "http://localhost:3000/#/ar/products"
for slug in "${DETAIL_SLUGS[@]}"; do
  capture_page mobile 375 812 "product-${slug}" "http://localhost:3000/#/ar/products/${slug}"
done

echo "Done → ${BASE_DIR}"
