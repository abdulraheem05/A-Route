#!/usr/bin/env python3
"""Renders a surface texture for a game height grid.

Jezero's surface texture is an orbital image mosaic. No equivalent image file
is bundled for Gale, so rather than leaving the ground untextured this renders
one from the same elevation data the terrain is built from: a hypsometric tint
crossed with a hillshade, in the palette of the orbital mosaic.

It is a *render of the elevation data*, not a photograph, and the terrain meta
records that so the data notice can say so. Nothing is added that is not in the
DEM: every pixel is a function of the measured elevations around it.

  python scripts/render_game_surface.py --meta public/terrain/gale-terrain-meta.json \
      --height public/terrain/gale-height.u16 --out public/terrain/gale-surface.jpg
"""
import argparse
import json
from pathlib import Path

import numpy as np
from PIL import Image

# Sampled from the Jezero orbital mosaic so both craters sit in the same
# palette: low ground is darker and greyer, high ground lighter and warmer.
RAMP = [
    (0.00, (92, 68, 52)),
    (0.25, (118, 88, 65)),
    (0.50, (146, 110, 80)),
    (0.72, (170, 133, 99)),
    (0.88, (191, 157, 122)),
    (1.00, (211, 182, 150)),
]


def ramp_rgb(t: np.ndarray) -> np.ndarray:
    stops = np.array([s[0] for s in RAMP])
    cols = np.array([s[1] for s in RAMP], dtype=np.float64)
    out = np.zeros(t.shape + (3,), dtype=np.float64)
    for c in range(3):
        out[..., c] = np.interp(t, stops, cols[:, c])
    return out


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--meta", required=True)
    ap.add_argument("--height", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--width", type=int, default=2048)
    # Illumination for the hillshade, degrees. The default matches the low
    # afternoon sun the scene shader uses.
    ap.add_argument("--sun-azimuth", type=float, default=315.0)
    ap.add_argument("--sun-altitude", type=float, default=42.0)
    args = ap.parse_args()

    meta = json.loads(Path(args.meta).read_text())
    w, h = meta["width"], meta["height"]
    data = np.frombuffer(Path(args.height).read_bytes(), dtype="<u2")
    if data.size != w * h:
        raise SystemExit("height grid does not match its metadata")
    span = meta["elevMax"] - meta["elevMin"]
    elev = meta["elevMin"] + data.reshape(h, w).astype(np.float64) / 65535.0 * span

    px = meta["metresPerPixel"]
    gy, gx = np.gradient(elev, px, px)
    # Screen-space: +x east, +y south (row 0 is north), so the northward slope
    # is the negative row gradient.
    az = np.deg2rad(args.sun_azimuth)
    alt = np.deg2rad(args.sun_altitude)
    slope = np.arctan(np.hypot(gx, gy))
    aspect = np.arctan2(-gy, gx)
    shade = np.sin(alt) * np.cos(slope) + np.cos(alt) * np.sin(slope) * np.cos(az - aspect)
    shade = np.clip(shade, 0.0, 1.0)

    # Hypsometric tint, stretched between the 2nd and 98th percentiles so a
    # single peak does not flatten the rest of the range.
    lo, hi = np.percentile(elev, [2, 98])
    tint = ramp_rgb(np.clip((elev - lo) / max(hi - lo, 1e-6), 0.0, 1.0))

    # Gentle shading: the scene shader lights the terrain itself, so this only
    # has to carry the texture of the ground, not replace that lighting.
    lit = tint * (0.74 + 0.52 * shade)[..., None]

    # A little grain, seeded, so the upscale does not look like flat plastic.
    rng = np.random.default_rng(7)
    lit *= 1.0 + (rng.random(lit.shape[:2]) - 0.5)[..., None] * 0.045

    img = Image.fromarray(np.clip(lit, 0, 255).astype(np.uint8), "RGB")
    out_h = max(1, round(args.width * h / w))
    img = img.resize((args.width, out_h), Image.LANCZOS)
    Path(args.out).parent.mkdir(parents=True, exist_ok=True)
    img.save(args.out, quality=88, optimize=True)
    print(f"{args.out}  {args.width}x{out_h}  {Path(args.out).stat().st_size / 1e3:.0f} kB")
    print(f"  rendered from {w}x{h} elevations, {px:.0f} m grid, tint stretched {lo:.0f}..{hi:.0f} m")


if __name__ == "__main__":
    main()
