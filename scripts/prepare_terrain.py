#!/usr/bin/env python3
"""Turn real Gale crater DEMs into browser-friendly elevation files.

Nothing here invents, smooths or fills elevation. Values are resampled from
the source rasters onto a regular lon/lat grid (sphere radius 3,396,190 m,
planetocentric latitude, east longitude) and written with their provenance.

Commands
--------
  crater   Crater-wide grid for the whole display region.
             python scripts/prepare_terrain.py crater
               default source: USGS MOLA-HRSC blend, 200 m (D03), read remotely
             python scripts/prepare_terrain.py crater --source hrsc30 \
                    --input data/raw/hrsc_km09_h1938_h1927_h1916-dtm-mosaic.tif
               30 m HRSC mosaic (D02), gridded at 100 m by default
           Output: public/data/terrain/crater/{meta.json, L0.bin, L1.bin, ...}

  rover    Tiled elevation for the rover region from the 1 m MSL DEM (D01).
             python scripts/prepare_terrain.py rover --res 16
             python scripts/prepare_terrain.py rover --res 16 4     (adds close-range detail, about 250 MB)
           Needs data/raw/MSL_Gale_DEM_Mosaic_1m_v3.tif (scripts/download_data.py msl-dem).
           Output: public/data/terrain/rover/{meta.json, r16/<row>_<col>.bin, ...}

  check    Vertical-datum check: sample rasters at Bradbury Landing and compare
           with the elevation in NASA's waypoint file (-4500.971 m).
             python scripts/prepare_terrain.py check data/raw/a.tif data/raw/b.tif

File formats
------------
  crater  Float32 little-endian, row 0 = north, NODATA = -32768.
  rover   Uint16 little-endian tiles of 257 x 257 samples (256 + 1 overlap):
          elevation_m = value * 0.1 - 6000, value 0 = no data.
"""
import argparse
import datetime
import json
import math
import os
import sys

import numpy as np

try:
    import rasterio
    from rasterio.crs import CRS
    from rasterio.enums import Resampling
    from rasterio.transform import from_origin
    from rasterio.vrt import WarpedVRT
    from rasterio.warp import transform as warp_transform
    from rasterio.warp import transform_bounds
    from rasterio.windows import Window
except ImportError:  # pragma: no cover
    sys.exit("rasterio is required:  pip install -r scripts/requirements.txt")

R_MARS = 3396190.0
M_PER_DEG = math.pi * R_MARS / 180.0
GALE = dict(west=135.1842593, east=139.2413012, south=-6.5732988, north=-2.8077809)
BRADBURY = dict(lon=137.441633, lat=-4.589467, elev=-4500.971)
NODATA = -32768.0

MARS_GEO = CRS.from_proj4("+proj=longlat +a=3396190 +b=3396190 +no_defs")

ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
OUT = os.path.join(ROOT, "public", "data", "terrain")

SOURCES = {
    "blend200": {
        "dataset_id": "D03",
        "name": "MGS MOLA - MEX HRSC Blended DEM Global 200m v2 (USGS)",
        "url": "https://planetarymaps.usgs.gov/mosaic/Mars/HRSC_MOLA_Blend/Mars_HRSC_MOLA_BlendDEM_Global_200mp_v2.tif",
        "source_page": "https://astrogeology.usgs.gov/search/map/mars_mgs_mola_mex_hrsc_blended_dem_global_200m",
        "citation": "Fergason, R.L., Hare, T.M., Laura, J., 2018, Astrogeology PDS Annex, USGS.",
        "default_res": 200.0,
    },
    "hrsc30": {
        "dataset_id": "D02",
        "name": "30-m HRSC DTM Mosaic of Gale Crater (Persaud et al. 2021)",
        "url": None,
        "source_page": "https://zenodo.org/record/5808354",
        "citation": "Persaud, D.M., Putri, A.D.R., Muller, J.-P., 2021, Zenodo, doi:10.5281/zenodo.5808354.",
        "default_res": 100.0,
    },
}

