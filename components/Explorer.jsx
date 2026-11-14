'use client';
// Workspace shell: the 3D viewport fills the screen and every piece of
// interface docks around it.
//
//   top bar      — identity, search, one data indicator, help
//   left dock    — layer manager (hierarchical, collapsible)
//   right dock   — contextual inspector (Inspect / Weather / Geology)
//   toolbox      — floating, right edge, above the footer
//   measure card — floating, left edge, only while measuring
//   footer       — pointer readout + sol timeline
//
// Measurement used to live permanently in the right sidebar. It now appears
// only in measurement mode, as a floating card over the map, and uses exactly
// the same two-point calculation as before.
import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { CraterProvider, useCrater } from '@/lib/mars/CraterContext';
import { defaultCrater } from '@/lib/mars/craters';
import { useTerrainData } from '@/hooks/useTerrainData';
import { useRoverData } from '@/hooks/useRoverData';
import { useWeather } from '@/hooks/useWeather';
import { greatCircleMeters } from '@/lib/coordinates/projection';
import { heightProvider } from '@/lib/terrain/heightProvider';
import { useStore } from '@/store/useStore';
import TopBar from '@/components/panels/TopBar';
import LayerSidebar from '@/components/panels/LayerSidebar';
import InfoPanel from '@/components/panels/InfoPanel';
import DatasetInfo from '@/components/panels/DatasetInfo';
import StatusBanner from '@/components/panels/StatusBanner';
import ProfileChart from '@/components/panels/ProfileChart';
import { DatasetLink, EvidenceBadge } from '@/components/panels/ui';
import NavControls from '@/components/controls/NavControls';
import Readout from '@/components/controls/Readout';
import SolTimeline from '@/components/controls/SolTimeline';

// The WebGL scene only exists in the browser.
const Viewport = dynamic(() => import('@/components/terrain/Viewport'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center">
      <span className="label animate-soft-pulse">Starting renderer</span>
    </div>
  ),
});

const fmtDistance = (m) => (m >= 1000 ? `${(m / 1000).toFixed(2)} km` : `${m.toFixed(0)} m`);

