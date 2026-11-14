# GALE_DATA_REGISTRY.md

MarsWalk — verified scientific data registry for Gale crater
Audit date: 2026-11-10

## How to read this file

**Verification status of each URL**

| Tag | Meaning |
|---|---|
| `FETCHED` | The page or file was loaded during this audit and its content read. |
| `LISTED` | The URL was not loaded itself, but it is printed on a `FETCHED` authoritative page or returned by name in a search result from the hosting organisation. Treat as very likely correct; confirm on first download. |
| `UNVERIFIED` | Could not be loaded or confirmed. Do not build on it until someone confirms it. |

**Data status vocabulary** (used everywhere in MarsWalk)

| Status | Meaning |
|---|---|
| Measured | Calibrated instrument output with minimal modelling (imagery, in-situ sensor readings). |
| Derived | Computed from measurements by a documented algorithm (DEMs from stereo, thermal inertia, slope, mosaics). |
| Interpreted | A scientist's reading of the data (geological unit boundaries, mineral identifications, formation names). |
| Simulated | Model output (climate database, reanalysis). |

**Confidence** = confidence that the dataset exists as described and can be used as stated: High / Medium / Low.

**Common reference frame.** Unless a block says otherwise: Mars sphere of radius 3,396,190 m, planetocentric latitude, positive-east longitude. Trek tiles declare this as `EPSG::104905` (geographic degrees). One degree of latitude = 59,274.7 m on this sphere.

**Trek tile grid.** All Trek equirectangular layers use tile matrix set `default028mm`: 256 px tiles, origin (−180°, +90°), level *z* has 2^(z+1) columns × 2^z rows. Ground size of one pixel at the equator (calculated in this audit from the grid definition):

| z | m/px | z | m/px |
|---|---|---|---|
| 7 | 325.6 | 12 | 10.18 |
| 8 | 162.8 | 13 | 5.09 |
| 9 | 81.4 | 14 | 2.54 |
| 10 | 40.7 | 15 | 1.27 |
| 11 | 20.4 | 16 | 0.64 |

Tile URL pattern: `https://trek.nasa.gov/tiles/Mars/EQ/{LayerID}/1.0.0/default/default028mm/{z}/{row}/{col}.{png|jpg}`
Capabilities: `https://trek.nasa.gov/tiles/Mars/EQ/{LayerID}/1.0.0/WMTSCapabilities.xml`
Note: the `ResourceURL` template inside the capabilities files contains a double slash (`1.0.0//{Style}`); normalise it.
This is a plain latitude/longitude grid, **not** Web Mercator.

---

## 1. Terrain

### D01 — Mars MSL Gale Merged DEM 1 m (v3)
- **Dataset name:** MSL_Gale_DEM_Mosaic_1m_v3
- **Source URL:** https://astrogeology.usgs.gov/search/map/mars_msl_gale_merged_dem_1m — `FETCHED`
- **Download URL:** https://planetarymaps.usgs.gov/mosaic/Mars/MSL/MSL_Gale_DEM_Mosaic_1m_v3.tif — `LISTED`
- **API / tile endpoint:** none (single file)
- **Instrument / mission:** HiRISE and CTX (MRO), HRSC (Mars Express), tied to MOLA (MGS)
- **Coverage:** lat −5.098652 to −4.129605, lon 137.124167 to 137.680559 (about 33 km × 57 km; NW crater floor and lower NW Mount Sharp only)
- **Resolution, native:** 1 m grid; 1 m altitude quantisation
- **Resolution, effective:** 1 m only where one of the 12 HiRISE stereo pairs covers. Elsewhere the grid is filled, in order, from CTX DEMs, HRSC DEMs, then the 128 ppd MOLA grid. No per-pixel source mask ships with the file.
- **CRS:** Equirectangular, planetocentric, +East (−180..180), sphere 3,396,190 m
- **Format:** GeoTIFF, 32,980 × 57,440 px, 1 band, 32-bit
- **Units:** metres (elevation). Min −4625.875, max −322.56
- **Status:** Derived
- **Access:** open; "please credit authors"
- **Size:** 3.6 GB
- **Browser integration:** offline → cut to terrain tiles (see acquisition plan); never loaded whole
- **Limitations:** USGS marks it "In Work". Horizontal accuracy "to control net"; HRSC-derived portions only as good as MOLA (~100 m horizontal, ~1 m vertical). Mixed-resolution content looks uniform but is not. The USGS-recommended citation carries the orthophoto's title — cite by product ID as well.
- **Confidence:** High
- **Use in MarsWalk:** primary terrain mesh, slope, aspect, hillshade, contours and profiles for the rover region, at zoom ≥ 12.
- **Citation:** Calef III, F.J. and Parker, T., 2016, PDS Annex, USGS.

