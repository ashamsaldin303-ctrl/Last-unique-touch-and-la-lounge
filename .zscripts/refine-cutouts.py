#!/usr/bin/env python3
"""
Pass 2 — refine product cutouts:
1. Absorb enclosed background pockets adjacent to the existing mask.
2. Decontaminate white fringe: darken RGB near the alpha edge.
Operates on the already-processed RGBA PNGs (originals in _orig/).
"""
import os
import glob
import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage

SRC = "/home/z/my-project/public/products"
BACKUP = os.path.join(SRC, "_orig")

TOL = 40
POCKET_ITER = 8       # dilation absorption rounds
FRINGE = 2            # px band to defringe

def process(path: str):
    name = os.path.basename(path)
    orig = Image.open(os.path.join(BACKUP, name)).convert("RGB")
    a = np.asarray(orig).astype(np.int16)
    h, w, _ = a.shape

    cur = Image.open(path).convert("RGBA")
    rgba = np.asarray(cur).copy()
    alpha = rgba[:, :, 3].astype(bool)  # True = kept foreground

    # background color estimate from original border
    border = np.concatenate([a[0, :, :], a[-1, :, :], a[:, 0, :], a[:, -1, :]])
    bg = np.median(border, axis=0)
    dist = np.sqrt(((a - bg) ** 2).sum(axis=2))
    is_bg = dist < TOL

    # 1. absorb pockets: iteratively grow "removed" into adjacent is_bg
    removed = ~alpha
    struct = ndimage.generate_binary_structure(2, 2)
    for _ in range(POCKET_ITER):
        grow = ndimage.binary_dilation(removed, struct, iterations=3)
        absorb = grow & is_bg & ~removed
        if not absorb.any():
            break
        removed |= absorb

    alpha_bool = ~removed

    # 2. defringe — for pixels near the new edge, darken toward bg-removed:
    #    blend color 60% toward its local darker neighbourhood average
    edge = ndimage.binary_dilation(alpha_bool, iterations=FRINGE) & ~alpha_bool | (
        ndimage.binary_erosion(alpha_bool, iterations=FRINGE) ^ alpha_bool
    )
    mask_img = Image.fromarray((alpha_bool * 255).astype(np.uint8)).filter(
        ImageFilter.GaussianBlur(1.4)
    )
    alpha_out = np.asarray(mask_img).astype(np.uint8)

    rgb = rgba[:, :, :3].astype(np.float32)
    # darken fringe band colors (they're lit by old bg)
    band = ndimage.binary_dilation(alpha_bool, iterations=FRINGE + 1) & alpha_bool
    if band.any():
        darker = ndimage.grey_erosion(rgb.mean(axis=2), size=(5, 5))
        factor = np.clip(darker / np.maximum(rgb.mean(axis=2), 1), 0.55, 1.0)
        for c in range(3):
            rgb[:, :, c] = np.where(band, rgb[:, :, c] * factor, rgb[:, :, c])

    out = np.dstack([rgb.astype(np.uint8), alpha_out])
    Image.fromarray(out).save(path, optimize=True)
    print(f"{name}: fg={alpha_bool.mean():.1%}")

if __name__ == "__main__":
    for p in sorted(glob.glob(os.path.join(SRC, "*.png"))):
        process(p)
    print("done")
