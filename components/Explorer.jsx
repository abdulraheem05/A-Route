'use client';
// Workspace shell: the 3D viewport fills the screen and every piece of
// interface docks around it.
//
//   top bar      — identity, search, one data indicator, help
//   left dock    — layer manager (hierarchical, collapsible)
//   right dock   — contextual inspector (Inspect / Weather / Geology)
//   toolbox      — floating, right edge, above the footer
//   route legend — floating, left edge, only while routes are planned
//   footer       — pointer readout + sol timeline
//
// Measurement and route planning are one section of the inspector,
// MEASURE & PLAN; the legend below the map names what is drawn.
import { useEffect } from 'react';
import dynamic from 'next/dynamic';
import { CraterProvider, useCrater } from '@/lib/mars/CraterContext';
import { defaultCrater } from '@/lib/mars/craters';
import { useTerrainData } from '@/hooks/useTerrainData';
import { useRoverData } from '@/hooks/useRoverData';
import { useWeather } from '@/hooks/useWeather';
import { useStore } from '@/store/useStore';
import TopBar from '@/components/panels/TopBar';
import LayerSidebar from '@/components/panels/LayerSidebar';
import InfoPanel from '@/components/panels/InfoPanel';
import DatasetInfo from '@/components/panels/DatasetInfo';
import StatusBanner from '@/components/panels/StatusBanner';
import MapLoadingGate from '@/components/ui/MapLoadingGate';
import RouteLegend from '@/components/panels/RouteLegend';
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
      <MapLoadingGate>
        <ExplorerShell />
      </MapLoadingGate>
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
        <RouteLegend />
        <footer className="gale-footer pointer-events-auto absolute inset-x-0 bottom-0 z-30">
          <Readout />
          <SolTimeline />
        </footer>
        <DatasetInfo />
      </div>
    </main>
  );
}
