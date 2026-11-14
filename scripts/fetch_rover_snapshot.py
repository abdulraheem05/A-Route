#!/usr/bin/env python3
"""Save local copies of NASA's Curiosity files so the app works offline or if
the (undocumented) endpoints change. The app prefers the live files and falls
back to these.

  python scripts/fetch_rover_snapshot.py

Writes public/data/rover/{waypoints,traverse,weather}.json plus provenance.json.
Files are validated as JSON and saved unmodified.
"""
import datetime
import hashlib
import json
import os
import sys
import urllib.request

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "public", "data", "rover")

FILES = {
    "waypoints": ("https://mars.nasa.gov/mmgis-maps/MSL/Layers/json/MSL_waypoints.json", "features"),
    "traverse": ("https://mars.nasa.gov/mmgis-maps/MSL/Layers/json/MSL_traverse.json", "features"),
    "weather": ("https://mars.nasa.gov/rss/api/?feed=weather&category=msl&feedtype=json", "soles"),
}


def main():
    os.makedirs(OUT, exist_ok=True)
    log = {}
    failed = False
    for name, (url, key) in FILES.items():
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "MarsWalk-data-prep/0.1"})
            raw = urllib.request.urlopen(req, timeout=120).read()
            data = json.loads(raw)
            if not isinstance(data.get(key), list):
                raise ValueError(f"expected a '{key}' list")
            with open(os.path.join(OUT, f"{name}.json"), "wb") as f:
                f.write(raw)
            log[name] = {
                "url": url,
                "retrieved": datetime.datetime.utcnow().isoformat() + "Z",
                "bytes": len(raw),
                "sha256": hashlib.sha256(raw).hexdigest(),
                "records": len(data[key]),
            }
            extra = ""
            if name == "waypoints":
                sols = [f["properties"].get("sol") for f in data[key] if f.get("properties")]
                sols = [s for s in sols if isinstance(s, (int, float))]
                if sols:
                    extra = f", sols {int(min(sols))}-{int(max(sols))}"
            print(f"{name:10s} {len(data[key]):6d} records, {len(raw) / 1e6:.2f} MB{extra}")
        except Exception as e:  # keep going; report at the end
            failed = True
            print(f"{name:10s} FAILED: {e}")
    with open(os.path.join(OUT, "provenance.json"), "w") as f:
        json.dump(log, f, indent=2)
    if failed:
        sys.exit(1)


if __name__ == "__main__":
    main()
