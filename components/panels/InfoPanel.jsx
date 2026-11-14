'use client';
// Scientific information panel: what is at the selected place, with the source
// and evidence class of every value.
import { useMemo } from 'react';
import { FIXED_LANDMARKS, NAME_CLASS, resolveLandmarks, waypointIndexAtSol } from '@/lib/data/landmarks';
import { nearestWaypoint } from '@/lib/data/roverAdapter';
import { STRAT_UNITS, UNIT_NOTE } from '@/lib/data/units';
import { formatLat, formatLon, greatCircleMeters, inBounds } from '@/lib/coordinates/projection';
import { heightProvider } from '@/lib/terrain/heightProvider';
import { cameraApi } from '@/lib/terrain/cameraApi';
import { useStore } from '@/store/useStore';
import ProfileChart from '@/components/panels/ProfileChart';
import WeatherPanel from '@/components/panels/WeatherPanel';
import { DatasetLink, EvidenceBadge, Row, Section, fmt } from '@/components/panels/ui';

const dist = (m) => (m >= 1000 ? `${(m / 1000).toFixed(2)} km` : `${m.toFixed(0)} m`);

function Coordinates({ lon, lat }) {
  return (
    <>
      <Row label="Latitude">
        <span className="num">{formatLat(lat, 5)}</span>
      </Row>
      <Row label="Longitude">
        <span className="num">{formatLon(lon, 5)}</span>
      </Row>
    </>
  );
}

