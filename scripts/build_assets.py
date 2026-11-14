#!/usr/bin/env python3
"""MarsWalk asset pipeline (this is the pipeline that produced the shipped assets).

Usage:  python3 scripts/build_assets.py "<path to Jezero Crater folder>"

Outputs (relative to project root):
  public/terrain/jezero-height.u16   uint16 LE height grid (row 0 = north)
  public/terrain/terrain-meta.json   georeferencing + calibration metadata
  public/terrain/jezero-surface.jpg  Mars-tinted relief texture (derived from the preview's shading)
  public/maps/jezero-dem-preview.jpg the supplied colour DEM preview, untouched pixels
  public/panoramas/*.jpg, thumbs/    web-ready copies of the supplied panoramas
  data/panorama-catalog.json         catalogue (dimensions, type, sols, coordinates, confidence)
  data/traverse.json                 decimated official waypoints

IMPORTANT: the supplied "DEM" is a colour-shaded JPG preview, not an elevation raster.
Heights are *estimated* from hue and calibrated against rover waypoint elevations.
Use scripts/prepare-terrain.js with the real GeoTIFF to replace them.
"""
import sys, os, re, json, csv, math, colorsys
import numpy as np
from PIL import Image
from scipy import ndimage as ndi
Image.MAX_IMAGE_PIXELS = None

SRC = sys.argv[1]
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
R_MARS = 3396190.0
# Extent published by USGS for "Mars 2020 Science Investigation CTX DEM Mosaic"
# (4456 x 5067 px @ 20 m; the supplied preview has the same aspect ratio).
EXT = dict(lonMin=76.99, lonMax=78.58, latMin=17.58, latMax=19.29)

def decode(name):
    return re.sub(r'#U([0-9a-fA-F]{4})', lambda m: chr(int(m.group(1), 16)), name)

# ---------------------------------------------------------------- traverse
rows = list(csv.DictReader(open(os.path.join(ROOT, 'data/waypoints-decimated.csv'))))
wps = [dict(sol=int(r['sol']), lon=float(r['lon']), lat=float(r['lat']), elev=round(float(r['elev_geoid']), 2)) for r in rows]
def dist(a, b):
    lat0 = math.radians(18.4446)
    dx = math.radians(b['lon'] - a['lon']) * R_MARS * math.cos(lat0)
    dy = math.radians(b['lat'] - a['lat']) * R_MARS
    return math.hypot(dx, dy)
json.dump(dict(
    source='NASA/JPL-Caltech Mars 2020 mission waypoints (M20_waypoints.json, mars.nasa.gov/mmgis-maps)',
    resolution='decimated',
    note='Bundled subset: roughly one official waypoint every 8 sols (sols 13-2006). Straight segments between them cut corners of the real drive path. Run `npm run fetch:traverse` to replace with every official waypoint.',
    elevationDatum='elev_geoid (m, relative to Mars areoid) as published in the waypoint file',
    waypoints=wps), open(os.path.join(ROOT, 'data/traverse.json'), 'w'), indent=0)

def position_at_sol(sol):
    prev = wps[0]; nxt = None
    for i, w in enumerate(wps):
        if w['sol'] <= sol: prev = w; nxt = wps[i + 1] if i + 1 < len(wps) else None
    unc = 0.0
    if sol < wps[0]['sol']: unc = 0.0          # rover had not driven before the first waypoint (landing spot)
    elif nxt is not None and prev['sol'] != sol: unc = dist(prev, nxt)
    return prev, unc

