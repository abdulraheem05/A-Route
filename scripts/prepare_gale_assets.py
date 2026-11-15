#!/usr/bin/env python3
"""Prepares the supplied Gale panorama and drill images for the web.

Source files are the originals as delivered. Nothing is cropped, recoloured or
composited: each image is resized down to a width the browser can hold as a
texture and re-encoded, and a thumbnail is written beside it. The measured
dimensions of the delivered original are printed so the catalogue can record
them.

  python scripts/prepare_gale_assets.py --src "<assets dir>" --out public
"""
import argparse
import json
from pathlib import Path

from PIL import Image

Image.MAX_IMAGE_PIXELS = None  # the delivered mosaics are legitimately huge

# WebGL texture limits and download size both argue for a ceiling. 7200 px is
# the widest panorama already in the project, so it is the ceiling here too.
MAX_PANO_W = 7200
THUMB_W = 640
MAX_SPECIMEN_W = 1920

PANORAMAS = {
    "Bradbury Landing Panorama.jpg": "bradbury-landing",
    "Pahrump Hills Panorama.jpg": "pahrump-hills",
    "Vera Rubin Ridge Panorama.jpg": "vera-rubin-ridge",
    "Glen Torridon Panorama.jpg": "glen-torridon",
    "Mont Mercou Panorama.jpg": "mont-mercou",
    "Greenheugh Pediment Panorama.jpg": "greenheugh-pediment",
    "Point Lake Panorama.jpg": "point-lake",
    "paraitepuy-pass Panorama.jpg": "paraitepuy-pass",
}

SPECIMENS = {
    "Cumberland Drilling details.png": "cumberland",
    "Windjana Drilling details.png": "windjana",
    "Buckskin Drilling details.png": "buckskin",
}


def save_resized(im: Image.Image, path: Path, max_w: int, quality: int) -> tuple:
    path.parent.mkdir(parents=True, exist_ok=True)
    w, h = im.size
    if w > max_w:
        im = im.resize((max_w, max(1, round(h * max_w / w))), Image.LANCZOS)
    im.convert("RGB").save(path, quality=quality, optimize=True, progressive=True)
    return im.size


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--src", required=True)
    ap.add_argument("--out", default="public")
    args = ap.parse_args()
    src = Path(args.src)
    out = Path(args.out)
    report = {"panoramas": [], "specimens": []}

    for filename, slug in PANORAMAS.items():
        p = src / filename
        if not p.exists():
            print(f"  MISSING {filename}")
            continue
        with Image.open(p) as im:
            ow, oh = im.size
            fmt, mode = im.format, im.mode
            w, h = save_resized(im, out / "panoramas" / "gale" / f"{slug}.jpg", MAX_PANO_W, 86)
            with Image.open(p) as im2:
                save_resized(im2, out / "panoramas" / "gale" / "thumbs" / f"{slug}.jpg", THUMB_W, 78)
        report["panoramas"].append(
            {
                "id": slug,
                "originalFilename": filename,
                "originalWidth": ow,
                "originalHeight": oh,
                "originalFormat": fmt,
                "originalMode": mode,
                "width": w,
                "height": h,
                "aspect": round(w / h, 3),
                "file": f"/panoramas/gale/{slug}.jpg",
                "thumb": f"/panoramas/gale/thumbs/{slug}.jpg",
            }
        )
        print(f"  {slug:<22} {ow}x{oh} -> {w}x{h}")

    for filename, slug in SPECIMENS.items():
        p = src / filename
        if not p.exists():
            print(f"  MISSING {filename}")
            continue
        with Image.open(p) as im:
            ow, oh = im.size
            fmt, mode = im.format, im.mode
            w, h = save_resized(im, out / "specimens" / "gale" / f"{slug}.jpg", MAX_SPECIMEN_W, 88)
        report["specimens"].append(
            {
                "id": slug,
                "originalFilename": filename,
                "originalWidth": ow,
                "originalHeight": oh,
                "originalFormat": fmt,
                "originalMode": mode,
                "width": w,
                "height": h,
                "image": f"/specimens/gale/{slug}.jpg",
            }
        )
        print(f"  {slug:<22} {ow}x{oh} -> {w}x{h}")

    (out / "panoramas" / "gale" / "asset-report.json").write_text(json.dumps(report, indent=1))
    print(f"\nreport: {out / 'panoramas' / 'gale' / 'asset-report.json'}")


if __name__ == "__main__":
    main()
