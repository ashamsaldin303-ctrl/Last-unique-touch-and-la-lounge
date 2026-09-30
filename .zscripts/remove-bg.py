#!/usr/bin/env python3
"""
Remove light studio backgrounds from product PNGs via border flood-fill,
making them blend beautifully into the dark luxury theme.
- Samples the border background color per image.
- Flood-fills from all border pixels (scipy label) within a tolerance.
- Feathers the mask edge for smooth compositing.
- Saves as optimized RGBA PNG (in-place backup kept in _orig/).
"""
import os
import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage

SRC = "/home/z/my-project/public/products"
BACKUP = os.path.join(SRC, "_orig")
os.makedirs(BACKUP, exist_ok=True)

TOL = 34          # color distance tolerance for background
FEATHER = 1.6     # edge feather sigma

def process(path: str):
    name = os.path.basename(path)
    img = Image.open(path).convert("RGB")
    a = np.asarray(img).astype(np.int16)
    h, w, _ = a.shape

    # median border color = background estimate
    border = np.concatenate([a[0, :, :], a[-1, :, :], a[:, 0, :], a[:, -1, :]])
    bg = np.median(border, axis=0)

    # distance to bg
    dist = np.sqrt(((a - bg) ** 2).sum(axis=2))

    # background-ish region
    is_bg = dist < TOL

    # keep only regions connected to the border (avoid holes inside product)
    labels, n = ndimage.label(is_bg)
    border_labels = set(np.unique(np.concatenate([
        labels[0, :], labels[-1, :], labels[:, 0], labels[:, -1]
    ]))) - {0}
    mask = np.isin(labels, list(border_labels))  # True = background

    # small orphan specks removal
    fg = ~mask
    fgl, nfg = ndimage.label(fg)
    if nfg > 1:
        sizes = ndimage.sum(fg, fgl, range(1, nfg + 1))
        keep = np.zeros_like(fg)
        for i, s in enumerate(sizes, start=1):
            if s > 150:
                keep |= fgl == i
        mask = ~keep | mask  # everything not kept-foreground is bg

    # feather: blur mask edge
    m = Image.fromarray((mask * 255).astype(np.uint8)).filter(
        ImageFilter.GaussianBlur(FEATHER)
    )
    alpha = 255 - np.asarray(m).astype(np.uint8)

    out = np.dstack([np.asarray(img), alpha])
    result = Image.fromarray(out, "RGBA")

    # backup original, save processed
    orig = os.path.join(BACKUP, name)
    if not os.path.exists(orig):
        img.save(orig)

    result.save(path, optimize=True)
    cov = (alpha > 128).mean()
    print(f"{name}: bg={bg.astype(int).tolist()} kept_fg={cov:.2%}")

if __name__ == "__main__":
    import glob
    for p in sorted(glob.glob(os.path.join(SRC, "*.png"))):
        process(p)
    print("done")
