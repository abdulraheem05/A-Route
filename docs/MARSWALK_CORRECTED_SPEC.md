# MARSWALK_CORRECTED_SPEC.md

MarsWalk — Gale Crater Scientific Reconstruction, corrected specification
Revision date: 2026-11-10. Supersedes the original specification.
Companion files: `GALE_DATA_REGISTRY.md` (dataset IDs D01–D25), `GALE_LANDMARK_REGISTRY.md`, `DATA_ACQUISITION_PLAN.md`, `DATA_GAPS_AND_LIMITATIONS.md`.

Status: specification only. No implementation has started.

---

## 1. Objective

Build an interactive 3-D exploration environment for Gale crater in which every pixel of terrain, every overlay value and every marker can be traced to a named dataset, and in which the interface always tells the user which of four kinds of information they are looking at.

### The four evidence classes

| Class | Definition | Examples in MarsWalk | Visual signature |
|---|---|---|---|
| **Measured** | Calibrated instrument output | CTX/HiRISE imagery; REMS daily temperatures and pressure; CRISM spectra | Solid rendering, no pattern |
| **Derived** | Computed from measurements by a documented method | DEMs, slope, hillshade, contours, thermal inertia, CRISM band-depth maps, rover localisation | Solid rendering + "Derived" tag with method |
| **Interpreted** | Scientific judgement about what the data mean | Geological units, formation names, mineral identifications, landmark extents | Outlined/hatched areas; citation always shown |
| **Simulated** | Model output | Mars Climate Database values; OpenMARS reanalysis | Dashed outlines, distinct colour family, "Model" badge that cannot be hidden |

A value can never be displayed without its class.

### What the user can do

- Explore the crater in 3-D: rim, floor (Aeolis Palus), Aeolis Mons (Mount Sharp), valleys, dunes.
- Switch between **greyscale orbital imagery**, **HiRISE enhanced colour** (rover region only), elevation, slope, aspect, thermal inertia, and — in phase 2 — CRISM spectral-parameter and geological-unit overlays.
- See Curiosity's landing site, traverse, position by sol, and drill sites.
- Click any point for elevation, slope, the datasets present there and their limits, distance to the traverse, and modelled atmospheric conditions.
- View observed weather at the rover and modelled climate elsewhere, never blended.

### Removed from the original objective

- "True-colour imagery" → no verified source. Replaced by greyscale plus labelled enhanced colour.
- "Mineralogical … layers" at crater scale from TES/THEMIS → removed (see §5).
- "Seasonal weather information" for any location from measurements → measurements exist only at the rover.

---

## 2. Region and reference frame

- Display region: lon 135.1842593°E–139.2413012°E, lat 6.5732988°S–2.8077809°S (extent of the Trek CTX mosaic, D05).
- Body: sphere of radius 3,396,190 m.
- Latitude: planetocentric. Longitude: positive east, stored as 0–360 internally; inputs in −180..180 or west-positive are converted on ingest. Gale is nowhere near the 0/360 seam, so wrap handling is an ingest concern only. (The IAU gazetteer publishes some bounds in west longitude: E = 360 − W.)
- Map projection for all rasters and tiles: equirectangular, standard parallel 0°, matching Trek's `EPSG::104905` grid.
- Scene coordinates: local tangent-plane metres with origin at Bradbury Landing (137.441633°E, −4.589467°). Curvature across the 240 km region is about 2 km of drop at the edges; the mesh is built on the sphere and then transformed, not on a flat plane.
- **Vertical datum:** one datum for the whole application — heights above the MOLA areoid, matching D01 and the waypoint file's `elev_geoid`. Each DEM's datum is verified before ingest (acquisition plan step T3). No dataset is ingested with an unverified datum.

---

## 3. Terrain

### Sources (three tiers)