ROVER_SOURCE = {
    "dataset_id": "D01",
    "name": "Mars MSL Gale Merged DEM 1m v3 (USGS)",
    "source_page": "https://astrogeology.usgs.gov/search/map/mars_msl_gale_merged_dem_1m",
    "citation": "Calef III, F.J. and Parker, T., 2016, PDS Annex, USGS.",
    "default_input": os.path.join(ROOT, "data", "raw", "MSL_Gale_DEM_Mosaic_1m_v3.tif"),
}
TILE = 256
ROVER_SCALE = 0.1
ROVER_OFFSET = -6000.0


def open_source(path):
    env = rasterio.Env(
        GDAL_DISABLE_READDIR_ON_OPEN="EMPTY_DIR",
        CPL_VSIL_CURL_ALLOWED_EXTENSIONS=".tif",
        GDAL_HTTP_MAX_RETRY="4",
        GDAL_HTTP_RETRY_DELAY="2",
    )
    env.__enter__()
    src = rasterio.open(path)
    if src.crs is None:
        sys.exit(f"{path} has no coordinate reference system; cannot georeference it.")
    return src


def warped(src, west, north, dx, dy, width, height, resampling):
    return WarpedVRT(
        src,
        crs=MARS_GEO,
        transform=from_origin(west, north, dx, dy),
        width=width,
        height=height,
        resampling=resampling,
        src_nodata=src.nodata,
        nodata=NODATA,
        dtype="float32",
    )


def clean(arr):
    arr = np.asarray(arr, dtype=np.float32)
    bad = ~np.isfinite(arr) | (arr <= NODATA + 1) | (np.abs(arr) > 30000)
    arr[bad] = NODATA
    return arr


def downsample2(a):
    """Halve resolution by block mean, ignoring NODATA."""
    h2, w2 = a.shape[0] // 2, a.shape[1] // 2
    b = a[: h2 * 2, : w2 * 2].reshape(h2, 2, w2, 2).astype(np.float64)
    valid = b != NODATA
    total = np.where(valid, b, 0.0).sum(axis=(1, 3))
    count = valid.sum(axis=(1, 3))
    out = np.where(count > 0, total / np.maximum(count, 1), NODATA)
    return out.astype(np.float32)


def sample_point(src, lon, lat):
    """Nearest-pixel value of a raster at a Mars lon/lat, or None."""
    xs, ys = warp_transform(MARS_GEO, src.crs, [lon], [lat])
    try:
        row, col = src.index(xs[0], ys[0])
    except Exception:
        return None
    if row < 0 or col < 0 or row >= src.height or col >= src.width:
        return None
    v = src.read(1, window=Window(col, row, 1, 1))[0, 0]
    if not np.isfinite(v) or (src.nodata is not None and v == src.nodata):
        return None
    return float(v)


