#!/usr/bin/env python3
"""Re-cut specific images with custom tolerance.
Usage: python3 scripts/recut.py <src> <dst> <tol>
"""
from PIL import Image, ImageFilter
import numpy as np
from collections import deque
from scipy import ndimage
import sys

src, dst, tol = sys.argv[1], sys.argv[2], float(sys.argv[3])

im = Image.open(src).convert('RGB')
w, h = im.size
arr = np.asarray(im).astype(np.int32)
border = np.concatenate([arr[0], arr[-1], arr[:, 0], arr[:, -1]])
bg_color = np.median(border, axis=0)
dist = np.sqrt(((arr - bg_color) ** 2).sum(axis=2))

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
lbl, n = ndimage.label(keep)
if n > 0:
    sizes = ndimage.sum(keep, lbl, range(1, n + 1))
    largest = sizes.max()
    keep = np.isin(lbl, [i + 1 for i, s in enumerate(sizes) if s > max(300, largest * 0.02)])

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
ys, xs = np.where(np.asarray(am) > 128)
print(f'{dst}: bg={bg.mean():.3f} bbox=({xs.min()},{xs.max()},{ys.min()},{ys.max()}) bottom-q={(np.asarray(am)[3*h//4:, :] > 128).mean():.3f}')