| Tier | Dataset | Grid | Shown at zoom | Footprint |
|---|---|---|---|---|
| Regional | D03 MOLA–HRSC blend | 200 m | ≤ 8 | whole region |
| Crater | D02 HRSC DTM | 30 m | 9–11 | Gale |
| Rover region | D01 MSL merged DEM | 1 m | ≥ 12 | 137.124–137.681°E, 5.099–4.130°S |

Optional phase 2: individual HiRISE DTMs (D04) as insets.

### Requirements

- Elevation is stored and served as numeric values (32-bit float or lossless 16-bit quantised with documented scale/offset), separately from any colour rendering.
- Derived products — hillshade, slope, aspect, contours, profiles — are computed by MarsWalk from these DEMs and labelled "Derived (MarsWalk) from Dxx".
- Slope and aspect are computed **at the grid spacing of the tier being displayed** and reported with that baseline, e.g. "slope 14° over 30 m baseline". A slope value without its baseline is not shown.
- Inside D01, the interface states that 1 m content exists only where HiRISE stereo was available. Until a source mask exists (gaps §G2), slope, dune height and other fine measurements from D01 carry the warning "source resolution at this point unknown (1 m to >100 m)".
- Tier boundaries are blended over a narrow margin for visual continuity; the click readout always reports the tier actually sampled.
- Default vertical exaggeration is 1×. If the user changes it, the factor is shown persistently on screen.
- No procedural detail, noise, or synthetic displacement is added at any zoom.

### Measurements

Rim, floor and summit elevations, relief, valley depth, ridge height and dune height are **measured from the DEMs at build time or on demand**, never hard-coded. Each stored measurement records coordinates, DEM ID, grid spacing, method and stated DEM accuracy. Quantities that the DEM cannot support at a location are not offered there — e.g. dune heights outside HiRISE-stereo coverage.

---

## 4. Surface imagery

| Layer | Dataset | Zoom | Label |
|---|---|---|---|
| Context | D10 MOLA colour shaded relief | ≤ 7 | "Shaded-relief picture (not a photograph)" |
| Crater | D05 CTX mosaic | 8–12 | "CTX greyscale, ~10 m/px as served" |
| Rover region | D06 HiRISE mosaic | 13–16 | "HiRISE greyscale, ~0.6 m/px as served" |
| Rover region, optional | D08 HiRISE colour basemap | 13–16 | "HiRISE enhanced colour — not what the eye would see" |

- Imagery is draped using its own georeferencing. No layer is stretched to fit another.
- Registration between each image layer and the DEM beneath it is measured at control features (crater rims, the rover-track region) and the residual is published in the layer panel. If the residual exceeds two image pixels at the layer's maximum zoom, a single documented translation may be applied and recorded; no rubber-sheeting.
- Beyond a layer's maximum zoom the image is magnified with a visible "beyond native resolution" indicator; no sharpening or super-resolution.
- Illumination: imagery already contains shadows from its acquisition time. Scene lighting on textured terrain is off by default; a separate hillshade layer provides relief cues. Any time-of-day lighting mode is labelled a visualisation.

---

## 5. Geology and mineralogy

### Phase 1 (first release)

- **Unit legend and glossary** from peer-reviewed sources (landmark registry §E), with no polygons.
- **Rover-traverse stratigraphy:** the traverse coloured by the formation the rover was on, by sol interval, wherever a publication gives the interval. Class: Interpreted.
- **Thermal inertia** (D19b, THEMIS, 100 m): Derived; legend in J m⁻² K⁻¹ s⁻¹ᐟ²; stated accuracy ≈ 20 %; shown at zoom 8–12 only.
- **IAU named features** (D21).

### Phase 2 (after the data exist)

- **CRISM spectral-parameter overlays** (D18), one layer per parameter per observation, each clipped to its footprint:
  - named by what was measured — "CRISM 2.3 µm band depth (D2300) — consistent with Fe/Mg phyllosilicate", "CRISM sulfate index (SINDEX2)", "CRISM 0.86 µm band depth (BD860_2) — consistent with crystalline hematite" — never just "clay map".
  - layer panel lists observation ID, acquisition date, pixel size, processing steps and thresholds.