def cmd_crater(args):
    spec = SOURCES[args.source]
    path = args.input or spec["url"]
    if not path:
        sys.exit("--input is required for this source (see scripts/download_data.py hrsc).")
    res_m = args.res or spec["default_res"]
    step = res_m / M_PER_DEG
    width = int(math.ceil((GALE["east"] - GALE["west"]) / step))
    height = int(math.ceil((GALE["north"] - GALE["south"]) / step))
    print(f"Source : {spec['name']}\n         {path}")
    print(f"Grid   : {width} x {height} at {res_m:g} m ({step:.6f} deg)")
    if path.startswith("http"):
        print("Reading remotely; only the Gale window is transferred. This can take a few minutes.")

    src = open_source(path)
    native = abs(src.transform.a) if not src.crs.is_geographic else abs(src.transform.a) * M_PER_DEG
    resampling = Resampling.average if res_m > 1.5 * native else Resampling.bilinear
    with warped(src, GALE["west"], GALE["north"], step, step, width, height, resampling) as vrt:
        arr = clean(vrt.read(1))
    valid = arr != NODATA
    if not valid.any():
        sys.exit("The source has no data inside the Gale window.")

    landing_raw = sample_point(src, BRADBURY["lon"], BRADBURY["lat"])
    if args.offset:
        arr[valid] += np.float32(args.offset)
        print(f"Applied constant vertical offset of {args.offset:+g} m (recorded in meta.json).")

    out_dir = os.path.join(OUT, "crater")
    os.makedirs(out_dir, exist_ok=True)
    levels = []
    level, k = arr, 0
    while True:
        name = f"L{k}.bin"
        level.astype("<f4").tofile(os.path.join(out_dir, name))
        levels.append(
            dict(
                file=name,
                width=int(level.shape[1]),
                height=int(level.shape[0]),
                west=GALE["west"],
                north=GALE["north"],
                dx=step * 2**k,
                dy=step * 2**k,
                res_m=res_m * 2**k,
            )
        )
        print(f"  wrote {name}: {level.shape[1]} x {level.shape[0]}")
        if max(level.shape) <= 320:
            break
        level = downsample2(level)
        k += 1

    landing = None
    if landing_raw is not None:
        val = landing_raw + (args.offset or 0.0)
        landing = dict(sampled_m=val, expected_m=BRADBURY["elev"], diff_m=val - BRADBURY["elev"])
        print(
            f"Datum check at Bradbury Landing: {val:.1f} m here vs {BRADBURY['elev']:.1f} m in NASA's waypoint file "
            f"(difference {landing['diff_m']:+.1f} m)."
        )
        if abs(landing["diff_m"]) > 50:
            print(
                "  WARNING: large difference. This raster is probably referenced to a different vertical surface\n"
                "  (for example the sphere instead of the areoid). See README, 'Vertical datum'."
            )

    meta = dict(
        dataset_id=spec["dataset_id"],
        source_name=spec["name"],
        source_page=spec["source_page"],
        source_file=path,
        citation=spec["citation"],
        evidence_class="Derived",
        res_m=res_m,
        native_res_m=native,
        resampling=resampling.name,
        crs="+proj=longlat +a=3396190 +b=3396190 +no_defs (planetocentric, east-positive)",
        units="metres",
        nodata=NODATA,
        min=float(arr[valid].min()),
        max=float(arr[valid].max()),
        valid_fraction=float(valid.mean()),
        applied_vertical_offset_m=float(args.offset or 0.0),
        landing_check=landing,
        bounds=GALE,
        levels=levels,
        created=datetime.datetime.utcnow().isoformat() + "Z",
        tool="scripts/prepare_terrain.py crater",
    )
    with open(os.path.join(out_dir, "meta.json"), "w") as f:
        json.dump(meta, f, indent=2)
    print(f"Elevation range {meta['min']:.1f} to {meta['max']:.1f} m; {100 * meta['valid_fraction']:.1f} % of the window has data.")
    print(f"Done -> {os.path.relpath(out_dir, ROOT)}")