### D02 — 30 m HRSC DTM mosaic of Gale crater
- **Dataset name:** 30-m HRSC DTM Mosaic of Gale Crater, Mars (v1.0.0)
- **Source URL:** https://zenodo.org/record/5808354 — `FETCHED` (DOI 10.5281/zenodo.5808354)
- **Download URL:** file `hrsc_km09_h1938_h1927_h1916-dtm-mosaic.tif` on that record — `LISTED`
- **API / tile endpoint:** none
- **Instrument / mission:** HRSC, Mars Express (orbits H1938_0000, H1927_0000, H1916_0000)
- **Coverage:** Gale crater (exact bounds not on the record page — read from the GeoTIFF header)
- **Resolution, native:** 30 m grid
- **Resolution, effective:** not stated; HRSC stereo DTMs resolve features somewhat coarser than their grid. Treat as ≥ 30 m.
- **CRS:** Equidistant cylindrical, sphere 3396.190 km
- **Format:** GeoTIFF, Float32
- **Units:** metres
- **Status:** Derived
- **Access:** open, CC BY 4.0
- **Size:** 311.8 MB
- **Browser integration:** offline → terrain tiles
- **Limitations:** the Zenodo record gives no accuracy assessment. Terrain reference is the 200 m MOLA–HRSC blend (D03). **Vertical datum must be checked before use** (sphere-relative vs areoid-relative heights differ substantially); compare against D01 at Bradbury Landing. The companion abstract (Persaud et al., EPSC-DPS 2019) reports good agreement with MOLA.
- **Confidence:** Medium (source verified; vertical datum and bounds to confirm from the file)
- **Use in MarsWalk:** crater-wide terrain mesh (rim, floor, whole of Mount Sharp, Peace Vallis, Farah Vallis) at zoom 8–11.
- **Citation:** Persaud, D.M., Putri, A.D.R., Muller, J.-P., 2021, Zenodo.

### D03 — MOLA–HRSC blended global DEM 200 m (v2)
- **Dataset name:** Mars_HRSC_MOLA_BlendDEM_Global_200mp_v2
- **Source URL:** https://astrogeology.usgs.gov/search/map/mars_mgs_mola_mex_hrsc_blended_dem_global_200m — `FETCHED`
- **Download URL:** https://planetarymaps.usgs.gov/mosaic/Mars/HRSC_MOLA_Blend/Mars_HRSC_MOLA_BlendDEM_Global_200mp_v2.tif — `LISTED`
- **API / tile endpoint:** none. Being a planetarymaps GeoTIFF, a windowed read with GDAL `/vsicurl/` is expected to work — `UNVERIFIED`.
- **Instrument / mission:** MOLA (MGS) + HRSC (Mars Express)
- **Coverage:** global
- **Resolution, native:** 200 m
- **Resolution, effective:** 200 m where HRSC DEMs exist (≈44 % of Mars); MOLA-interpolated elsewhere (MOLA shot spacing is far coarser than 200 m between tracks). Whether Gale is HRSC-covered in this product must be checked.
- **CRS:** Simple cylindrical, planetocentric, +East, sphere 3,396,190 m
- **Format:** GeoTIFF
- **Units:** metres
- **Status:** Derived
- **Access:** open; cite authors
- **Size:** 11 GB (global) — clip the Gale window only
- **Browser integration:** offline → clip → terrain tiles
- **Limitations:** interim product; "areas where the blending … did not always work well"; total elevation uncertainty at least ±3 m.
- **Confidence:** High
- **Use in MarsWalk:** fallback and regional context beyond D02's footprint (zoom ≤ 8), and the datum reference for checking D02.
- **Citation:** Fergason, R.L., Hare, T.M., Laura, J., 2018, Astrogeology PDS Annex, USGS.

### D04 — HiRISE DTMs on Mount Sharp outside the 1 m mosaic
- **Dataset name:** HiRISE DTM products (DTEEC), University of Arizona / PDS
- **Source URL (examples):**
  - https://www.uahirise.org/dtm/dtm.php?ID=ESP_018788_1755 — north-central mound, 4.6°S 137.8°E — `LISTED`
  - https://www.uahirise.org/dtm/dtm.php?ID=ESP_014186_1745 — south Gale layers, 5.6°S 138.3°E — `LISTED`
  - https://www.uahirise.org/dtm/dtm.php?ID=ESP_017931_1745 — west Gale sulfate/clay beds, 5.4°S 137.1°E — `LISTED`
  - https://www.uahirise.org/dtm/dtm.php?ID=ESP_063319_1745 — SW Aeolis Mons fan, 5.5°S 137.3°E — `LISTED`
  - https://www.uahirise.org/dtm/PSP_009149_1750 — inverted riverbed (DTEEC_009149_1750_009294_1750_U01, 391 MB) — `LISTED`
  - https://www.uahirise.org/dtm/dtm.php?ID=PSP_006855_1750 — Sakarya Vallis (DTEEC_006855_1750_007501_1750_A01) — `LISTED`
