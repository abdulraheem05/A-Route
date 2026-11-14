'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { X, Info } from 'lucide-react';
import { useGame } from '@/lib/store';
import { WORLD, MISSIONS, PANORAMA_BY_ID } from '@/lib/scientific-data';
import { bandForPanorama, describePanorama, projectionSummary, projectionVerified } from '@/lib/panoramas';
import AskAI from '@/components/ai/AskAI';

/** The image mapped on the inside of a sphere band sized from the catalogue's angular extent. */
function PanoBand({ pano, span, look, onLoaded, onError }) {
  const { camera, gl } = useThree();
  const [texture, setTexture] = useState(null);
  const band = useMemo(() => bandForPanorama(pano, span), [pano, span]);
  const geometry = useMemo(() => {
    const g = new THREE.SphereGeometry(50, Math.max(48, Math.round(band.spanDeg / 2.5)), 48, band.phiStart, band.phiLength, band.thetaStart, band.thetaLength);
    g.scale(-1, 1, 1); // view from inside without mirroring the image
    return g;
  }, [band]);
  useEffect(() => () => geometry.dispose(), [geometry]);

  // load on demand, free GPU memory on exit
  useEffect(() => {
    let tex = null, cancelled = false;
    new THREE.TextureLoader().load(
      pano.file,
      (t) => {
        if (cancelled) { t.dispose(); return; }
        t.colorSpace = THREE.SRGBColorSpace;
        t.anisotropy = Math.min(8, gl.capabilities.getMaxAnisotropy());
        t.minFilter = THREE.LinearMipmapLinearFilter;
        t.generateMipmaps = true;
        tex = t; setTexture(t); onLoaded();
      },
      undefined,
      () => { if (!cancelled) onError(); }
    );
    return () => { cancelled = true; if (tex) tex.dispose(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pano.file, gl]);

  // start centred on the image, looking slightly below the horizon
  useEffect(() => {
    look.current.yaw = band.centreYaw;
    look.current.pitch = THREE.MathUtils.degToRad(Math.max(band.elBottomDeg + 20, Math.min(-4, band.elTopDeg - 20)));
  }, [band, look]);

  useFrame(() => {
    camera.rotation.order = 'YXZ';
    camera.rotation.set(look.current.pitch, look.current.yaw, 0);
    if (camera.fov !== look.current.fov) { camera.fov = look.current.fov; camera.updateProjectionMatrix(); }
  });

  if (!texture) return null;
  return (
    <mesh geometry={geometry}>
      <meshBasicMaterial map={texture} toneMapped={false} />
    </mesh>
  );
}

export default function PanoramaViewer() {
  const id = useGame((g) => g.activePanoramaId);
  const pano = PANORAMA_BY_ID[id];
  const item = WORLD.itemById[id];
  const site = item ? WORLD.siteById[item.siteId] : null;
  const mission = item ? MISSIONS[item.missionIndex] : null;
  const look = useRef({ yaw: 0, pitch: 0, fov: 70 });
  const drag = useRef(null);
  const [status, setStatus] = useState('loading');
  const [showInfo, setShowInfo] = useState(false);
  const [span, setSpan] = useState(pano && pano.projection ? pano.projection.azimuthSpanDeg : 360);
  const [closing, setClosing] = useState(false);
  const flat = pano.type === 'vertical-projection';
  const verified = projectionVerified(pano);

  function close() {
    setClosing(true);
    setTimeout(() => useGame.getState().closePanorama(), 350);
  }
  // Escape is handled globally in Player.js (it calls closePanorama).

  function onPointerDown(e) {
    drag.current = { x: e.clientX, y: e.clientY, yaw: look.current.yaw, pitch: look.current.pitch };
    e.currentTarget.setPointerCapture(e.pointerId);
  }
  function onPointerMove(e) {
    const d = drag.current;
    if (!d) return;
    const k = (look.current.fov / 70) * 0.0032;
    look.current.yaw = d.yaw + (e.clientX - d.x) * k;
    look.current.pitch = Math.max(-1.55, Math.min(1.55, d.pitch + (e.clientY - d.y) * k));
  }
  function onWheel(e) {
    look.current.fov = Math.max(18, Math.min(95, look.current.fov + e.deltaY * 0.03));
  }

  return (
    <div className={`absolute inset-0 z-40 bg-black transition-opacity duration-300 ${closing ? 'opacity-0' : 'fade-in'}`}>
      {flat ? (
        <div className="flex h-full w-full items-center justify-center p-10">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={pano.file} alt={pano.name} className="max-h-full max-w-full object-contain" onLoad={() => setStatus('ready')} onError={() => setStatus('error')} />
        </div>
      ) : (
        <div className="h-full w-full cursor-grab touch-none active:cursor-grabbing" onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={() => (drag.current = null)} onWheel={onWheel}>
          <Canvas flat camera={{ fov: 70, near: 0.1, far: 200, position: [0, 0, 0] }} dpr={[1, 2]}>
            <color attach="background" args={['#0a0807']} />
            <PanoBand pano={pano} span={span} look={look} onLoaded={() => setStatus('ready')} onError={() => setStatus('error')} />
          </Canvas>
        </div>
      )}

      {status === 'loading' && <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-xs uppercase tracking-hud text-mars-200/70">Loading panorama…</div>}
      {status === 'error' && <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-red-200">Could not load {pano.file}</div>}

      <div className="pointer-events-none absolute left-6 top-5 [text-shadow:0_1px_4px_rgba(0,0,0,0.9)]">
        <div className="text-[10px] uppercase tracking-hud text-mars-300">{flat ? 'Image' : 'Panorama'} · Mastcam-Z</div>
        <div className="text-xl font-light text-mars-50">{pano.name}</div>
        <div className="font-mono text-[11px] text-mars-100/70">
          {pano.sols ? `sols ${pano.sols[0]}${pano.sols[1] !== pano.sols[0] ? '–' + pano.sols[1] : ''}` : 'sol unknown'}
          {site ? ` · ${site.lat.toFixed(5)}° N ${site.lon.toFixed(5)}° E` : ' · position unresolved'}
        </div>
      </div>

      <div className="absolute right-6 top-5 flex gap-2">
        <button type="button" className="icon-btn h-10 w-10" aria-label="Toggle information" onClick={() => setShowInfo((v) => !v)}><Info size={16} /></button>
        <button type="button" className="icon-btn h-10 w-10" aria-label="Exit panorama" onClick={close}><X size={18} /></button>
      </div>

      {showInfo && (
        <div className="panel absolute bottom-6 left-6 w-[360px] p-4 rise-in">
          <p className="text-[12px] leading-relaxed text-mars-100/90">{describePanorama(pano, site, mission)}</p>
          {mission && <p className="mt-1.5 text-[12px] leading-relaxed text-mars-100/75">{mission.scientificContext}</p>}
          {site && site.hasObject && (
            <p className="mt-1.5 text-[11px] text-mars-200/70">Features recorded here: {site.items.filter((i) => i.kind === 'object').map((i) => i.name).join('; ')}.</p>
          )}
          <p className="mt-2 text-[10px] leading-snug text-mars-200/60">{projectionSummary(pano)}{pano.note ? ' ' + pano.note : ''}</p>
          {!flat && !verified && (
            <label className="mt-2 flex items-center gap-2 text-[10px] uppercase tracking-[0.14em] text-mars-200/70">
              Wrap {span}°
              <input type="range" min="60" max="360" step="10" value={span} onChange={(e) => setSpan(+e.target.value)} className="flex-1 accent-mars-400" />
            </label>
          )}
          <div className="mt-3 border-t border-mars-200/10 pt-3">
            <AskAI extra={{ panoramaId: pano.id, siteId: site ? site.id : null }} placeholder="Ask about this view…" />
          </div>
          <div className="mt-2 text-[10px] text-mars-200/50">{pano.source} · drag to look, scroll to zoom, Esc to return</div>
        </div>
      )}
    </div>
  );
}
