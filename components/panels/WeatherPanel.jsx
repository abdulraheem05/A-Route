'use client';
// Observed weather at the rover (Gale: the Curiosity REMS daily feed, D22).
//
// The instrument name, the dataset code and the caveats come from
// crater.weather, so a crater with a different weather source — or none —
// reads correctly here.
//
// Measured values only, always tied to a sol and to where the rover was on
// that sol. The three readings people actually come for — air temperature,
// ground temperature and pressure — are shown first; everything else, and
// every caveat about the instrument, is behind a disclosure.
//
// This is a historical record, never a forecast and never "now".
import { useMemo } from 'react';
import { waypointIndexAtSol } from '@/lib/data/landmarks';
import { useCrater } from '@/lib/mars/CraterContext';
import { formatLat, formatLon } from '@/lib/coordinates/projection';
import { useStore } from '@/store/useStore';
import { DatasetLink, EvidenceBadge, fmt } from '@/components/panels/ui';

function Spark({ records, keys, colors }) {
  const W = 280;
  const H = 64;
  const pts = records.filter((r) => keys.some((k) => r[k] !== null));
  if (pts.length < 2) return null;
  let lo = Infinity;
  let hi = -Infinity;
  for (const r of pts)
    for (const k of keys)
      if (r[k] !== null) {
        lo = Math.min(lo, r[k]);
        hi = Math.max(hi, r[k]);
      }
  if (hi - lo < 1e-6) hi = lo + 1;
  const s0 = pts[0].sol;
  const s1 = pts[pts.length - 1].sol;
  const x = (sol) => 30 + ((sol - s0) / Math.max(1, s1 - s0)) * (W - 36);
  const y = (v) => 6 + (1 - (v - lo) / (hi - lo)) * (H - 22);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
      {keys.map((k, n) => {
        let d = '';
        let pen = false;
        let prevSol = null;
        for (const r of pts) {
          if (r[k] === null || (prevSol !== null && r.sol - prevSol > 3)) pen = false; // leave gaps as gaps
          if (r[k] === null) continue;
          d += `${pen ? 'L' : 'M'}${x(r.sol).toFixed(1)},${y(r[k]).toFixed(1)}`;
          pen = true;
          prevSol = r.sol;
        }
        return <path key={k} d={d} fill="none" stroke={colors[n]} strokeWidth="1.2" />;
      })}
      <text x="26" y="12" textAnchor="end" fontSize="9" fill="#6b7686" fontFamily="monospace">
        {Math.round(hi)}
      </text>
      <text x="26" y={H - 16} textAnchor="end" fontSize="9" fill="#6b7686" fontFamily="monospace">
        {Math.round(lo)}
      </text>
      <text x="30" y={H - 3} fontSize="9" fill="#6b7686" fontFamily="monospace">
        sol {s0}
      </text>
      <text x={W - 6} y={H - 3} textAnchor="end" fontSize="9" fill="#6b7686" fontFamily="monospace">
        sol {s1}
      </text>
    </svg>
  );
}

function Stat({ label, value, unit, tone }) {
  return (
    <div className="rounded-md border px-2 py-1.5" style={{ borderColor: 'var(--g-line-soft)' }}>
      <div className="label mb-0.5">{label}</div>
      <div className="num text-[13px] leading-none" style={{ color: tone || 'var(--g-text)' }}>
        {value}
        {unit && <span className="ml-1 text-[9.5px] text-slate-500">{unit}</span>}
      </div>
    </div>
  );
}