- **Geological-unit polygons** only from vector data obtained from the authors or digitised with permission (gaps §G3).
- **Local published GIS** (D17), each within its own extent.

### Evidence that must stay separate

| Evidence | Scale | Class | Shown as |
|---|---|---|---|
| Orbital spectroscopy (CRISM) | 12–36 m pixels, top microns of the surface | Derived → Interpreted | raster overlay |
| Orbital thermophysics (THEMIS, TES) | 100 m / ≥ 3 km | Derived | raster overlay |
| Rover remote and contact science (ChemCam, APXS, Mastcam) | cm–m | Measured | point on traverse |
| Rover laboratory analyses of drilled powder (CheMin, SAM) | one sample | Measured | drill-site card |

A drill result is never painted onto an area. An orbital detection is never described as a rock composition.

### Removed or corrected

- TES pyroxene, sheet-silicate/high-silica-glass and dust layers are not Gale layers. If the Trek layer IDs are confirmed they may appear only at regional zoom (≤ 7) as native-resolution cells under the heading "Global context".
- "THEMIS mineralogical/geological context" → replaced by THEMIS thermal inertia and daytime IR.
- "Mount Sharp stratigraphy" as continuous layers → replaced by traverse-based stratigraphy plus, later, mapped units of limited extent.
- Mount Sharp is described as a sedimentary mound; the word "volcanic" does not appear.
- Dunes are shown only where imagery shows them; no generated dunes.

---

## 6. Curiosity rover

- **Sources:** D12 waypoints and D13 traverse path, mirrored by MarsWalk's server; D14 PLACES as archival reference; D15 for drill sols.
- **Shown:** landing site; full traverse line; drive-end waypoints with sol, site/drive (RMC), odometry, elevation and attitude; drill sites.
- **Position by sol:** the rover is drawn at the last drive-end position at or before the selected sol. Sols with no record show the previous position and say so. Positions are not interpolated between drive ends in time.
- **Landmarks:** only those in `GALE_LANDMARK_REGISTRY.md` whose coordinates are extracted and whose name-to-sol link has a citation.
- **Rover images and observations:** phase 2, linked out to NASA/PDS by sol rather than re-hosted.
- **Not included:** drive dates or events not present in the source files; a "landing ellipse" (no verified geometry was found — add only from a cited source).
- Elevation along the route is shown twice when they differ: the file's own vertex elevation and the value sampled from MarsWalk's terrain, to expose registration error rather than hide it.

---

## 7. Atmosphere and weather

### Observed (Measured) — at the rover only

| Quantity | Source | Notes |
|---|---|---|
| Daily min/max air temperature | D22 / D23 | |
| Daily min/max ground temperature | D22 / D23 | |
| Mean daily pressure | D22 / D23 | strong seasonal CO₂ cycle |
| UV index (categorical) | D22; UVRDR in D23 | |
| Atmospheric opacity (categorical) | D22 | description, not optical depth |
| Solar longitude (Ls), sunrise, sunset | D22 | computed quantities |
| Relative humidity | D23 only | phase 2; night-time values only, with caveat |

Each observation shows sol, Earth date, Ls and **the rover's location on that sol**. Because the rover has climbed several hundred metres, long-term pressure and temperature series mix seasonal change with change of place; charts state this.

### Not available (removed)

- **Measured wind speed and direction.** The archive states calibrated wind is unavailable owing to sensor damage at landing. The interface shows "No calibrated wind measurements exist for Curiosity" rather than an empty field.

### Modelled (Simulated) — anywhere in the crater

- **Climatology:** D24 Mars Climate Database — temperature, pressure, wind, dust opacity as functions of location, Ls and local time, precomputed on a grid over Gale with the high-resolution pressure mode. Labelled with MCD version and dust scenario.
- **Specific past dates (optional, phase 2):** D25 OpenMARS.
- Model cells are about as large as the crater. The interface says so: "Model grid ≈ crater-sized; local slope winds are not resolved."