- **Download URL:** per-product, from each DTM page
- **Instrument / mission:** HiRISE, MRO
- **Coverage:** individual strips ~5–6 km wide; scattered. No complete HiRISE DTM of Mount Sharp exists.
- **Resolution, native:** typically 1 m grid (some 2 m)
- **Resolution, effective:** ~3–4 m horizontal features; sub-metre vertical precision in good texture (general HiRISE DTM behaviour; per-product numbers not checked)
- **CRS:** per-product equirectangular; centre latitude differs between products — reproject
- **Format:** PDS IMG with label (GDAL-readable); orthoimages JP2
- **Units:** metres
- **Status:** Derived
- **Access:** open
- **Size:** ~300–650 MB per DTM
- **Browser integration:** offline → co-register to D02/D01 → terrain tiles, shown only inside each footprint
- **Limitations:** each DTM is independently controlled to MOLA; offsets of tens of metres between neighbours and against D01 are normal and must be measured. Several of these footprints are already inside D01.
- **Confidence:** Medium (catalogue pages seen in search results, not loaded)
- **Use in MarsWalk:** optional high-resolution insets on Mount Sharp beyond D01. Phase 2.

---

## 2. Imagery

### D05 — MRO CTX Gale crater mosaic (Mars Trek)
- **Dataset name / Layer ID:** `Gale_CTX_BlockAdj_dd`
- **Source URL:** https://trek.nasa.gov/mars/ — `UNVERIFIED` (portal not loaded; taken from the original spec) ; API doc https://trek.nasa.gov/tiles/apidoc/trekAPI.html?body=mars — `FETCHED`
- **Download URL:** none (tiles only)
- **Tile endpoint:** https://trek.nasa.gov/tiles/Mars/EQ/Gale_CTX_BlockAdj_dd/1.0.0/WMTSCapabilities.xml — `FETCHED`; PNG tiles, z 0–12
- **Instrument / mission:** CTX, MRO
- **Coverage:** lon 135.1842593–139.2413012, lat −6.5732988 to −2.8077809
- **Resolution, native:** CTX ≈ 5–6 m/px
- **Resolution, effective:** ≈ 10.2 m/px at max zoom 12
- **CRS:** EPSG::104905
- **Format:** PNG, 256 px
- **Units:** 8-bit display brightness (not radiance)
- **Status:** Measured imagery, mosaicked and stretched (Derived mosaic)
- **Access:** open, no key
- **Size:** streamed
- **Browser integration:** direct tile fetch as texture
- **Limitations:** panchromatic greyscale. Block-adjusted mosaic; registration against the USGS DEM must be measured, not assumed. Images from different dates and lighting.
- **Confidence:** High
- **Use in MarsWalk:** default crater-wide surface texture, zoom 8–12.

### D06 — MRO HiRISE Curiosity roving-site mosaic (Mars Trek)
- **Layer ID:** `curiosity_hirise_mosaic`
- **Tile endpoint:** https://trek.nasa.gov/tiles/Mars/EQ/curiosity_hirise_mosaic/1.0.0/WMTSCapabilities.xml — `FETCHED`; PNG, z 0–16
- **Instrument / mission:** HiRISE, MRO
- **Coverage:** lon 137.1224669–137.7298129, lat −4.9254743 to −4.2489588
- **Resolution, native:** HiRISE 0.25–0.30 m/px
- **Resolution, effective:** ≈ 0.64 m/px at zoom 16
- **CRS:** EPSG::104905
- **Format / units:** PNG; 8-bit brightness
- **Status:** Measured imagery (Derived mosaic)
- **Access / size:** open; streamed
- **Browser integration:** direct tile fetch
- **Limitations:** greyscale; footprint is smaller than D01 in the south (ends at −4.925, D01 reaches −5.099).
- **Confidence:** High
- **Use in MarsWalk:** high-zoom texture (13–16) over the rover region.

### D07 — MSL Gale merged orthophoto mosaic 25 cm (v3)
- **Source URL:** https://astrogeology.usgs.gov/search/map/mars_msl_gale_merged_orthophoto_mosaic_25cm — `FETCHED`
- **Download URL:** https://asc-pds-services.s3.us-west-2.amazonaws.com/mosaic/MSL_Gale_Orthophoto_Mosaic_25cm_v3.tif — `LISTED`
- **Instrument / mission:** HiRISE (with CTX and HRSC fill), MRO / Mars Express
- **Coverage:** lat −5.249525 to −4.068583, lon 137.094719–137.853896
- **Resolution:** 0.25 m native; effective 0.25 m only in HiRISE areas
- **CRS:** Equirectangular, planetocentric, +East, sphere 3,396,190 m
- **Format:** GeoTIFF, 180,000 × 280,000 px, 8-bit, 1 band
- **Units:** 8-bit brightness
- **Status:** Measured imagery (Derived orthomosaic)
- **Access:** open; credit authors
- **Size:** 23 GB (MD5 e1b8670b605eb593dc1d0551f6c45b64)
- **Browser integration:** offline tiling only if D06 proves insufficient
- **Limitations:** same control caveats as D01 (it is the orthoimage companion of D01, so it is the best-registered image for that DEM).
- **Confidence:** High
- **Use in MarsWalk:** registration reference for checking D05/D06 against D01; optional self-hosted high-zoom texture. Not needed for a first release.

