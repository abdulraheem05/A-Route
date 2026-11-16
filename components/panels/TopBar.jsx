'use client';
// Minimal workspace header.
//
// The detailed dataset status that used to sit here permanently (terrain
// resolution, imagery tile counts, rover waypoint counts, loading text) is now
// behind one indicator: a single dot whose colour reports the worst current
// state, opening a compact data panel. The MAP / PLAY switch is owned by
// CraterWorkspace and floats over the centre of this bar, so the centre is kept
// clear for it.
import { useState } from 'react';
import { useCrater } from '@/lib/mars/CraterContext';
import { brandGradientTextStyle } from '@/lib/brand';
import { inBounds, parseLatLon } from '@/lib/coordinates/projection';
import { cameraApi } from '@/lib/terrain/cameraApi';
import { useStore } from '@/store/useStore';
import { DatasetLink } from '@/components/panels/ui';

function Icon({ name }) {
  const common = { width: 15, height: 15, viewBox: '0 0 16 16', fill: 'none', stroke: 'currentColor', strokeWidth: 1.4, strokeLinecap: 'round', strokeLinejoin: 'round' };
  if (name === 'layers') {
    return (
      <svg {...common}>
        <path d="M8 1.8 L14 5 L8 8.2 L2 5 Z" />
        <path d="M2 8 L8 11.2 L14 8" />
        <path d="M2 11 L8 14.2 L14 11" />
      </svg>
    );
  }
  if (name === 'inspector') {
    return (
      <svg {...common}>
        <rect x="1.8" y="2.8" width="12.4" height="10.4" rx="1.4" />
        <path d="M9.6 2.8 V13.2" />
      </svg>
    );
  }
  if (name === 'help') {
    return (
      <svg {...common}>
        <circle cx="8" cy="8" r="6.2" />
        <path d="M6.3 6.2 a1.75 1.75 0 1 1 1.9 2.3 V10" />
        <path d="M8.1 12.1 v.1" strokeWidth="1.8" />
      </svg>
    );
  }
  if (name === 'search') {
    return (
      <svg {...common}>
        <circle cx="7" cy="7" r="4.4" />
        <path d="M10.3 10.3 L14 14" />
      </svg>
    );
  }
  return null;
}

function Popover({ title, onClose, children, width = 300 }) {
  return (
    <>
      {/* Click-away shield. The bar carries a backdrop-filter, which makes it
          the containing block for fixed children, so this is sized absolutely
          rather than with `fixed inset-0`. */}
      <button
        type="button"
        className="absolute z-40 cursor-default"
        style={{ top: 0, left: '-100vw', right: '-100vw', height: '100vh' }}
        onClick={onClose}
        aria-label="Close panel"
        tabIndex={-1}
      />
      {/* Never wider than the screen it is anchored to, which leaves the
          desktop width untouched and keeps it on a 320px phone. */}
      <div
        className="panel fade-in thin-scroll absolute right-0 top-9 z-50 max-h-[70vh] overflow-y-auto"
        style={{ width: `min(${width}px, calc(100vw - 20px))` }}
        role="dialog"
        aria-label={title}
      >
        <div className="gale-head">
          <span className="label flex-1">{title}</span>
          <button type="button" className="gale-icon-btn" onClick={onClose} aria-label="Close">
            <svg width="11" height="11" viewBox="0 0 12 12" stroke="currentColor" strokeWidth="1.4">
              <path d="M2 2 L10 10 M10 2 L2 10" />
            </svg>
          </button>
        </div>
        <div className="px-2.5 py-2.5">{children}</div>
      </div>
    </>
  );
}