def cmd_rover(args):
    path = args.input or ROVER_SOURCE["default_input"]
    if not os.path.exists(path):
        sys.exit(f"{path} not found. Run:  python scripts/download_data.py msl-dem")
    src = open_source(path)
    west, south, east, north = transform_bounds(src.crs, MARS_GEO, *src.bounds, densify_pts=21)
    print(f"Source : {ROVER_SOURCE['name']}\n         {path}")
    print(f"Extent : {west:.6f}..{east:.6f} E, {south:.6f}..{north:.6f}")
    landing = sample_point(src, BRADBURY["lon"], BRADBURY["lat"])
    if landing is not None:
        print(f"Datum check at Bradbury Landing: {landing:.1f} m vs {BRADBURY['elev']:.1f} m in NASA's waypoint file.")

    out_dir = os.path.join(OUT, "rover")
    os.makedirs(out_dir, exist_ok=True)
    levels = []
    for res_m in sorted(set(args.res)):
        step = res_m / M_PER_DEG
        width = int(math.ceil((east - west) / step))
        height = int(math.ceil((north - south) / step))
        cols = int(math.ceil(width / TILE))
        rows = int(math.ceil(height / TILE))
        name = f"r{res_m:g}".replace(".", "p")
        level_dir = os.path.join(out_dir, name)
        os.makedirs(level_dir, exist_ok=True)
        resampling = Resampling.average if res_m > 1.5 else Resampling.bilinear
        present = []
        print(f"Level {res_m:g} m: {width} x {height} samples, {cols} x {rows} tiles")
        # The warped grid is padded to whole tiles (+1 overlap) so every tile read is in range.
        with warped(src, west, north, step, step, cols * TILE + 1, rows * TILE + 1, resampling) as vrt:
            for r in range(rows):
                for c in range(cols):
                    arr = clean(vrt.read(1, window=Window(c * TILE, r * TILE, TILE + 1, TILE + 1)))
                    valid = arr != NODATA
                    if not valid.any():
                        continue
                    q = np.zeros(arr.shape, dtype=np.uint16)
                    q[valid] = np.clip(np.rint((arr[valid] - ROVER_OFFSET) / ROVER_SCALE), 1, 65535).astype(np.uint16)
                    q.astype("<u2").tofile(os.path.join(level_dir, f"{r}_{c}.bin"))
                    present.append(f"{r}_{c}")
                sys.stdout.write(f"\r  row {r + 1}/{rows}")
                sys.stdout.flush()
        print(f"\n  wrote {len(present)} tiles")
        levels.append(
            dict(
                res_m=res_m,
                dir=name,
                tile=TILE,
                cols=cols,
                rows=rows,
                width=width,
                height=height,
                west=west,
                north=north,
                dx=step,
                dy=step,
                scale=ROVER_SCALE,
                offset=ROVER_OFFSET,
                present=present,
            )
        )

    levels.sort(key=lambda l: l["res_m"])  # finest first
    meta = dict(
        dataset_id=ROVER_SOURCE["dataset_id"],
        source_name=ROVER_SOURCE["name"],
        source_page=ROVER_SOURCE["source_page"],
        source_file=os.path.relpath(path, ROOT),
        citation=ROVER_SOURCE["citation"],
        evidence_class="Derived",
        units="metres",
        encoding="uint16 little-endian; elevation_m = value * scale + offset; 0 = no data; tiles are (tile+1)^2 samples",
        note="1 m content exists only where HiRISE stereo was available; the source ships no mask.",
        landing_check=None if landing is None else dict(sampled_m=landing, expected_m=BRADBURY["elev"], diff_m=landing - BRADBURY["elev"]),
        bounds=dict(west=west, east=east, south=south, north=north),
        levels=levels,
        created=datetime.datetime.utcnow().isoformat() + "Z",
        tool="scripts/prepare_terrain.py rover",
    )
    with open(os.path.join(out_dir, "meta.json"), "w") as f:
        json.dump(meta, f)
    print(f"Done -> {os.path.relpath(out_dir, ROOT)}")


def cmd_check(args):
    print(f"Bradbury Landing {BRADBURY['lon']} E, {BRADBURY['lat']}: NASA waypoint file gives {BRADBURY['elev']} m\n")
    for path in args.inputs:
        src = open_source(path)
        v = sample_point(src, BRADBURY["lon"], BRADBURY["lat"])
        if v is None:
            print(f"{path}\n  no data at the landing site")
        else:
            print(f"{path}\n  {v:.2f} m   difference {v - BRADBURY['elev']:+.2f} m")
    print(
        "\nA difference of a few metres to tens of metres is ordinary mis-registration between products.\n"
        "A difference of hundreds of metres or more means a different vertical reference surface."
    )


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)

    c = sub.add_parser("crater", help="crater-wide elevation grid")
    c.add_argument("--source", choices=sorted(SOURCES), default="blend200")
    c.add_argument("--input", help="local file or URL (overrides the source default)")
    c.add_argument("--res", type=float, help="grid spacing in metres")
    c.add_argument("--offset", type=float, default=0.0, help="constant vertical offset in metres (recorded in meta.json)")
    c.set_defaults(func=cmd_crater)

    r = sub.add_parser("rover", help="rover-region tiles from the 1 m MSL DEM")
    r.add_argument("--input", help="path to MSL_Gale_DEM_Mosaic_1m_v3.tif")
    r.add_argument("--res", type=float, nargs="+", default=[16.0], help="one or more grid spacings in metres")
    r.set_defaults(func=cmd_rover)

    k = sub.add_parser("check", help="vertical datum check at Bradbury Landing")
    k.add_argument("inputs", nargs="+")
    k.set_defaults(func=cmd_check)

    args = ap.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