### D08 — MSL Gale HiRISE colour basemap (78 quads)
- **Source URL:** same USGS page as D07 — `FETCHED`
- **Download URL:** https://asc-pds-services.s3.us-west-2.amazonaws.com/mosaic/Mars/MSL/MSL_Gale_HiRISE-LRGB_78quads_sharp_cog.tif — `LISTED`
- **Instrument / mission:** HiRISE colour strips, MRO
- **Coverage:** not stated on the page — read from file header; expected to be a subset of D07 along the rover corridor
- **Resolution:** not stated (fused to the 25 cm red mosaic)
- **CRS:** expected as D07 — confirm from header
- **Format:** Cloud-Optimized GeoTIFF, JPEG-compressed (quality 85)
- **Units:** 8-bit display colour
- **Status:** Derived (and visually processed)
- **Access:** open
- **Size:** ~1 GB
- **Browser integration:** as a COG it can be range-read directly from the browser (e.g. geotiff.js) if the bucket allows cross-origin requests — `UNVERIFIED`; otherwise tile offline
- **Limitations:** **not true colour.** HiRISE colour comes from blue-green, red and near-infrared channels over a narrow central strip; the product was hand-georectified with tie-points, blended and fused in Photoshop, then sharpened in GIMP. Colours are not radiometrically meaningful. Added July 2025.
- **Confidence:** High that it exists; Medium on footprint/resolution until the header is read
- **Use in MarsWalk:** optional "HiRISE enhanced colour" texture for the rover region, labelled as enhanced colour.

