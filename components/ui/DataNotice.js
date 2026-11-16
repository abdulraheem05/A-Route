'use client';
import { X } from 'lucide-react';
import { useGame } from '@/lib/store';
import { WORLD, PANORAMAS } from '@/lib/scientific-data';

/** Plain statement of what in this build is measured, estimated or missing. */
export default function DataNotice({ hf }) {
  const close = useGame((g) => g.closeNotice);
  const m = hf.meta;
  const conf = (c) => WORLD.sites.filter((s) => s.confidence === c).length;
  return (
    <div className="absolute inset-0 z-[37] flex items-center justify-center bg-coal-950/70 backdrop-blur-sm fade-in">
      <div className="panel thin-scroll max-h-[88dvh] w-[min(640px,92vw)] overflow-y-auto px-5 py-5 sm:px-6">
        <header className="mb-3 flex items-center justify-between">
          <div>
            <div className="text-[10px] uppercase tracking-hud text-amber-200">Data notes</div>
            <div className="text-base font-light leading-snug sm:text-xl">What is measured and what is estimated</div>
          </div>
          <button type="button" className="icon-btn m-hit" aria-label="Close" onClick={close}><X size={15} /></button>
        </header>

        <section className="mb-4 text-[13px] leading-relaxed text-mars-100/90">
          <h3 className="hud-label mb-1">Terrain</h3>
          {m.calibrated ? (
            <p>Elevations come from a numerical DEM ({m.source}), {m.metresPerPixel} m per grid cell.</p>
          ) : (
            <>
              <p className="mb-2">
                The supplied DEM file is a colour-shaded JPG preview, not an elevation raster. {m.method} Against rover waypoint elevations the estimate is within about {m.residuals.floorFanRmsM} m (RMS) on the crater floor and delta, and about {m.residuals.rimRmsM} m on the rim.
              </p>
              <ul className="list-disc space-y-1 pl-5 text-[12px] text-mars-100/80">{m.limitations.map((l) => <li key={l}>{l}</li>)}</ul>
              <p className="mt-2 text-[12px]">To fix this, download <span className="font-mono text-[11px]">{m.replaceWith.split(' ')[0]}</span> from USGS Astrogeology and run <span className="font-mono text-[11px]">npm run prepare:terrain</span> (see README).</p>
            </>
          )}
          <p className="mt-2 text-[12px] text-mars-100/70">Fine ground texture, rocks and stones are procedural dressing styled on each campaign\u2019s panoramas: illustrative, not mapped. They are not in the height data and have no collision.</p>
        </section>

        <section className="mb-4 text-[13px] leading-relaxed text-mars-100/90">
          <h3 className="hud-label mb-1">Rover traverse</h3>
          <p>{WORLD.track.length} official NASA waypoints, sols {WORLD.track[0].sol}–{WORLD.track[WORLD.track.length - 1].sol}. {WORLD.traverseMeta.note}</p>
        </section>

        <section className="text-[13px] leading-relaxed text-mars-100/90">
          <h3 className="hud-label mb-1">Stations and panoramas</h3>
          <p>
            Each station is placed at the rover&apos;s waypoint for the sol the panorama or sample was taken. Of {WORLD.sites.length} stations, {conf('high')} are within 30 m, {conf('approximate')} within 300 m and {conf('coarse')} are coarser. {WORLD.unplaced.length} of the {PANORAMAS.length} supplied images have no known sol and are not placed.
          </p>
          <p className="mt-2 text-[12px] text-mars-100/70">Panoramas are cylindrical mosaics shown on a band of a sphere. Their vertical scale and horizon height are estimated, and their headings are not aligned to map north.</p>
        </section>
      </div>
    </div>
  );
}
