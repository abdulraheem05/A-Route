'use client';
// Contextual inspector.
//
// Three stacked sections — INSPECT, WEATHER, GEOLOGY — each a collapsed box
// that opens only when its chevron is clicked, so at most one body of text is
// ever on screen. Which one is open is the existing `infoTab` state, so
// selecting something on the map still opens Inspect automatically.
//
// Everything a value needs in order to be read honestly travels with it: the
// dataset it came from and whether it is measured, derived, interpreted or
// simulated. Long-form provenance now lives in disclosures instead of being
// printed by default. Measurement has moved out of this panel entirely and
// into a floating card (components/Explorer.jsx).
import { useMemo } from 'react';
import { BRADBURY } from '@/lib/mars/constants';
import { FIXED_LANDMARKS, NAME_CLASS, resolveLandmarks, waypointIndexAtSol } from '@/lib/data/landmarks';
import { nearestWaypoint } from '@/lib/data/roverAdapter';
import { STRAT_UNITS, UNIT_NOTE } from '@/lib/data/units';
import { formatLat, formatLon, inBounds } from '@/lib/coordinates/projection';
import { heightProvider } from '@/lib/terrain/heightProvider';
import { cameraApi } from '@/lib/terrain/cameraApi';
import { useStore } from '@/store/useStore';
import WeatherPanel from '@/components/panels/WeatherPanel';
import { DatasetLink, EvidenceBadge, fmt } from '@/components/panels/ui';

const dist = (m) => (m >= 1000 ? `${(m / 1000).toFixed(2)} km` : `${m.toFixed(0)} m`);

function Icon({ name, size = 14 }) {
  const p = {
    width: size,
    height: size,
    viewBox: '0 0 16 16',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.35,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
  };
  switch (name) {
    case 'inspect':
      return (
        <svg {...p}>
          <circle cx="7.2" cy="7.2" r="4.4" />
          <path d="M10.4 10.4 L14 14" />
        </svg>
      );
    case 'weather':
      return (
        <svg {...p}>
          <path d="M4.6 11.5 a2.7 2.7 0 0 1 .3-5.4 3.7 3.7 0 0 1 7 .9 2.4 2.4 0 0 1-.4 4.5Z" />
          <path d="M5.5 14 h5" opacity="0.55" />
        </svg>
      );
    case 'geology':
      return (
        <svg {...p}>
          <path d="M2 5 H14 M2 8 H14 M2 11 H14" />
          <path d="M2 2.6 H14" opacity="0.5" />
        </svg>
      );
    case 'rover':
      return (
        <svg {...p}>
          <rect x="3.5" y="5.5" width="9" height="4" rx="0.8" />
          <circle cx="4.5" cy="11.5" r="1.3" />
          <circle cx="8" cy="11.5" r="1.3" />
          <circle cx="11.5" cy="11.5" r="1.3" />
          <path d="M9 5.5 V3 h2.5" />
        </svg>
      );
    case 'crater':
      return (
        <svg {...p}>
          <circle cx="8" cy="8" r="5.6" />
          <circle cx="8" cy="8" r="1.5" />
        </svg>
      );
    case 'ruler':
      return (
        <svg {...p}>
          <path d="M2 12 L12 2 L14 4 L4 14 Z M5 9 l1.2 1.2 M7 7 l1.2 1.2 M9 5 l1.2 1.2" />
        </svg>
      );
    default:
      return null;
  }
}

function Chevron({ open }) {
  return (
    <span className="chev" data-open={open ? 'true' : 'false'}>
      <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
        <path d="M3.5 1.5 L7 5 L3.5 8.5" />
      </svg>
    </span>
  );
}

