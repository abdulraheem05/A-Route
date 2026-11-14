'use client';
// Floating map toolbox.
//
// Two stacks on the right edge: what you are doing (select / measure) and
// where you are looking (north, zoom, tilt, whole crater, rover). Every
// button calls an existing camera or store action — there are no placeholders
// here, so a route-planning tool is deliberately absent until routing exists.
import { BRADBURY } from '@/lib/mars/constants';
import { waypointIndexAtSol } from '@/lib/data/landmarks';
import { cameraApi } from '@/lib/terrain/cameraApi';
import { useStore } from '@/store/useStore';

function Tool({ tip, onClick, active, disabled, children, label }) {
  return (
    <button
      type="button"
      className="tool-btn tip"
      data-tip={tip}
      data-on={active ? 'true' : 'false'}
      disabled={disabled}
      onClick={onClick}
      aria-label={label || tip}
      aria-pressed={active === undefined ? undefined : active}
    >
      {children}
    </button>
  );
}

const svg = {
  width: 15,
  height: 15,
  viewBox: '0 0 16 16',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.35,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
};

export default function NavControls() {
  const azimuth = useStore((s) => s.camera.azimuth);
  const polar = useStore((s) => s.camera.polar);
  const infoOpen = useStore((s) => s.infoOpen);
  const measuring = useStore((s) => s.measure.active);
  const toggleMeasure = useStore((s) => s.toggleMeasure);

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

  const topDown = polar < 0.12;

  return (
    <div className="gale-toolbox pointer-events-none" data-inset={infoOpen ? 'true' : 'false'}>
      {/* What the pointer does */}
      <div className="panel tool-stack pointer-events-auto flex flex-col overflow-hidden">
        <Tool
          tip="Select — click the map to inspect"
          active={!measuring}
          onClick={() => {
            if (measuring) toggleMeasure();
          }}
        >
          <svg {...svg}>
            <path d="M3.2 2.4 L12.4 7.4 L8.4 8.5 L6.6 12.4 Z" />
          </svg>
        </Tool>
        <Tool tip="Measure distance and elevation" active={measuring} onClick={toggleMeasure}>
          <svg {...svg}>
            <path d="M2 12 L12 2 L14 4 L4 14 Z M5 9 l1.2 1.2 M7 7 l1.2 1.2 M9 5 l1.2 1.2" />
          </svg>
        </Tool>
      </div>

      {/* Where the camera is */}
      <div className="panel tool-stack pointer-events-auto flex flex-col overflow-hidden">
        <Tool tip="North up" onClick={() => cameraApi.resetNorth()} label="Rotate so north is up">
          <svg width="17" height="17" viewBox="0 0 20 20" style={{ transform: `rotate(${azimuth}rad)` }}>
            <path d="M10 2.6 L12.8 10 L10 8.7 L7.2 10 Z" fill="#e8884a" />
            <path d="M10 17.4 L12.8 10 L10 11.3 L7.2 10 Z" fill="rgba(255,255,255,0.3)" />
          </svg>
        </Tool>
        <Tool tip="Zoom in" onClick={() => cameraApi.zoomBy(0.6)}>
          <svg {...svg}>
            <path d="M8 3.4 V12.6 M3.4 8 H12.6" />
          </svg>
        </Tool>
        <Tool tip="Zoom out" onClick={() => cameraApi.zoomBy(1 / 0.6)}>
          <svg {...svg}>
            <path d="M3.4 8 H12.6" />
          </svg>
        </Tool>
        <Tool
          tip={topDown ? 'Tilt to an angled view' : 'Look straight down'}
          active={topDown}
          onClick={() => cameraApi.setTilt(topDown ? 0.95 : 0.02)}
        >
          <svg {...svg}>
            <path d="M2 11 L8 14 L14 11 M2 8 L8 11 L14 8 L8 5 Z" />
          </svg>
        </Tool>
        <Tool tip="Fit the whole crater" onClick={() => cameraApi.flyTo(137.7, -5.0, 260)}>
          <svg {...svg}>
            <circle cx="8" cy="8" r="5.6" />
            <circle cx="8" cy="8" r="1.4" />
          </svg>
        </Tool>
        <Tool tip="Go to Curiosity" onClick={toRover}>
          <svg {...svg}>
            <rect x="3.5" y="5.5" width="9" height="4" rx="0.8" />
            <circle cx="4.5" cy="11.5" r="1.3" />
            <circle cx="8" cy="11.5" r="1.3" />
            <circle cx="11.5" cy="11.5" r="1.3" />
            <path d="M9 5.5 V3 h2.5" />
          </svg>
        </Tool>
      </div>
    </div>
  );
}