# ---------------------------------------------------------------- terrain
dem_file = [f for f in os.listdir(SRC) if 'DEM' in f][0]
dem = Image.open(os.path.join(SRC, dem_file)).convert('RGB')
W, H = dem.size
rgb = np.asarray(dem).astype(np.float32) / 255.0
sm = np.stack([ndi.gaussian_filter(rgb[..., c], 1.0) for c in range(3)], -1)
mx = sm.max(-1); mn = sm.min(-1); d = mx - mn
sat = np.where(mx > 0, d / np.maximum(mx, 1e-6), 0)
r, g, b = sm[..., 0], sm[..., 1], sm[..., 2]
hue = np.zeros_like(mx)
dd = np.maximum(d, 1e-6)
hue = np.where(mx == r, ((g - b) / dd) % 6, hue)
hue = np.where(mx == g, (b - r) / dd + 2, hue)
hue = np.where(mx == b, (r - g) / dd + 4, hue)
hue = hue * 60.0
# hue -> elevation anchors, fitted by eye to rover waypoint elevations (see calibration report below)
ANCH = [(0, -1850), (9, -1880), (17, -2040), (40, -2220), (49, -2354), (54, -2400), (56, -2420),
        (72, -2495), (76, -2530), (92, -2575), (133, -2700), (200, -2900)]
hx = np.array([a[0] for a in ANCH], np.float32); hy = np.array([a[1] for a in ANCH], np.float32)
h2 = np.where(hue > 300, 0, np.clip(hue, 0, 200))
elev = np.interp(h2, hx, hy).astype(np.float32)
valid = sat >= 0.15
# pale reddish pixels: the ramp fades maroon -> pale -> white at the top, where hue stops being meaningful
pale_top = (sat < 0.30) & (sat >= 0.15) & ((hue < 30) | (hue > 300))
elev = np.where(pale_top, ANCH[0][1], elev)
# near-white patches: top of the colour ramp if they are surrounded by high ground (otherwise leave to interpolation)
white = (sat < 0.15) & (mx > 0.75)
lab, n = ndi.label(white)
for i in range(1, n + 1):
    comp = lab == i
    if comp.sum() < 12: continue
    ring = ndi.binary_dilation(comp, iterations=4) & valid
    if ring.sum() and elev[ring].mean() > -2050:
        elev[comp] = ANCH[0][1]; valid = valid | comp
# fill unreliable (desaturated) pixels by normalised diffusion from valid neighbours
num = elev * valid; den = valid.astype(np.float32)
for sigma in (2, 4, 8, 16, 32, 64):
    n2 = ndi.gaussian_filter(num, sigma); d2 = ndi.gaussian_filter(den, sigma)
    fill = n2 / np.maximum(d2, 1e-6)
    todo = (~valid) & (d2 > 0.05)
    elev = np.where(todo & (den == 0), fill, elev); den = np.where(todo, 1.0, den); num = elev * den
elev = ndi.gaussian_filter(elev, 1.6)
unresolved_frac = float((~valid).mean())

# calibration residuals against waypoints
res = []
for w in wps:
    x = (w['lon'] - EXT['lonMin']) / (EXT['lonMax'] - EXT['lonMin']) * (W - 1)
    y = (EXT['latMax'] - w['lat']) / (EXT['latMax'] - EXT['latMin']) * (H - 1)
    e = ndi.map_coordinates(elev, [[y], [x]], order=1)[0]
    res.append((w['sol'], e - w['elev']))
ra = np.array([r_[1] for r_ in res])
floor = np.array([r_[1] for r_ in res if r_[0] <= 1250]); rim = np.array([r_[1] for r_ in res if r_[0] > 1250])
print(f"calibration residuals (DEM-estimate minus rover): all RMS={np.sqrt((ra**2).mean()):.0f} m; "
      f"floor+fan (sol<=1250) RMS={np.sqrt((floor**2).mean()):.0f} m max={np.abs(floor).max():.0f}; "
      f"rim (sol>1250) RMS={np.sqrt((rim**2).mean()):.0f} m max={np.abs(rim).max():.0f}")