function MeasureCard() {
  const [profileOpen, setProfileOpen] = useState(false);
  const active = useStore((s) => s.measure.active);
  const points = useStore((s) => s.measure.points);
  const terrainVersion = useStore((s) => s.terrainVersion);
  const patch = useStore((s) => s.patch);
  const clear = useStore((s) => s.clearMeasure);
  const exit = useStore((s) => s.toggleMeasure);
  const sidebarOpen = useStore((s) => s.sidebarOpen);

  // Unchanged from the original implementation: great-circle distance between
  // the two picked points, with the elevation profile sampled from whatever
  // terrain dataset covers the line.
  const result = useMemo(() => {
    if (points.length !== 2) return null;
    const [a, b] = points;
    const total = greatCircleMeters(a.lon, a.lat, b.lon, b.lat);
    const n = 240;
    const samples = [];
    const sources = new Set();
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const lon = a.lon + (b.lon - a.lon) * t;
      const lat = a.lat + (b.lat - a.lat) * t;
      const s = heightProvider.sample(lon, lat);
      if (s) sources.add(s.datasetId);
      samples.push({ d: total * t, h: s ? s.h : null });
    }
    const h0 = samples[0].h;
    const h1 = samples[n].h;
    const dh = h0 !== null && h1 !== null ? h1 - h0 : null;
    return {
      total,
      samples,
      sources: [...sources],
      dh,
      // Straight-line grade between the two ends — not a terrain slope reading.
      grade: dh !== null && total > 0 ? (Math.atan2(dh, total) * 180) / Math.PI : null,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [points, terrainVersion, patch]);

  if (!active && points.length === 0) return null;

  const step = points.length === 0 ? 'Click the first point on the terrain' : points.length === 1 ? 'Click the second point' : null;

  return (
    <div className="gale-measure panel fade-in pointer-events-auto" data-inset={sidebarOpen ? 'true' : 'false'}>
      <div className="gale-head">
        <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" className="text-accent">
          <path d="M2 12 L12 2 L14 4 L4 14 Z M5 9 l1.2 1.2 M7 7 l1.2 1.2 M9 5 l1.2 1.2" />
        </svg>
        <span className="label flex-1" style={{ color: 'var(--g-text)' }}>
          Measure
        </span>
        <EvidenceBadge kind="Derived" />
        <button type="button" className="gale-icon-btn tip tip-below-right" data-tip="Exit measurement" onClick={exit} aria-label="Exit measurement">
          <svg width="11" height="11" viewBox="0 0 12 12" stroke="currentColor" strokeWidth="1.4">
            <path d="M2 2 L10 10 M10 2 L2 10" />
          </svg>
        </button>
      </div>

      <div className="px-2.5 py-2.5">
        {step && (
          <p className="flex items-center gap-2 text-[11.5px] text-slate-300">
            <span className="num flex h-4 w-4 items-center justify-center rounded-full border border-accent/50 text-[9px] text-accent">
              {points.length + 1}
            </span>
            {step}
          </p>
        )}

        {result && (
          <>
            <div className="kv">
              <span>Distance</span>
              <span className="num">{fmtDistance(result.total)}</span>
            </div>
            <div className="kv">
              <span>Elevation change</span>
              <span className="num">
                {result.dh !== null ? `${result.dh >= 0 ? '+' : ''}${result.dh.toFixed(1)} m` : '—'}
              </span>
            </div>
            <div className="kv">
              <span>Grade, end to end</span>
              <span className="num">{result.grade !== null ? `${result.grade.toFixed(1)}°` : '—'}</span>
            </div>

            <button
              type="button"
              className="mt-1.5 flex w-full items-center justify-between rounded-md border border-line px-2 py-1.5 text-[11px] text-slate-400 transition hover:text-slate-100"
              onClick={() => setProfileOpen((v) => !v)}
            >
              Elevation profile
              <span className="chev" data-open={profileOpen ? 'true' : 'false'}>
                <svg width="9" height="9" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M3.5 1.5 L7 5 L3.5 8.5" />
                </svg>
              </span>
            </button>

            {profileOpen && (
              <div className="mt-1.5">
                <ProfileChart samples={result.samples} height={92} />
                <p className="note mt-1">
                  Sampled from {result.sources.length ? result.sources.map((id) => <DatasetLink key={id} id={id} />) : 'no elevation data'}
                  {result.sources.length ? ' along the line.' : '.'}
                </p>
              </div>
            )}
          </>
        )}

        <div className="mt-2 flex gap-1.5">
          <button type="button" className="btn flex-1" onClick={clear} disabled={points.length === 0}>
            Clear
          </button>
          <button type="button" className="btn flex-1" onClick={exit}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * The explorer for one crater.
 *
 * `crater` is a configuration object from lib/mars/craters/. Every
 * crater-specific value the scene, the panels and the data hooks need comes
 * from it, published through CraterProvider. Called with no crater it explores
 * the default (Gale), which is what the original component did.
 */
export default function Explorer({ crater = defaultCrater }) {
  return (
    <CraterProvider crater={crater}>
      <ExplorerShell />
    </CraterProvider>
  );
}

function ExplorerShell() {
  const crater = useCrater();
  useTerrainData();
  useRoverData();
  useWeather();

  // Crater-scoped state is cleared whenever a different crater is explored, so
  // one crater's sol, selection or dataset status can never appear under
  // another after a client-side navigation. On a fresh mount this restores the
  // values the store already starts with, so Gale is unaffected.
  //
  // The base-imagery choice is a layer key from the crater's own imagery set.
  // Gale's is 'ctx', which is already the store default.
  useEffect(() => {
    useStore.getState().resetCraterState();
    const key = crater.imagery && crater.imagery.baseLayerKey;
    const current = useStore.getState().baseLayer;
    if (key && current !== 'none' && current !== key) useStore.setState({ baseLayer: key });
  }, [crater]);

  return (
    <main className="gale-workspace relative h-screen w-screen overflow-hidden text-slate-200">
      <div className="absolute inset-0">
        <Viewport />
      </div>

      {/* Interface layer: only the panels themselves take pointer input, so the
          terrain keeps the whole screen for navigation. */}
      <div className="pointer-events-none absolute inset-0 z-20">
        <TopBar />
        <StatusBanner />
        <LayerSidebar />
        <InfoPanel />
        <NavControls />
        <MeasureCard />
        <footer className="gale-footer pointer-events-auto absolute inset-x-0 bottom-0 z-30">
          <Readout />
          <SolTimeline />
        </footer>
        <DatasetInfo />
      </div>
    </main>
  );
}
