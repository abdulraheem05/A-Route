'use client';
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { useGame } from '@/lib/store';
import { WORLD, MISSIONS } from '@/lib/scientific-data';
import { nextObjective } from '@/lib/missions';

const COLORS = { current: '#e08a4f', past: '#d9c3a3', locked: '#6b625c', target: '#a9c7dc' };

function Beacon({ site, hf, state }) {
  const ref = useRef();
  const beamMat = useRef();
  const y = useMemo(() => hf.worldY(site.x, site.z), [hf, site]);
  const baseOpacity = state === 'locked' ? 0.25 : 0.6;
  useFrame(({ camera }) => {
    if (!ref.current) return;
    const d = Math.hypot(camera.position.x - site.x, camera.position.z - site.z);
    // keep the beam about the same apparent width at any range
    const k = Math.max(1, d / 160);
    const sy = 1 + Math.min(d / 400, 12);
    ref.current.scale.set(k, sy, k);
    ref.current.position.y = 35 * sy; // beam stands on the ground
    // fade the beam away as the player arrives, so it does not fill the view (or the projected panorama)
    if (beamMat.current) beamMat.current.opacity = baseOpacity * THREE.MathUtils.smoothstep(d, 18, 70);
  });
  const color = COLORS[state];
  return (
    <group position={[site.x, y, site.z]}>
      <mesh ref={ref} position={[0, 0, 0]}>
        <cylinderGeometry args={[0.35, 0.35, 70, 8, 1, true]} />
        <meshBasicMaterial ref={beamMat} color={color} transparent opacity={baseOpacity} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.35, 0]}>
        <ringGeometry args={[2.2, 2.6, 40]} />
        <meshBasicMaterial color={color} transparent opacity={0.85} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

function Label({ site, hf, state, isTarget }) {
  const player = useGame((g) => g.player);
  const d = Math.hypot(player.x - site.x, player.z - site.z);
  const y = hf.worldY(site.x, site.z) + 4 + Math.min(d / 40, 60);
  return (
    <Html position={[site.x, y, site.z]} center zIndexRange={[5, 0]} style={{ pointerEvents: 'none' }}>
      <div className="whitespace-nowrap text-center" style={{ opacity: state === 'locked' ? 0.5 : 1 }}>
        <div className={`mx-auto mb-1 h-1.5 w-1.5 rotate-45 ${isTarget ? 'bg-ice-300' : 'bg-mars-300'}`} />
        <div className="text-[10px] uppercase tracking-[0.16em] text-mars-50 [text-shadow:0_1px_3px_rgba(0,0,0,0.9)]">{site.name.length > 34 ? site.name.slice(0, 32) + '…' : site.name}</div>
        <div className="font-mono text-[10px] text-mars-100/80 [text-shadow:0_1px_3px_rgba(0,0,0,0.9)]">{d < 1000 ? `${Math.round(d)} m` : `${(d / 1000).toFixed(2)} km`}</div>
      </div>
    </Html>
  );
}

export default function Markers({ hf }) {
  const missionIndex = useGame((g) => g.missionIndex);
  const done = useGame((g) => g.done);
  const showLabels = useGame((g) => g.settings.showLabels);
  // re-evaluate label set only when the player has moved a fair distance
  const cell = useGame((g) => `${Math.round(g.player.x / 60)}:${Math.round(g.player.z / 60)}`);

  const targetSiteId = useMemo(() => {
    const o = nextObjective(MISSIONS[missionIndex], done);
    return o ? WORLD.itemById[o.target].siteId : null;
  }, [missionIndex, done]);

  const labelled = useMemo(() => {
    const p = useGame.getState().player;
    const near = WORLD.sites
      .map((s) => ({ s, d: Math.hypot(s.x - p.x, s.z - p.z) }))
      .filter((e) => e.d < 900)
      .sort((a, b) => a.d - b.d)
      .slice(0, 5)
      .map((e) => e.s.id);
    if (targetSiteId && !near.includes(targetSiteId)) near.push(targetSiteId);
    return near;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cell, targetSiteId]);

  const stateOf = (s) => (s.id === targetSiteId ? 'target' : s.missionIndex > missionIndex ? 'locked' : s.missionIndex === missionIndex ? 'current' : 'past');

  return (
    <group>
      {WORLD.sites.map((s) => <Beacon key={s.id} site={s} hf={hf} state={stateOf(s)} />)}
      {showLabels && labelled.map((id) => {
        const s = WORLD.siteById[id];
        return <Label key={id} site={s} hf={hf} state={stateOf(s)} isTarget={id === targetSiteId} />;
      })}
    </group>
  );
}
