'use client';
import { useEffect, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import * as THREE from 'three';
import { useGame } from '@/lib/store';
import { loadHeightfield } from '@/lib/terrain/heightfield';
import { WORLD, MISSIONS, PANORAMAS, setGameWorld } from '@/lib/scientific-data';
import { setGameCrater } from '@/lib/mars/gameCrater';
import { JEZERO_GAME } from '@/lib/mars/gameCraters';
import { loadTraverse } from '@/lib/scientific-data/traverseSource';
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

export default function Game({ crater = JEZERO_GAME }) {
  const [assets, setAssets] = useState(null);
  const [error, setError] = useState(null);
  const [steps, setSteps] = useState([
    { label: 'Rover traverse', done: false },
    { label: 'Terrain height model', done: false },
    { label: 'Surface imagery', done: false },
    { label: 'Mission plan', done: false },
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
        // The crater has to be set before anything reads the projection, the
        // terrain paths or the save key.
        setGameCrater(crater);

        // Every site in the campaign is placed along the rover's traverse, so
        // the traverse comes first. Jezero's ships with the project; Gale's is
        // read from NASA's waypoint file through this project's own route. If
        // it cannot be loaded the game says so instead of guessing positions.
        const traverse = await loadTraverse(crater.traverse);
        if (cancelled) return;
        setGameWorld({ ...crater.db, traverse });
        useGame.getState().loadSave();
        mark(0, traverse.note);

        const hf = await loadHeightfield();
        if (cancelled) return;
        mark(1, `${hf.w}×${hf.h} · ${hf.meta.calibrated ? 'DEM' : 'preview-derived'}`);

        surface = await new THREE.TextureLoader().loadAsync(crater.terrain.surfaceUrl);
        surface.anisotropy = 8;
        surface.wrapS = surface.wrapT = THREE.ClampToEdgeWrapping;
        if (cancelled) { surface.dispose(); return; }
        mark(2);

        mark(3, `${WORLD.sites.length} sites · ${MISSIONS.length} missions`);
        mark(4, `${PANORAMAS.length} images, loaded on demand`);
        if (cancelled) return;
        setAssets({ hf, surface });
        useGame.getState().setReady(true);
      } catch (e) {
        const msg = String(e && e.message ? e.message : e);
        if (!cancelled) {
          setError(
            `${msg} — ${crater.name} loads ${crater.terrain.heightUrl}, ${crater.terrain.metaUrl} and ` +
              `${crater.terrain.surfaceUrl}${crater.traverse.url ? `, and its rover traverse from ${crater.traverse.url}` : ''}.`
          );
        }
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
  }, [crater]);

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
