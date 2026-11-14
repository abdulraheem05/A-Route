'use client';
import dynamic from 'next/dynamic';
import { useTerrainData } from '@/hooks/useTerrainData';
import { useRoverData } from '@/hooks/useRoverData';
import { useWeather } from '@/hooks/useWeather';
import TopBar from '@/components/panels/TopBar';
import LayerSidebar from '@/components/panels/LayerSidebar';
import InfoPanel from '@/components/panels/InfoPanel';
import DatasetInfo from '@/components/panels/DatasetInfo';
import StatusBanner from '@/components/panels/StatusBanner';
import NavControls from '@/components/controls/NavControls';
import Readout from '@/components/controls/Readout';
import SolTimeline from '@/components/controls/SolTimeline';

// The WebGL scene only exists in the browser.
const Viewport = dynamic(() => import('@/components/terrain/Viewport'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center text-xs uppercase tracking-[0.3em] text-slate-600">
      Starting renderer
    </div>
  ),
});

export default function Explorer() {
  useTerrainData();
  useRoverData();
  useWeather();

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-space text-slate-200">
      <div className="absolute inset-0">
        <Viewport />
      </div>

      {/* Interface layer: only the panels themselves take pointer input. */}
      <div className="pointer-events-none absolute inset-0 z-20">
        <TopBar />
        <StatusBanner />
        <LayerSidebar />
        <InfoPanel />
        <NavControls />
        <footer className="pointer-events-auto absolute inset-x-0 bottom-0 z-30 border-t border-line bg-space/85 backdrop-blur-md">
          <Readout />
          <SolTimeline />
        </footer>
        <DatasetInfo />
      </div>
    </main>
  );
}
