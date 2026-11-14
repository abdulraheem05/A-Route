'use client';
// MEASURE & PLAN.
//
// One pair of points does two jobs: the direct line between them is the
// measurement that used to live in Inspect, and the same pair is the input to
// terrain-aware route planning (lib/terrain/routing.js).
//
// Nothing here is crater-specific. Points come from the active crater's
// terrain through the existing picker, or from its own place index; elevation
// comes from whichever dataset the height provider says covers each point.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { formatLat, formatLon, inBounds } from '@/lib/coordinates/projection';
import { useCrater } from '@/lib/mars/CraterContext';
import { heightProvider } from '@/lib/terrain/heightProvider';
import { cameraApi } from '@/lib/terrain/cameraApi';
import { buildPlaceIndex, filterPlaces } from '@/lib/data/placeIndex';
import {
  DEFAULT_ASSUMPTIONS,
  ROUTE_MODES,
  paceFromWaypoints,
  planRoutes,
  profileAlong,
  routeStats,
} from '@/lib/terrain/routing';
import { useStore } from '@/store/useStore';
import ProfileChart from '@/components/panels/ProfileChart';
import { DatasetLink, EvidenceBadge } from '@/components/panels/ui';

const fmtDist = (m) =>
  m == null ? '—' : m >= 1000 ? `${(m / 1000).toFixed(2)} km` : `${m.toFixed(0)} m`;
const fmtElev = (m) => (m == null ? '—' : `${m.toFixed(1)} m`);
const fmtDeg = (d) => (d == null ? '—' : `${d.toFixed(1)}°`);
const fmtSols = (s) =>
  s == null ? '—' : s < 2 ? `${(s * 24.66).toFixed(1)} h` : s < 1000 ? `${s.toFixed(0)} sols` : `${(s / 1000).toFixed(1)}k sols`;

function Block({ title, right, children }) {
  return (
    <div className="border-t px-2.5 py-2.5 first:border-t-0" style={{ borderColor: 'var(--g-line-soft)' }}>
      {(title || right) && (
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <span className="label">{title}</span>
          {right}
        </div>
      )}
      {children}
    </div>
  );
}

function K({ label, children }) {
  return (
    <div className="kv">
      <span>{label}</span>
      <span>{children}</span>
    </div>
  );
}

/* ------------------------------------------------------------ controls --- */