/** One of the three stacked boxes. */
function Acc({ id, icon, title, hint, open, onToggle, children }) {
  return (
    <section className="acc panel pointer-events-auto" data-open={open ? 'true' : 'false'}>
      <button
        type="button"
        className="acc-head"
        onClick={() => onToggle(id)}
        aria-expanded={open}
        aria-controls={`acc-${id}`}
      >
        <span style={{ color: open ? 'var(--g-accent)' : 'var(--g-text-faint)' }}>
          <Icon name={icon} />
        </span>
        <span className="acc-title">{title}</span>
        {!open && hint && <span className="acc-hint">{hint}</span>}
        <Chevron open={open} />
      </button>
      {open && (
        <div className="acc-body thin-scroll" id={`acc-${id}`}>
          {children}
        </div>
      )}
    </section>
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

function Coordinates({ lon, lat }) {
  return (
    <>
      <K label="Latitude">
        <span className="num">{formatLat(lat, 5)}</span>
      </K>
      <K label="Longitude">
        <span className="num">{formatLon(lon, 5)}</span>
      </K>
    </>
  );
}

/** Elevation and slope under a position — unchanged sampling logic. */
function TerrainAt({ lon, lat, compact }) {
  const terrainVersion = useStore((s) => s.terrainVersion);
  const patch = useStore((s) => s.patch);
  const info = useMemo(
    () => ({ sample: heightProvider.sample(lon, lat), slope: heightProvider.slope(lon, lat) }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lon, lat, terrainVersion, patch]
  );

  if (!info.sample) {
    return <p className="note">No elevation dataset covers this point. Nothing is estimated in its place.</p>;
  }

  return (
    <>
      <K label="Elevation">
        <span className="num">{info.sample.h.toFixed(1)} m</span> <DatasetLink id={info.sample.datasetId} />
      </K>
      {info.slope ? (
        <K label="Steepness">
          <span className="num">{info.slope.deg.toFixed(1)}°</span>
        </K>
      ) : (
        <K label="Steepness">
          <span className="text-slate-500">not available</span>
        </K>
      )}
      {!compact && (
        <details className="science-details mt-1.5">
          <summary>How this was measured</summary>
          <div>
            <K label="Elevation grid">
              <span className="num">{info.sample.resM.toFixed(info.sample.resM < 10 ? 1 : 0)} m</span>
            </K>
            {info.slope && (
              <>
                <K label="Slope baseline">
                  <span className="num">{info.slope.baselineM.toFixed(0)} m</span>
                </K>
                <K label="Faces (downslope)">
                  <span className="num">{info.slope.aspect.toFixed(0)}°</span> from north
                </K>
              </>
            )}
            {info.sample.datasetId === 'D01' && (
              <p className="note mt-1 text-interpreted">
                Inside the 1 m mosaic the true source resolution at any point is unknown (1 m to more than 100 m), so
                fine slope values are conditional.
              </p>
            )}
          </div>
        </details>
      )}
    </>
  );
}

function NearRover({ lon, lat }) {
  const waypoints = useStore((s) => s.rover.waypoints);
  const near = useMemo(() => (waypoints.length ? nearestWaypoint(waypoints, lon, lat) : null), [waypoints, lon, lat]);
  if (!near) return null;
  const w = waypoints[near.index];
  return (
    <K label="Nearest rover stop">
      <span className="num">{dist(near.distanceM)}</span>
      <span className="text-slate-500"> · sol {w.sol}</span>
    </K>
  );
}

/* ---------------------------------------------------------------- cards -- */

function PointCard({ sel }) {
  const containing = FIXED_LANDMARKS.filter((l) => l.bounds && inBounds(l.bounds, sel.lon, sel.lat));
  return (
    <>
      <Block>
        <div className="mb-1.5 flex items-start justify-between gap-2">
          <div>
            <h2 className="text-[13px] font-medium text-slate-50">Terrain point</h2>
            <p className="note">A place you picked on the surface.</p>
          </div>
          <EvidenceBadge kind="Derived" />
        </div>
        <TerrainAt lon={sel.lon} lat={sel.lat} />
        <NearRover lon={sel.lon} lat={sel.lat} />
        {containing.length > 0 && <K label="Inside">{containing.map((l) => l.name).join(', ')}</K>}
      </Block>

      <Block>
        <details className="science-details">
          <summary>Coordinates</summary>
          <div>
            <Coordinates lon={sel.lon} lat={sel.lat} />
          </div>
        </details>
        <details className="science-details mt-1.5">
          <summary>Rock and air at this point</summary>
          <div className="note space-y-1.5">
            <p>
              No mineral or geological-unit layer is loaded, so no composition is reported here. See Geology below for
              what is known in writing.
            </p>
            <p>
              Weather has only ever been measured where the rover has been, so there is no reading for this point.
            </p>
          </div>
        </details>
      </Block>
    </>
  );
}

function WaypointCard({ sel }) {
  const waypoints = useStore((s) => s.rover.waypoints);
  const weather = useStore((s) => s.weather);
  const w = waypoints[sel.index];
  const sites = useMemo(
    () => (w ? resolveLandmarks(waypoints).filter((l) => l.resolvedSol === w.sol && l.rmc === w.rmc) : []),
    [waypoints, w]
  );
  if (!w) return null;
  const obs = weather.bySol.get(w.sol);

  return (
    <>
      <Block>
        <div className="mb-1.5 flex items-start justify-between gap-2">
          <div>
            <h2 className="text-[13px] font-medium text-slate-50">Drive end · sol {w.sol}</h2>
            <p className="note">Where Curiosity stopped at the end of this drive.</p>
          </div>
          <EvidenceBadge kind="Derived" />
        </div>
        <K label="Driven in total">
          <span className="num">{w.distTotalM !== null ? dist(w.distTotalM) : '—'}</span>
        </K>
        <K label="This drive">
          <span className="num">{w.distM !== null ? `${w.distM.toFixed(1)} m` : '—'}</span>
          {w.driveType ? <span className="text-slate-500"> · {w.driveType}</span> : null}
        </K>
        <K label="Elevation">
          <span className="num">{fmt(w.elev, 1, ' m')}</span> <DatasetLink id="D12" />
        </K>
        {sites.length > 0 && <K label="At this stop">{sites.map((l) => l.name).join(', ')}</K>}
      </Block>

      <Block title="Weather that sol" right={obs ? <EvidenceBadge kind="Measured" /> : null}>
        {obs ? (
          <>
            <K label="Air temperature">
              <span className="num">
                {fmt(obs.minAir, 0)} to {fmt(obs.maxAir, 0)} °C
              </span>
            </K>
            <K label="Pressure">
              <span className="num">{fmt(obs.pressure, 0)} Pa</span>
            </K>
          </>
        ) : (
          <p className="note">
            The public daily feed has no record for this sol. Older sols are in the PDS REMS archive, which is not
            integrated.
          </p>
        )}
      </Block>

      <Block>
        <details className="science-details">
          <summary>Rover attitude and record</summary>
          <div>
            <K label="Record">
              <span className="num">RMC {w.rmc}</span>
            </K>
            <K label="Tilt / pitch / roll">
              <span className="num">
                {fmt(w.tilt, 1, '°')} / {fmt(w.pitch, 1, '°')} / {fmt(w.roll, 1, '°')}
              </span>
            </K>
            <K label="Heading (yaw)">
              <span className="num">{fmt(w.yaw, 1, '°')}</span>
            </K>
            <p className="note mt-1">
              End-of-drive position. Where the rover was between drive ends is not in the public file.
            </p>
          </div>
        </details>

        <details className="science-details mt-1.5">
          <summary>Terrain here, from our elevation data</summary>
          <div>
            <TerrainAt lon={w.lon} lat={w.lat} compact />
            <p className="note mt-1">
              Any difference from the rover file&rsquo;s own elevation shows how well the two datasets line up.
            </p>
          </div>
        </details>

        <details className="science-details mt-1.5">
          <summary>Coordinates</summary>
          <div>
            <Coordinates lon={w.lon} lat={w.lat} />
          </div>
        </details>
      </Block>
    </>
  );
}

function LandmarkCard({ sel }) {
  const waypoints = useStore((s) => s.rover.waypoints);
  const setSol = useStore((s) => s.setSol);
  const l = useMemo(() => resolveLandmarks(waypoints).find((x) => x.id === sel.id), [waypoints, sel.id]);
  if (!l) return null;

  return (
    <>
      <Block>
        <div className="mb-1.5 flex items-start justify-between gap-2">
          <div>
            <h2 className="text-[13px] font-medium leading-tight text-slate-50">{l.name}</h2>
            <p className="note">
              {NAME_CLASS[l.nameClass]}
              {l.alias ? ` · ${l.alias}` : ''}
            </p>
          </div>
          <EvidenceBadge kind="Interpreted" />
        </div>
        <p className="body-text">{l.significance}</p>
      </Block>

      <Block>
        <K label="Type">{l.type}</K>
        {l.sizeKm && (
          <K label="Size">
            <span className="num">{l.sizeKm} km</span>
          </K>
        )}
        {l.elev != null && (
          <K label="Elevation">
            <span className="num">{l.elev.toFixed(1)} m</span>
          </K>
        )}
        {l.unit && <K label="Rock unit">{l.unit}</K>}
        <div className="mt-2 flex gap-1.5">
          <button
            type="button"
            className="btn btn-accent flex-1"
            onClick={() => cameraApi.flyTo(l.lon, l.lat, l.sizeKm ? Math.max(20, l.sizeKm * 1.6) : 4)}
          >
            Fly here
          </button>
          {l.resolvedSol != null && (
            <button type="button" className="btn flex-1" onClick={() => setSol(l.resolvedSol)}>
              Sol {l.resolvedSol}
            </button>
          )}
        </div>
      </Block>

      <Block>
        <details className="science-details">
          <summary>Where this position comes from</summary>
          <div className="note space-y-1">
            <p>
              <span className="text-slate-400">Basis:</span> {l.positionBasis}
            </p>
            <p>
              <span className="text-slate-400">Uncertainty:</span> {l.uncertainty}
            </p>
            <p>
              <span className="text-slate-400">Source:</span> {l.source} <DatasetLink id={l.datasetId} />
            </p>
          </div>
        </details>
        <details className="science-details mt-1.5">
          <summary>Coordinates and terrain</summary>
          <div>
            <Coordinates lon={l.lon} lat={l.lat} />
            <TerrainAt lon={l.lon} lat={l.lat} compact />
          </div>
        </details>
      </Block>
    </>
  );
}

/** Nothing selected: what this place is, and what you can do next. */
function DefaultCard() {
  const terrain = useStore((s) => s.terrain);
  const rover = useStore((s) => s.rover);
  const toggleMeasure = useStore((s) => s.toggleMeasure);
  const measuring = useStore((s) => s.measure.active);
  const last = rover.waypoints[rover.waypoints.length - 1];

  const toRover = () => {
    const s = useStore.getState();
    const wps = s.rover.waypoints;
    if (!wps.length) {
      cameraApi.flyTo(BRADBURY.lon, BRADBURY.lat, 6);
      return;
    }
    const i = s.sol === null ? wps.length - 1 : Math.max(0, waypointIndexAtSol(wps, s.sol));
    cameraApi.flyTo(wps[i].lon, wps[i].lat, 2);
  };

  return (
    <>
      <Block>
        <h2 className="text-[13px] font-medium text-slate-50">Gale Crater</h2>
        <p className="body-text mt-1">
          An impact crater 154 km across with a mound of layered rock at its centre, Aeolis Mons. NASA&rsquo;s Curiosity
          rover landed on the northern floor in 2012 and has been climbing the mound ever since.
        </p>
        <p className="note mt-1.5">Click the terrain, a rover waypoint or a named place to inspect it.</p>
      </Block>

      <Block>
        <div className="grid grid-cols-2 gap-1.5">
          <button type="button" className="btn" onClick={toRover}>
            <Icon name="rover" size={13} />
            Curiosity
          </button>
          <button type="button" className="btn" onClick={() => cameraApi.flyTo(137.7, -5.0, 260)}>
            <Icon name="crater" size={13} />
            Whole crater
          </button>
          <button
            type="button"
            className={`btn col-span-2 ${measuring ? 'btn-accent' : ''}`}
            onClick={toggleMeasure}
          >
            <Icon name="ruler" size={13} />
            {measuring ? 'Measuring — click two points' : 'Measure distance'}
          </button>
        </div>
      </Block>

      <Block title="Loaded now">
        <K label="Elevation">
          {terrain.status === 'ready' ? (
            <DatasetLink id={terrain.meta.dataset_id} />
          ) : (
            <span className="text-interpreted">flat reference surface</span>
          )}
        </K>
        <K label="Imagery">
          <DatasetLink id="D05" /> <DatasetLink id="D06" />
        </K>
        <K label="Rover">
          {rover.status === 'ready' ? (
            <span className="num">
              to sol {last.sol}
              {last.distTotalM !== null ? ` · ${dist(last.distTotalM)}` : ''}
            </span>
          ) : rover.status === 'error' ? (
            <span className="text-rose-300">unavailable</span>
          ) : (
            <span className="text-slate-500">loading…</span>
          )}
        </K>
      </Block>

      <Block>
        <details className="science-details">
          <summary>Advanced · data information</summary>
          <div className="note space-y-1.5">
            <p>
              Positions use a local equirectangular projection on a sphere of radius 3,396,190 m, planetocentric
              latitude, east longitude.
            </p>
            <p>
              Planetary curvature is not applied to the surface, which costs about 2 km of drop at the edges of this
              region.
            </p>
            {rover.error && <p className="text-rose-300/80">{rover.error}</p>}
            {rover.join && !rover.join.ok && (
              <p>The path file could not be matched to the waypoint file reliably, so the path is not coloured by sol.</p>
            )}
            <p>Click any dataset code to see its instrument, resolution, limitations and citation.</p>
          </div>
        </details>
      </Block>
    </>
  );
}

/** Written rock-unit glossary. There is no unit polygon layer to toggle. */
function GeologyBody() {
  return (
    <>
      <Block right={<EvidenceBadge kind="Interpreted" />}>
        <p className="body-text">
          The rocks Curiosity drives over are grouped into units — bodies of rock that formed in the same way at
          roughly the same time. These descriptions come from published mapping, not from a data layer.
        </p>
      </Block>
      <Block>
        <ul className="space-y-2.5">
          {STRAT_UNITS.map((u) => (
            <li key={u.name}>
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-[12px] font-medium text-slate-100">{u.name}</span>
                <span className="label">{u.rank}</span>
              </div>
              <p className="note mt-0.5">{u.text}</p>
              <p className="note opacity-70">{u.source}</p>
            </li>
          ))}
        </ul>
      </Block>
      <Block>
        <details className="science-details">
          <summary>Why there is no geology layer on the map</summary>
          <div>
            <p className="note">{UNIT_NOTE}</p>
          </div>
        </details>
      </Block>
    </>
  );
}

/* --------------------------------------------------------------- panel --- */

export default function InfoPanel() {
  const open = useStore((s) => s.infoOpen);
  const tab = useStore((s) => s.infoTab);
  const selection = useStore((s) => s.selection);
  const waypoints = useStore((s) => s.rover.waypoints);
  const sol = useStore((s) => s.sol);
  const weatherStatus = useStore((s) => s.weather.status);
  const setValue = useStore((s) => s.setValue);

  if (!open) return null;

  const toggle = (id) => setValue('infoTab', tab === id ? null : id);

  const inspectHint = !selection
    ? 'Gale Crater'
    : selection.type === 'waypoint'
    ? `Sol ${waypoints[selection.index] ? waypoints[selection.index].sol : '—'}`
    : selection.type === 'landmark'
    ? 'Named place'
    : 'Terrain point';

  const weatherHint =
    weatherStatus === 'ready' ? (sol !== null ? `Sol ${sol}` : 'Rover record') : weatherStatus === 'error' ? 'Unavailable' : 'Loading…';

  // The dock itself is transparent: only the three boxes take pointer input, so
  // the empty space below them leaves the map clickable.
  return (
    <aside className="gale-dock gale-dock-right info-panel fade-in pointer-events-none" aria-label="Inspector">
      <Acc id="selection" icon="inspect" title="Inspect" hint={inspectHint} open={tab === 'selection'} onToggle={toggle}>
        {selection && (
          <div className="flex justify-end px-2.5 pt-2">
            <button
              type="button"
              className="text-[10.5px] text-slate-500 transition hover:text-slate-200"
              onClick={() => setValue('selection', null)}
            >
              Clear selection
            </button>
          </div>
        )}
        {!selection && <DefaultCard />}
        {selection && selection.type === 'point' && <PointCard sel={selection} />}
        {selection && selection.type === 'waypoint' && <WaypointCard sel={selection} />}
        {selection && selection.type === 'landmark' && <LandmarkCard sel={selection} />}
      </Acc>

      <Acc id="weather" icon="weather" title="Weather" hint={weatherHint} open={tab === 'weather'} onToggle={toggle}>
        <WeatherPanel />
      </Acc>

      <Acc id="units" icon="geology" title="Geology" hint={`${STRAT_UNITS.length} rock units`} open={tab === 'units'} onToggle={toggle}>
        <GeologyBody />
      </Acc>
    </aside>
  );
}
