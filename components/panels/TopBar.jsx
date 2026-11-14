'use client';
import { useState } from 'react';
import { GALE } from '@/lib/mars/constants';
import { inBounds, parseLatLon } from '@/lib/coordinates/projection';
import { cameraApi } from '@/lib/terrain/cameraApi';
import { useStore } from '@/store/useStore';

function Status({ label, value, tone }) {
  const tones = {
    ok: 'text-measured',
    warn: 'text-interpreted',
    bad: 'text-rose-400',
    idle: 'text-slate-400',
  };
  return (
    <span className="hidden items-center gap-1.5 text-[11px] lg:flex">
      <span className="text-slate-500">{label}</span>
      <span className={tones[tone] || tones.idle}>{value}</span>
    </span>
  );
}

export default function TopBar() {
  const terrain = useStore((s) => s.terrain);
  const rover = useStore((s) => s.rover);
  const imagery = useStore((s) => s.imagery);
  const baseLayer = useStore((s) => s.baseLayer);
  const sidebarOpen = useStore((s) => s.sidebarOpen);
  const infoOpen = useStore((s) => s.infoOpen);
  const setValue = useStore((s) => s.setValue);
  const select = useStore((s) => s.select);
  const [query, setQuery] = useState('');
  const [error, setError] = useState(null);

  const go = (e) => {
    e.preventDefault();
    const p = parseLatLon(query);
    if (!p) {
      setError('Use “lat, lon”, e.g. -4.59, 137.44');
      return;
    }
    if (!inBounds(GALE, p.lon, p.lat)) {
      setError('Outside the Gale data region');
      return;
    }
    setError(null);
    cameraApi.flyTo(p.lon, p.lat, Math.min(cameraApi.distance(), 12));
    select({ type: 'point', lon: p.lon, lat: p.lat });
  };

  const terrainStatus =
    terrain.status === 'ready'
      ? { value: `${terrain.meta.dataset_id} · ${Math.round(terrain.meta.res_m)} m${terrain.roverMeta ? ' + D01 tiles' : ''}`, tone: 'ok' }
      : terrain.status === 'missing'
      ? { value: terrain.roverMeta ? 'D01 tiles only' : 'not prepared (flat)', tone: 'warn' }
      : terrain.status === 'error'
      ? { value: 'error', tone: 'bad' }
      : { value: 'loading…', tone: 'idle' };

  const roverStatus =
    rover.status === 'ready'
      ? { value: `${rover.waypoints.length} waypoints · ${rover.origin === 'snapshot' ? 'local snapshot' : 'NASA live'}`, tone: rover.origin === 'snapshot' ? 'warn' : 'ok' }
      : rover.status === 'error'
      ? { value: 'unavailable', tone: 'bad' }
      : { value: 'loading…', tone: 'idle' };

  const imageryStatus =
    baseLayer !== 'ctx'
      ? { value: 'off', tone: 'idle' }
      : imagery.done
      ? imagery.drawn > 0
        ? { value: `CTX · ${imagery.drawn} tiles`, tone: 'ok' }
        : { value: 'no tiles received', tone: 'bad' }
      : { value: `loading ${imagery.drawn}/${imagery.requested}`, tone: 'idle' };

  return (
    <header className="pointer-events-auto absolute inset-x-0 top-0 z-40 flex h-12 items-center gap-4 border-b border-line bg-space/85 px-3 backdrop-blur-md">
      <button
        type="button"
        className="btn h-8 w-8 p-0"
        onClick={() => setValue('sidebarOpen', !sidebarOpen)}
        title="Layers"
        aria-label="Toggle layers panel"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4">
          <path d="M1 3h12M1 7h12M1 11h12" />
        </svg>
      </button>

      <div className="flex items-baseline gap-2">
        <span className="text-sm font-semibold tracking-[0.28em] text-slate-100">MARSWALK</span>
        <span className="hidden text-[11px] uppercase tracking-[0.18em] text-slate-500 sm:inline">Gale crater</span>
      </div>

      <form onSubmit={go} className="relative ml-2 hidden md:block">
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setError(null);
          }}
          placeholder="Go to lat, lon   (−4.59, 137.44)"
          className="num h-8 w-64 rounded-md border border-line bg-white/5 px-2.5 text-xs text-slate-100 outline-none placeholder:text-slate-600 focus:border-accent/50"
          aria-label="Go to coordinates"
        />
        {error && (
          <div className="fade-in absolute left-0 top-9 rounded border border-rose-400/30 bg-black/90 px-2 py-1 text-[11px] text-rose-300">
            {error}
          </div>
        )}
      </form>

      <div className="ml-auto flex items-center gap-5">
        <Status label="Elevation" {...terrainStatus} />
        <Status label="Imagery" {...imageryStatus} />
        <Status label="Rover" {...roverStatus} />
        <button
          type="button"
          className={`btn h-8 ${infoOpen ? 'btn-accent' : ''}`}
          onClick={() => setValue('infoOpen', !infoOpen)}
        >
          Info
        </button>
      </div>
    </header>
  );
}
