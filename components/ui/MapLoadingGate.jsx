'use client';
// Holds the crater MAP behind a loading screen until it is genuinely usable,
// and reports the stages that are actually happening.
//
// Every stage below is read from real state, never from a timer:
//
//   renderer           the WebGL scene has published a camera distance
//   terrain elevation  useTerrainData has resolved: ready, or missing (no DEM
//                      prepared, which is a usable state — a flat reference
//                      surface with real imagery — so it does not block)
//   orbital imagery    the first batch of Mars Trek tiles has been drawn
//   scientific layers  the rover record has resolved, including 'unavailable'
//                      for a crater with no mission
//
// The gate lifts when the blocking stages are done. It also lifts on error so
// the interface can explain itself, and after a ceiling so a stalled network
// can never leave a viewer stuck on this screen.
import { useEffect, useMemo, useRef, useState } from 'react';
import { useCrater } from '@/lib/mars/CraterContext';
import { useStore } from '@/store/useStore';
import MarsLoadingScreen from '@/components/ui/MarsLoadingScreen';

// A stalled fetch must not trap the viewer. Past this the map is shown with
// whatever has arrived, and its own status banner explains what is missing.
const CEILING_MS = 20000;

export default function MapLoadingGate({ children }) {
  const crater = useCrater();
  const terrain = useStore((s) => s.terrain);
  const imagery = useStore((s) => s.imagery);
  const rover = useStore((s) => s.rover);
  const rendererReady = useStore((s) => s.rendererReady);
  const baseLayer = useStore((s) => s.baseLayer);

  const [released, setReleased] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const startedAt = useRef(Date.now());

  // This gate mounts before the Canvas is even imported, so clearing the flag
  // here cannot race Viewport's onCreated.
  useEffect(() => {
    useStore.setState({ rendererReady: false });
  }, []);

  // Published by Viewport's onCreated, so this is the real WebGL context.
  const rendererUp = rendererReady;
  const terrainSettled = terrain.status !== 'loading';
  const imagerySettled = baseLayer === 'none' || imagery.done || imagery.drawn > 0;
  const roverSettled = rover.status !== 'loading';

  const stages = useMemo(
    () => [
      { label: 'Starting the renderer', done: rendererUp },
      {
        label: 'Loading terrain elevation',
        done: terrainSettled,
        detail:
          terrain.status === 'ready' && terrain.meta
            ? `${terrain.meta.dataset_id} · ${Math.round(terrain.meta.res_m)} m`
            : terrain.status === 'missing'
            ? 'none prepared — flat reference surface'
            : terrain.status === 'error'
            ? 'failed'
            : null,
      },
      {
        label: 'Preparing orbital imagery',
        done: imagerySettled,
        detail: imagery.drawn > 0 ? `${imagery.drawn} tiles` : baseLayer === 'none' ? 'imagery off' : null,
      },
      {
        label: 'Loading scientific layers',
        done: roverSettled,
        detail:
          rover.status === 'ready'
            ? `${rover.waypoints.length} waypoints`
            : rover.status === 'unavailable'
            ? 'no rover mission here'
            : rover.status === 'error'
            ? 'unavailable'
            : null,
      },
    ],
    [rendererUp, terrainSettled, imagerySettled, roverSettled, terrain.status, terrain.meta, imagery.drawn, baseLayer, rover.status, rover.waypoints.length]
  );

  const ready = rendererUp && terrainSettled && imagerySettled && roverSettled;

  useEffect(() => {
    if (released) return undefined;
    if (ready) {
      // One short fade so the map is not revealed mid-paint.
      setLeaving(true);
      const t = setTimeout(() => setReleased(true), 520);
      return () => clearTimeout(t);
    }
    const left = CEILING_MS - (Date.now() - startedAt.current);
    const t = setTimeout(() => {
      setLeaving(true);
      setTimeout(() => setReleased(true), 520);
    }, Math.max(0, left));
    return () => clearTimeout(t);
  }, [ready, released]);

  return (
    <>
      {children}
      {!released && (
        <div className={leaving ? 'mars-load-exit' : undefined}>
          <MarsLoadingScreen
            variant="map"
            crater={crater}
            stages={stages}
            note={
              terrain.status === 'missing'
                ? 'No elevation grid is prepared for this crater. The map will open on a flat reference surface carrying real orbital imagery.'
                : null
            }
          />
        </div>
      )}
    </>
  );
}
