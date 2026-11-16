'use client';
// Floating terrain controls for the mobile map.
//
// Every button calls the same camera or store action the desktop toolbox
// calls (components/controls/NavControls.jsx) — this is that toolbox in a
// thumb-reachable column, not a second set of controls. The landing site, the
// home view and the rover's name come from the crater configuration, exactly
// as they do on desktop.
import { useCrater } from '@/lib/mars/CraterContext';
import { waypointIndexAtSol } from '@/lib/data/landmarks';
import { cameraApi } from '@/lib/terrain/cameraApi';
import { useStore } from '@/store/useStore';

const svg = {
  width: 17,
  height: 17,
  viewBox: '0 0 16 16',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.35,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
};

function Fab({ label, onClick, active, children }) {
  return (
    <button
      type="button"
      className="m-fab"
      data-on={active ? 'true' : 'false'}
      onClick={onClick}
      aria-label={label}
      aria-pressed={active === undefined ? undefined : active}
      title={label}
    >
      {children}
    </button>
  );
}

export default function MapToolbar({ style }) {
  const crater = useCrater();
  const roverName = (crater.rover && crater.rover.name) || 'the rover';
  const landing = crater.rover && crater.rover.landingSite;
  const home = crater.view.home;
  const fitDistanceKm = crater.view.fitDistanceKm;
  const azimuth = useStore((s) => s.camera.azimuth);
  const polar = useStore((s) => s.camera.polar);
  const picking = useStore((s) => s.plan.picking);
  const startPicking = useStore((s) => s.startPicking);
  const stopPicking = useStore((s) => s.stopPicking);

  // Identical to NavControls' rover button: the drive-end record at or before
  // the selected sol, or the landing site when no traverse has loaded.
  const toRover = () => {
    const s = useStore.getState();
    const wps = s.rover.waypoints;
    if (!wps.length) {
      if (landing) cameraApi.flyTo(landing.lon, landing.lat, 6);
      return;
    }
    const i = s.sol === null ? wps.length - 1 : Math.max(0, waypointIndexAtSol(wps, s.sol));
    cameraApi.flyTo(wps[i].lon, wps[i].lat, 2);
  };

  const topDown = polar < 0.12;

  return (
    <div className="m-fab-stack" style={style}>
      <Fab
        label={picking ? 'Cancel picking route points' : 'Measure and plan a route'}
        active={!!picking}
        onClick={() => (picking ? stopPicking() : startPicking('start'))}
      >
        <svg {...svg}>
          <path d="M2 12 L12 2 L14 4 L4 14 Z M5 9 l1.2 1.2 M7 7 l1.2 1.2 M9 5 l1.2 1.2" />
        </svg>
      </Fab>

      <Fab label="Zoom in" onClick={() => cameraApi.zoomBy(0.6)}>
        <svg {...svg}>
          <path d="M8 3.4 V12.6 M3.4 8 H12.6" />
        </svg>
      </Fab>

      <Fab label="Zoom out" onClick={() => cameraApi.zoomBy(1 / 0.6)}>
        <svg {...svg}>
          <path d="M3.4 8 H12.6" />
        </svg>
      </Fab>

      <Fab label="Rotate so north is up" onClick={() => cameraApi.resetNorth()}>
        <svg width="20" height="20" viewBox="0 0 20 20" style={{ transform: `rotate(${azimuth}rad)` }}>
          <path d="M10 2.6 L12.8 10 L10 8.7 L7.2 10 Z" fill="#e8884a" />
          <path d="M10 17.4 L12.8 10 L10 11.3 L7.2 10 Z" fill="rgba(255,255,255,0.3)" />
        </svg>
      </Fab>

      <Fab
        label={topDown ? 'Tilt to an angled view' : 'Look straight down'}
        active={topDown}
        onClick={() => cameraApi.setTilt(topDown ? 0.95 : 0.02)}
      >
        <svg {...svg}>
          <path d="M2 11 L8 14 L14 11 M2 8 L8 11 L14 8 L8 5 Z" />
        </svg>
      </Fab>

      <Fab label="Reset the view to the whole crater" onClick={() => cameraApi.flyTo(home.lon, home.lat, fitDistanceKm)}>
        <svg {...svg}>
          <circle cx="8" cy="8" r="5.6" />
          <circle cx="8" cy="8" r="1.4" />
        </svg>
      </Fab>

      <Fab label={`Recentre on ${roverName}`} onClick={toRover}>
        <svg {...svg}>
          <rect x="3.5" y="5.5" width="9" height="4" rx="0.8" />
          <circle cx="4.5" cy="11.5" r="1.3" />
          <circle cx="8" cy="11.5" r="1.3" />
          <circle cx="11.5" cy="11.5" r="1.3" />
          <path d="M9 5.5 V3 h2.5" />
        </svg>
      </Fab>
    </div>
  );
}
