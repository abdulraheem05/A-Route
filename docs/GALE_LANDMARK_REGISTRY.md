# GALE_LANDMARK_REGISTRY.md

MarsWalk — landmark registry for Gale crater
Audit date: 2026-11-10

## Rules used in this file

1. A coordinate appears only if it was read from a source during this audit. Everything else says **TO EXTRACT** and names the exact source and key to extract it from. Nothing is estimated.
2. Coordinates are planetocentric latitude (negative = south) and east longitude, degrees.
3. Three kinds of name exist and must never be mixed in the interface:
   - **IAU** — formally approved, from the Gazetteer of Planetary Nomenclature.
   - **Mission (informal)** — names given by the MSL team; shown in quotation marks in NASA usage.
   - **Stratigraphic** — rock units (formations, groups). These are bodies of rock, not places. They are drawn as areas or as rover-traverse intervals, never as a pin.
4. Elevation is given only where a source provided it. "Rover elevation" is the `elev_geoid` value in the waypoint file at that drive end.
5. Positional uncertainty:
   - IAU entries: the gazetteer states its boundaries are approximate; centre coordinates are given to 0.01° (≈ 600 m).
   - Rover waypoints: relative precision is sub-metre; absolute position is tied to the mission basemap, itself controlled to MOLA (order of 100 m absolute).
   - Drill sites: the rover waypoint is used; the hole lies within arm's reach (≈ 2 m) of the rover.

Source keys: **GAZ** = planetarynames.wr.usgs.gov; **WP** = MSL_waypoints.json (registry D12); **DR** = drill table, PMC8981195 Table 3 (registry D15); **F16** = Fraeman et al. 2016 (D16); **B22** = Bennett et al. 2023 Glen Torridon overview, DOI 10.1029/2022JE007185; **F20** = Fraeman et al. 2020 Vera Rubin ridge synthesis (USGS publication page cited in the original spec).

---

## A. IAU-approved features

