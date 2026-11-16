'use client';
import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useGame } from '@/lib/store';
import { touchInput, resetTouchInput } from '@/lib/mobile/touchInput';
import { WORLD } from '@/lib/scientific-data';
import { worldToGeo } from '@/lib/coordinates/projection-jezero';
import { EYE_HEIGHT_M, WALK_SPEED, RUN_SPEED, JUMP_SPEED, MARS_GRAVITY, MAX_WALKABLE_SLOPE_DEG, INTERACT_RADIUS_M } from '@/lib/mars/constants-jezero';

const D2R = Math.PI / 180;

/** First-person controller: click-drag look (no pointer lock), WASD movement, terrain following and slope limits. */
export default function Player({ hf }) {
  const { camera, gl } = useThree();
  const keys = useRef({});
  const st = useRef({ x: 0, z: 300, y: 0, vy: 0, grounded: true, yaw: 0, pitch: -0.03, tick: 0, saveTick: 0, blocked: null, blockedUntil: 0, speed: 0 });

  // spawn
  useEffect(() => {
    const s = st.current;
    const spawn = useGame.getState().spawn;
    if (spawn && hf.inBounds(spawn.x, spawn.z, 300)) { s.x = spawn.x; s.z = spawn.z; }
    s.y = hf.worldY(s.x, s.z) + EYE_HEIGHT_M;
    camera.rotation.order = 'YXZ';
    camera.position.set(s.x, s.y, s.z);
    camera.rotation.set(s.pitch, s.yaw, 0);
  }, [camera, hf]);

  // field of view from settings
  const fov = useGame((g) => g.settings.fov);
  useEffect(() => { camera.fov = fov; camera.updateProjectionMatrix(); }, [camera, fov]);

  useEffect(() => {
    const canvas = gl.domElement;
    const game = useGame;

    let drag = null;
    function interact() {
      const g = game.getState();
      if (g.nearbySiteId && !g.overlayOpen() && !g.paused) g.openSite(g.nearbySiteId);
    }
    function onPointerDown(e) {
      if (e.button !== 0 || game.getState().overlayOpen() || game.getState().paused) return;
      drag = { x: e.clientX, y: e.clientY, yaw: st.current.yaw, pitch: st.current.pitch, moved: false };
      canvas.setPointerCapture(e.pointerId);
    }
    function onPointerMove(e) {
      if (!drag) return;
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      if (Math.abs(dx) + Math.abs(dy) > 3) drag.moved = true;
      if (!drag.moved) return;
      const k = 0.0032 * game.getState().settings.sensitivity;
      st.current.yaw = drag.yaw + dx * k;
      st.current.pitch = Math.max(-1.5, Math.min(1.5, drag.pitch + dy * k));
    }
    function onPointerUp() { if (drag && !drag.moved) interact(); drag = null; }
    function onKeyDown(e) {
      const tag = e.target && e.target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      const g = game.getState();
      keys.current[e.code] = true;
      if (e.code === 'KeyM' && !e.repeat) {
        if (g.mapOpen) g.closeMap(); else if (!g.activePanoramaId && !g.paused) g.openMap();
      } else if (e.code === 'KeyE' && !e.repeat) {
        interact();
      } else if (e.code === 'Escape') {
        if (g.activePanoramaId) g.closePanorama();
        else if (g.mapOpen) g.closeMap();
        else if (g.activeSiteId) g.closeSite();
        else if (g.noticeOpen) g.closeNotice();
        else if (g.settingsOpen && !g.paused) g.closeSettings();
      } else if (e.code === 'Space') {
        e.preventDefault();
        const s = st.current;
        if (s.grounded && !g.paused && !g.overlayOpen()) { s.vy = JUMP_SPEED; s.grounded = false; }
      }
    }
    function onKeyUp(e) { keys.current[e.code] = false; }
    function onBlur() { keys.current = {}; resetTouchInput(); }

    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerup', onPointerUp);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    // release the pointer whenever an overlay opens
    const unsub = game.subscribe((g) => {
      const open = g.overlayOpen() || g.paused;
      if (open && document.pointerLockElement === canvas) document.exitPointerLock();
      if (open) { keys.current = {}; resetTouchInput(); }
    });
    return () => {
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
      unsub();
      
    };
  }, [gl]);

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.1);
    const s = st.current;
    const g = useGame.getState();
    const now = performance.now();

    if (g.teleportTarget) {
      const t = hf.clamp(g.teleportTarget.x, g.teleportTarget.z);
      s.x = t.x; s.z = t.z; s.vy = 0; s.grounded = true;
      s.y = hf.worldY(s.x, s.z) + EYE_HEIGHT_M;
      if (g.teleportTarget.heading != null) s.yaw = -g.teleportTarget.heading * D2R;
      g.clearTeleport();
    }

    const frozen = g.paused || g.overlayOpen();
    let moved = 0;
    if (!frozen) {
      const k = keys.current;
      // Keyboard and the on-screen stick feed the same pair. The stick is
      // analog, so the pair is clamped to the unit disc rather than
      // normalised: for keys the two are identical (a single key is already
      // length 1, a diagonal 1.41 is scaled to 1 either way), and a half
      // push of the stick stays a half-speed walk.
      let f = (k.KeyW || k.ArrowUp ? 1 : 0) - (k.KeyS || k.ArrowDown ? 1 : 0) + touchInput.forward;
      let r = (k.KeyD || k.ArrowRight ? 1 : 0) - (k.KeyA || k.ArrowLeft ? 1 : 0) + touchInput.right;
      if (f || r) {
        const len = Math.hypot(f, r);
        if (len > 1) { f /= len; r /= len; }
        const running = k.ShiftLeft || k.ShiftRight || touchInput.run;
        const speed = (running ? RUN_SPEED : WALK_SPEED) * g.settings.pace;
        const sin = Math.sin(s.yaw), cos = Math.cos(s.yaw);
        // camera forward = (-sin, -cos), right = (cos, -sin) in (x, z)
        const dx = (-sin * f + cos * r) * speed * dt;
        const dz = (-cos * f - sin * r) * speed * dt;
        const tryMove = (mx, mz) => {
          if (!mx && !mz) return false;
          const nx = s.x + mx, nz = s.z + mz;
          if (!hf.inBounds(nx, nz, 200)) { s.blocked = 'Edge of the mapped terrain'; s.blockedUntil = now + 1200; return false; }
          // slope check only applies on the ground; uses the terrain model's own gradient
          const grade = hf.gradeAlong(nx, nz, mx, mz);
          if (s.grounded && Math.abs(grade) > MAX_WALKABLE_SLOPE_DEG) {
            s.blocked = grade > 0 ? `Too steep to climb (${grade.toFixed(0)}°)` : `Drop too steep (${Math.abs(grade).toFixed(0)}°)`;
            s.blockedUntil = now + 1200;
            return false;
          }
          s.x = nx; s.z = nz; moved = Math.hypot(mx, mz);
          return true;
        };
        // full move, otherwise slide along one axis (contouring around steep ground)
        if (!tryMove(dx, dz)) { if (!tryMove(dx, 0)) tryMove(0, dz); }
      }
    }
    s.speed = moved / Math.max(dt, 1e-4);

    const ground = hf.worldY(s.x, s.z) + EYE_HEIGHT_M;
    if (!s.grounded) {
      s.vy -= MARS_GRAVITY * dt;
      s.y += s.vy * dt;
      if (s.y <= ground) { s.y = ground; s.vy = 0; s.grounded = true; }
    } else {
      s.y = ground; // never below the surface
    }

    camera.position.set(s.x, s.y, s.z);
    camera.rotation.set(s.pitch, s.yaw, 0);

    // publish to the HUD / minimap a few times per second
    if (now - s.tick > 140) {
      s.tick = now;
      const geo = worldToGeo(s.x, s.z);
      const near = nearest(s.x, s.z);
      const heading = ((-s.yaw / D2R) % 360 + 360) % 360;
      g.setPlayer(
        { x: s.x, z: s.z, lat: geo.lat, lon: geo.lon, elev: hf.elevation(s.x, s.z), slope: hf.slopeDeg(s.x, s.z), heading, speed: s.speed },
        near && near.d <= INTERACT_RADIUS_M ? near.id : null,
        near ? near.d : null,
        now < s.blockedUntil ? s.blocked : null
      );
      if (now - s.saveTick > 5000) { s.saveTick = now; g.save(); }
    }
  });

  return null;
}

function nearest(x, z) {
  let best = null, bd = Infinity;
  for (const site of WORLD.sites) {
    const d = Math.hypot(site.x - x, site.z - z);
    if (d < bd) { bd = d; best = site; }
  }
  return best ? { id: best.id, d: bd } : null;
}
