'use client';
import { UNAVAILABLE_LAYERS } from '@/lib/data/registry';
import { useStore } from '@/store/useStore';
import { DatasetLink, EvidenceBadge, Section, Toggle } from '@/components/panels/ui';

const VIRIDIS = 'linear-gradient(90deg,#440154,#3b528b,#21918c,#5ec962,#fde725)';
const SLOPE = 'linear-gradient(90deg,#f5f2e0,#f29e33,#8c0f1f)';

export default function LayerSidebar() {
  const open = useStore((s) => s.sidebarOpen);
  const baseLayer = useStore((s) => s.baseLayer);
  const hirise = useStore((s) => s.hirise);
  const overlays = useStore((s) => s.overlays);
  const overlayOpacity = useStore((s) => s.overlayOpacity);
  const contourInterval = useStore((s) => s.contourInterval);
  const exaggeration = useStore((s) => s.exaggeration);
  const show = useStore((s) => s.show);
  const terrain = useStore((s) => s.terrain);
  const patch = useStore((s) => s.patch);
  const setBaseLayer = useStore((s) => s.setBaseLayer);
  const toggleOverlay = useStore((s) => s.toggleOverlay);
  const toggleShow = useStore((s) => s.toggleShow);
  const setValue = useStore((s) => s.setValue);

  if (!open) return null;
  const hasElevation = terrain.status === 'ready' || !!terrain.roverMeta;
  const meta = terrain.meta;

  return (
    <aside className="panel thin-scroll fade-in pointer-events-auto absolute bottom-32 left-3 top-16 z-30 w-72 overflow-y-auto">
      <Section title="Surface imagery" right={<EvidenceBadge kind="Measured" />}>
        <label className="flex cursor-pointer items-start gap-2 py-1">
          <input
            type="radio"
            name="base"
            className="mt-0.5 accent-[#e8884a]"
            checked={baseLayer === 'ctx'}
            onChange={() => setBaseLayer('ctx')}
          />
          <span className="flex-1">
            <span className="flex items-center gap-2 text-xs text-slate-100">
              CTX greyscale <DatasetLink id="D05" />
            </span>
            <span className="block text-[11px] leading-snug text-slate-500">
              Orbital camera mosaic, about 10 m/px at closest. Shadows are from the original images.
            </span>
          </span>
        </label>
        <label className="flex cursor-pointer items-start gap-2 py-1">
          <input
            type="radio"
            name="base"
            className="mt-0.5 accent-[#e8884a]"
            checked={baseLayer === 'none'}
            onChange={() => setBaseLayer('none')}
          />
          <span className="flex-1">
            <span className="block text-xs text-slate-100">No imagery</span>
            <span className="block text-[11px] leading-snug text-slate-500">Shaded relief from the elevation data only.</span>
          </span>
        </label>
        <div className="mt-1 border-t border-line pt-1">
          <Toggle
            checked={hirise}
            disabled={baseLayer !== 'ctx'}
            onChange={() => setValue('hirise', !hirise)}
            label={
              <span className="flex items-center gap-2">
                HiRISE close-range <DatasetLink id="D06" />
              </span>
            }
            hint="Appears within about 10 km of the surface, inside the rover corridor only. Greyscale, about 0.6 m/px."
          />
        </div>
        {patch && (
          <p className="mt-2 rounded border border-line bg-white/5 px-2 py-1.5 text-[11px] leading-snug text-slate-400">
            Detail window: {patch.sizeKm.toFixed(1)} km · {patch.imagery}
            {patch.zoom ? ` (zoom ${patch.zoom})` : ''}
            {patch.magnified && <span className="text-interpreted"> · shown beyond its resolution</span>}
          </p>
        )}
        <p className="mt-2 text-[11px] leading-snug text-slate-500">
          Natural-colour imagery of the crater does not exist as a verified dataset, so none is offered.
        </p>
      </Section>

      <Section title="Terrain analysis" right={<EvidenceBadge kind="Derived" />}>
        {!hasElevation && (
          <p className="mb-2 rounded border border-interpreted/30 bg-interpreted/10 px-2 py-1.5 text-[11px] leading-snug text-interpreted">
            No elevation data prepared yet. These layers need it — see the README.
          </p>
        )}
        <Toggle
          checked={overlays.hillshade || baseLayer === 'none'}
          disabled={!hasElevation || baseLayer === 'none'}
          onChange={() => toggleOverlay('hillshade')}
          label="Hillshade"
          hint="Computed light from azimuth 315°, altitude 45°."
        />
        <Toggle
          checked={overlays.elevation}
          disabled={!hasElevation}
          onChange={() => toggleOverlay('elevation')}
          label="Elevation"
        />
        {overlays.elevation && meta && (
          <div className="mb-1 ml-5">
            <div className="h-2 rounded-sm" style={{ background: VIRIDIS }} />
            <div className="num mt-0.5 flex justify-between text-[10px] text-slate-400">
              <span>{Math.round(meta.min)} m</span>
              <span>{Math.round(meta.max)} m</span>
            </div>
          </div>
        )}
        <Toggle
          checked={overlays.slope}
          disabled={!hasElevation}
          onChange={() => toggleOverlay('slope')}
          label="Slope"
          hint="Measured over the grid spacing of the elevation data in view, not finer."
        />
        {overlays.slope && (
          <div className="mb-1 ml-5">
            <div className="h-2 rounded-sm" style={{ background: SLOPE }} />
            <div className="num mt-0.5 flex justify-between text-[10px] text-slate-400">
              <span>0°</span>
              <span>15°</span>
              <span>30°+</span>
            </div>
          </div>
        )}
        <Toggle
          checked={overlays.contours}
          disabled={!hasElevation}
          onChange={() => toggleOverlay('contours')}
          label="Contours"
        />
        {overlays.contours && (
          <div className="mb-1 ml-5 flex gap-1">
            {[50, 100, 200, 500].map((v) => (
              <button
                key={v}
                type="button"
                className={`btn num px-2 py-0.5 text-[10px] ${contourInterval === v ? 'btn-accent' : ''}`}
                onClick={() => setValue('contourInterval', v)}
              >
                {v} m
              </button>
            ))}
          </div>
        )}
        <div className="mt-2">
          <div className="flex justify-between text-[11px] text-slate-400">
            <span>Overlay opacity</span>
            <span className="num">{Math.round(overlayOpacity * 100)}%</span>
          </div>
          <input
            type="range"
            min="0.1"
            max="1"
            step="0.05"
            value={overlayOpacity}
            onChange={(e) => setValue('overlayOpacity', parseFloat(e.target.value))}
            className="w-full"
          />
        </div>
        <div className="mt-2">
          <div className="flex justify-between text-[11px] text-slate-400">
            <span>Vertical exaggeration</span>
            <span className={`num ${exaggeration !== 1 ? 'text-interpreted' : ''}`}>{exaggeration.toFixed(1)}×</span>
          </div>
          <input
            type="range"
            min="1"
            max="5"
            step="0.5"
            value={exaggeration}
            disabled={!hasElevation}
            onChange={(e) => setValue('exaggeration', parseFloat(e.target.value))}
            className="w-full"
          />
          <p className="text-[11px] leading-snug text-slate-500">1× is true scale. Readouts always report true elevations.</p>
        </div>
      </Section>

      <Section title="Curiosity rover" right={<EvidenceBadge kind="Derived" />}>
        <Toggle
          checked={show.traverse}
          onChange={() => toggleShow('traverse')}
          label={
            <span className="flex items-center gap-2">
              Traverse path <DatasetLink id="D13" />
            </span>
          }
        />
        <Toggle
          checked={show.waypoints}
          onChange={() => toggleShow('waypoints')}
          label={
            <span className="flex items-center gap-2">
              Drive-end waypoints <DatasetLink id="D12" />
            </span>
          }
          hint="Visible within about 90 km. Click one for its record."
        />
      </Section>

      <Section title="Landmarks" right={<EvidenceBadge kind="Interpreted" />}>
        <Toggle
          checked={show.landmarks}
          onChange={() => toggleShow('landmarks')}
          label={
            <span className="flex items-center gap-2">
              Named features and sites <DatasetLink id="D21" />
            </span>
          }
          hint="IAU names in capitals; mission names are informal."
        />
        <Toggle
          checked={show.drillSites}
          disabled={!show.landmarks}
          onChange={() => toggleShow('drillSites')}
          label="Individual drill sites"
          hint="Shown within about 30 km. Positions come from the rover’s record for the drill sol."
        />
      </Section>

      <Section title="Elevation sources">
        <ul className="space-y-1.5 text-[11px] leading-snug text-slate-400">
          <li>
            Crater-wide:{' '}
            {meta ? (
              <>
                <DatasetLink id={meta.dataset_id} /> at {Math.round(meta.res_m)} m
                {meta.landing_check && Math.abs(meta.landing_check.diff_m) > 50 && (
                  <span className="mt-1 block text-interpreted">
                    Differs from the landing-site elevation by {Math.round(meta.landing_check.diff_m)} m — check the
                    vertical datum (README).
                  </span>
                )}
              </>
            ) : (
              <span className="text-interpreted">not prepared</span>
            )}
          </li>
          <li>
            Rover region:{' '}
            {terrain.roverMeta ? (
              <>
                <DatasetLink id="D01" /> tiles at {terrain.roverMeta.levels.map((l) => `${Math.round(l.res_m)} m`).join(', ')}
              </>
            ) : (
              <span className="text-interpreted">not prepared</span>
            )}
          </li>
          {patch && patch.heightSource && (
            <li>
              Detail window heights: {patch.heightSource}, sampled every {patch.spacingM.toFixed(0)} m
            </li>
          )}
        </ul>
      </Section>

      <Section title="Not yet available">
        <ul className="space-y-2">
          {UNAVAILABLE_LAYERS.map((l) => (
            <li key={l.name} className="opacity-70">
              <div className="flex items-start justify-between gap-2">
                <span className="text-xs text-slate-300">{l.name}</span>
                <EvidenceBadge kind={l.evidence} />
              </div>
              <p className="text-[11px] leading-snug text-slate-500">{l.reason}</p>
            </li>
          ))}
        </ul>
      </Section>
    </aside>
  );
}