function Segmented({ value, options, onChange }) {
  return (
    <div className="plan-seg" role="tablist">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          role="tab"
          aria-selected={value === o.id}
          data-active={value === o.id ? 'true' : 'false'}
          onClick={() => onChange(o.id)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** One end of the route: its coordinates, where it came from, and its controls. */
function EndCard({ which, point, picking, mode, onPick, onClear, places, onChoose }) {
  const isStart = which === 'start';
  const label = isStart ? 'Start' : 'End';
  const color = isStart ? 'var(--g-accent)' : 'var(--g-data)';
  return (
    <div className="plan-end" data-armed={picking ? 'true' : 'false'}>
      <div className="plan-end-head">
        <span className="plan-dot" style={{ background: color }} aria-hidden="true" />
        <span className="label flex-1" style={{ color: 'var(--g-text)' }}>
          {label}
        </span>
        {point && (
          <>
            <button type="button" className="plan-mini" onClick={() => cameraApi.flyTo(point.lon, point.lat, 4)}>
              Fly
            </button>
            <button type="button" className="plan-mini" onClick={onClear}>
              Clear
            </button>
          </>
        )}
      </div>

      {point ? (
        <div className="px-2 pb-2">
          {point.label && <p className="mb-1 text-[11.5px] text-slate-100">{point.label}</p>}
          <K label="Latitude">
            <span className="num">{formatLat(point.lat, 5)}</span>
          </K>
          <K label="Longitude">
            <span className="num">{formatLon(point.lon, 5)}</span>
          </K>
          <K label="Elevation">
            {point.elev != null ? (
              <span className="num">{fmtElev(point.elev)}</span>
            ) : (
              <span className="text-slate-500">no data here</span>
            )}
          </K>
          {point.datasetId && (
            <K label="From">
              <DatasetLink id={point.datasetId} />
            </K>
          )}
        </div>
      ) : mode === 'terrain' ? (
        <div className="px-2 pb-2">
          <button type="button" className={`btn w-full ${picking ? 'btn-accent' : ''}`} onClick={onPick}>
            {picking ? 'Click the terrain…' : `Set ${label.toLowerCase()} on terrain`}
          </button>
        </div>
      ) : (
        <div className="px-2 pb-2">
          <PlaceSearch places={places} onChoose={onChoose} label={label} />
        </div>
      )}

      {!point && mode === 'terrain' && picking && <LivePreview />}
    </div>
  );
}

/** Live latitude and longitude under the cursor while a point is being set. */
function LivePreview() {
  const cursor = useStore((s) => s.cursor);
  return (
    <div className="plan-live">
      {cursor ? (
        <>
          <span className="num">{formatLat(cursor.lat, 4)}</span>
          <span className="num">{formatLon(cursor.lon, 4)}</span>
          <span className="num ml-auto">
            {cursor.elev != null ? `${cursor.elev.toFixed(0)} m` : 'no data'}
          </span>
        </>
      ) : (
        <span className="text-slate-500">Move the pointer over the terrain</span>
      )}
    </div>
  );
}

/** Type-to-filter selector over the crater's own places. */
function PlaceSearch({ places, onChoose, label }) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const box = useRef(null);
  const hits = useMemo(() => filterPlaces(places, q).slice(0, 40), [places, q]);

  useEffect(() => {
    const away = (e) => {
      if (box.current && !box.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('pointerdown', away);
    return () => document.removeEventListener('pointerdown', away);
  }, []);

  if (!places.length) {
    return <p className="note">No named places are loaded for this crater yet.</p>;
  }

  return (
    <div className="plan-search" ref={box}>
      <input
        type="text"
        className="plan-input"
        placeholder={`Search ${places.length} places…`}
        aria-label={`Search for a ${label.toLowerCase()} location`}
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
      />
      {open && (
        <ul className="plan-results thin-scroll" role="listbox">
          {hits.length === 0 && <li className="plan-empty">Nothing matches “{q}”</li>}
          {hits.map((p) => (
            <li key={`${p.kind}:${p.id}`}>
              <button
                type="button"
                role="option"
                aria-selected="false"
                onClick={() => {
                  onChoose(p);
                  setOpen(false);
                  setQ('');
                }}
              >
                <span className="plan-result-name">{p.name}</span>
                <span className="plan-result-meta">
                  {p.kindLabel}
                  {p.type ? ` · ${p.type}` : ''} · {formatLat(p.lat, 3)} {formatLon(p.lon, 3)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* --------------------------------------------------------------- stats --- */

function RouteStats({ route, assumptions }) {
  const s = route.stats;
  return (
    <>
      <K label="Distance">
        <span className="num">{fmtDist(s.cellDistanceM ?? s.distanceM)}</span>
      </K>
      <K label="Travel time">
        <span className="num">{fmtSols(s.travelSols)}</span>
      </K>
      <K label="Elevation gain">
        <span className="num plan-gain">+{s.gainM != null ? s.gainM.toFixed(0) : '—'} m</span>
      </K>
      <K label="Elevation loss">
        <span className="num plan-loss">−{s.lossM != null ? s.lossM.toFixed(0) : '—'} m</span>
      </K>
      <K label="Lowest / highest">
        <span className="num">
          {s.minElevM != null ? `${s.minElevM.toFixed(0)} / ${s.maxElevM.toFixed(0)} m` : '—'}
        </span>
      </K>
      <K label="Slope, average">
        <span className="num">{fmtDeg(s.avgSlopeDeg)}</span>
      </K>
      <K label="Slope, maximum">
        <span className={`num ${s.maxSlopeDeg != null && s.maxSlopeDeg > assumptions.safeSlopeLimitDeg ? 'plan-over' : ''}`}>
          {fmtDeg(s.maxSlopeDeg)}
        </span>
      </K>
      {s.incomplete && (
        <p className="note mt-1">
          Elevation is missing along {(100 - s.coverage * 100).toFixed(0)}% of this line, so the profile has gaps and
          the totals cover only the part with data.
        </p>
      )}
    </>
  );
}

/* --------------------------------------------------------------- panel --- */

export default function MeasurePlanPanel() {
  const crater = useCrater();
  const plan = useStore((s) => s.plan);
  const waypoints = useStore((s) => s.rover.waypoints);
  const sol = useStore((s) => s.sol);
  const terrain = useStore((s) => s.terrain);
  const terrainVersion = useStore((s) => s.terrainVersion);
  const setPlanMode = useStore((s) => s.setPlanMode);
  const startPicking = useStore((s) => s.startPicking);
  const stopPicking = useStore((s) => s.stopPicking);
  const setPlanPoint = useStore((s) => s.setPlanPoint);
  const clearPlanPoint = useStore((s) => s.clearPlanPoint);
  const clearPlan = useStore((s) => s.clearPlan);
  const setPlanResult = useStore((s) => s.setPlanResult);
  const setPlanComputing = useStore((s) => s.setPlanComputing);
  const setPlanError = useStore((s) => s.setPlanError);
  const setActiveRoute = useStore((s) => s.setActiveRoute);
  const toggleRouteVisible = useStore((s) => s.toggleRouteVisible);
  const setPlanOverride = useStore((s) => s.setPlanOverride);
  const resetPlanOverrides = useStore((s) => s.resetPlanOverrides);
  const setProfileCursor = useStore((s) => s.setProfileCursor);

  const [showAssumptions, setShowAssumptions] = useState(false);

  const places = useMemo(
    () => buildPlaceIndex(crater, waypoints, sol),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [crater, waypoints, sol, terrainVersion]
  );

  // The pace the planner will use, and where it came from.
  const pace = useMemo(() => paceFromWaypoints(waypoints), [waypoints]);
  const assumptions = useMemo(
    () => ({
      ...DEFAULT_ASSUMPTIONS,
      ...(pace ? { paceMPerSol: pace.paceMPerSol, paceSource: pace.paceSource, paceBasis: pace.basis } : {}),
      ...plan.overrides,
    }),
    [pace, plan.overrides]
  );

  const sampleHere = useCallback((lon, lat) => {
    const s = heightProvider.sample(lon, lat);
    return { elev: s ? s.h : null, datasetId: s ? s.datasetId : null };
  }, []);

  const choosePlace = (which) => (p) => {
    const here = sampleHere(p.lon, p.lat);
    setPlanPoint(which, {
      lon: p.lon,
      lat: p.lat,
      elev: here.elev ?? p.elev ?? null,
      datasetId: here.datasetId,
      label: p.name,
      kind: p.kind,
    });
  };

  const bothSet = !!(plan.start && plan.end);
  const outside =
    bothSet &&
    (!inBounds(crater.bounds, plan.start.lon, plan.start.lat) || !inBounds(crater.bounds, plan.end.lon, plan.end.lat));

  // Routes are computed only on request, never while the pointer moves.
  const compute = () => {
    if (!bothSet) return;
    setPlanComputing(true);
    // One frame of breathing room so the button shows its working state before
    // the search blocks the thread.
    requestAnimationFrame(() => {
      try {
        const result = planRoutes({
          a: { lon: plan.start.lon, lat: plan.start.lat, elev: plan.start.elev },
          b: { lon: plan.end.lon, lat: plan.end.lat, elev: plan.end.elev },
          waypoints,
          assumptions: plan.overrides,
        });
        setPlanResult({
          routes: result.routes,
          direct: result.direct,
          notes: result.notes,
          assumptions: result.assumptions,
          gridInfo: result.grid
            ? {
                nodes: result.grid.w * result.grid.h,
                cellMetres: result.grid.cellMetres,
                stride: result.grid.stride,
                nativeResM: result.grid.nativeResM,
                datasetId: result.grid.datasetId,
              }
            : null,
        });
      } catch (err) {
        setPlanError(err && err.message ? err.message : String(err));
      }
    });
  };

  const result = plan.result;
  const activeRoute = result && result.routes ? result.routes[plan.active] : null;

  // If the selected model could not produce a route but the other could, show
  // the one that exists rather than an empty panel.
  useEffect(() => {
    if (!result || !result.routes) return;
    const current = result.routes[plan.active];
    if (current && current.points) return;
    const usable = ROUTE_MODES.find((m) => result.routes[m.id] && result.routes[m.id].points);
    if (usable && usable.id !== plan.active) setActiveRoute(usable.id);
  }, [result, plan.active, setActiveRoute]);

  return (
    <>
      {/* ---------------------------------------------------- how to pick */}
      <Block title="Choose points by" right={<EvidenceBadge kind="Derived" />}>
        <Segmented
          value={plan.mode}
          options={[
            { id: 'terrain', label: 'Select on terrain' },
            { id: 'known', label: 'Known locations' },
          ]}
          onChange={setPlanMode}
        />
        <p className="note mt-1.5">
          {plan.mode === 'terrain'
            ? 'Click the surface to place each end. The readout follows the pointer while you aim.'
            : `Search the ${places.length} named places, landing site and rover positions loaded for ${crater.searchRegionLabel || crater.name}.`}
        </p>
      </Block>

      {/* ------------------------------------------------------ the ends */}
      <Block>
        <div className="space-y-1.5">
          <EndCard
            which="start"
            point={plan.start}
            picking={plan.picking === 'start'}
            mode={plan.mode}
            onPick={() => (plan.picking === 'start' ? stopPicking() : startPicking('start'))}
            onClear={() => clearPlanPoint('start')}
            places={places}
            onChoose={choosePlace('start')}
          />
          <EndCard
            which="end"
            point={plan.end}
            picking={plan.picking === 'end'}
            mode={plan.mode}
            onPick={() => (plan.picking === 'end' ? stopPicking() : startPicking('end'))}
            onClear={() => clearPlanPoint('end')}
            places={places}
            onChoose={choosePlace('end')}
          />
        </div>

        {outside && (
          <p className="note mt-1.5 text-rose-300/80">
            One end is outside the {crater.searchRegionLabel || crater.name} data region.
          </p>
        )}
      </Block>

      {/* --------------------------------------------- direct measurement */}
      {bothSet && (
        <Block title="Direct line" right={<EvidenceBadge kind="Derived" />}>
          <DirectLine start={plan.start} end={plan.end} terrainVersion={terrainVersion} />
        </Block>
      )}

      {/* ------------------------------------------------------- planning */}
      {bothSet && (
        <Block title="Plan a route">
          {terrain.status !== 'ready' ? (
            <p className="note">
              Route planning needs the elevation grid. {terrain.status === 'missing'
                ? 'None is prepared for this crater, so only the direct line above is available.'
                : 'Waiting for it to load…'}
            </p>
          ) : (
            <>
              <button
                type="button"
                className={`btn w-full ${plan.computing ? '' : 'btn-accent'}`}
                onClick={compute}
                disabled={plan.computing}
              >
                {plan.computing ? 'Searching the terrain…' : result ? 'Recalculate routes' : 'Calculate routes'}
              </button>
              {plan.error && <p className="note mt-1.5 text-rose-300/80">{plan.error}</p>}
            </>
          )}
        </Block>
      )}

      {/* --------------------------------------------------------- routes */}
      {result && (
        <Block title="Routes">
          <div className="space-y-1.5">
            {ROUTE_MODES.map((m) => {
              const r = result.routes[m.id];
              if (!r) return null;
              const on = plan.active === m.id;
              return (
                <div key={m.id} className="plan-route" data-active={on ? 'true' : 'false'}>
                  <button type="button" className="plan-route-head" onClick={() => setActiveRoute(m.id)}>
                    <span className="plan-swatch" style={{ background: m.color }} aria-hidden="true" />
                    <span className="plan-route-name">{m.label}</span>
                    <span className="plan-route-figure num">
                      {r.points ? fmtDist(r.stats.cellDistanceM ?? r.stats.distanceM) : 'not possible'}
                    </span>
                  </button>
                  {r.points && (
                    <label className="plan-route-eye">
                      <input
                        type="checkbox"
                        checked={!!plan.show[m.id]}
                        onChange={() => toggleRouteVisible(m.id)}
                      />
                      <span>Show on map</span>
                    </label>
                  )}
                  {!r.points && <p className="note px-2 pb-2">{r.notes[0]}</p>}
                </div>
              );
            })}
          </div>
          {result.notes.map((n) => (
            <p key={n} className="note mt-1.5">
              {n}
            </p>
          ))}
        </Block>
      )}

      {/* ---------------------------------------------- stats and profile */}
      {activeRoute && activeRoute.points && (
        <Block title={`${activeRoute.label} route`} right={<EvidenceBadge kind="Interpreted" />}>
          <RouteStats route={activeRoute} assumptions={result.assumptions} />
          <div className="mt-2">
            <ProfileChart
              samples={activeRoute.profile.points}
              height={104}
              interactive
              color={activeRoute.color}
              onHover={setProfileCursor}
            />
            <p className="note mt-1">
              {plan.profileCursor
                ? `${fmtDist(plan.profileCursor.d)} along · ${plan.profileCursor.h != null ? `${plan.profileCursor.h.toFixed(1)} m` : 'no data'}`
                : 'Hover the profile to follow the route on the map.'}
            </p>
            <p className="note">
              Elevation from{' '}
              {activeRoute.profile.sources.length
                ? activeRoute.profile.sources.map((id) => <DatasetLink key={id} id={id} />)
                : 'no dataset'}
              , sampled every {activeRoute.stats.sampleSpacingM.toFixed(0)} m. Slope from {activeRoute.stats.slopeBasis}.
            </p>
          </div>
        </Block>
      )}

      {/* ---------------------------------------------------- assumptions */}
      {bothSet && (
        <Block>
          <button
            type="button"
            className="flex w-full items-center justify-between rounded-md border border-line px-2 py-1.5 text-[11px] text-slate-400 transition hover:text-slate-100"
            onClick={() => setShowAssumptions((v) => !v)}
          >
            Assumptions used
            <span className="chev" data-open={showAssumptions ? 'true' : 'false'}>
              <svg width="9" height="9" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M3.5 1.5 L7 5 L3.5 8.5" />
              </svg>
            </span>
          </button>

          {showAssumptions && (
            <div className="mt-2 space-y-2">
              <p className="note">
                Elevation and slope are read from the DEM. Everything below is a modelling choice, not a published
                rover specification, and changing it changes the routes.
              </p>

              <Slider
                label="Pace on easy ground"
                value={assumptions.paceMPerSol}
                min={1}
                max={300}
                step={1}
                unit=" m/sol"
                onChange={(v) => setPlanOverride('paceMPerSol', v)}
              />
              <p className="note -mt-1">
                {pace && !('paceMPerSol' in plan.overrides)
                  ? `From the loaded rover record: ${pace.basis} (${pace.paceSource}).`
                  : pace
                  ? `Overriding the rover record, which gives ${pace.paceMPerSol.toFixed(1)} m/sol.`
                  : 'No rover record is loaded, so this is an assumed figure.'}
              </p>

              <Slider
                label="Safe slope limit"
                value={assumptions.safeSlopeLimitDeg}
                min={3}
                max={30}
                step={1}
                unit="°"
                onChange={(v) => setPlanOverride('safeSlopeLimitDeg', v)}
              />
              <Slider
                label="Refuse above"
                value={assumptions.hardSlopeLimitDeg}
                min={10}
                max={45}
                step={1}
                unit="°"
                onChange={(v) => setPlanOverride('hardSlopeLimitDeg', v)}
              />
              <Slider
                label="Steepness avoidance"
                value={assumptions.safetyWeight}
                min={0}
                max={20}
                step={1}
                unit="×"
                onChange={(v) => setPlanOverride('safetyWeight', v)}
              />

              {result && result.gridInfo && (
                <p className="note">
                  Searched a {result.gridInfo.nodes.toLocaleString()}-cell window of{' '}
                  <DatasetLink id={result.gridInfo.datasetId} /> at {Math.round(result.gridInfo.cellMetres)} m
                  {result.gridInfo.stride > 1
                    ? ` (every ${result.gridInfo.stride} cells of the ${Math.round(result.gridInfo.nativeResM)} m grid)`
                    : ''}
                  . A route cannot resolve obstacles smaller than one cell, so it describes the shape of the ground,
                  not whether a rover could actually drive it.
                </p>
              )}

              {Object.keys(plan.overrides).length > 0 && (
                <button type="button" className="btn w-full" onClick={resetPlanOverrides}>
                  Reset assumptions
                </button>
              )}
            </div>
          )}
        </Block>
      )}

      {/* --------------------------------------------------------- footer */}
      <Block>
        <div className="flex gap-1.5">
          <button type="button" className="btn flex-1" onClick={clearPlan} disabled={!plan.start && !plan.end}>
            Clear route
          </button>
          <button type="button" className="btn flex-1" onClick={stopPicking} disabled={!plan.picking}>
            Exit selection
          </button>
        </div>
      </Block>
    </>
  );
}

/**
 * The straight line between the two ends.
 *
 * This is the measurement that used to be the Measure Distance card: the same
 * great-circle distance, the same elevation profile sampled from whatever
 * dataset covers the line, and the same end-to-end grade. It is recomputed
 * when the terrain under it changes, as before.
 */
function DirectLine({ start, end, terrainVersion }) {
  const [open, setOpen] = useState(false);
  const patch = useStore((s) => s.patch);
  const setProfileCursor = useStore((s) => s.setProfileCursor);

  const d = useMemo(() => {
    const profile = profileAlong([start, end], 240);
    const stats = routeStats(profile, DEFAULT_ASSUMPTIONS);
    const grade =
      stats.netM != null && profile.totalM > 0 ? (Math.atan2(stats.netM, profile.totalM) * 180) / Math.PI : null;
    return { profile, stats, grade };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [start, end, terrainVersion, patch]);

  return (
    <>
      <K label="Distance">
        <span className="num">{fmtDist(d.profile.totalM)}</span>
      </K>
      <K label="Elevation change">
        <span className="num">
          {d.stats.netM != null ? `${d.stats.netM >= 0 ? '+' : ''}${d.stats.netM.toFixed(1)} m` : '—'}
        </span>
      </K>
      <K label="Grade, end to end">
        <span className="num">{fmtDeg(d.grade)}</span>
      </K>

      <button
        type="button"
        className="mt-1.5 flex w-full items-center justify-between rounded-md border border-line px-2 py-1.5 text-[11px] text-slate-400 transition hover:text-slate-100"
        onClick={() => setOpen((v) => !v)}
      >
        Elevation profile
        <span className="chev" data-open={open ? 'true' : 'false'}>
          <svg width="9" height="9" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M3.5 1.5 L7 5 L3.5 8.5" />
          </svg>
        </span>
      </button>

      {open && (
        <div className="mt-1.5">
          <ProfileChart samples={d.profile.points} height={92} interactive onHover={setProfileCursor} />
          <p className="note mt-1">
            Sampled from{' '}
            {d.profile.sources.length
              ? d.profile.sources.map((id) => <DatasetLink key={id} id={id} />)
              : 'no elevation data'}
            {d.profile.sources.length ? ' along the line.' : '.'}
          </p>
        </div>
      )}
    </>
  );
}

function Slider({ label, value, min, max, step, unit, onChange }) {
  return (
    <label className="plan-slider">
      <span className="plan-slider-row">
        <span>{label}</span>
        <span className="num">
          {typeof value === 'number' ? (value >= 10 ? value.toFixed(0) : value.toFixed(1)) : value}
          {unit}
        </span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
      />
    </label>
  );
}
