#!/usr/bin/env python3
"""Remove dark opaque backgrounds from 3 product images → transparent cutouts.
Flood-fill from edges (brightness-gated) so the product body is never touched.
Feathered mask edge for smooth compositing on light card backgrounds.
"""
from PIL import Image, ImageFilter
import numpy as np
from collections import deque

FILES = ['louis-ghost-chair', 'monet-armchair', 'tiffany-chair-crystal']
DIR = 'public/products'
LUM_THRESHOLD = 118   # background pixels must be darker than this
FEATHER = 1.5          # px of edge softening

for name in FILES:
    path = f'{DIR}/{name}.png'
    im = Image.open(path).convert('RGB')
    w, h = im.size
    arr = np.asarray(im).astype(np.int32)
    lum = arr.mean(axis=2)

    # BFS flood fill from all border pixels
    bg = np.zeros((h, w), dtype=bool)
    q = deque()
    for x in range(w):
        for y in (0, h - 1):
            if lum[y, x] < LUM_THRESHOLD and not bg[y, x]:
                bg[y, x] = True; q.append((y, x))
    for y in range(h):
        for x in (0, w - 1):
            if lum[y, x] < LUM_THRESHOLD and not bg[y, x]:
                bg[y, x] = True; q.append((y, x))
    while q:
        y, x = q.popleft()
        for ny, nx in ((y-1, x), (y+1, x), (y, x-1), (y, x+1)):
            if 0 <= ny < h and 0 <= nx < w and not bg[ny, nx] and lum[ny, nx] < LUM_THRESHOLD:
                bg[ny, nx] = True; q.append((ny, nx))

    frac = bg.mean()
    print(f'{name}: background fraction = {frac:.3f}')

    # alpha mask: 255 = keep product, 0 = background
    alpha = np.where(bg, 0, 255).astype(np.uint8)
    am = Image.fromarray(alpha, 'L')
    if FEATHER:
        # soften cut edge: blur then clamp so interior stays 255 / bg stays 0
        soft = am.filter(ImageFilter.GaussianBlur(FEATHER))
        sa = np.asarray(soft).astype(np.int32)
        aa = np.asarray(am).astype(np.int32)
        # interior (aa=255): max(aa, sa) keeps solid; exterior (aa=0): min = 0
        out = np.where(aa == 255, np.maximum(aa, sa - 40), np.minimum(aa, sa))
        am = Image.fromarray(out.clip(0, 255).astype(np.uint8), 'L')

    rgba = im.convert('RGBA')
    rgba.putalpha(am)
    # save a backup of the original
    orig = Image.open(path)
    orig.save(f'{DIR}/_orig/{name}.opaque.png')
    rgba.save(path)
    print(f'  saved → {path} (backup in _orig)')