### D09 — Global CTX mosaic V01 (Murray Lab, Caltech)
- **Source URL:** https://murray-lab.caltech.edu/CTX/ — `FETCHED`; USGS record https://astrogeology.usgs.gov/search/map/mars-mro-ctx-global-mosaic-murray-lab-v1 — `LISTED`
- **Download URL:** tile directory https://murray-lab.caltech.edu/CTX/V01/tiles/ — `LISTED`
- **Tile endpoint:** no public WMTS documented; streaming only through ArcGIS, JMARS, Quickmap
- **Instrument / mission:** CTX, MRO
- **Coverage:** 88°S–88°N in 4°×4° tiles named by lower-left corner. Gale needs the four tiles with lower-left longitudes 132° and 136° and lower-left latitudes −8° and −4° (derived from the tile scheme; confirm exact file names from the lab's tile-map shapefile).
- **Resolution:** 5.0 m/px (native CTX resampled)
- **CRS:** Equirectangular
- **Format:** uncompressed GeoTIFF + seam-map and tie-point shapefiles per tile
- **Units:** 8-bit brightness
- **Status:** Measured imagery (Derived mosaic)
- **Access:** open; "free use … for all purposes"; credit NASA/JPL/MSSS/The Murray Lab
- **Size:** per-tile size not stated; whole mosaic 5.6 TB compressed
- **Browser integration:** offline tiling
- **Limitations:** semi-controlled; absolute errors under 200 m; data through December 2018 with fill to mid-2020.
- **Confidence:** High
- **Use in MarsWalk:** only if 5 m crater-wide texture is wanted beyond Trek's ~10 m. Seam maps give per-pixel image provenance, which Trek's mosaic does not. Phase 2.

### D10 — MGS MOLA colour shaded relief (Mars Trek)
- **Layer ID:** `Mars_MGS_MOLA_ClrShade_merge_global_463m`
- **Tile endpoint:** https://trek.nasa.gov/tiles/Mars/EQ/Mars_MGS_MOLA_ClrShade_merge_global_463m/1.0.0/WMTSCapabilities.xml — `FETCHED`; JPEG, z 0–7
- **Instrument / mission:** MOLA, MGS
- **Coverage:** global
- **Resolution:** 463 m/px; effective MOLA spacing is coarser between tracks
- **CRS:** EPSG::104905
- **Format / units:** JPEG; colour-coded picture (not elevation values)
- **Status:** Derived (visual product)
- **Access / size:** open; streamed
- **Browser integration:** direct tiles
- **Limitations:** a rendered picture. Must never be used as an elevation source.
- **Confidence:** High
- **Use in MarsWalk:** far-zoom context basemap only (zoom ≤ 7).

### D11 — Crater-wide colour imagery — **NO VERIFIED SOURCE**
- **Candidates examined:**
  - Viking MDIM 2.1 colour mosaic, 232 m, Trek layer `Viking_MDIM21_ClrMosaic_global_232m` — capabilities request failed in this audit — `UNVERIFIED`
  - Mars Express HRSC colour swath covering all of Gale, acquired 27 July 2013, ~25 m/px (reported by The Planetary Society: https://www.planetary.org/articles/05231630-new-orbital-images-curiosity — `FETCHED`). Product ID and archive URL not identified — `UNVERIFIED`. Would come from ESA's Planetary Science Archive.
- **Status if used:** Measured (HRSC), then Derived if used to colourise CTX
- **Limitations:** HRSC colour channels are not natural RGB; any CTX colourisation is a visual product.
- **Confidence:** Low
- **Use in MarsWalk:** none in the first release. See DATA_GAPS_AND_LIMITATIONS §G1.

---

## 3. Rover

### D12 — Curiosity drive-end waypoints
- **Source URL:** https://science.nasa.gov/mission/msl-curiosity/location-map/ — `FETCHED` (the public map; does not itself link the data)
- **Download URL:** https://mars.nasa.gov/mmgis-maps/MSL/Layers/json/MSL_waypoints.json — `FETCHED` (content read to sol 515; the fetch tool truncated the remainder)
- **Instrument / mission:** rover localisation (MSL operations)
- **Coverage:** Bradbury Landing to current position
- **Resolution:** one point per drive end; coordinates to ~1e-6° (≈ 6 cm numeric precision, not accuracy)
- **CRS:** lon/lat degrees (planetocentric, +East), plus `easting`/`northing` in metres and `elev_geoid` in metres
- **Format:** GeoJSON FeatureCollection, 3-D Point features
- **Fields:** RMC, site, drive, sol, easting, northing, elev_geoid, lon, lat, roll, pitch, yaw, yaw_rad, tilt, dist_m, dist_total_m, dist_km, dist_mi, drive_type
- **Units:** degrees; metres; attitude in degrees (yaw also in radians)
- **Status:** Derived (localisation solution)
- **Access:** open, no key; **undocumented endpoint** behind NASA's map — may change without notice
- **Size:** small (order of 1 MB)
- **Browser integration:** fetched server-side on a schedule, cached and re-served by MarsWalk; never hot-linked from the client
- **Limitations:** absolute position inherits the basemap control (~100 m absolute; relative positions far better). The projection of `easting`/`northing` is not documented in the file. Not every sol has a record (no drive, no point).
- **Confidence:** High for content; Medium for long-term URL stability
- **Use in MarsWalk:** position-by-sol, waypoint markers, cumulative distance, distance-to-traverse queries.

### D13 — Curiosity traverse path
- **Download URL:** https://mars.nasa.gov/mmgis-maps/MSL/Layers/json/MSL_traverse.json — `FETCHED` (57+ features read; truncated)
- **Coverage:** whole drive path
- **Resolution:** dense 3-D vertices along each drive (consecutive vertices a few metres apart in the sample read)
- **CRS:** lon, lat, elevation (m)
- **Format:** GeoJSON; first feature MultiLineString, the rest LineString; single property `Length` (m)
- **Status:** Derived
- **Access / size:** as D12
- **Browser integration:** as D12; simplified per zoom level
- **Limitations:** features carry no sol attribute — sols must be assigned by joining segment endpoints to D12. Vertex elevations come from the mission DEM and will not exactly match a re-tiled D01.
- **Confidence:** High
- **Use in MarsWalk:** traverse geometry between waypoints; elevation profile along route.

### D14 — MSL PLACES localisation archive (PDS4)
- **Source URL:** https://pds-imaging.jpl.nasa.gov/volumes/msl.html — `FETCHED`
- **Download URL:** https://pds-imaging.jpl.nasa.gov/data/msl/msl_places/ — `LISTED`; mirror https://pdsimage2.wr.usgs.gov/Mars_Science_Laboratory/PDS4/msl_places/ — `LISTED`
- **Coverage:** Sites 1–121 at the time of the audit
- **Format:** PDS4 bundle (localisations, maps, orbital, ancillary collections)
- **Status:** Derived
- **Access:** open
- **Size:** not checked
- **Browser integration:** offline only
- **Limitations:** lags operations by months; more complex than D12/D13.
- **Confidence:** High
- **Use in MarsWalk:** the citable, archived source of record. Used to validate D12/D13 and as fallback if the mmgis endpoint disappears.

### D15 — Drill and sample record
- **Source URL:** table of drill attempts with sols and depths, https://pmc.ncbi.nlm.nih.gov/articles/PMC8981195/table/Tab3 — `LISTED` (search result; content read from the result)
- **Further source:** MSL Analyst's Notebook via https://pds-geosciences.wustl.edu/missions/msl/ — `LISTED`
- **Status:** Measured (event record)
- **Limitations:** the table gives sols, not coordinates. Coordinates come from joining to D12 (rover position, not the hole itself — the hole is within arm's reach, ≈ 2 m).
- **Confidence:** High for sols
- **Use in MarsWalk:** drill-site markers and links to laboratory results.

---

## 4. Geology and mineralogy

### D16 — Orbital geological units of lower Mount Sharp (Fraeman et al. 2016)
- **Source URL:** https://pmc.ncbi.nlm.nih.gov/articles/PMC5101845 — `FETCHED` (DOI 10.1002/2016JE005095; CC BY-NC-ND)
- **Download URL:** none — **the map exists as figures only; no GIS files are published with the paper**
- **Instruments:** CRISM, HiRISE, THEMIS, CTX
- **Coverage:** NW flank of lower Mount Sharp only
- **Resolution:** mapped on 25 cm HiRISE with 12–36 m CRISM
- **Status:** Interpreted
- **Units defined:** Mount Sharp group — MF1, MF2, MF3 (Murray formation), PhU (phyllosilicate unit), HR (hematite ridge), SS (spectral-sloped unit), LS (layered sulfate unit). Siccar Point group — HTI1, HTI2, Stimson formation.
- **Limitations (authors' own):** orbital data alone make depositional process hard to infer; HR-vs-SS order and HTI1–Stimson link are hypotheses; small or sand-covered areas left unmapped. Later rover work revised several interpretations (e.g. the ridge's hematite signature is diagenetic and not unique to the ridge).
- **Licence caution:** NC-ND figure licence — the published map image cannot be redistributed in modified form or commercially. Digitising it creates a derivative; seek the authors' data or permission.
- **Confidence:** High as a scientific reference; **Low as a ready data layer**
- **Use in MarsWalk:** unit vocabulary and descriptions now; polygons only after obtaining vector data from the authors (see gaps §G3).

### D17 — Local published GIS geology
- Glen Torridon periodic bedrock ridge and TAR polylines — https://zenodo.org/records/5576754 — `LISTED`
- Sakarya Vallis unit map and marker bed shapefile — https://doi.org/10.5281/zenodo.5819267 — `LISTED`
- Kimberley outcrop GIS archive (3 × 3 km, PLANMAP) — https://zenodo.org/record/4767462 — `LISTED`
- **Status:** Interpreted
- **Format:** ESRI shapefiles / GIS archives
- **Limitations:** each covers a few km²; different authors, unit schemes and base maps. Licences not checked.
- **Confidence:** Medium
- **Use in MarsWalk:** optional local overlays, each shown only inside its own extent and under its own citation. Phase 2.

### D18 — CRISM hyperspectral observations (PDS Geosciences)
- **Source URL:** https://pds-geosciences.wustl.edu/missions/mro/crism.htm — `FETCHED`
- **Download:** per observation through the Mars Orbital Data Explorer (named on that page; ODE URL not loaded — `UNVERIFIED`)
- **Instrument / mission:** CRISM, MRO
- **Gale observation IDs confirmed from the literature:**
  - `FRT0000B6F1` (18 m/px), `FRT0001BBA1` (18 m/px), `HRL0000BABA` (36 m/px), `ATO00021C92`, `ATO0002EC79`, `ATO00038AA7` (12 m/px along-track oversampled) — Fraeman et al. 2016
  - `FRT000233AC` — used in a Gale phyllosilicate study (ISPRS Archives XL-8, 2014)
- **Product levels:** TRDR (calibrated I/F, sensor space; 2006-09-27 to 2022-05-08); TER/MTRDR (corrected, map-projected; **only observations up to 2012-05-21**); DDR (geometry)
- **Coverage:** individual ~10 km footprints; roughly a third of the crater had targeted coverage as of 2012 (Bennett et al., LPSC abstract)
- **Resolution:** 18 m (FRT), 36 m (HRL/HRS), ~12 m along-track (ATO)
- **CRS:** MTRDR map-projected equirectangular; TRDR needs DDR geometry
- **Format:** PDS4 image cubes
- **Units:** I/F (dimensionless); summary parameters are band depths (dimensionless)
- **Status:** Measured (spectra) → Derived (summary parameters such as BD860_2, D2300, SINDEX2) → Interpreted (mineral names)
- **Access:** open
- **Size:** hundreds of MB per observation
- **Browser integration:** offline → compute summary-parameter rasters per observation → tiles, clipped to footprint
- **Limitations:** IR channel ended 2018-02-15 (cooler failure). Atmosphere, dust cover and illumination affect detections. A band depth indicates a spectral feature consistent with a mineral class; it is not an abundance and does not identify a unique mineral or anything below the optical surface. MTRDRs are registered to MOLA-class terrain and can be offset from HiRISE by tens of metres.
- **Confidence:** High (archive and IDs); Medium (effort to produce clean layers)
- **Use in MarsWalk:** the only quantitative orbital clay/sulfate/hematite evidence. Phase 2, starting with FRT0000B6F1 and HRL0000BABA.

### D19 — THEMIS products
- **(a) Gale Crater THEMIS Daytime IR mosaic (USGS):** https://astrogeology.usgs.gov/search/map/gale_crater_themis_daytime_ir_isis — `FETCHED`; download http://astropedia.astrogeology.usgs.gov/download/Mars/MarsScienceLaboratory/Gale_crater_THEMIS_dayIR_ISIS.cub — `LISTED`. ISIS3 cube, 3.2 MB (so a reduced-resolution regional product; resolution, bounds and projection are not stated on the page — read from the cube label).
- **(b) THEMIS global thermal-inertia mosaic, 100 m (USGS, Fergason):** tile pages follow the pattern https://astrogeology.usgs.gov/search/map/themis_thermal_inertia_mosaic_quantitative_30s060e_100mpp — `LISTED` for that tile. Tiles are 30° lat × 60° lon; the tile containing Gale (5°S, 137°E) has not been identified by URL — `UNVERIFIED`. Quantitative version in J m⁻² K⁻¹ s⁻¹ᐟ²; stated absolute accuracy ≈ 20 %.
- **(c) THEMIS VIS 18 m Gale mosaic (ASU):** https://jmars.mars.asu.edu/maps/gale/gale.html — `LISTED`; 325 MB PNG, 205 frames, hand-fitted; georeferencing not documented → picture only.
- **(d) Single scene used in the literature:** THEMIS IR `I17950012` (100 m/px) — Fraeman et al. 2016.
- **Instrument / mission:** THEMIS, 2001 Mars Odyssey
- **Status:** (a) Measured imagery mosaic; (b) Derived; (c) Measured imagery, uncontrolled
- **Access:** open; cite authors
- **Browser integration:** offline → convert with ISIS/GDAL → tiles
- **Limitations:** (b) has gaps where images were removed; thermal inertia reflects the top centimetres and mixes dust, sand and rock within a 100 m pixel. THEMIS provides thermophysical context and decorrelation-stretch colour, **not** a mineral map.
- **Confidence:** (a) Medium, (b) Medium until the Gale tile is located, (c) Low for scientific use
- **Use in MarsWalk:** (b) as the thermal-inertia layer, replacing TES at crater scale. "THEMIS mineralogical layer" is dropped.

### D20 — MGS TES global products
- **Thermal inertia maps (PDS):** https://pds-geosciences.wustl.edu/missions/mgs/tes-timap.html — `LISTED`
- **TES mineral-abundance and dust layers on Mars Trek (High-Ca pyroxene, sheet silicates/high-Si glass, dust):** layer IDs not confirmed — `UNVERIFIED`. The Trek API page lists no layers; IDs must be read from the Trek portal's layer catalogue.
- **Instrument / mission:** TES, MGS
- **Resolution:** native footprint ≈ 3 km; global mineral maps are binned far coarser (order of 1 pixel per degree ≈ 60 km — from general knowledge of the published maps; confirm from the layer metadata). **Gale is 154 km across: a handful of pixels.**
- **Status:** Derived (thermal inertia); Interpreted/Derived (spectral unmixing abundances)
- **Limitations:** unmixing detection limits of roughly 10–15 % are commonly quoted; values near that are not detections. Cannot resolve anything inside Gale.
- **Confidence:** Medium (thermal inertia); Low (Trek mineral layers until IDs are confirmed)
- **Use in MarsWalk:** optional regional-context layers visible only at zoom ≤ 7, drawn as hard-edged native cells. Not part of the Gale science layers.

### D21 — IAU Gazetteer of Planetary Nomenclature
- **Source URL:** https://planetarynames.wr.usgs.gov/ — feature pages `FETCHED`: /Feature/15000 (Aeolis Mons), /Feature/15001 (Aeolis Palus), /Feature/15571 (Gediz Vallis); `LISTED` from search results: /Feature/15036 (Peace Vallis), /Feature/15109 (Farah Vallis)
- **Download:** the gazetteer offers a full Mars shapefile/KML export (`MARS_nomenclature` — link not loaded, `UNVERIFIED`)
- **Status:** official names (Interpreted extents: "boundaries … are approximate")
- **Format:** per-feature centre, bounding box, size, approval date
- **Confidence:** High
- **Use in MarsWalk:** authoritative names and positions for all formally named features. See GALE_LANDMARK_REGISTRY.md.

---

## 5. Atmosphere

### D22 — Curiosity REMS daily summary feed
- **Source URL:** https://science.nasa.gov/mission/msl-curiosity/weather/ — `UNVERIFIED` (page failed to load in this audit)
- **Endpoint:** https://mars.nasa.gov/rss/api/?feed=weather&category=msl&feedtype=json — `FETCHED` (≈ 199 records read, sols 4797–4995; truncated)
- **Instrument / mission:** REMS, MSL
- **Coverage:** the rover's position on each sol — a single point that moves
- **Resolution:** one record per sol
- **Fields:** id, terrestrial_date, sol, ls, season, min_temp, max_temp, pressure, pressure_string, abs_humidity, wind_speed, wind_direction, atmo_opacity, sunrise, sunset, local_uv_irradiance_index, min_gts_temp, max_gts_temp
- **Units:** not stated in the records read; defined in the feed's `descriptions` object — confirm (expected °C and Pa)
- **Status:** Measured (daily summaries of measurements). `season` is a derived label; `atmo_opacity` is a categorical description.
- **Access:** open; undocumented endpoint
- **Browser integration:** server-side fetch, cache, re-serve
- **Limitations:** `wind_speed`, `wind_direction` and `abs_humidity` were "--" in every record read. The newest record read was sol 4995 (2026-08-25) — confirm whether the feed is current. Missing sols occur.
- **Confidence:** High for content; Medium for stability and currency
- **Use in MarsWalk:** observed daily min/max air and ground temperature, pressure, UV index and Ls at the rover.

### D23 — REMS archive (PDS Atmospheres)
- **Source URL:** https://pdsatmospheres.nmsu.edu/data_and_services/atmospheres_data/MARS/curiosity/rems.html — `FETCHED`
- **Wind note page:** https://atmos.nmsu.edu/data_and_services/atmospheres_data/MARS/curiosity/rems_wind.html — `LISTED`
- **Products:** EDR, TELRDR, ENVRDR, MODRDR, UVRDR (dust- and geometry-corrected UV), ADR
- **Coverage:** page header to sol 4488 (2025-03-22); volume directories listed sols 1–3778
- **Resolution:** up to 1 Hz in sampling blocks
- **Units:** Pa, K
- **Format:** PDS tables
- **Status:** Measured (ENV/MOD RDR are calibrated/corrected)
- **Limitations:** **calibrated wind speed and direction are not available** — "Due to sensor damage during landing, only partial segments of the raw data have been recorded." Humidity is retrievable from RDRs but is reliable mainly at night.
- **Confidence:** High
- **Use in MarsWalk:** authoritative source for seasonal curves (pressure cycle, temperature ranges, UV). Phase 2: build per-sol and per-Ls aggregates offline.

### D24 — Mars Climate Database v6.x
- **Source URL:** https://www-mars.lmd.jussieu.fr/ — `UNVERIFIED` (home page not loaded; taken from the original spec) ; access terms https://www-mars.lmd.jussieu.fr/mars/access.html — `FETCHED`; documentation https://www-mars.lmd.jussieu.fr/mars/info_web/ — `FETCHED` (covers v6.1)
- **Coverage:** global; any lat/lon/altitude/Ls/local time
- **Resolution:** GCM grid of a few degrees (exact figures in the user manual; not on the pages read). A "high-resolution mode" adjusts surface pressure using 32 px/deg MOLA topography.
- **Format:** netCDF + Fortran access library (C/Python/IDL/Matlab wrappers)
- **Variables:** temperature, pressure, winds, density, dust, water, and more
- **Status:** Simulated (climatology — typical conditions for a season and dust scenario, not weather on a date)
- **Access:** web interface "for moderate use only"; full version free after registration. Scientific use requires acknowledging the source and keeping the authors informed. **Commercial use requires specific authorisation.**
- **Size:** multi-GB (not stated on pages read)
- **Browser integration:** none directly. Precompute a Gale grid offline and ship as small static JSON/binary tables.
- **Limitations:** Gale (≈ 2.6° wide) spans about one model cell; crater-scale slope winds and the strong topographic pressure gradient are represented only through the pressure correction. Web-interface scraping is not permitted use.
- **Confidence:** High
- **Use in MarsWalk:** modelled temperature, pressure, wind and dust at a clicked location, labelled Simulated.

### D25 — OpenMARS reanalysis
- **Source URL:** https://ordo.open.ac.uk/articles/dataset/OpenMARS_continuous_MY28-35_standard_database/24573205 — `FETCHED`; collection DOI https://doi.org/10.21954/ou.rd.c.4278950 — `LISTED`
- **Coverage:** global; Mars Years 28–35 continuous (earlier MY24–27 set separate)
- **Resolution:** 2-hourly; spatial grid not stated on the page (see reference manual in the repository)
- **Variables:** zonal/meridional wind, temperature vs altitude, column dust optical depth, surface variables
- **Format:** not stated on page (182 files)
- **Status:** Simulated (model constrained by assimilated orbiter observations)
- **Access:** open; licence not shown on the page read
- **Limitations:** coarse global grid; ends at MY35; not rover-validated at Gale within this audit.
- **Confidence:** Medium
- **Use in MarsWalk:** optional. Lets MarsWalk show modelled conditions for a *specific past date* (e.g. the 2018 global dust storm) rather than climatology. Phase 2.

---

## 6. Datasets removed from the original specification

| Original item | Reason |
|---|---|
| Measured wind speed and direction | Not available as calibrated data (D23). |
| "True-colour imagery" | No such crater-wide dataset verified (D11). |
| "THEMIS mineralogical layer" | THEMIS gives thermophysical data; no Gale mineral map product was found. |
| TES mineral maps as Gale layers | Too coarse to say anything inside the crater (D20). |
| CRISM map from planetary.org | A picture, not data. Replaced by D18. |
| Screenshots or coloured hillshades as elevation | Replaced by D01–D03. |