emin, emax = float(elev.min()), float(elev.max())
u16 = np.round((elev - emin) / (emax - emin) * 65535).astype('<u2')
os.makedirs(os.path.join(ROOT, 'public/terrain'), exist_ok=True)
u16.tofile(os.path.join(ROOT, 'public/terrain/jezero-height.u16'))
meta = dict(
    width=W, height=H, **EXT, elevMin=emin, elevMax=emax, encoding='uint16-le, row 0 = north, elev = elevMin + v/65535*(elevMax-elevMin)',
    metresPerPixel=round((EXT['latMax'] - EXT['latMin']) * math.pi / 180 * R_MARS / H, 1),
    calibrated=False, textureBounds=EXT,
    kind='preview-derived',
    source=decode(dem_file),
    method='Elevation estimated from the HUE of a colour-shaded JPG preview and anchored to rover waypoint elevations. Not a measurement.',
    residuals=dict(allRmsM=round(float(np.sqrt((ra**2).mean()))), floorFanRmsM=round(float(np.sqrt((floor**2).mean()))), rimRmsM=round(float(np.sqrt((rim**2).mean())))),
    limitations=[
        'Preview resolution is ~87 m/pixel, not the 20 m/pixel of the real DEM.',
        'Extent taken from USGS product metadata rounded to 0.01 deg: horizontal registration uncertainty is roughly 300-600 m.',
        'The colour ramp is ambiguous above about -1900 m (reds/maroons/white): everything higher is clipped near -1850 m, so the crater rim crest and the south-east massif are too low.',
        f'{unresolved_frac*100:.1f}% of pixels were too desaturated to read and were interpolated from neighbours.',
        'Elevations below the lowest rover waypoint (-2586 m) are extrapolated.'],
    replaceWith='JEZ_ctx_B_soc_008_DTM_MOLAtopography_DeltaGeoid_20m_Eqc_latTs0_lon0.tif or the Mars 2020 Science Investigation CTX DEM Mosaic GeoTIFF (USGS Astrogeology); see README.')
json.dump(meta, open(os.path.join(ROOT, 'public/terrain/terrain-meta.json'), 'w'), indent=1)

# Mars-tinted relief texture: keep only local shading detail of the preview, drop the false colour
val = rgb.max(-1); local = val / np.maximum(ndi.gaussian_filter(val, 18), 1e-3)
local = np.clip((local - 0.55) / 0.9, 0, 1)
# gentle large-scale albedo variation with elevation (visual only)
t = np.clip((elev - emin) / (emax - emin), 0, 1)[..., None]
dark = np.array([0.25, 0.185, 0.145]); light = np.array([0.80, 0.69, 0.575])
tint = dark + (light - dark) * local[..., None]
tint = tint * (0.92 + 0.12 * t)
surf = Image.fromarray(np.clip(tint * 255, 0, 255).astype(np.uint8)).resize((W * 2, H * 2), Image.BICUBIC)
surf.save(os.path.join(ROOT, 'public/terrain/jezero-surface.jpg'), quality=86)
os.makedirs(os.path.join(ROOT, 'public/maps'), exist_ok=True)
dem.save(os.path.join(ROOT, 'public/maps/jezero-dem-preview.jpg'), quality=92)
print('terrain', W, H, 'elev range', round(emin), round(emax), 'unresolved', round(unresolved_frac, 3))

