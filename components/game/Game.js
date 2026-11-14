'use client';
import { useEffect, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import * as THREE from 'three';
import { useGame } from '@/lib/store';
import { loadHeightfield } from '@/lib/terrain/heightfield';
import { WORLD, MISSIONS, PANORAMAS } from '@/lib/scientific-data';
import Terrain from '@/components/terrain/Terrain';
import Rocks from '@/components/world/Rocks';
import { SUN_DIR, FOG_DENSITY } from '@/components/terrain/terrainMaterial';
import Sky from '@/components/terrain/Sky';
import Markers from '@/components/world/Markers';
import { TraverseLine, RouteLine } from '@/components/world/TraverseLine';
import Player from './Player';
import MarsLoadingScreen from '@/components/ui/MarsLoadingScreen';
import HUD from '@/components/ui/HUD';
import PauseMenu from '@/components/ui/PauseMenu';
import SettingsPanel from '@/components/ui/SettingsPanel';
import DataNotice from '@/components/ui/DataNotice';
import InfoPopup from '@/components/scientific/InfoPopup';
import PanoramaViewer from '@/components/panorama/PanoramaViewer';
import FullMap from '@/components/minimap/FullMap';
import MissionComplete from '@/components/missions/MissionComplete';
import CampaignCard from '@/components/missions/CampaignCard';

const DPR = { low: 1, medium: 1.5, high: 2 };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

export default function Game() {
  const [assets, setAssets] = useState(null);
  const [error, setError] = useState(null);
  const [steps, setSteps] = useState([
    { label: 'Terrain height model', done: false },
    { label: 'Surface imagery', done: false },
    { label: 'Rover traverse and mission data', done: false },
    { label: 'Panorama catalogue', done: false },
  ]);
  const ready = useGame((g) => g.ready);
  const quality = useGame((g) => g.settings.quality);
  const activePanoramaId = useGame((g) => g.activePanoramaId);
  const mapOpen = useGame((g) => g.mapOpen);
  const paused = useGame((g) => g.paused);
  const settingsOpen = useGame((g) => g.settingsOpen);
  const noticeOpen = useGame((g) => g.noticeOpen);
  const started = useGame((g) => g.started);
  const allComplete = useGame((g) => g.allComplete);
  const completion = useGame((g) => g.completion);

  useEffect(() => {
    let cancelled = false;
    let surface = null;
    const mark = (i, detail) => setSteps((s) => s.map((x, k) => (k === i ? { ...x, done: true, detail } : x)));
    (async () => {
      try {
        useGame.getState().loadSave();
        const hf = await loadHeightfield();
        if (cancelled) return;
        mark(0, `${hf.w}×${hf.h} · ${hf.meta.calibrated ? 'DEM' : 'preview-derived'}`);
        surface = await new THREE.TextureLoader().loadAsync('/terrain/jezero-surface.jpg');
        surface.anisotropy = 8;
        surface.wrapS = surface.wrapT = THREE.ClampToEdgeWrapping;
        if (cancelled) { surface.dispose(); return; }
        mark(1);
        await wait(250);
        mark(2, `${WORLD.track.length} waypoints · ${MISSIONS.length} missions`);
        await wait(250);
        mark(3, `${PANORAMAS.length} images, loaded on demand`);
        await wait(500);
        if (cancelled) return;
        setAssets({ hf, surface });
        useGame.getState().setReady(true);
      } catch (e) {
        if (!cancelled) setError(String(e && e.message ? e.message : e) + ' — check that public/terrain contains jezero-height.u16, terrain-meta.json and jezero-surface.jpg.');
      }
    })();
    return () => {
      cancelled = true;
      if (surface) surface.dispose();
      const g = useGame.getState();
      g.save();
      g.setReady(false);
      g.setPaused(false);
    };
  }, []);

  return (
    <div className="relative h-screen w-screen select-none overflow-hidden bg-coal-950">
      {assets && (
        <Canvas
          flat
          dpr={Math.min(typeof window !== 'undefined' ? window.devicePixelRatio : 1, DPR[quality] || 1.5)}
          gl={{ antialias: quality !== 'low', powerPreference: 'high-performance' }}
          camera={{ fov: 68, near: 0.25, far: 220000 }}
          frameloop={activePanoramaId ? 'never' : 'always'}
          className="fade-in"
        >
          <Sky />
          {/* lights and fog apply to the rocks; the terrain shader lights itself the same way */}
          <ambientLight color="#d9bb9c" intensity={1.0} />
          <directionalLight color="#ffe9d2" intensity={2.1} position={[SUN_DIR.x * 1000, SUN_DIR.y * 1000, SUN_DIR.z * 1000]} />
          <fogExp2 attach="fog" args={['#cca078', FOG_DENSITY]} />
          <Terrain hf={assets.hf} surface={assets.surface} quality={quality} />
          <Rocks hf={assets.hf} quality={quality} />
          <TraverseLine hf={assets.hf} />
          <RouteLine hf={assets.hf} />
          <Markers hf={assets.hf} />
          <Player hf={assets.hf} />
        </Canvas>
      )}

      {ready && assets && (
        <>
          {started && !allComplete && !activePanoramaId && <HUD />}
          <InfoPopup />
          <MissionComplete />
          <CampaignCard mode={!started ? 'start' : allComplete && completion ? 'finish' : null} />
          {mapOpen && <FullMap hf={assets.hf} />}
          {activePanoramaId && <PanoramaViewer />}
          {paused && !settingsOpen && <PauseMenu />}
          {settingsOpen && <SettingsPanel />}
          {noticeOpen && <DataNotice hf={assets.hf} />}
        </>
      )}
      {/* The same real step list the previous loader used, in the shared
          cinematic screen. Nothing about the loading work itself changed. */}
      {!ready && (
        <MarsLoadingScreen
          variant="play"
          stages={steps.map((s) => ({ label: s.label, done: s.done, detail: s.detail }))}
          error={error}
          onRetry={() => window.location.reload()}
        />
      )}
    </div>
  );
}
