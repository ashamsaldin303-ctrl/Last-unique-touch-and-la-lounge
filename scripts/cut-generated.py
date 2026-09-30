#!/usr/bin/env python3
"""Cut generated studio images out of their uniform light background.
Flood-fill from edges gated by color-distance to the sampled border color,
keep large connected components (the product), feather the mask edge.
"""
from PIL import Image, ImageFilter
import numpy as np
from collections import deque
import sys

JOBS = [
    ('/tmp/gen-louis.png',   'public/products/louis-ghost-chair.png'),
    ('/tmp/gen-monet.png',   'public/products/monet-armchair.png'),
    ('/tmp/gen-tiffany.png', 'public/products/tiffany-chair-crystal.png'),
]

for src, dst in JOBS:
    im = Image.open(src).convert('RGB')
    w, h = im.size
    arr = np.asarray(im).astype(np.int32)

    # sample border color = median of all border pixels
    border = np.concatenate([arr[0], arr[-1], arr[:, 0], arr[:, -1]])
    bg_color = np.median(border, axis=0)
    dist = np.sqrt(((arr - bg_color) ** 2).sum(axis=2))
    tol = 38.0

    # BFS from border pixels within tolerance
    bg = np.zeros((h, w), dtype=bool)
    q = deque()
    for x in range(w):
        for y in (0, h - 1):
            if dist[y, x] < tol:
                bg[y, x] = True; q.append((y, x))
    for y in range(h):
        for x in (0, w - 1):
            if dist[y, x] < tol:
                bg[y, x] = True; q.append((y, x))
    while q:
        y, x = q.popleft()
        for ny, nx in ((y-1, x), (y+1, x), (y, x-1), (y, x+1)):
            if 0 <= ny < h and 0 <= nx < w and not bg[ny, nx] and dist[ny, nx] < tol:
                bg[ny, nx] = True; q.append((ny, nx))

    keep = ~bg
    # remove speck islands inside background: label connected components of keep
    from scipy import ndimage
    lbl, n = ndimage.label(keep)
    if n > 0:
        sizes = ndimage.sum(keep, lbl, range(1, n + 1))
        largest = sizes.max()
        keep = np.isin(lbl, [i + 1 for i, s in enumerate(sizes) if s > max(300, largest * 0.02)])
    print(f'{src}: bg frac={bg.mean():.3f}, components kept={len(np.unique(lbl))}')

    alpha = np.where(keep, 255, 0).astype(np.uint8)
    am = Image.fromarray(alpha)
    soft = am.filter(ImageFilter.GaussianBlur(1.2))
    sa = np.asarray(soft).astype(np.int32)
    aa = alpha.astype(np.int32)
    out = np.where(aa == 255, np.maximum(aa, sa - 30), np.minimum(aa, sa))
    am = Image.fromarray(out.clip(0, 255).astype(np.uint8))

    rgba = im.convert('RGBA')
    rgba.putalpha(am)
    rgba.save(dst)
    print(f'  saved → {dst}')