# ---------------------------------------------------------------- panoramas
# key (substring of decoded filename) -> catalogue info. Sols and numbering from the
# Mastcam-Z 360-degree Panorama Collection (ASU) unless stated otherwise.
P = [
 ('Octavia', 'octavia-butler-landing', 'Octavia E. Butler Landing Site', 1, [3, 11], 'm01', 'listed', 0.10),
 ('First View Inside', 'seitah-first-view', 'First View Inside Séítah', 8, [181, 182], 'm02', 'probable', 0.10),
 ('Mosaic Outcrop', 'seitah-martre-outcrop', 'Martre "Mosaic" Outcrop within Séítah', 10, [207, 209], 'm03', 'listed', 0.12),
 ('Village', 'seitah-village-outcrop', '"Village" Outcrop within Séítah', 11, [213, 215], 'm03', 'listed', 0.10),
 ('tah mosaic', 'seitah-mosaic', 'Séítah Mosaic', 13, [286, 328], 'm03', 'probable', 0.10),
 ('Adziilii', 'adziilii-crater', 'East Side of Adziilii Crater', 15, [356, 356], 'm04', 'listed', 0.10),
 ('Chal-like', 'sid-chal-rocks', 'Sid Sample Target and Ch\'ał-like Rocks', 16, [363, 372], 'm04', 'listed', 0.10),
 ('Rose River', 'rose-river-falls', 'Rose River Falls Workspace', 17, [454, 454], 'm05', 'listed', 0.10),
 ('Rockytop', 'rockytop-scarp', 'Rockytop Scarp', 18, [466, 474], 'm05', 'listed', 0.20),
 ('Skinner', 'skinner-ridge', 'Skinner Ridge', 19, [484, 492], 'm05', 'listed', 0.15),
 ('Wildcat', 'wildcat-ridge', 'Wildcat Ridge', 20, [518, 534], 'm05', 'listed', 0.15),
 ('Enchanted', 'enchanted-lake', 'Enchanted Lake', 21, [566, 586], 'm05', 'listed', 0.10),
 ('Hidden Harbor', 'hidden-harbor', 'Hidden Harbor Workspace', 22, [614, 619], 'm05', 'listed', 0.15),
 ('Three Forks', 'three-forks-depot', 'Three Forks Sample Depot', 23, [670, 670], 'm06', 'listed', 0.12),
 ('Belva', 'belva-crater', 'Belva Crater, Onahu, Powell Peak, Mount Julian and Echo Creek', 25, [789, 789], 'm07', 'listed', 0.08),
 ('Stone Man', 'stone-man-pass', 'Stone Man Pass, Flint Pass, Parika Lake, Echo Creek and Powell Peak', 26, [817, 817], 'm07', 'listed', 0.08),
 ('Snowdrift', 'snowdrift-peak', 'Snowdrift Peak Region (boulder context)', 27, [840, 840], 'm07', 'listed', 0.25),
 ('Lookout Mountain', 'lookout-mountain', 'Lookout Mountain, Mount Meeker, Adam’s Falls and Marigold Pond', 28, [857, 866], 'm07', 'listed', 0.10),
 ('DreamLake', 'dream-lake', 'Dream Lake Workspace', 29, [873, 884], 'm07', 'listed', 0.08),
 ('Howard', 'howard-mountain', 'Howard Mountain', 30, [889, 896], 'm07', 'listed', 0.08),
 ('Turquoise', 'turquoise-bay', 'Turquoise Bay', 31, [933, 944], 'm07', 'listed', 0.10),
 ('Airey', 'airey-hill', 'Airey Hill', 32, [962, 965], 'm07', 'listed', 0.03),
 ('Flat Point', 'flat-point', 'Flat Point', 33, [995, 996], 'm07', 'listed', 0.10),
 ('Bunbury', 'bunbury', 'Bunbury Margin Unit', 34, [1009, 1009], 'm07', 'listed', 0.10),
 ('Bessieres', 'bessieres-island', 'Bessieres Island Margin Unit', 35, [1024, 1039], 'm07', 'listed', 0.06),
 ('Neretva', 'neretva-vallis', 'Neretva Vallis', 38, [1155, 1155], 'm08', 'listed', 0.15),
 ('BrightAngel', 'bright-angel', 'Bright Angel Outcrop', 39, [1178, 1178], 'm08', 'listed', 0.20),
 ('Rio Chiquito', 'rio-chiquito', 'Rio Chiquito Workspace and Western Pico Turquino', 40, [1337, 1337], 'm09', 'listed', 0.20),
 ('Lookout Hill', 'lookout-hill', 'Jezero Crater Rim Crest at Lookout Hill', 41, [1356, 1358], 'm09', 'listed', 0.12),
 ('Trout River', 'trout-river-shallow-bay', 'Trout River / Shallow Bay', 42, [1399, 1399], 'm09', 'listed', 0.15),
 ('South Arm', 'south-arm', 'South Arm', 43, [1412, 1412], 'm09', 'listed', 0.20),
 ('Broompoint', 'broom-point', 'Broom Point', 44, [1438, 1443], 'm09', 'listed', 0.15),
 ('Fallbreen', 'fallbreen', 'Fallbreen (Falbreen)', 45, [1516, 1516], 'm09', 'listed', 0.20),
 ('Vernodden', 'vernodden', 'Vernodden', 46, [1603, 1603], 'm09', 'listed', 0.20),
 ('taylorfjellet', 'taylorfjellet', 'Taylorfjellet', 47, [1618, 1621], 'm09', 'listed', 0.20),
 ('Plankeholmane', 'plankeholmane', 'Plankeholmane', 48, [1660, 1660], 'm09', 'listed', 0.20),
 ('Tatarka', 'tatarka', 'Tatarka', 49, [1695, 1695], 'm09', 'listed', 0.20),
 ('Crocodile', 'crocodile-bridge', 'Crocodile Bridge', 50, [1717, 1754], 'm10', 'listed', 0.12),
 ('Olifants', 'olifants', 'Olifants', 51, [1775, 1775], 'm10', 'listed', 0.12),
 ('Vingeanne', 'vingeanne', 'Vingeanne', 52, [1823, 1823], 'm10', 'listed', 0.20),
 ('Arbot', 'arbot', 'Arbot (Lac de Charmes)', None, [1882, 1882], 'm10', 'press-release', 0.12),
 ('Origney', 'origny', 'Origny', None, None, None, 'unknown', 0.15),
 ('Groloy', 'groloy-vertical', 'Groloy (vertical projection)', None, None, None, 'unknown', 0.0),
 ('Marble', 'marble-mountain', 'Marble Mountain', None, None, None, 'unknown', 0.15),
 ('Post-Drive', 'post-drive-horizon', 'Post-Drive Horizon', None, None, None, 'unknown', 0.45),
]
NOTES = {
 'seitah-first-view': 'Filename does not match a collection title exactly; matched to 360 Panorama #8 "Séítah Outcrop 1" (sols 181-182). Treat the sol as probable.',
 'seitah-mosaic': 'Could be 360 Panorama #13 (sols 286-328) or #14 (sol 320); the rover was parked at the same place for both, so the position is unaffected.',
 'vingeanne': 'The ASU page title says sol 1775 but its caption says sol 1823; panorama #51 (Olifants) is sol 1775, so 1823 is used.',
 'crocodile-bridge': 'Acquired over the 2025/2026 solar conjunction (sol 1717, partial re-imaging sol 1754).',
 'arbot': 'Not a 360 collection entry: a 46-frame Mastcam-Z mosaic released by NASA/JPL (PIA26753), sol 1882. Azimuth coverage is not published; shown as a partial panorama.',
 'origny': 'No sol found for this image. Supplied file is named "Origney". Lac de Charmes-era naming suggests 2026, but that is not a position.',
 'marble-mountain': 'No sol found for this image.',
 'post-drive-horizon': 'No sol found for this image; it is a narrow horizon strip.',
 'groloy-vertical': 'A vertical ("north-up, looking down") projection of a panorama, not a cylindrical view. No sol found. Displayed flat.',
 'airey-hill': 'Supplied file is a screenshot of the Gigapan viewer and includes its azimuth/elevation tick labels.',
 'lookout-hill': 'Supplied file is a screenshot of the Gigapan viewer and includes its tick marks.',
 'bessieres-island': 'Supplied file includes an azimuth/elevation grid overlay in its no-data areas.',
}
PARTIAL = {'arbot': 'partial-cylindrical', 'groloy-vertical': 'vertical-projection', 'post-drive-horizon': 'horizon-strip'}
os.makedirs(os.path.join(ROOT, 'public/panoramas/thumbs'), exist_ok=True)
cat = []; used = set()
files = sorted(f for f in os.listdir(SRC) if 'DEM' not in f)
for f in files:
    name = decode(f)
    hit = [p for p in P if p[0] in name]
    assert len(hit) == 1, (name, hit)
    key, pid, title, num, sols, mission, solSrc, horizon = hit[0]; used.add(pid)
    im = Image.open(os.path.join(SRC, f)); w, h = im.size; fmt = im.format; mode = im.mode
    if mode == 'RGBA':
        bg = Image.new('RGBA', im.size, (0, 0, 0, 255)); bg.alpha_composite(im); out = bg.convert('RGB')
    else: out = im.convert('RGB')
    if out.width > 8192: out = out.resize((8192, round(out.height * 8192 / out.width)), Image.LANCZOS)
    out.save(os.path.join(ROOT, f'public/panoramas/{pid}.jpg'), quality=90)
    th = out.resize((640, max(1, round(out.height * 640 / out.width))), Image.LANCZOS)
    th.save(os.path.join(ROOT, f'public/panoramas/thumbs/{pid}.jpg'), quality=78)
    ptype = PARTIAL.get(pid, 'cylindrical-360')
    entry = dict(id=pid, name=title, originalFilename=name, file=f'/panoramas/{pid}.jpg', thumb=f'/panoramas/thumbs/{pid}.jpg',
                 width=w, height=h, aspect=round(w / h, 3), originalFormat=fmt, originalMode=mode,
                 type=ptype, mastcamZPanoramaNumber=num, sols=sols, solSource=solSrc, missionId=mission,
                 source='NASA/JPL-Caltech/ASU/MSSS (Mastcam-Z)', available=True, note=NOTES.get(pid, ''))
    if ptype == 'cylindrical-360':
        entry['projection'] = dict(azimuthSpanDeg=360, azimuthSpanSource='Mastcam-Z 360 Panorama Collection (cylindrical projection)',
                                   verticalSpanDeg=round(360 * h / w, 1), verticalSpanSource='assumes equal degrees per pixel on both axes (not published with the file)',
                                   horizonFromTop=horizon, horizonSource='estimated by eye from the image', northAzimuthPx=None)
    elif ptype == 'partial-cylindrical':
        entry['projection'] = dict(azimuthSpanDeg=180, azimuthSpanSource='UNKNOWN - placeholder default; adjust in the viewer', verticalSpanDeg=round(180 * h / w, 1),
                                   verticalSpanSource='assumed', horizonFromTop=horizon, horizonSource='estimated by eye', northAzimuthPx=None)
    elif ptype == 'horizon-strip':
        entry['projection'] = dict(azimuthSpanDeg=360, azimuthSpanSource='UNKNOWN - assumed; adjust in the viewer', verticalSpanDeg=round(360 * h / w, 1),
                                   verticalSpanSource='assumed', horizonFromTop=horizon, horizonSource='estimated by eye', northAzimuthPx=None)
    else: entry['projection'] = None
    if sols:
        wp, unc = position_at_sol(sols[0])
        conf = 'high' if unc < 30 else ('approximate' if unc < 300 else 'coarse')
        entry['coordinates'] = dict(latitude=wp['lat'], longitude=wp['lon'], elevationM=wp['elev'])
        entry['coordinateConfidence'] = conf
        entry['coordinateUncertaintyM'] = round(unc)
        entry['coordinateMethod'] = f"Rover position from official waypoint at sol {wp['sol']} (latest bundled waypoint at or before sol {sols[0]}); uncertainty = distance to the next bundled waypoint."
    else:
        entry['coordinates'] = dict(latitude=None, longitude=None, elevationM=None)
        entry['coordinateConfidence'] = 'unresolved'; entry['coordinateUncertaintyM'] = None
        entry['coordinateMethod'] = 'No acquisition sol could be established, so no rover position was assigned.'
    cat.append(entry)
missing = [p[1] for p in P if p[1] not in used]
assert not missing, missing
cat.sort(key=lambda e: (e['sols'][0] if e['sols'] else 99999, e['id']))
json.dump(cat, open(os.path.join(ROOT, 'data/panorama-catalog.json'), 'w'), indent=1, ensure_ascii=False)
for e in cat: print(f"{e['id']:26s} {e['width']}x{e['height']} {e['type']:20s} sols={e['sols']} {e['coordinateConfidence']} ±{e['coordinateUncertaintyM']}")
