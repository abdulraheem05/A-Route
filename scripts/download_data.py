#!/usr/bin/env python3
"""Download the raw elevation files MarsWalk can use (resumable).

  python scripts/download_data.py msl-dem     # D01, 3.6 GB  (rover region, 1 m)
  python scripts/download_data.py hrsc        # D02, 312 MB  (whole crater, 30 m)

Files go to data/raw/. The default crater-wide source (D03, the USGS 200 m
MOLA-HRSC blend) is read remotely by prepare_terrain.py and needs no download.

URLs are those recorded in docs/GALE_DATA_REGISTRY.md. The Zenodo file URL is
built from the record's file name and has not been exercised; if it fails,
download the .tif by hand from https://zenodo.org/record/5808354 into data/raw/.
"""
import argparse
import hashlib
import os
import sys
import urllib.request

RAW = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "data", "raw")

TARGETS = {
    "msl-dem": {
        "url": "https://planetarymaps.usgs.gov/mosaic/Mars/MSL/MSL_Gale_DEM_Mosaic_1m_v3.tif",
        "file": "MSL_Gale_DEM_Mosaic_1m_v3.tif",
        "md5": None,
        "note": "USGS Mars MSL Gale Merged DEM 1m v3 (registry D01), about 3.6 GB",
    },
    "hrsc": {
        "url": "https://zenodo.org/records/5808354/files/hrsc_km09_h1938_h1927_h1916-dtm-mosaic.tif?download=1",
        "file": "hrsc_km09_h1938_h1927_h1916-dtm-mosaic.tif",
        "md5": "1d714f2142a56e962d50d985b7088b13",
        "note": "30-m HRSC DTM Mosaic of Gale Crater (registry D02), 311.8 MB, CC BY 4.0",
    },
}


def md5sum(path):
    h = hashlib.md5()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def download(url, dest):
    have = os.path.getsize(dest) if os.path.exists(dest) else 0
    req = urllib.request.Request(url, headers={"User-Agent": "MarsWalk-data-prep/0.1"})
    if have:
        req.add_header("Range", f"bytes={have}-")
    try:
        resp = urllib.request.urlopen(req, timeout=60)
    except urllib.error.HTTPError as e:
        if e.code == 416:  # already complete
            print("  already complete")
            return
        raise
    resumed = resp.status == 206
    if have and not resumed:
        have = 0  # server ignored the range request; start again
    total = int(resp.headers.get("Content-Length", 0)) + have
    mode = "ab" if resumed else "wb"
    done = have
    with open(dest, mode) as f:
        while True:
            chunk = resp.read(1 << 20)
            if not chunk:
                break
            f.write(chunk)
            done += len(chunk)
            if total:
                sys.stdout.write(f"\r  {done / 1e6:9.1f} / {total / 1e6:.1f} MB ({100 * done / total:5.1f} %)")
            else:
                sys.stdout.write(f"\r  {done / 1e6:9.1f} MB")
            sys.stdout.flush()
    print()


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("target", choices=sorted(TARGETS))
    args = ap.parse_args()
    t = TARGETS[args.target]
    os.makedirs(RAW, exist_ok=True)
    dest = os.path.join(RAW, t["file"])
    print(t["note"])
    print(f"  from {t['url']}")
    print(f"  to   {os.path.normpath(dest)}")
    download(t["url"], dest)
    if t["md5"]:
        got = md5sum(dest)
        if got != t["md5"]:
            sys.exit(f"MD5 mismatch: expected {t['md5']}, got {got}. Delete the file and retry.")
        print("  MD5 verified")
    print("Done.")


if __name__ == "__main__":
    main()