function TerrainAt({ lon, lat }) {
  // Re-evaluate when terrain or detail tiles change.
  const terrainVersion = useStore((s) => s.terrainVersion);
  const patch = useStore((s) => s.patch);
  const info = useMemo(
    () => ({ sample: heightProvider.sample(lon, lat), slope: heightProvider.slope(lon, lat) }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lon, lat, terrainVersion, patch]
  );
  if (!info.sample) {
    return (
      <p className="text-[11px] leading-snug text-slate-500">
        No elevation dataset is loaded at this point. Nothing is estimated in its place.
      </p>
    );
  }
  return (
    <>
      <Row label="Elevation">
        <span className="num">{info.sample.h.toFixed(1)} m</span> <DatasetLink id={info.sample.datasetId} />
      </Row>
      <Row label="Elevation grid">
        <span className="num">{info.sample.resM.toFixed(info.sample.resM < 10 ? 1 : 0)} m</span>
      </Row>
      {info.slope ? (
        <>
          <Row label="Slope">
            <span className="num">{info.slope.deg.toFixed(1)}°</span>
            <span className="text-slate-500"> over {info.slope.baselineM.toFixed(0)} m</span>
          </Row>
          <Row label="Faces (downslope)">
            <span className="num">{info.slope.aspect.toFixed(0)}°</span>
            <span className="text-slate-500"> from north</span>
          </Row>
        </>
      ) : (
        <Row label="Slope">
          <span className="text-slate-500">not available here</span>
        </Row>
      )}
      {info.sample.datasetId === 'D01' && (
        <p className="mt-1 text-[11px] leading-snug text-interpreted">
          Inside the 1 m mosaic the true source resolution at any point is unknown (1 m to more than 100 m), so fine
          slope values are conditional.
        </p>
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
    <Row label="Nearest rover stop">
      <span className="num">{dist(near.distanceM)}</span>
      <span className="text-slate-500"> · sol {w.sol}</span>
    </Row>
  );
}

function PointDetails({ sel }) {
  const containing = FIXED_LANDMARKS.filter((l) => l.bounds && inBounds(l.bounds, sel.lon, sel.lat));
  return (
    <>
      <Section title="Selected point">
        <Coordinates lon={sel.lon} lat={sel.lat} />
        <NearRover lon={sel.lon} lat={sel.lat} />
        {containing.length > 0 && (
          <Row label="Within (IAU extent)">{containing.map((l) => l.name).join(', ')}</Row>
        )}
      </Section>
      <Section title="Terrain" right={<EvidenceBadge kind="Derived" />}>
        <TerrainAt lon={sel.lon} lat={sel.lat} />
      </Section>
      <Section title="Composition and geology">
        <p className="text-[11px] leading-snug text-slate-500">
          No mineral or geological-unit layer is loaded, so nothing is reported for this point. See “Not yet available”
          in the layers panel.
        </p>
      </Section>
      <Section title="Atmosphere">
        <p className="text-[11px] leading-snug text-slate-500">
          No weather has been measured at this point. Measurements exist only where the rover was — see the Weather
          tab. Modelled conditions are not integrated yet.
        </p>
      </Section>
    </>
  );
}

function WaypointDetails({ sel }) {
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
      <Section title={`Waypoint · sol ${w.sol}`} right={<EvidenceBadge kind="Derived" />}>
        <Row label="Record">
          <span className="num">RMC {w.rmc}</span> <DatasetLink id="D12" />
        </Row>
        <Coordinates lon={w.lon} lat={w.lat} />
        <Row label="Elevation (NASA file)">
          <span className="num">{fmt(w.elev, 1, ' m')}</span>
        </Row>
        <Row label="Odometry">
          <span className="num">{w.distTotalM !== null ? dist(w.distTotalM) : '—'}</span>
        </Row>
        <Row label="This drive">
          <span className="num">{w.distM !== null ? `${w.distM.toFixed(1)} m` : '—'}</span>
          {w.driveType ? <span className="text-slate-500"> · {w.driveType}</span> : null}
        </Row>
        <Row label="Tilt / pitch / roll">
          <span className="num">
            {fmt(w.tilt, 1, '°')} / {fmt(w.pitch, 1, '°')} / {fmt(w.roll, 1, '°')}
          </span>
        </Row>
        <Row label="Heading (yaw)">
          <span className="num">{fmt(w.yaw, 1, '°')}</span>
        </Row>
        <p className="mt-1 text-[11px] leading-snug text-slate-500">
          End-of-drive position. Where the rover was between drive ends is not in the public file.
        </p>
      </Section>
      {sites.length > 0 && (
        <Section title="At this stop">
          <ul className="space-y-1 text-xs text-slate-200">
            {sites.map((l) => (
              <li key={l.id}>{l.name}</li>
            ))}
          </ul>
        </Section>
      )}
      <Section title="MarsWalk terrain here" right={<EvidenceBadge kind="Derived" />}>
        <TerrainAt lon={w.lon} lat={w.lat} />
        <p className="mt-1 text-[11px] leading-snug text-slate-500">
          Any difference from the NASA file’s elevation shows how well the terrain data and the rover data line up.
        </p>
      </Section>
      <Section title="Weather that sol" right={obs ? <EvidenceBadge kind="Measured" /> : null}>
        {obs ? (
          <>
            <Row label="Air temperature">
              <span className="num">{fmt(obs.minAir, 0)} to {fmt(obs.maxAir, 0)} °C</span>
            </Row>
            <Row label="Pressure">
              <span className="num">{fmt(obs.pressure, 0)} Pa</span>
            </Row>
          </>
        ) : (
          <p className="text-[11px] leading-snug text-slate-500">
            The public daily feed has no record for this sol. Older sols are in the PDS REMS archive, which is not
            integrated yet.
          </p>
        )}
      </Section>
    </>
  );
}

function LandmarkDetails({ sel }) {
  const waypoints = useStore((s) => s.rover.waypoints);
  const l = useMemo(() => resolveLandmarks(waypoints).find((x) => x.id === sel.id), [waypoints, sel.id]);
  if (!l) return null;
  return (
    <>
      <Section title={NAME_CLASS[l.nameClass]} right={<EvidenceBadge kind="Interpreted" />}>
        <h2 className="text-base font-medium leading-tight text-slate-50">{l.name}</h2>
        {l.alias && <p className="text-xs text-slate-400">{l.alias}</p>}
        <p className="mt-2 text-xs leading-relaxed text-slate-300">{l.significance}</p>
      </Section>
      <Section title="Location">
        <Row label="Type">{l.type}</Row>
        <Coordinates lon={l.lon} lat={l.lat} />
        {l.sizeKm && (
          <Row label="Size (gazetteer)">
            <span className="num">{l.sizeKm} km</span>
          </Row>
        )}
        {l.elev != null && (
          <Row label="Rover elevation">
            <span className="num">{l.elev.toFixed(1)} m</span>
          </Row>
        )}
        {l.unit && <Row label="Rock unit">{l.unit}</Row>}
        <p className="mt-2 text-[11px] leading-snug text-slate-500">
          <span className="text-slate-400">Position basis:</span> {l.positionBasis}
        </p>
        <p className="mt-1 text-[11px] leading-snug text-slate-500">
          <span className="text-slate-400">Uncertainty:</span> {l.uncertainty}
        </p>
        <p className="mt-1 text-[11px] leading-snug text-slate-500">
          <span className="text-slate-400">Source:</span> {l.source} <DatasetLink id={l.datasetId} />
        </p>
        <div className="mt-2 flex gap-2">
          <button
            type="button"
            className="btn btn-accent"
            onClick={() => cameraApi.flyTo(l.lon, l.lat, l.sizeKm ? Math.max(20, l.sizeKm * 1.6) : 4)}
          >
            Fly here
          </button>
          {l.resolvedSol != null && (
            <button type="button" className="btn" onClick={() => useStore.getState().setSol(l.resolvedSol)}>
              Set sol {l.resolvedSol}
            </button>
          )}
        </div>
      </Section>
      <Section title="Terrain at this position" right={<EvidenceBadge kind="Derived" />}>
        <TerrainAt lon={l.lon} lat={l.lat} />
      </Section>
    </>
  );
}

function MeasureResult() {
  const points = useStore((s) => s.measure.points);
  const active = useStore((s) => s.measure.active);
  const terrainVersion = useStore((s) => s.terrainVersion);
  const patch = useStore((s) => s.patch);
  const clear = useStore((s) => s.clearMeasure);

  const result = useMemo(() => {
    if (points.length !== 2) return null;
    const [a, b] = points;
    const total = greatCircleMeters(a.lon, a.lat, b.lon, b.lat);
    const n = 240;
    const samples = [];
    const sources = new Set();
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const lon = a.lon + (b.lon - a.lon) * t;
      const lat = a.lat + (b.lat - a.lat) * t;
      const s = heightProvider.sample(lon, lat);
      if (s) sources.add(s.datasetId);
      samples.push({ d: total * t, h: s ? s.h : null });
    }
    const h0 = samples[0].h;
    const h1 = samples[n].h;
    return { total, samples, sources: [...sources], dh: h0 !== null && h1 !== null ? h1 - h0 : null };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [points, terrainVersion, patch]);

  if (!active && points.length === 0) return null;
  return (
    <Section
      title="Measurement"
      right={
        points.length > 0 ? (
          <button type="button" className="text-[11px] text-slate-400 hover:text-slate-200" onClick={clear}>
            Clear
          </button>
        ) : null
      }
    >
      {points.length < 2 && (
        <p className="text-xs text-slate-400">
          {points.length === 0 ? 'Click the terrain to set the first point.' : 'Click a second point.'}
        </p>
      )}
      {result && (
        <>
          <Row label="Distance (on the sphere)">
            <span className="num">{dist(result.total)}</span>
          </Row>
          <Row label="Elevation change">
            <span className="num">{result.dh !== null ? `${result.dh >= 0 ? '+' : ''}${result.dh.toFixed(1)} m` : '—'}</span>
          </Row>
          <div className="mt-2">
            <ProfileChart samples={result.samples} />
          </div>
          <p className="mt-1 flex flex-wrap items-center gap-1 text-[11px] leading-snug text-slate-500">
            Profile (metres) sampled at {(result.total / 240).toFixed(0)} m steps from
            {result.sources.length ? result.sources.map((id) => <DatasetLink key={id} id={id} />) : ' no elevation data'}
            . True scale; vertical exaggeration is not applied.
          </p>
        </>
      )}
    </Section>
  );
}

function Overview() {
  const terrain = useStore((s) => s.terrain);
  const rover = useStore((s) => s.rover);
  const last = rover.waypoints[rover.waypoints.length - 1];
  return (
    <>
      <Section title="Gale crater">
        <p className="text-xs leading-relaxed text-slate-300">
          An ancient impact crater about 154 km across with a mound of layered sedimentary rock, Aeolis Mons, at its
          centre. NASA’s Curiosity rover landed on the northern floor in August 2012 and has been climbing the mound’s
          lower slopes since 2014.
        </p>
        <p className="mt-2 text-xs leading-relaxed text-slate-400">
          Click the terrain, a waypoint or a label to inspect it. Every value shown names its dataset and whether it is
          measured, derived, interpreted or simulated.
        </p>
      </Section>
      <Section title="What is loaded">
        <Row label="Elevation">
          {terrain.status === 'ready' ? (
            <DatasetLink id={terrain.meta.dataset_id} />
          ) : (
            <span className="text-interpreted">flat reference surface</span>
          )}
        </Row>
        <Row label="Imagery">
          <DatasetLink id="D05" /> <DatasetLink id="D06" />
        </Row>
        <Row label="Rover">
          {rover.status === 'ready' ? (
            <span>
              to sol <span className="num">{last.sol}</span>
              {last.distTotalM !== null ? ` · ${dist(last.distTotalM)}` : ''}
            </span>
          ) : rover.status === 'error' ? (
            <span className="text-rose-300">unavailable</span>
          ) : (
            'loading…'
          )}
        </Row>
        {rover.error && <p className="mt-1 text-[11px] leading-snug text-rose-300/80">{rover.error}</p>}
        {rover.join && !rover.join.ok && (
          <p className="mt-1 text-[11px] leading-snug text-slate-500">
            The path file could not be matched to the waypoint file reliably, so the path is not coloured by sol.
          </p>
        )}
      </Section>
      <Section title="Projection">
        <p className="text-[11px] leading-snug text-slate-500">
          Local equirectangular projection on a sphere of radius 3,396,190 m, planetocentric latitude, east longitude.
          Planetary curvature is not applied to the surface (about 2 km of drop at the edges of this region).
        </p>
      </Section>
    </>
  );
}

function Units() {
  return (
    <div className="px-3 py-3">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-medium text-slate-100">Rock units</h3>
        <EvidenceBadge kind="Interpreted" />
      </div>
      <p className="mb-3 text-[11px] leading-snug text-slate-500">{UNIT_NOTE}</p>
      <ul className="space-y-3">
        {STRAT_UNITS.map((u) => (
          <li key={u.name}>
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-xs font-medium text-slate-100">{u.name}</span>
              <span className="text-[10px] uppercase tracking-wider text-slate-500">{u.rank}</span>
            </div>
            <p className="text-xs leading-snug text-slate-400">{u.text}</p>
            <p className="text-[11px] text-slate-600">{u.source}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

const TABS = [
  ['selection', 'Selection'],
  ['weather', 'Weather'],
  ['units', 'Rock units'],
];

export default function InfoPanel() {
  const open = useStore((s) => s.infoOpen);
  const tab = useStore((s) => s.infoTab);
  const selection = useStore((s) => s.selection);
  const setValue = useStore((s) => s.setValue);
  if (!open) return null;

  return (
    <aside className="panel fade-in pointer-events-auto absolute bottom-32 right-3 top-16 z-30 flex w-80 flex-col overflow-hidden">
      <nav className="flex shrink-0 border-b border-line">
        {TABS.map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setValue('infoTab', id)}
            className={`flex-1 px-2 py-2 text-[11px] uppercase tracking-[0.12em] transition ${
              tab === id ? 'border-b border-accent text-accent' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            {label}
          </button>
        ))}
      </nav>
      <div className="thin-scroll flex-1 overflow-y-auto">
        {tab === 'selection' && (
          <>
            <MeasureResult />
            {selection && (
              <div className="flex justify-end px-3 pt-2">
                <button
                  type="button"
                  className="text-[11px] text-slate-500 hover:text-slate-300"
                  onClick={() => setValue('selection', null)}
                >
                  Clear selection
                </button>
              </div>
            )}
            {!selection && <Overview />}
            {selection && selection.type === 'point' && <PointDetails sel={selection} />}
            {selection && selection.type === 'waypoint' && <WaypointDetails sel={selection} />}
            {selection && selection.type === 'landmark' && <LandmarkDetails sel={selection} />}
          </>
        )}
        {tab === 'weather' && <WeatherPanel />}
        {tab === 'units' && <Units />}
      </div>
    </aside>
  );
}
