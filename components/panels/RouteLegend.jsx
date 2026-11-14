'use client';
// Legend for the planned routes, over the map and only while routes exist.
// Clicking an entry makes that route the active one; the checkbox in the panel
// controls whether it is drawn at all.
import { END_COLOR, ROUTE_MODES, START_COLOR } from '@/lib/terrain/routing';
import { useStore } from '@/store/useStore';

export default function RouteLegend() {
  const result = useStore((s) => s.plan.result);
  const show = useStore((s) => s.plan.show);
  const active = useStore((s) => s.plan.active);
  const start = useStore((s) => s.plan.start);
  const end = useStore((s) => s.plan.end);
  const setActiveRoute = useStore((s) => s.setActiveRoute);
  const sidebarOpen = useStore((s) => s.sidebarOpen);

  const drawn = result && result.routes ? ROUTE_MODES.filter((m) => result.routes[m.id] && result.routes[m.id].points) : [];
  if (!drawn.length) return null;

  return (
    <div
      className="plan-legend fade-in pointer-events-auto absolute z-30"
      style={{
        bottom: 'calc(var(--g-foot) + var(--g-gap))',
        left: sidebarOpen ? 'calc(var(--g-left-w) + var(--g-gap) * 2)' : 'calc(var(--g-gap) * 2)',
        transition: 'left 220ms ease',
      }}
      aria-label="Route legend"
    >
      {start && (
        <span className="plan-legend-item">
          <span className="plan-dot" style={{ background: START_COLOR }} aria-hidden="true" />
          Start
        </span>
      )}
      {end && (
        <span className="plan-legend-item">
          <span className="plan-dot" style={{ background: END_COLOR }} aria-hidden="true" />
          End
        </span>
      )}
      {drawn.map((m) => (
        <button
          key={m.id}
          type="button"
          className="plan-legend-item"
          data-dim={show[m.id] && active === m.id ? 'false' : 'true'}
          onClick={() => setActiveRoute(m.id)}
          title={show[m.id] ? `Make the ${m.label.toLowerCase()} route active` : 'Hidden — switch it on in Measure & Plan'}
        >
          <span className="plan-swatch" style={{ background: m.color }} aria-hidden="true" />
          {m.label}
        </button>
      ))}
    </div>
  );
}