export default function TopBar() {
  const crater = useCrater();
  const baseLayerKey = (crater.imagery && crater.imagery.baseLayerKey) || 'ctx';
  const baseDatasetId =
    (crater.imagery && crater.imagery.layers && crater.imagery.layers[baseLayerKey]
      ? crater.imagery.layers[baseLayerKey].datasetId
      : null);
  const terrain = useStore((s) => s.terrain);
  const rover = useStore((s) => s.rover);
  const imagery = useStore((s) => s.imagery);
  const patch = useStore((s) => s.patch);
  const baseLayer = useStore((s) => s.baseLayer);
  const sidebarOpen = useStore((s) => s.sidebarOpen);
  const infoOpen = useStore((s) => s.infoOpen);
  const setValue = useStore((s) => s.setValue);
  const select = useStore((s) => s.select);

  const [query, setQuery] = useState('');
  const [error, setError] = useState(null);
  const [open, setOpen] = useState(null); // 'data' | 'help' | null

  const go = (e) => {
    e.preventDefault();
    const p = parseLatLon(query);
    if (!p) {
      setError(`Use “lat, lon”, e.g. ${crater.searchExample}`);
      return;
    }
    if (!inBounds(crater.bounds, p.lon, p.lat)) {
      setError(`Outside the ${crater.searchRegionLabel || crater.name} data region`);
      return;
    }
    setError(null);
    cameraApi.flyTo(p.lon, p.lat, Math.min(cameraApi.distance(), 12));
    select({ type: 'point', lon: p.lon, lat: p.lat });
  };

  // One indicator for everything: the worst state wins.
  const loading =
    terrain.status === 'loading' || rover.status === 'loading' || (baseLayer === baseLayerKey && !imagery.done);
  const failed =
    terrain.status === 'error' ||
    rover.status === 'error' ||
    (baseLayer === baseLayerKey && imagery.done && imagery.requested > 0 && imagery.drawn === 0);
  const degraded = terrain.status === 'missing' || rover.origin === 'snapshot' || rover.origin === 'bundled';

  const roverName = (crater.rover && crater.rover.name) || 'the rover';

  const dot = failed ? '#fb7185' : loading ? '#6cb6f5' : degraded ? 'var(--g-warn)' : 'var(--g-ok)';
  const dotLabel = failed ? 'Some data unavailable' : loading ? 'Loading data' : degraded ? 'Running on partial data' : 'All datasets loaded';

  return (
    <header className="gale-topbar pointer-events-auto absolute inset-x-0 top-0 z-40 flex items-center gap-2 px-2">
      <button
        type="button"
        className="gale-icon-btn tip tip-below"
        data-tip="Layers"
        data-on={sidebarOpen ? 'true' : 'false'}
        onClick={() => setValue('sidebarOpen', !sidebarOpen)}
        aria-label="Toggle the layer panel"
        aria-pressed={sidebarOpen}
      >
        <Icon name="layers" />
      </button>

      <div className="flex items-baseline gap-2 pl-0.5">
        <span className="font-artemus text-[15px] leading-none tracking-[0.2em]" style={brandGradientTextStyle()}>
          A-ROUTE
        </span>
        <span className="hidden text-[10px] uppercase tracking-[0.2em] text-slate-500 sm:inline">{crater.shortLabel || crater.name}</span>
      </div>

      <form onSubmit={go} className="relative ml-2 hidden md:block">
        <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-600">
          <Icon name="search" />
        </span>
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setError(null);
          }}
          placeholder="lat, lon"
          className="gale-search num pl-8"
          aria-label="Go to coordinates"
        />
        {error && (
          <div className="fade-in absolute left-0 top-8 z-50 rounded border border-rose-400/30 bg-black/95 px-2 py-1 text-[10.5px] text-rose-300">
            {error}
          </div>
        )}
      </form>

      {/* Kept clear for the MAP / PLAY switch (components/CraterWorkspace.jsx). */}
      <div className="gale-topbar-centre" aria-hidden="true" />

      <div className="relative flex items-center gap-1">
        <button
          type="button"
          className="tip tip-below-right flex h-7 items-center gap-2 rounded-md border border-line px-2.5 transition hover:bg-white/5"
          data-tip={dotLabel}
          onClick={() => setOpen(open === 'data' ? null : 'data')}
          aria-label={`Data status: ${dotLabel}`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${loading ? 'animate-soft-pulse' : ''}`}
            style={{ background: dot }}
          />
          <span className="text-[10.5px] uppercase tracking-[0.14em] text-slate-400">Data</span>
        </button>

        <button
          type="button"
          className="gale-icon-btn tip tip-below-right"
          data-tip="How to use this map"
          data-on={open === 'help' ? 'true' : 'false'}
          onClick={() => setOpen(open === 'help' ? null : 'help')}
          aria-label="How to use this map"
        >
          <Icon name="help" />
        </button>

        <button
          type="button"
          className="gale-icon-btn tip tip-below-right"
          data-tip="Inspector"
          data-on={infoOpen ? 'true' : 'false'}
          onClick={() => setValue('infoOpen', !infoOpen)}
          aria-label="Toggle the inspector panel"
          aria-pressed={infoOpen}
        >
          <Icon name="inspector" />
        </button>

        {open === 'data' && (
          <Popover title="Loaded data" onClose={() => setOpen(null)}>
            <div className="kv">
              <span>Elevation</span>
              <span>
                {terrain.status === 'ready' ? (
                  <>
                    <DatasetLink id={terrain.meta.dataset_id} />{' '}
                    <span className="num text-slate-300">{Math.round(terrain.meta.res_m)} m</span>
                  </>
                ) : terrain.status === 'missing' ? (
                  <span className="text-interpreted">flat reference surface</span>
                ) : terrain.status === 'error' ? (
                  <span className="text-rose-300">error</span>
                ) : (
                  <span className="text-slate-500">loading…</span>
                )}
              </span>
            </div>
            {terrain.roverMeta && (
              <div className="kv">
                <span>Rover-area tiles</span>
                <span>
                  <DatasetLink id={terrain.roverMeta.dataset_id || 'D01'} />{' '}
                  <span className="num text-slate-300">
                    {terrain.roverMeta.levels.map((l) => `${Math.round(l.res_m)} m`).join(' · ')}
                  </span>
                </span>
              </div>
            )}
            <div className="kv">
              <span>Imagery</span>
              <span>
                {baseLayer !== baseLayerKey ? (
                  <span className="text-slate-500">off</span>
                ) : imagery.done ? (
                  imagery.drawn > 0 ? (
                    <>
                      <DatasetLink id={baseDatasetId} /> <span className="num text-slate-300">{imagery.drawn} tiles</span>
                    </>
                  ) : (
                    <span className="text-rose-300">no tiles received</span>
                  )
                ) : (
                  <span className="num text-slate-500">
                    {imagery.drawn}/{imagery.requested}
                  </span>
                )}
              </span>
            </div>
            {patch && (
              <div className="kv">
                <span>Detail window</span>
                <span className="num text-slate-300">
                  {patch.sizeKm.toFixed(1)} km · {patch.imagery}
                </span>
              </div>
            )}
            <div className="kv">
              <span>Rover track</span>
              <span>
                {rover.status === 'ready' ? (
                  <>
                    <DatasetLink id={(crater.rover && crater.rover.waypointDatasetId) || 'D12'} />{' '}
                    <span className="num text-slate-300">{rover.waypoints.length} waypoints</span>
                  </>
                ) : rover.status === 'error' ? (
                  <span className="text-rose-300">unavailable</span>
                ) : (
                  <span className="text-slate-500">loading…</span>
                )}
              </span>
            </div>
            <div className="kv">
              <span>Source</span>
              <span className="text-slate-300">
                {rover.origin === 'snapshot'
                  ? 'local snapshot'
                  : rover.origin === 'bundled'
                  ? 'bundled subset'
                  : rover.origin === 'live'
                  ? 'NASA, live'
                  : '—'}
              </span>
            </div>
            <p className="note mt-2">Click a dataset code for its instrument, resolution and citation.</p>
          </Popover>
        )}

        {open === 'help' && (
          <Popover title="Using this map" onClose={() => setOpen(null)} width={320}>
            <ul className="space-y-2 body-text">
              <li>
                <span className="text-slate-200">Move around.</span> Drag to orbit, scroll to zoom, right-drag to pan.
                The toolbox on the right resets north, tilts the view and flies to {roverName}.
              </li>
              <li>
                <span className="text-slate-200">Inspect something.</span> Click the terrain, a rover waypoint or a
                named place. Details open in the inspector on the right.
              </li>
              <li>
                <span className="text-slate-200">Choose what you see.</span> The layer panel on the left stacks
                imagery, terrain analysis and the rover track. Select a layer to reach its opacity and legend.
              </li>
              <li>
                <span className="text-slate-200">Follow the mission.</span> The timeline at the bottom moves {roverName}
                {' '}to where it was on any sol — a Martian day since landing.
              </li>
            </ul>
            <div className="mt-3 border-t border-line pt-2.5">
              <p className="label mb-1.5">Every value is labelled</p>
              <ul className="space-y-1">
                <li className="kv">
                  <span className="text-measured">Measured</span>
                  <span className="note">instrument output</span>
                </li>
                <li className="kv">
                  <span className="text-derived">Derived</span>
                  <span className="note">computed from measurements</span>
                </li>
                <li className="kv">
                  <span className="text-interpreted">Interpreted</span>
                  <span className="note">scientific judgement</span>
                </li>
                <li className="kv">
                  <span className="text-simulated">Simulated</span>
                  <span className="note">model output</span>
                </li>
              </ul>
            </div>
          </Popover>
        )}
      </div>
    </header>
  );
}
