'use client';
import { formatDuration } from '@/lib/terrain/route';
import { MAX_WALKABLE_SLOPE_DEG } from '@/lib/mars/constants-jezero';

function Profile({ profile }) {
  const W = 300, H = 70;
  const es = profile.map((p) => p.e);
  const lo = Math.min(...es), hi = Math.max(...es), span = Math.max(hi - lo, 1), dMax = profile[profile.length - 1].d || 1;
  const pts = profile.map((p) => `${((p.d / dMax) * W).toFixed(1)},${(H - 4 - ((p.e - lo) / span) * (H - 10)).toFixed(1)}`).join(' ');
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Elevation profile along the route">
        <polygon points={`0,${H} ${pts} ${W},${H}`} fill="rgba(200,116,63,0.22)" />
        <polyline points={pts} fill="none" stroke="#dcb58d" strokeWidth="1.4" />
      </svg>
      <div className="flex justify-between font-mono text-[10px] text-mars-200/60">
        <span>≈{Math.round(profile[0].e)} m</span>
        <span>range {Math.round(lo)} to {Math.round(hi)} m</span>
        <span>≈{Math.round(es[es.length - 1])} m</span>
      </div>
    </div>
  );
}

const Stat = ({ label, value }) => (
  <div>
    <div className="hud-label">{label}</div>
    <div className="hud-value">{value}</div>
  </div>
);

export default function RoutePanel({ route, calibrated, onClear }) {
  const a = route.analysis;
  const km = (m) => (m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(2)} km`);
  return (
    <div className="mt-4 border-t border-mars-200/15 pt-4">
      <div className="mb-1 flex items-center justify-between">
        <div className="text-[10px] uppercase tracking-hud text-ice-300">Proposed astronaut route</div>
        <button type="button" className="text-[10px] uppercase tracking-[0.14em] text-mars-200/60 hover:text-white" onClick={onClear}>Clear</button>
      </div>
      <div className="mb-3 text-[11px] leading-snug text-mars-100/70">Straight line from your position to {route.name}. Simulated: not a rover drive and not verified on the ground.</div>
      <div className="mb-3 grid grid-cols-3 gap-3">
        <Stat label="Distance" value={km(a.horizontal)} />
        <Stat label="Gain" value={`+${Math.round(a.gain)} m`} />
        <Stat label="Loss" value={`−${Math.round(a.loss)} m`} />
        <Stat label="Max slope" value={`${a.maxSlope.toFixed(1)}°`} />
        <Stat label="On foot" value={formatDuration(a.walkSeconds)} />
        <Stat label="Rover pace" value={formatDuration(a.roverSeconds)} />
      </div>
      <Profile profile={a.profile} />
      <ul className="mt-3 space-y-1 text-[11px] leading-snug text-mars-100/70">
        {a.steepLength > 0 ? (
          <li className="text-amber-200">About {km(a.steepLength)} of this line is steeper than {MAX_WALKABLE_SLOPE_DEG}° in the terrain model and would block you on foot.</li>
        ) : (
          <li>No section exceeds {MAX_WALKABLE_SLOPE_DEG}° at the model&apos;s resolution.</li>
        )}
        <li>Obstacles smaller than about {Math.round(a.sampleSpacing < 90 ? 90 : a.sampleSpacing)} m (boulders, sand ripples, small scarps) are not in this terrain model.</li>
        <li>{calibrated ? 'Elevations come from the loaded DEM.' : 'Elevations are estimated from a colour preview, so gain, loss and slope are approximate.'}</li>
        <li>This is a planning sketch. It is not a traversability or safety assessment.</li>
      </ul>
    </div>
  );
}
