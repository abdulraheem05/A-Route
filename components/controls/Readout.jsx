'use client';
// Live coordinate and elevation readout under the pointer.
import { formatLat, formatLon } from '@/lib/coordinates/projection';
import { useStore } from '@/store/useStore';

function Cell({ label, children, wide }) {
  return (
    <div className={`flex items-baseline gap-2 ${wide ? 'min-w-[11rem]' : 'min-w-[8rem]'}`}>
      <span className="label">{label}</span>
      <span className="num text-xs text-slate-100">{children}</span>
    </div>
  );
}

export default function Readout() {
  const cursor = useStore((s) => s.cursor);
  const dist = useStore((s) => s.camera.dist);
  const exaggeration = useStore((s) => s.exaggeration);
  const measuring = useStore((s) => s.measure.active);

  const range = dist >= 10 ? `${dist.toFixed(0)} km` : dist >= 1 ? `${dist.toFixed(1)} km` : `${(dist * 1000).toFixed(0)} m`;

  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-1 border-b border-line px-4 py-1.5">
      <Cell label="Lat">{cursor ? formatLat(cursor.lat, 5) : '—'}</Cell>
      <Cell label="Lon">{cursor ? formatLon(cursor.lon, 5) : '—'}</Cell>
      <Cell label="Elev" wide>
        {cursor && cursor.elev !== null ? (
          <>
            {cursor.elev.toFixed(1)} m
            <span className="ml-1.5 text-[10px] text-slate-500">
              {cursor.datasetId} · {cursor.resM < 10 ? cursor.resM.toFixed(1) : cursor.resM.toFixed(0)} m grid
            </span>
          </>
        ) : cursor ? (
          <span className="text-slate-500">no elevation data</span>
        ) : (
          '—'
        )}
      </Cell>
      <div className="ml-auto flex items-baseline gap-6">
        {measuring && <span className="text-[11px] text-derived">Measuring — click two points</span>}
        <Cell label="Range">{range}</Cell>
        <div className="flex items-baseline gap-2">
          <span className="label">Vertical</span>
          <span className={`num text-xs ${exaggeration !== 1 ? 'text-interpreted' : 'text-slate-100'}`}>
            {exaggeration.toFixed(1)}×
          </span>
        </div>
      </div>
    </div>
  );
}