| Name | Type | Centre lat, lon | Extent (N / S / W / E) | Size | Approved | Source | Selectable |
|---|---|---|---|---|---|---|---|
| **Gale** | Crater | TO EXTRACT from GAZ (ESA gives 5.4°S, 137.9°E) | TO EXTRACT | 154 km diameter (ESA; NASA) | — | GAZ entry not loaded (ID 2071 seen in a secondary reference — UNVERIFIED); ESA image page | Yes — crater outline, not a pin |
| **Aeolis Mons** (informal: Mount Sharp) | Mons | −5.08, 137.85 | −4.46 / −5.61 / 137.11 / 138.62 | 88.99 km | 2012-05-16 | GAZ /Feature/15000 (fetched) | Yes |
| **Aeolis Palus** | Palus (plain) | −4.47, 137.42 | −4.18 / −5.39 / 136.75 / 138.65 | 111.63 km | 2012-05-16 | GAZ /Feature/15001 (fetched) | Yes |
| **Peace Vallis** | Vallis | −4.21, 137.23 | −3.96 / −4.42 / (lon bounds published in west-longitude form — convert on extraction) | 35.24 km | 2012-09-26 | GAZ /Feature/15036 (read from search result) | Yes — draw as line from DEM, see notes |
| **Gediz Vallis** | Vallis | −4.85, 137.44 | −4.77 / −4.91 / 137.38 / 137.48 | 8.29 km | 2017-05-01 | GAZ /Feature/15571 (fetched) | Yes |
| **Farah Vallis** | Vallis | −6.03, 136.80 | −5.49 / −6.49 / (convert) | 76.37 km | — | GAZ /Feature/15109 (read from search result) | Yes |
| **Sakarya Vallis** | Vallis | TO EXTRACT from GAZ | TO EXTRACT | TO EXTRACT | 2020-12-14 (Washington University announcement) | GAZ entry not located | Yes, once extracted |
| **Yellowknife** | Crater (small) | −4.58, 137.44 (as given in the gazetteer's news item) | TO EXTRACT | TO EXTRACT | — | GAZ news page; feature page not loaded | Optional — easily confused with "Yellowknife Bay"; if shown, label clearly as the IAU crater |

### Notes on the IAU features

**Gale.** Ancient impact crater on the dichotomy boundary. Rim, floor and mound elevations must be measured from the DEM (registry D02/D03); none are recorded here.

**Aeolis Mons / Mount Sharp.** A mound of layered sedimentary rock, not a volcano and not a simple central peak. Reported relief of about 5.5 km above the northern floor is a secondary-source figure — measure from D02. The summit is **outside** the 1 m DEM (D01), whose maximum value (−322.56 m) is therefore not the summit elevation.

**Aeolis Palus.** The crater-floor plain between the northern wall and the mound; contains Bradbury Landing.

**Peace Vallis.** Valley cut through the northern rim feeding an alluvial fan on the floor near the landing site. Fan area ≈ 80 km² and catchment ≈ 730 km² are reported in a secondary source citing Palucis et al. 2014 (J. Geophys. Res. Planets 119, 705–728) — verify against the paper before display. Channel geometry and tributaries are to be traced from D02 and CTX, and labelled Derived.

**Gediz Vallis.** Canyon on the NW flank of Mount Sharp along Curiosity's later route.

**Farah Vallis.** Large valley entering the crater through the SW rim.

---

## B. Mission landmarks with verified rover coordinates

These positions were read directly from WP during the audit (file content was available to sol 515).

| Landmark (informal) | What it is | Sol(s) | RMC | Lon | Lat | Rover elev. (m) | Odometry (m) | Selectable |
|---|---|---|---|---|---|---|---|---|
| **Bradbury Landing** | Landing site | 3 (first record) | 2_0 | 137.441633 | −4.589467 | −4500.971 | 0.0 | Yes |
| (rover stationary) | Position held sols 59–102 | 59 / 102 | 5_104 / 5_388 | 137.4483418 / 137.4486951 | −4.58999567 / −4.58994723 | −4517.843 / −4518.25 | 490.02 / 517.2 | See note 1 |
| **Yellowknife Bay** — "John Klein" drill site | First drilled sample, sol 182 (DR) | nearest records 164 and 166 | 5_2270 / 6_0 | 137.4491362 / 137.4491296 | −4.589467 / −4.58948488 | −4520.492 / −4520.456 | 720.06 / 723.41 | Yes |
| **Yellowknife Bay** — "Cumberland" drill site | Second drilled sample, sol 279 (DR) | nearest record 274 | 6_82 | 137.4491125 | −4.58947865 | −4520.369 | 727.16 | Yes (may merge with John Klein at low zoom) |
| (leaving Yellowknife Bay) | Drive end | 324 | 7_0 | 137.4487282 | −4.59020261 | −4518.411 | 866.14 | No |
| (waypoint) | Drive end | 392 | 16_50 | 137.426291 | −4.60711483 | −4505.705 | 2852.46 | See note 2 |
| (waypoint) | Drive end | 440 | 22_0 | 137.4150005 | −4.62233426 | −4493.677 | 4182.79 | See note 2 |

Cross-check: NASA's fact sheet gives the landing as 4.6°S, 137.4°E, −4,501 m, consistent with the first waypoint. The original spec's "4.5895°S, 137.4417°E" agrees with the waypoint to four decimals.

Note 1 — The stationary period at sols 59–102 corresponds in mission accounts to the "Rocknest" sand-scooping campaign; that name-to-sol link was **not** verified against a source in this audit. Confirm before labelling.
Note 2 — NASA's sol-524 traverse map names waypoints "Darwin" and "Cooperstown" on this stretch; which sols they correspond to was not verified. Do not label until confirmed.

**Yellowknife Bay — significance.** Mudstone of the Sheepbed member, Yellowknife Bay formation, interpreted as a shallow lake deposit; drill samples contained clay minerals and sulfate salts alongside detrital basaltic minerals (Vaniman et al. 2014, Science).

---

## C. Mission landmarks — coordinates TO EXTRACT from the waypoint file

Sols are verified (source in last column). Extraction key = the WP record with the greatest `sol` ≤ the sol shown. Do not publish a coordinate for these until the extraction has been run on the complete file.

| Landmark (informal) | Type | Key sol(s) | Geological unit (as published) | Significance | Sol source | Selectable |
|---|---|---|---|---|---|---|
| **The Kimberley** — "Windjana" drill | Outcrop area; drill site | 621 (mini-drill 615) | Kimberley formation, Bradbury group | Sandstone outcrop on the crater floor | DR | Yes |
| **Pahrump Hills** — "Confidence Hills" drill | Outcrop; first Mount Sharp drill | 759 (test 756) | Murray formation, base of Mount Sharp group | Where Curiosity first reached Mount Sharp strata (F16; Rampe et al. 2017) | DR | Yes |
| "Mojave" / "Telegraph Peak" drills | Drill sites at Pahrump Hills | 882 / 908 | Murray formation | Mudstone mineralogy series | sols from NASA captions (PIA21254) | Optional (zoom ≥ 14) |
| "Buckskin" drill | Drill site | 1060 | Murray formation | — | NASA caption | Optional |
| "Big Sky" / "Greenhorn" drills | Drill sites | 1119 / 1137 | Stimson formation (per later literature — confirm) | Aeolian sandstone and its altered fracture halo | NASA caption | Optional |
| **Bagnold Dunes — Namib Dune** ("Gobabeb" scoop) | Active dune | sol not verified in this audit | Modern aeolian sand | First in-situ study of an active dune on another planet | NASA caption names the Gobabeb scoop site | Yes, once sol and position are confirmed |
| "Lubango" / "Okoruso" / "Oudam" / "Marimba" drills | Drill sites | 1320 / 1332 / 1361 / 1422 | Stimson (first two) and Murray (last two) per literature — confirm | — | NASA captions | Optional |
| **Murray Buttes** — "Quela" drill | Buttes; drill site | 1464 | Murray formation | Layered buttes at the base of Mount Sharp | NASA caption | Yes |
| "Sebina" drill | Drill site | 1495 | Murray formation | — | Planetary Society caption | Optional |
| **Vera Rubin ridge** (first survey stop) | Ridge | campaign sols 1726–2302 | Murray formation (Pettegrove Point and Jura members — per F20; confirm) | Erosion-resistant ridge with an orbital hematite signature; rover results indicate the ridge was hardened by diagenesis | F20 | Yes — also as a line feature |
| "Duluth" drill | Drill site, just below the ridge | 2057 | Murray formation | First sample with the feed-extended drilling technique | DR | Optional |
| "Rock Hall" drill | Drill site on the ridge | 2261 | Murray formation (Jura member — confirm) | — | DR | Optional |
| **Glen Torridon** (entry) | Trough / region | campaign January 2019 – January 2021 (~sol 2300 on) | Murray formation passing up into the Carolyn Shoemaker formation | Region of strongest orbital clay signature; highest clay abundances measured by the rover; ~5 km driven, 11 drill holes (B22) | B22 | Yes — as a region |
| "Aberlady" / "Kilmarie" drills | Drill sites | 2370 / 2384 | Glen Torridon | — | DR | Optional |
| "Glen Etive" 1 & 2 drills | Drill sites | 2486 / 2527 | Glen Torridon | — | DR | Optional |
| "Hutton" drill | Drill site | 2668 | Just below the Siccar Point unconformity (per B22 context — confirm) | — | DR | Optional |
| **Greenheugh pediment** — "Edinburgh" drill | Pediment surface; drill site | 2711 | Stimson formation capping sandstone (B22) | Remnant of a Hesperian aeolian sand sea above the unconformity | DR; pediment association from B22 abstract, drill-to-pediment link to confirm | Yes |
| "Glasgow" / "Mary Anning" drills | Drill sites | 2754 / 2838 | Glen Torridon | Mary Anning: site of the thermochemolysis organics experiment (confirm against B22 text) | DR | Optional |

Later exploration (the sulfate-bearing unit, Gediz Vallis, and terrain reached after sol ~2850) is real and should be included, but no sol or unit was verified in this audit. Add entries only from the waypoint file plus a peer-reviewed or NASA source for each name.

---

## D. Features defined from orbit (areas and lines, not pins)

| Feature | Type | Location | Dimensions (as published) | Significance | Source | Confidence | Selectable |
|---|---|---|---|---|---|---|---|
| **Hematite ridge (orbital unit HR)** = Vera Rubin ridge | Ridge unit | NW lower Mount Sharp; outline TO OBTAIN (no public vector) | ≈ 200 m wide, ≈ 6.5 km long, ≈ 10 m above the unit below | Capped by a layer with an anhydrous hematite spectral signature | F16 | High (description); geometry unavailable | As area once geometry exists |
| **Phyllosilicate unit (PhU)** ≈ Glen Torridon | Orbital unit | Directly above the Murray formation, south of the ridge | not given | Fe/Mg phyllosilicate signatures with some Al substitution | F16 | High / geometry unavailable | As area |
| **Layered sulfate unit (LS)** | Orbital unit | Above PhU/HR on the NW flank | not given | Mono- and polyhydrated Mg-sulfate signatures; boxwork and fractures | F16 | High / geometry unavailable | As area |
| **Peace Vallis fan** | Alluvial fan | Floor of Aeolis Palus below Peace Vallis | ≈ 80 km² (secondary source — verify) | Source of sediments near the landing site | Palucis et al. 2014 via secondary source | Medium | As area once traced |
| **Bagnold Dunes** | Dune field | Along the NW base of Mount Sharp | TO MEASURE from imagery/DEM | Active dark basaltic sand | CTX/HiRISE imagery | Medium | As area once traced |

Any outline traced by the MarsWalk team from imagery is **Interpreted (MarsWalk)** and must be labelled that way, with the base image and date.

---

## E. Stratigraphic units (not selectable as point landmarks)

Shown in the unit legend and along the rover traverse (by sol interval), not as map pins.

| Unit | Rank | Short description as published | Source |
|---|---|---|---|
| Bradbury group | Group | Oldest strata explored on the crater floor (with the Mount Sharp group, "the oldest strata in Gale") | F16 citing Grotzinger et al. 2015 |
| Yellowknife Bay formation (incl. Sheepbed member) | Formation | Lake mudstone with clay minerals | Vaniman et al. 2014 |
| Kimberley formation | Formation | Sandstones at The Kimberley | named in mission literature — add primary citation |
| Mount Sharp group | Group | Lower Mount Sharp strata; seven orbital units in F16 | F16 |
| Murray formation | Formation | Finely laminated lake mudstone with rare cross-bedded sandstone; lowest exposed Mount Sharp group | Rampe et al. 2017; F16 |
| Carolyn Shoemaker formation | Formation | Defined in Glen Torridon where cross-bedded sandstones record more energetic fluvial settings above the Murray formation | B22 |
| Siccar Point group | Group | Unconformably overlies the Mount Sharp group | F16 |
| Stimson formation | Formation | Cross-bedded aeolian sandstone | F16; B22 |

Required display note: "Formations and groups are interpretations. Contacts are known where the rover crossed them and inferred elsewhere."

---

## F. Extraction procedure for section C

1. Download the complete `MSL_waypoints.json` (registry D12).
2. For each key sol *S*, select the feature with the largest `sol` ≤ *S*; record `lon`, `lat`, `elev_geoid`, `RMC`, `dist_total_m`.
3. Store with `position_basis = "rover drive-end position at or before sol S"`.
4. Cross-check a sample against the PLACES archive (D14).
5. For every name, record the publication that ties the name to the sol. Entries marked "confirm" stay hidden until that is done.