### Click behaviour

1. Modelled conditions for the clicked point (Simulated badge, model version, scenario, Ls, local time).
2. If the point is within 1 km of the rover's position on a sol with data, the observation for that sol is offered alongside — labelled "measured at the rover, *d* m away".
3. Otherwise: "Nearest measurements: Curiosity, *d* km away, sol *n*" as a link — never as a value for the clicked point.

Rover measurements are never interpolated, extrapolated or lapse-rate-adjusted to other locations.

---

## 8. Click inspector

For a clicked point, in this order:

1. Latitude, longitude (planetocentric, °E).
2. Elevation (m, above areoid) with DEM ID, grid spacing and accuracy note.
3. Slope and aspect with baseline.
4. Imagery layers present at the point, with resolution as served.
5. Overlay values present (thermal inertia; CRISM parameters where a footprint covers the point). Outside coverage: "No data here", not zero.
6. IAU feature(s) containing the point; mapped unit if a polygon layer exists.
7. Distance to the nearest point of the traverse and the sol(s) of that segment.
8. Drill sites or cited landmarks within a set radius.
9. Atmosphere block as in §7.
10. Provenance table: every dataset touched, its class, and a link to its registry entry.

---

## 9. Visualisation strategy

### 9.1 Rendering by data type

| Data | Rendering | Rules |
|---|---|---|
| Terrain mesh | Quadtree level-of-detail tiles; one elevation tile per image tile region; skirts at tile edges | Vertex spacing never finer than the source grid; no smoothing beyond bilinear sampling; exaggeration 1× default |
| Surface textures | Raster tiles draped by coordinates | One base texture at a time; opacity control; no blending of greyscale and colour sources into a pseudo-true-colour |
| Hillshade | Computed per tier, fixed documented sun azimuth/elevation | Multiplies under overlays; labelled Derived |
| Slope / aspect | Sequential (slope) and cyclic (aspect) colour maps with fixed legends | Baseline printed in legend; hidden at zooms where tier grid > 4 screen pixels would mislead |
| Contours | Vector lines generated per tier | Interval scales with tier: 200 m (regional), 50 m (crater), 5 m (rover region); never finer than 5× the DEM's vertical accuracy |
| Thermal inertia | Sequential colour map, units in legend | 100 m cells drawn as cells when zoomed past native |
| CRISM parameters | Sequential single-hue map per parameter, thresholded at a documented detection floor; footprint outline always drawn | Never merged across observations into one seamless map; date shown |
| Geological units | Semi-transparent fill with hatch + outline; dashed outline where a contact is inferred | Legend entry carries the citation; extent box of the mapping drawn so blank ≠ "no unit" |
| Rover traverse | 3-D polyline snapped to terrain, 0.5 m above surface; coloured by sol, formation, or elevation | Simplified by zoom; original vertices used for all measurements |
| Waypoints / drill sites | Billboard markers; drill sites distinct from drive ends | Clustered at low zoom |
| Landmarks | Pins for point features; outlines for IAU bounding extents; labels typed by naming class | IAU names plain; mission names in quotation marks; units never as pins |
| Elevation profile | 2-D chart between two picked points or along the traverse | Shaded band = stated DEM accuracy; x-axis sampled at tier grid spacing; tier changes marked |
| Atmosphere, observed | Time-series charts against sol and against Ls; year-over-year overlay by Ls | Gaps left as gaps; rover elevation plotted as a secondary trace |
| Atmosphere, modelled | Separate charts and, optionally, coarse arrows/tints over the terrain | Drawn at model cell size with visible cell edges; Simulated badge; never on the same axes as observations without distinct styling and legend |

### 9.2 Resolution and uncertainty by zoom

Zoom levels refer to the Trek grid (registry, "Trek tile grid").

