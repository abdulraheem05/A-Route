#!/usr/bin/env python3
"""Builds a first-person game height grid from a prepared MAP elevation grid.

The MAP pipeline (scripts/prepare_terrain.py) writes Float32 levels plus a
meta.json under public/data/terrain/<region>/. The game wants a Uint16 grid and
its own metadata, which is what this produces. No elevation is invented: values
are read from the Float32 grid, and cells the source marks as no-data are
filled from their nearest valid neighbour and counted in the output metadata,
the same way the Jezero grid records its own fill.

  python scripts/prepare_game_terrain.py \
      --source public/data/terrain/crater \
      --out public/terrain/gale \
      --bounds 137.0 138.2 -5.4 -4.1
"""
import argparse
import json
import math
import struct
from datetime import datetime, timezone
from pathlib import Path

import numpy as np

NODATA = -32768.0


def load_level(base: Path, meta: dict, level: dict) -> np.ndarray:
    raw = (base / level["file"]).read_bytes()
    arr = np.frombuffer(raw, dtype="<f4").astype(np.float64)
    if arr.size != level["width"] * level["height"]:
        raise SystemExit(f"{level['file']}: {arr.size} samples, expected {level['width'] * level['height']}")
    return arr.reshape(level["height"], level["width"])


def fill_nodata(grid: np.ndarray, valid: np.ndarray):
    """Fills invalid cells from their nearest valid neighbours, by repeated
    dilation. Returns (filled grid, number of cells filled). The count is
    recorded in the metadata so the interface can say which part of the surface
    is measured and which was carried in from a neighbour.
    """
    missing = int((~valid).sum())
    if missing == 0:
        return grid, 0
    out = grid.copy()
    known = valid.copy()
    for _ in range(4096):
        if known.all():
            break
        nb_sum = np.zeros_like(out)
        nb_cnt = np.zeros(out.shape, dtype=np.int32)
        for dy, dx in ((-1, 0), (1, 0), (0, -1), (0, 1)):
            sv = np.roll(known, (dy, dx), axis=(0, 1))
            sg = np.roll(out, (dy, dx), axis=(0, 1))
            # np.roll wraps; blank the wrapped edge so values do not cross the grid.
            if dy == -1:
                sv[-1, :] = False
            elif dy == 1:
                sv[0, :] = False
            if dx == -1:
                sv[:, -1] = False
            elif dx == 1:
                sv[:, 0] = False
            nb_sum += np.where(sv, sg, 0.0)
            nb_cnt += sv.astype(np.int32)
        fillable = (~known) & (nb_cnt > 0)
        if not fillable.any():
            break
        out[fillable] = nb_sum[fillable] / nb_cnt[fillable]
        known |= fillable
    if not known.all():
        out[~known] = out[known].mean()
    return out, missing


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--source", required=True, help="prepared MAP grid directory")
    ap.add_argument("--out", required=True, help="output prefix, e.g. public/terrain/gale")
    ap.add_argument("--bounds", nargs=4, type=float, metavar=("W", "E", "S", "N"), required=True)
    ap.add_argument("--name", default=None, help="human-readable region name")
    args = ap.parse_args()

    base = Path(args.source)
    meta = json.loads((base / "meta.json").read_text())
    level = meta["levels"][0]  # finest
    grid = load_level(base, meta, level)

    west, east, south, north = args.bounds
    dx, dy = level["dx"], level["dy"]
    gw, gn = level["west"], level["north"]

    i0 = max(0, int(math.floor((west - gw) / dx)))
    i1 = min(level["width"] - 1, int(math.ceil((east - gw) / dx)))
    j0 = max(0, int(math.floor((gn - north) / dy)))
    j1 = min(level["height"] - 1, int(math.ceil((gn - south) / dy)))
    if i1 - i0 < 2 or j1 - j0 < 2:
        raise SystemExit("Requested bounds do not overlap the source grid.")

    crop = grid[j0 : j1 + 1, i0 : i1 + 1]
    h, w = crop.shape
    # Cell centres: the extent the grid actually spans.
    lon_min = gw + (i0 + 0.5) * dx
    lon_max = gw + (i1 + 0.5) * dx
    lat_max = gn - (j0 + 0.5) * dy
    lat_min = gn - (j1 + 0.5) * dy

    valid = np.isfinite(crop) & (crop > NODATA + 1)
    valid_fraction = float(valid.mean())
    if valid_fraction < 0.5:
        print(f"WARNING: only {valid_fraction * 100:.1f}% of this window has elevation data.")
    crop, filled = fill_nodata(crop, valid)

    elev_min = float(crop.min())
    elev_max = float(crop.max())
    span = elev_max - elev_min or 1.0
    quant = np.clip(np.rint((crop - elev_min) / span * 65535.0), 0, 65535).astype("<u2")

    out_prefix = Path(args.out)
    out_prefix.parent.mkdir(parents=True, exist_ok=True)
    height_path = out_prefix.with_name(out_prefix.name + "-height.u16")
    meta_path = out_prefix.with_name(out_prefix.name + "-terrain-meta.json")
    height_path.write_bytes(quant.tobytes())

    metres_per_px = level["res_m"]
    game_meta = {
        "width": int(w),
        "height": int(h),
        "lonMin": lon_min,
        "lonMax": lon_max,
        "latMin": lat_min,
        "latMax": lat_max,
        "elevMin": elev_min,
        "elevMax": elev_max,
        "encoding": "uint16-le, row 0 = north, elev = elevMin + v/65535*(elevMax-elevMin)",
        "metresPerPixel": metres_per_px,
        "calibrated": True,
        "kind": "dem",
        "source": meta.get("source_name") or meta.get("source_file"),
        "sourceDatasetId": meta.get("dataset_id"),
        "citation": meta.get("citation"),
        "method": (
            f"Cropped from the prepared {metres_per_px:.0f} m grid in {args.source} "
            "(itself read from the source DEM) and quantised to 16 bits."
        ),
        "limitations": [
            f"Grid spacing is {metres_per_px:.0f} m, so nothing smaller than that is represented.",
            f"{filled} no-data cells were filled from their nearest valid neighbour."
            if filled
            else "No no-data cells in this window.",
            f"Quantisation step is {span / 65535:.3f} m over a {span:.0f} m range.",
        ],
        "validFractionBeforeFill": valid_fraction,
        "created": datetime.now(timezone.utc).isoformat(),
        "tool": "scripts/prepare_game_terrain.py",
    }
    if args.name:
        game_meta["region"] = args.name
    meta_path.write_text(json.dumps(game_meta, indent=1))

    print(f"{height_path}  {w}x{h}  {height_path.stat().st_size / 1e6:.1f} MB")
    print(f"{meta_path}")
    print(f"  lon {lon_min:.4f}..{lon_max:.4f}  lat {lat_min:.4f}..{lat_max:.4f}")
    print(f"  elev {elev_min:.1f}..{elev_max:.1f} m   valid before fill {valid_fraction * 100:.1f}%   filled {filled}")


if __name__ == "__main__":
    main()
