# DATA_GAPS_AND_LIMITATIONS.md

MarsWalk — what cannot be delivered, what is uncertain, and what was not verified
Date: 2026-11-10

## 1. Limits of this audit

- The working environment could read web pages but could not download data files. No GeoTIFF, cube or archive was opened. File properties come from the hosts' metadata pages.
- Two JSON files (waypoints, traverse) and the weather feed were read only in part because the fetch tool truncates long responses. Waypoints were read to sol 515.
- Statements marked "from general knowledge" or "confirm" in the registries were not checked against a source during the audit.

## 2. Unverified items

| Item | What is unverified | Where used |
|---|---|---|
| https://science.nasa.gov/mission/msl-curiosity/weather/ | Page failed to load | D22 |
| Trek layer `Viking_MDIM21_ClrMosaic_global_232m` | Capabilities request failed | D11 |
| Trek TES layer IDs (dust, high-Ca pyroxene, sheet silicates/high-Si glass, thermal inertia) | IDs never found; Trek's API page lists no layers | D20 |
| HRSC colour product covering Gale (27 July 2013) | Orbit/product ID and archive URL | D11 |
| THEMIS thermal-inertia tile containing Gale | Exact tile name/URL | D19b |
| Mars Orbital Data Explorer URL | Named by PDS, not loaded | D18 |
| Gazetteer entries for Gale, Sakarya Vallis, Yellowknife | Pages not loaded | Landmark registry §A |
| Gazetteer bulk export link | Not loaded | D21 |
| Range-request / cross-origin behaviour of USGS and S3 hosts and of Trek | Not testable here | Plan C1, C5 |
| Trek usage terms and rate limits | Not reviewed | Plan C2 |
| OpenMARS grid, format, licence | Not on the page read | D25 |
| MCD horizontal grid and download size | Not on the pages read | D24 |
| Bounds of D02 (HRSC DTM) and D08 (colour COG) | Not on their pages | D02, D08 |
| Vertical datum of D02 and D03 relative to D01 | Must be measured | Plan T3 |
| Units of the weather feed fields | In the feed's `descriptions` object, not captured | D22 |
| THEMIS, PDS portal home pages and several reference links in section B of the original spec (B1, B2, B4, B6, B8, B9) | Not opened | — |
| Name-to-sol links for "Rocknest", "Darwin", "Cooperstown", "Namib Dune/Gobabeb" and formation assignments marked "confirm" | Not checked against a source | Landmark registry |
| Later-mission landmarks (after ~sol 2850) | No sols or units verified | Landmark registry |

## 3. Capabilities that cannot be delivered

### G1 — Natural-colour imagery of the crater
No verified crater-wide colour dataset. CTX is panchromatic. HiRISE colour covers only narrow strips and uses a near-infrared channel, so even the USGS colour basemap (D08) is enhanced colour over the rover corridor. An HRSC colour swath exists but its product was not identified, and HRSC colour is not natural RGB either.
**Decision:** ship greyscale. Offer D08 as "enhanced colour". Do not tint CTX to look like colour photography. If HRSC colour is later sourced from ESA's archive, a CTX-sharpened composite may be added, labelled as a derived visualisation.

### G2 — Uniform 1 m terrain, even inside the "1 m" DEM
D01 falls back to CTX, HRSC and MOLA sources where HiRISE stereo is missing, with no mask. Fine-scale slope, roughness and dune height are trustworthy only in HiRISE-stereo areas, and the user cannot currently be told which those are.
**Decision:** conditional-resolution warning until a mask is obtained or built (plan T5).

### G3 — A geological map layer
No public GIS file of Gale's units was found. The principal orbital map (Fraeman et al. 2016) is published as figures under a no-derivatives, non-commercial licence, covers only the NW flank, and is partly superseded by rover results. A USGS 1:60,000 map of western Aeolis Mons was heading to formal review in 2023; publication status unknown.
**Decision:** phase 1 has a unit glossary and traverse-based stratigraphy only. Polygons wait for author-supplied data.