| Zoom | ≈ m/px | Terrain | Texture | Overlays allowed | What is suppressed |
|---|---|---|---|---|---|
| ≤ 7 | ≥ 326 | D03 (200 m) | D10 | TES context (if confirmed), IAU large features | Slope, contours < 200 m, rover detail |
| 8 | 163 | D03 | D05 | Thermal inertia, IAU features, traverse as single line | Fine contours |
| 9–11 | 81–20 | D02 (30 m) | D05 | Thermal inertia, CRISM footprints and parameters, unit polygons, landmarks | Sub-30 m slope claims |
| 12 | 10 | D01 inside its footprint, D02 outside | D05 | All; waypoints individually | — |
| 13–16 | 5–0.6 | D01 | D06 / D08 | CRISM and thermal inertia drawn as visible cells with "coarser than view" badge; drill sites | Unit polygon edges switch to a fuzzy band of stated mapping uncertainty |
| > 16 | < 0.6 | D01 magnified | D06 magnified | as above | "Beyond data resolution" banner |

General rules:

- **Coarser-than-view badge:** whenever an overlay's native cell is more than 4 screen pixels, it is drawn as hard-edged cells, not interpolated, and the layer chip shows its native resolution.
- **Outside-coverage rule:** outside any dataset's footprint the layer is absent, and the footprint edge is drawn. Nothing is extrapolated.
- **Mixed-source warning:** inside D01, until a source mask exists, a persistent note marks 1 m claims as conditional.
- **Positional uncertainty rings:** landmarks with uncertainty greater than the current pixel size get a ring of that radius (IAU centres ≈ 600 m; absolute rover positions ≈ 100 m; relative rover positions unringed).
- **Interpretation fade:** Interpreted layers default to 50 % opacity and cannot fully hide the Measured imagery beneath.

---

## 10. Technical requirements

- Next.js (JavaScript); Three.js or an equivalent WebGL/WebGPU terrain engine.
- All third-party data reach the browser through one of two paths:
  1. direct tile requests to Mars Trek (subject to a cross-origin check; otherwise through a caching proxy route in the app), or
  2. static tiles and tables produced offline and hosted with the app.
- The undocumented NASA JSON endpoints (D12, D13, D22) are fetched server-side on a schedule, validated against a schema, cached, and served from MarsWalk. If validation fails the last good copy is served with its retrieval date displayed.
- No whole GeoTIFF is ever sent to the browser. Elevation tiles are quantised or float tiles with documented encoding; raw values are recoverable.
- Progressive loading; request cancellation on camera move; memory cap on cached tiles.
- The Mars Climate Database is used only as precomputed tables under its licence; its web interface is not called by the app.

---

## 11. Scientific integrity rules

Every layer panel shows: dataset name and ID; instrument; mission; native and as-served resolution; coverage; units; source URL; evidence class; known limitations; citation; retrieval date.

The application must never:

- synthesise terrain, texture, dunes, or geological boundaries;
- show a rover position, sol, or event that is not in the source files;
- show a measured value away from where it was measured;
- show a modelled value without the Simulated badge;
- present enhanced or false colour as natural colour;
- present a spectral parameter as a mineral abundance;
- hide a dataset's footprint or resolution.

Registry entries are populated only with verified metadata; unknown fields stay `null` and display as "not stated by source".

---

## 12. Registry schema (revised)

```json
{
  "dataset_id": "D01",
  "dataset_name": "",
  "instrument": "",
  "mission": "",
  "source_url": "",
  "download_url": null,
  "tile_endpoint": null,
  "url_verification": "FETCHED | LISTED | UNVERIFIED",
  "retrieved": "YYYY-MM-DD",
  "product_id": "",
  "data_type": "DEM | imagery | spectral | thermophysical | geology | nomenclature | rover | weather | climate-model",
  "resolution_native": "",
  "resolution_effective": "",
  "coverage": { "min_latitude": null, "max_latitude": null, "min_longitude": null, "max_longitude": null },
  "units": "",
  "coordinate_system": "",
  "vertical_datum": null,
  "format": "",
  "size": "",
  "access": "",
  "licence": "",
  "observation_time": null,
  "evidence_class": "Measured | Derived | Interpreted | Simulated",
  "limitations": "",
  "confidence": "High | Medium | Low",
  "marswalk_use": "",
  "citation": ""
}
```

