'use client';
import { BRADBURY } from '@/lib/mars/constants';
import { waypointIndexAtSol } from '@/lib/data/landmarks';
import { cameraApi } from '@/lib/terrain/cameraApi';
import { useStore } from '@/store/useStore';

function Btn({ title, onClick, active, children }) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      className={`flex h-9 w-9 items-center justify-center border-b border-line text-slate-200 transition last:border-b-0 hover:bg-white/10 ${
        active ? 'bg-accent/20 text-accent' : ''
      }`}
    >
      {children}
    </button>
  );
}

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
    <div
      className={`pointer-events-auto absolute bottom-36 z-30 flex flex-col gap-2 transition-all ${
        infoOpen ? 'right-[21.5rem]' : 'right-3'
      }`}
    >
      <button
        type="button"
        title="North up"
        aria-label="Rotate so north is up"
        onClick={() => cameraApi.resetNorth()}
        className="panel flex h-9 w-9 items-center justify-center hover:bg-white/10"
      >
        <svg width="20" height="20" viewBox="0 0 20 20" style={{ transform: `rotate(${azimuth}rad)` }}>
          <path d="M10 2 L13 10 L10 8.6 L7 10 Z" fill="#e8884a" />
          <path d="M10 18 L13 10 L10 11.4 L7 10 Z" fill="rgba(255,255,255,0.35)" />
        </svg>
      </button>

      <div className="panel flex flex-col overflow-hidden">
        <Btn title="Zoom in" onClick={() => cameraApi.zoomBy(0.6)}>
          <span className="text-lg leading-none">+</span>
        </Btn>
        <Btn title="Zoom out" onClick={() => cameraApi.zoomBy(1 / 0.6)}>
          <span className="text-lg leading-none">−</span>
        </Btn>
        <Btn
          title={topDown ? 'Oblique view' : 'Look straight down'}
          onClick={() => cameraApi.setTilt(topDown ? 0.95 : 0.02)}
          active={topDown}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3">
            <path d="M2 11 L8 14 L14 11 M2 8 L8 11 L14 8 L8 5 Z" />
          </svg>
        </Btn>
        <Btn title="Whole crater" onClick={() => cameraApi.flyTo(137.7, -5.0, 260)}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3">
            <circle cx="8" cy="8" r="5.5" />
            <circle cx="8" cy="8" r="1.4" />
          </svg>
        </Btn>
        <Btn title="Go to the rover (selected sol)" onClick={toRover}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3">
            <rect x="3.5" y="5.5" width="9" height="4" rx="0.8" />
            <circle cx="4.5" cy="11.5" r="1.3" />
            <circle cx="8" cy="11.5" r="1.3" />
            <circle cx="11.5" cy="11.5" r="1.3" />
            <path d="M9 5.5 V3 h2.5" />
          </svg>
        </Btn>
        <Btn title="Measure distance and elevation profile" onClick={toggleMeasure} active={measuring}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3">
            <path d="M2 12 L12 2 L14 4 L4 14 Z M5 9 l1.2 1.2 M7 7 l1.2 1.2 M9 5 l1.2 1.2" />
          </svg>
        </Btn>
      </div>
    </div>
  );
}