export default function WeatherPanel() {
  const crater = useCrater();
  const weatherCfg = crater.weather || {};
  const instrument = weatherCfg.instrument || 'weather';
  const weather = useStore((s) => s.weather);
  const sol = useStore((s) => s.sol);
  const waypoints = useStore((s) => s.rover.waypoints);

  const { record, exact } = useMemo(() => {
    if (!weather.records.length) return { record: null, exact: false };
    if (sol !== null && weather.bySol.has(sol)) return { record: weather.bySol.get(sol), exact: true };
    return { record: weather.records[weather.records.length - 1], exact: false };
  }, [weather, sol]);

  const where = useMemo(() => {
    if (!record || !waypoints.length) return null;
    const i = waypointIndexAtSol(waypoints, record.sol);
    return i < 0 ? null : waypoints[i];
  }, [record, waypoints]);

  if (weather.status === 'unavailable') {
    return (
      <div className="px-2.5 py-3">
        <p className="note">No weather observations exist for this crater in the datasets loaded here.</p>
        {weather.error && <p className="note mt-1 opacity-70">{weather.error}</p>}
      </div>
    );
  }
  if (weather.status === 'loading') {
    return <p className="px-2.5 py-3 note">Loading the {instrument} feed…</p>;
  }
  if (weather.status === 'error') {
    return (
      <div className="px-2.5 py-3">
        <p className="text-[11.5px] text-rose-300">Weather observations unavailable.</p>
        <p className="note mt-1">{weather.error}</p>
      </div>
    );
  }
  if (!record) return <p className="px-2.5 py-3 note">The feed returned no records.</p>;

  const first = weather.records[0];
  const last = weather.records[weather.records.length - 1];

  return (
    <div className="px-2.5 py-2.5">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div>
          <div className="flex items-baseline gap-1.5">
            <span className="num text-[15px] leading-none text-slate-50">Sol {record.sol}</span>
            {record.date && <span className="note">{record.date}</span>}
          </div>
          <p className="note">Recorded at the rover — not a forecast.</p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <EvidenceBadge kind="Measured" />
          <DatasetLink id={weatherCfg.datasetId} />
        </div>
      </div>

      {!exact && sol !== null && (
        <p className="mb-2 rounded border px-2 py-1.5 note" style={{ borderColor: 'var(--g-line)' }}>
          No record for sol {sol} in the feed (it covers sols {first.sol}–{last.sol}). Showing the most recent.
        </p>
      )}

      <div className="grid grid-cols-2 gap-1.5">
        <Stat
          label="Air temperature"
          value={`${fmt(record.minAir, 0)} to ${fmt(record.maxAir, 0)}`}
          unit="°C"
          tone="var(--g-accent)"
        />
        <Stat
          label="Ground temperature"
          value={`${fmt(record.minGround, 0)} to ${fmt(record.maxGround, 0)}`}
          unit="°C"
        />
        <Stat label="Pressure" value={fmt(record.pressure, 0)} unit="Pa" tone="var(--g-ok)" />
        <Stat label="Sky" value={record.opacity || '—'} />
      </div>

      <div className="mt-2.5">
        <div className="mb-0.5 flex items-center justify-between">
          <span className="label">Air temperature</span>
          <span className="flex items-center gap-2 text-[9.5px] text-slate-500">
            <span className="flex items-center gap-1">
              <span className="h-[2px] w-2.5" style={{ background: '#e8884a' }} /> max
            </span>
            <span className="flex items-center gap-1">
              <span className="h-[2px] w-2.5" style={{ background: '#6cb6f5' }} /> min
            </span>
            <span>°C</span>
          </span>
        </div>
        <Spark records={weather.records} keys={['maxAir', 'minAir']} colors={['#e8884a', '#6cb6f5']} />
      </div>

      <div className="mt-1.5">
        <div className="mb-0.5 flex items-center justify-between">
          <span className="label">Pressure</span>
          <span className="text-[9.5px] text-slate-500">Pa</span>
        </div>
        <Spark records={weather.records} keys={['pressure']} colors={['#5fd0a0']} />
      </div>

      <details className="science-details mt-2">
        <summary>More measurements</summary>
        <div>
          <div className="kv">
            <span>Season</span>
            <span>
              {record.ls !== null ? <span className="num">Ls {record.ls}°</span> : '—'}
              {record.season ? ` · ${record.season}` : ''}
            </span>
          </div>
          <div className="kv">
            <span>UV index</span>
            <span>{record.uv || '—'}</span>
          </div>
          <div className="kv">
            <span>Sunrise / sunset</span>
            <span className="num">
              {record.sunrise || '—'} / {record.sunset || '—'}
            </span>
          </div>
          <div className="kv">
            <span>Wind</span>
            <span className="text-slate-500">no calibrated data</span>
          </div>
          <div className="kv">
            <span>Rover position</span>
            <span className="num">
              {where ? `${formatLat(where.lat)}, ${formatLon(where.lon)}` : '—'}
            </span>
          </div>
        </div>
      </details>

      <details className="science-details mt-1.5">
        <summary>About these observations</summary>
        <ul className="list-disc space-y-1 pl-4 note">
          <li>{weatherCfg.sourceNote}</li>
          {weatherCfg.windNote && <li>{weatherCfg.windNote}</li>}
          <li>A long run of sols mixes seasonal change with the rover moving and climbing.</li>
          <li>Units follow NASA&rsquo;s feed (°C, Pa). Modelled local weather is not integrated.</li>
          <li>
            Feed {weather.origin === 'snapshot' ? 'uses a local snapshot' : 'retrieved live'}
            {weather.retrieved ? ` on ${weather.retrieved.slice(0, 10)}` : ''}; latest sol {last.sol}
            {last.date ? ` (${last.date})` : ''}.
          </li>
        </ul>
      </details>
    </div>
  );
}
