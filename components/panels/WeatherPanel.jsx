'use client';
// Observed weather at the rover (REMS daily feed, D22). Measured values only,
// always tied to a sol and to where the rover was on that sol.
import { useMemo } from 'react';
import { waypointIndexAtSol } from '@/lib/data/landmarks';
import { formatLat, formatLon } from '@/lib/coordinates/projection';
import { useStore } from '@/store/useStore';
import { DatasetLink, EvidenceBadge, Row, fmt } from '@/components/panels/ui';

function Spark({ records, keys, colors }) {
  const W = 280;
  const H = 70;
  const pts = records.filter((r) => keys.some((k) => r[k] !== null));
  if (pts.length < 2) return null;
  let lo = Infinity;
  let hi = -Infinity;
  for (const r of pts) for (const k of keys) if (r[k] !== null) {
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
      <text x="26" y="12" textAnchor="end" fontSize="9" fill="#94a3b8" fontFamily="monospace">{Math.round(hi)}</text>
      <text x="26" y={H - 16} textAnchor="end" fontSize="9" fill="#94a3b8" fontFamily="monospace">{Math.round(lo)}</text>
      <text x="30" y={H - 3} fontSize="9" fill="#94a3b8" fontFamily="monospace">sol {s0}</text>
      <text x={W - 6} y={H - 3} textAnchor="end" fontSize="9" fill="#94a3b8" fontFamily="monospace">sol {s1}</text>
    </svg>
  );
}

export default function WeatherPanel() {
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

  if (weather.status === 'loading') return <p className="p-3 text-xs text-slate-400">Loading the REMS feed…</p>;
  if (weather.status === 'error') {
    return (
      <div className="p-3 text-xs text-slate-300">
        <p className="text-rose-300">Weather observations unavailable.</p>
        <p className="mt-1 text-slate-500">{weather.error}</p>
      </div>
    );
  }
  if (!record) return <p className="p-3 text-xs text-slate-400">The feed returned no records.</p>;

  const first = weather.records[0];
  const last = weather.records[weather.records.length - 1];

  return (
    <div className="px-3 py-3">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-medium text-slate-100">Observed at the rover</h3>
        <div className="flex items-center gap-1.5">
          <EvidenceBadge kind="Measured" />
          <DatasetLink id="D22" />
        </div>
      </div>
      {!exact && sol !== null && (
        <p className="mb-2 rounded border border-line bg-white/5 px-2 py-1.5 text-[11px] leading-snug text-slate-400">
          No record for sol {sol} in the feed (it covers sols {first.sol}–{last.sol}). Showing the most recent record.
        </p>
      )}
      <Row label="Sol">
        <span className="num">{record.sol}</span>
        {record.date ? ` · ${record.date}` : ''}
      </Row>
      <Row label="Season">
        {record.ls !== null ? <span className="num">Ls {record.ls}°</span> : '—'}
        {record.season ? ` · ${record.season}` : ''}
      </Row>
      <Row label="Air temperature">
        <span className="num">{fmt(record.minAir, 0)} to {fmt(record.maxAir, 0)} °C</span>
      </Row>
      <Row label="Ground temperature">
        <span className="num">{fmt(record.minGround, 0)} to {fmt(record.maxGround, 0)} °C</span>
      </Row>
      <Row label="Pressure">
        <span className="num">{fmt(record.pressure, 0)} Pa</span>
      </Row>
      <Row label="UV index">{record.uv || '—'}</Row>
      <Row label="Sky">{record.opacity || '—'}</Row>
      <Row label="Sunrise / sunset">
        <span className="num">{record.sunrise || '—'} / {record.sunset || '—'}</span>
      </Row>
      <Row label="Wind">
        <span className="text-slate-500">no calibrated measurements exist</span>
      </Row>
      <Row label="Rover position that sol">
        {where ? <span className="num">{formatLat(where.lat)}, {formatLon(where.lon)}</span> : '—'}
      </Row>

      <div className="mt-3">
        <div className="mb-1 flex items-center justify-between">
          <span className="label">Air temperature, daily min and max (°C)</span>
        </div>
        <Spark records={weather.records} keys={['maxAir', 'minAir']} colors={['#e8884a', '#6cb6f5']} />
      </div>
      <div className="mt-2">
        <span className="label">Pressure (Pa)</span>
        <Spark records={weather.records} keys={['pressure']} colors={['#5fd0a0']} />
      </div>

      <ul className="mt-3 list-disc space-y-1 pl-4 text-[11px] leading-snug text-slate-500">
        <li>These values were measured at the rover only. They are not valid for other places in the crater.</li>
        <li>
          Curiosity’s wind sensor was damaged at landing; the archive holds no calibrated wind speed or direction.
        </li>
        <li>The rover has climbed during the mission, so long series mix seasonal change with change of place.</li>
        <li>Units are those of NASA’s public feed (°C, Pa).</li>
        <li>
          Feed {weather.origin === 'snapshot' ? 'read from a local snapshot' : 'retrieved live'}
          {weather.retrieved ? ` on ${weather.retrieved.slice(0, 10)}` : ''}; newest record is sol {last.sol}
          {last.date ? ` (${last.date})` : ''}.
        </li>
        <li>Modelled conditions for other locations (Mars Climate Database) are not integrated yet.</li>
      </ul>
    </div>
  );
}