### G4 — Mineral maps
- TES: far too coarse for anything inside Gale.
- THEMIS: no mineral map product for Gale; thermal inertia only.
- CRISM: real, but per-observation cubes needing spectral processing; covers only parts of the crater; IR data ended February 2018; results are spectral indicators, not abundances.
**Decision:** no mineral layer in phase 1. Phase 2 delivers CRISM spectral-parameter overlays for named observations.

### G5 — Measured wind
Calibrated REMS wind does not exist in the archive. **Removed.** Only modelled wind is offered.

### G6 — Measured weather anywhere but the rover
One moving station. Relative humidity is usable mainly at night. Opacity in the public feed is categorical. **No spatial weather maps from measurements.**

### G7 — Fine-scale modelled weather
The Mars Climate Database grid cell is roughly crater-sized; crater circulations and slope winds are not resolved. Output is climatology, not the weather on a date. Commercial use needs permission. **Modelled values are context, not local forecasts.**

### G8 — High-resolution terrain for all of Mount Sharp
HiRISE DTMs are scattered strips; the upper mound and summit have 30 m HRSC at best. Buttes, layers and ridges high on the mound will look smooth because the data are smooth.

### G9 — Continuous rover position in time
Records exist at drive ends. Positions during a drive, or on sols with no drive record, are not in the public files. The traverse line gives the path but not time along it.

### G10 — Rover photographs and science results in-app
Not sourced in this audit. Phase 2, by linking to NASA/PDS by sol.

### G11 — Landing ellipse
No verified geometry was found. Omitted.

## 4. Known accuracy limits of what will be delivered

| Quantity | Limit | Basis |
|---|---|---|
| Absolute horizontal position of D01/D07 content | ~100 m where HRSC-controlled | USGS metadata |
| Vertical accuracy, D01 | ~1 m relative to control; 1 m quantisation | USGS metadata |
| Vertical uncertainty, D03 | at least ±3 m | USGS metadata |
| Accuracy of D02 | not stated by authors | Zenodo record |
| Murray Lab CTX absolute position | < 200 m | Murray Lab |
| Trek CTX vs DEM registration | unknown until measured | — |
| THEMIS thermal inertia | ≈ 20 % absolute | USGS metadata |
| IAU feature positions | 0.01° (≈ 600 m); extents approximate | Gazetteer |
| Rover absolute position | inherits basemap control | D07 metadata |
| CRISM map-projected cube position | tens of metres vs HiRISE (typical; measure per cube) | general experience — confirm |

## 5. Risks

| Risk | Effect | Mitigation |
|---|---|---|
| Undocumented NASA JSON endpoints change or vanish (D12, D13, D22) | Rover and weather stop updating | Server-side mirror with last-good copy; PLACES and PDS REMS as fallbacks |
| Trek blocks cross-origin or throttles | No base imagery | Proxy with cache; or self-host from D07/D09 |
| Datum mismatch between DEM tiers | Steps of tens to thousands of metres at tier edges | Plan T3 is blocking |
| MCD licence incompatible with intended use | No modelled atmosphere | Ask early; OpenMARS as alternative |
| Weather feed stale | "Latest weather" misleading | Always show the date of the newest record |
| Interpretations presented as fact | Scientific misrepresentation | Evidence-class rules in the spec §1, §11 |
| Published names evolve (e.g. hematite ridge → Vera Rubin ridge; Murray units subdivided) | Outdated labels | Each name stored with source and year |

## 6. Open questions for the project owner

1. Is MarsWalk commercial, educational or research? This decides whether the Mars Climate Database and the NC-licensed geological figures can be used at all.
2. Is a greyscale-first product acceptable, given that natural colour is not available?
3. Should phase 1 wait for the THEMIS thermal-inertia tile, or ship without any compositional or thermophysical layer?
4. Is there appetite to contact data authors (USGS/JPL for a DEM source mask; Fraeman et al. for unit polygons)? Both materially improve the product and both depend on other people's time.