Changes from the original: `data_status` renamed `evidence_class` and gains `Interpreted`; added `download_url`, `tile_endpoint`, `url_verification`, `retrieved`, `resolution_native`/`resolution_effective`, `vertical_datum`, `format`, `size`, `access`, `licence`, `confidence`, `marswalk_use`.

---

## 13. Reference corrections

| Original reference | Problem | Replacement |
|---|---|---|
| Stratigraphy: NTRS 20210013304 (Martin et al. 2021) | A cosmogenic exposure-age paper; only summarises units | Fraeman et al. 2016 (DOI 10.1002/2016JE005095) for orbital units; Grotzinger et al. 2015 (Science) for the group/formation framework [locate and verify DOI]; Bennett et al. 2023 (DOI 10.1029/2022JE007185) for the Carolyn Shoemaker formation |
| Peace Vallis: JPL PIA22210 | A Mastcam panorama from Vera Rubin ridge | IAU gazetteer /Feature/15036 for name and position; Palucis et al. 2014 (JGR Planets 119, 705–728) for the fan system |
| CRISM: planetary.org image | Illustration only | PDS Geosciences CRISM archive + the observation IDs in D18 |
| Mars Climate Database docs | Page describes v6.1; current release is 6.2 | Use the manual shipped with the version actually downloaded |
| Landing site: mars.nasa.gov/internal_resources/824 | Fact sheet gives rounded 4.6°S, 137.4°E | First record of the waypoint file (137.441633°E, −4.589467°, −4500.971 m); fact sheet retained as cross-check |
| "Curiosity REMS wind" | Not available calibrated | Removed |
| "Gale crater-wide HRSC/MOLA or CTX elevation model" (unnamed) | No source given | D02 (30 m HRSC, Zenodo 5808354) with D03 as fallback |
| "HiRISE DEMs for local high-resolution areas" (unnamed) | No source given | D04 product list |

---

## 14. Phasing

**Phase 1 — real terrain, imagery, rover, weather**
D01, D02, D03, D05, D06, D10, D12, D13, D15, D21, D22, D24; thermal inertia D19b if the Gale tile is located. Unit glossary without polygons.

**Phase 2 — spectral and geological layers, deeper archives**
D18 CRISM parameters; unit polygons (if obtained); D17; D04 insets; D08 enhanced colour; D23 REMS archive aggregates; D25; rover image links.

**Not planned:** crater-wide natural colour; measured wind; TES/THEMIS mineral maps of Gale.

---

## 15. Acceptance checks before any release

1. Terrain: at ≥ 20 points spread across each tier, MarsWalk's elevation equals the source GeoTIFF value at that coordinate to within the tile quantisation.
2. Datum: D02 and D03 agree with D01 at Bradbury Landing and at four other points to within the DEMs' stated accuracy after datum handling; the first waypoint's `elev_geoid` (−4500.971 m) agrees with D01 at that coordinate — difference recorded.
3. Imagery registration: measured residuals for D05 and D06 against D01 published in the layer panels.
4. Geometry: Gale's rim diameter and Aeolis Mons' extent measured in MarsWalk are consistent with 154 km and the gazetteer bounds.
5. Traverse: every waypoint in MarsWalk matches the source file exactly; a sample matches PLACES.
6. Landmarks: every displayed landmark has extracted coordinates and a citation for its name; none marked "confirm" is visible.
7. Overlays: each shows native resolution and footprint; none renders outside its footprint.
8. Weather: every observed value carries sol, date and rover position; no wind values anywhere; every modelled value carries the Simulated badge and model version.
9. Coordinates: round-trip conversion tests for east/west longitude and 0–360/±180.
10. Coverage: a generated map of "no data" areas per layer is reviewed and linked from the help page.
