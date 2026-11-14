'use client';
// Selectable landmark labels. IAU names are drawn plain; mission names keep
// their quotation marks; stratigraphic units are never pins (see units.js).
import { useMemo } from 'react';
import { Html } from '@react-three/drei';
import { resolveLandmarks } from '@/lib/data/landmarks';
import { scenePosition } from '@/lib/terrain/place';
import { useStore } from '@/store/useStore';

export default function LandmarkMarkers() {
  const waypoints = useStore((s) => s.rover.waypoints);
  const exaggeration = useStore((s) => s.exaggeration);
  const terrainVersion = useStore((s) => s.terrainVersion);
  const patch = useStore((s) => s.patch);
  const showLandmarks = useStore((s) => s.show.landmarks);
  const showDrill = useStore((s) => s.show.drillSites);
  const detail = useStore((s) => (s.camera.dist < 30 ? 2 : s.camera.dist < 160 ? 1 : 0));
  const selectedId = useStore((s) => (s.selection && s.selection.type === 'landmark' ? s.selection.id : null));
  const select = useStore((s) => s.select);

  const landmarks = useMemo(() => resolveLandmarks(waypoints), [waypoints]);

  const placed = useMemo(
    () =>
      landmarks.map((l) => ({
        ...l,
        position: scenePosition(l.lon, l.lat, l.elev ?? null, exaggeration, 10),
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [landmarks, exaggeration, terrainVersion, patch]
  );

  if (!showLandmarks) return null;

  return (
    <group>
      {placed
        .filter((l) => l.tier <= detail && (l.tier < 2 || showDrill))
        .map((l) => {
          const iau = l.nameClass === 'iau';
          const active = l.id === selectedId;
          return (
            <Html key={l.id} position={l.position} center zIndexRange={[10, 0]}>
              <button
                type="button"
                onClick={() => select({ type: 'landmark', id: l.id })}
                className={`map-label group flex -translate-y-3 flex-col items-center gap-0.5 ${
                  active ? 'text-accent' : 'text-slate-100'
                }`}
              >
                <span
                  className={`rounded px-1.5 py-0.5 text-[10px] leading-none transition group-hover:bg-black/80 ${
                    active ? 'bg-black/80' : 'bg-black/45'
                  } ${iau ? 'font-semibold uppercase tracking-[0.12em]' : ''}`}
                >
                  {l.name}
                </span>
                <span
                  className={`h-1.5 w-1.5 rounded-full border ${
                    iau ? 'border-white bg-transparent' : 'border-black/60 bg-interpreted'
                  }`}
                />
              </button>
            </Html>
          );
        })}
    </group>
  );
}
