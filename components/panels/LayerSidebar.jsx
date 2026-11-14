'use client';
// Hierarchical layer manager.
//
// Replaces the former flat checkbox list with a real layer tree: four groups
// that expand and collapse, each layer a row with its own icon, visibility
// control and selection state. Legends, opacity and per-layer options are
// revealed only for the selected layer, so the panel stays short.
//
// All visibility still goes through the existing store actions
// (setBaseLayer / toggleOverlay / toggleShow / setValue) — no new state.
import { useState } from 'react';
import { useCrater } from '@/lib/mars/CraterContext';
import { useStore } from '@/store/useStore';
import { DatasetLink, EvidenceBadge } from '@/components/panels/ui';

const VIRIDIS = 'linear-gradient(90deg,#440154,#3b528b,#21918c,#5ec962,#fde725)';
const SLOPE_RAMP = 'linear-gradient(90deg,#f5f2e0,#f29e33,#8c0f1f)';
const GREY_RAMP = 'linear-gradient(135deg,#1a1a1a,#7a7a7a,#d8d8d8)';

function Icon({ name, size = 13 }) {
  const p = {
    width: size,
    height: size,
    viewBox: '0 0 16 16',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.3,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
  };
  switch (name) {
    case 'surface':
      return (
        <svg {...p}>
          <rect x="2" y="2.5" width="12" height="11" rx="1.4" />
          <path d="M2 10.5 L5.5 7.5 L9 10.5 L11.5 8.5 L14 10.5" />
          <circle cx="10.6" cy="5.4" r="1.1" />
        </svg>
      );
    case 'analysis':
      return (
        <svg {...p}>
          <path d="M1.8 13 L6 5.5 L9 10 L11 7 L14.2 13 Z" />
        </svg>
      );
    case 'exploration':
      return (
        <svg {...p}>
          <path d="M3 13.5 C5 9 7 11 8.5 7 C9.6 4 11.5 4.5 13 3" strokeDasharray="2.4 1.8" />
          <circle cx="3" cy="13.5" r="1.3" />
          <circle cx="13" cy="3" r="1.3" />
        </svg>
      );
    case 'geology':
      return (
        <svg {...p}>
          <path d="M2 5 H14 M2 8 H14 M2 11 H14" />
          <path d="M2 2.6 H14" opacity="0.5" />
        </svg>
      );
    case 'hillshade':
      return (
        <svg {...p}>
          <path d="M1.8 12.5 L6 5 L10.2 12.5 Z" />
          <path d="M8.4 9.2 L11 5.6 L14.2 12.5 H10.2" />
        </svg>
      );
    case 'elevation':
      return (
        <svg {...p}>
          <path d="M2 12.5 H14 M3.5 9.5 H12.5 M5 6.5 H11 M6.5 3.5 H9.5" />
        </svg>
      );
    case 'slope':
      return (
        <svg {...p}>
          <path d="M2 13 L13 13 L13 4 Z" />
          <path d="M5.6 13 a4.6 4.6 0 0 0 1.4 -3.2" strokeWidth="1" />
        </svg>
      );
    case 'contours':
      return (
        <svg {...p}>
          <path d="M8 4.6 c3.4 0 5.4 1.5 5.4 3.4 S11.4 11.4 8 11.4 2.6 9.9 2.6 8 4.6 4.6 8 4.6 Z" />
          <path d="M8 6.6 c1.8 0 2.9 .7 2.9 1.4 S9.8 9.4 8 9.4 5.1 8.7 5.1 8 6.2 6.6 8 6.6 Z" />
        </svg>
      );
    case 'raster':
      return (
        <svg {...p}>
          <rect x="2" y="3" width="12" height="10" rx="1.2" />
          <path d="M2 10 L5.5 7 L9 10.3 L11 8.6 L14 11" />
        </svg>
      );
    case 'detail':
      return (
        <svg {...p}>
          <rect x="2" y="3" width="12" height="10" rx="1.2" opacity="0.45" />
          <rect x="6.2" y="6.2" width="6.2" height="5.4" rx="0.8" />
        </svg>
      );
    case 'path':
      return (
        <svg {...p}>
          <path d="M2.5 12.8 C5.5 12.8 4.5 8.5 7.5 8.5 S10 4 13.5 3.6" />
        </svg>
      );
    case 'waypoint':
      return (
        <svg {...p}>
          <circle cx="4" cy="11.6" r="1.5" />
          <circle cx="8" cy="7.6" r="1.5" />
          <circle cx="12" cy="4.4" r="1.5" />
        </svg>
      );
    case 'place':
      return (
        <svg {...p}>
          <path d="M8 14 s4.6-4.3 4.6-7.4A4.6 4.6 0 0 0 3.4 6.6C3.4 9.7 8 14 8 14Z" />
          <circle cx="8" cy="6.5" r="1.5" />
        </svg>
      );
    case 'drill':
      return (
        <svg {...p}>
          <circle cx="8" cy="8" r="4.6" />
          <path d="M8 1.6 V4 M8 12 v2.4 M1.6 8 H4 M12 8 h2.4" />
          <circle cx="8" cy="8" r="1.1" fill="currentColor" stroke="none" />
        </svg>
      );
    case 'eye':
      return (
        <svg {...p} strokeWidth="1.25">
          <path d="M1.3 8 S3.8 3.6 8 3.6 14.7 8 14.7 8 12.2 12.4 8 12.4 1.3 8 1.3 8Z" />
          <circle cx="8" cy="8" r="1.9" />
        </svg>
      );
    case 'eye-off':
      return (
        <svg {...p} strokeWidth="1.25">
          <path d="M3 4.4 S1.3 6.6 1.3 8 3.8 12.4 8 12.4 c1.5 0 2.7-.5 3.7-1.2" />
          <path d="M13.1 10 c1-1 1.6-2 1.6-2 S12.2 3.6 8 3.6 c-.5 0-1 .1-1.5.2" opacity="0.5" />
          <path d="M2.4 2.4 L13.6 13.6" />
        </svg>
      );
    case 'lock':
      return (
        <svg {...p} strokeWidth="1.25">
          <rect x="3.6" y="7" width="8.8" height="6.4" rx="1.1" />
          <path d="M5.8 7V5.2a2.2 2.2 0 0 1 4.4 0V7" />
        </svg>
      );
    default:
      return null;
  }
}

function Chevron({ open }) {
  return (
    <span className="chev" data-open={open ? 'true' : 'false'}>
      <svg width="9" height="9" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
        <path d="M3.5 1.5 L7 5 L3.5 8.5" />
      </svg>
    </span>
  );
}

/** One group header: chevron, icon, name, visible-count and a group eye. */
function Group({ id, icon, title, open, onToggle, visible, total, onToggleAll, children }) {
  return (
    <section className="border-b last:border-b-0" style={{ borderColor: 'var(--g-line-soft)' }}>
      <div className="flex items-center">
        <button
          type="button"
          className="layer-group-head"
          onClick={() => onToggle(id)}
          aria-expanded={open}
          aria-controls={`layer-group-${id}`}
        >
          <Chevron open={open} />
          <span style={{ color: visible > 0 ? 'var(--g-text)' : 'inherit' }}>
            <Icon name={icon} size={14} />
          </span>
          <span className="flex-1 text-left text-[10.5px] font-medium uppercase tracking-[0.15em]">{title}</span>
          {total > 0 && (
            <span className="num text-[9.5px] text-slate-600">
              {visible}/{total}
            </span>
          )}
        </button>
        {onToggleAll && (
          <button
            type="button"
            className="layer-eye tip mr-2.5"
            data-tip={visible > 0 ? `Hide ${title.toLowerCase()}` : `Show ${title.toLowerCase()}`}
            data-on={visible > 0 ? 'true' : 'false'}
            onClick={onToggleAll}
            aria-label={visible > 0 ? `Hide all ${title} layers` : `Show all ${title} layers`}
          >
            <Icon name={visible > 0 ? 'eye' : 'eye-off'} size={14} />
          </button>
        )}
      </div>
      {open && (
        <div id={`layer-group-${id}`} className="pb-1.5">
          {children}
        </div>
      )}
    </section>
  );
}

/**
 * One layer row. `mode` is 'toggle' for independent layers, 'radio' for the
 * mutually exclusive base imagery, and 'unavailable' for datasets that do not
 * exist for the crater being explored — those are shown, never faked.
 */
function Layer({
  id,
  icon,
  swatch,
  name,
  on,
  mode = 'toggle',
  disabled,
  locked,
  lockNote,
  selected,
  onSelect,
  onToggle,
  badge,
}) {
  return (
    <div
      className="layer-row"
      data-selected={selected ? 'true' : 'false'}
      data-on={on ? 'true' : 'false'}
      data-disabled={disabled ? 'true' : 'false'}
    >
      <button
        type="button"
        className="flex min-w-0 flex-1 items-center gap-2 text-left"
        onClick={() => onSelect(id)}
        aria-expanded={selected}
      >
        {swatch ? (
          <span className="layer-swatch" style={{ background: swatch }} aria-hidden="true" />
        ) : (
          <span style={{ color: on ? 'var(--g-data)' : 'var(--g-text-faint)' }} aria-hidden="true">
            <Icon name={icon} />
          </span>
        )}
        <span className="layer-name">{name}</span>
      </button>

      {/* Dataset chips are buttons of their own, so they sit beside the row
          button rather than inside it. */}
      {badge}

      {mode === 'unavailable' ? (
        <span className="layer-eye tip" data-tip={lockNote} aria-label="Not available">
          <Icon name="lock" size={13} />
        </span>
      ) : mode === 'radio' ? (
        <span
          className="flex h-5 w-5 items-center justify-center"
          aria-hidden="true"
          style={{ color: on ? 'var(--g-ok)' : 'var(--g-text-faint)' }}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.3">
            <circle cx="6" cy="6" r="4.4" />
            {on && <circle cx="6" cy="6" r="2" fill="currentColor" stroke="none" />}
          </svg>
        </span>
      ) : (
        <button
          type="button"
          className="layer-eye tip"
          data-tip={locked ? lockNote : on ? 'Hide' : 'Show'}
          data-on={on ? 'true' : 'false'}
          disabled={disabled || locked}
          onClick={(e) => {
            e.stopPropagation();
            onToggle();
          }}
          aria-label={`${on ? 'Hide' : 'Show'} ${name}`}
          aria-pressed={on}
        >
          <Icon name={on ? 'eye' : 'eye-off'} size={14} />
        </button>
      )}
    </div>
  );
}

/** Detail strip under the selected layer: description, legend, options. */
function Detail({ children }) {
  return <div className="layer-detail fade-in">{children}</div>;
}

function Ramp({ gradient, left, right, middle }) {
  return (
    <div className="mt-1.5">
      <div className="h-[7px] rounded-sm" style={{ background: gradient }} />
      <div className="num mt-1 flex justify-between text-[9.5px] text-slate-500">
        <span>{left}</span>
        {middle && <span>{middle}</span>}
        <span>{right}</span>
      </div>
    </div>
  );
}

export default function LayerSidebar() {
  const crater = useCrater();
  const imageryCfg = crater.imagery || {};
  const layers = imageryCfg.layers || {};
  const baseLayerKey = imageryCfg.baseLayerKey || 'ctx';
  const baseTrekLayer = layers[baseLayerKey] || null;
  const overlayKey = imageryCfg.detailOverlayKey || null;
  const overlayTrekLayer = overlayKey ? layers[overlayKey] || null : null;
  const roverName = (crater.rover && crater.rover.name) || 'Rover';
  const roverCfg = crater.rover || null;
  const geologyCfg = crater.geology || {};
  const unavailableLayers = crater.unavailableLayers || [];
  const landmarkSet = crater.landmarks || {};
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

  const [groups, setGroups] = useState({ surface: true, analysis: true, exploration: true, geology: false });
  const [selected, setSelected] = useState(baseLayerKey);

  if (!open) return null;

  const toggleGroup = (id) => setGroups((g) => ({ ...g, [id]: !g[id] }));
  const pick = (id) => setSelected((cur) => (cur === id ? null : id));

  const hasElevation = terrain.status === 'ready' || !!terrain.roverMeta;
  const meta = terrain.meta;
  const noImagery = baseLayer !== baseLayerKey;
  // Without imagery the shaded relief is what you are looking at, so hillshade
  // is forced on — the same rule the previous panel used.
  const hillshadeOn = overlays.hillshade || noImagery;

  const analysisKeys = ['hillshade', 'elevation', 'slope', 'contours'];
  const analysisOn = analysisKeys.filter((k) => overlays[k]).length;
  const setAnalysis = (on) => {
    if (on) {
      // Turning the group back on starts with shaded relief only, which is the
      // layer that reads well underneath everything else.
      if (!overlays.hillshade) toggleOverlay('hillshade');
      return;
    }
    analysisKeys.forEach((k) => {
      if (overlays[k]) toggleOverlay(k);
    });
  };

  const exploreKeys = ['traverse', 'waypoints', 'landmarks', 'drillSites'];
  const exploreOn = exploreKeys.filter((k) => show[k]).length;
  const setExplore = (target) => {
    exploreKeys.forEach((k) => {
      if (show[k] !== target) toggleShow(k);
    });
  };

  const overlaySelected = analysisKeys.includes(selected);

  return (
    <aside className="gale-dock gale-dock-left panel layer-panel fade-in pointer-events-auto overflow-hidden">
      <div className="gale-head">
        <span className="label flex-1">Layers</span>
        <button
          type="button"
          className="gale-icon-btn tip tip-below-right"
          data-tip="Hide panel"
          onClick={() => setValue('sidebarOpen', false)}
          aria-label="Hide the layer panel"
        >
          <svg width="11" height="11" viewBox="0 0 12 12" stroke="currentColor" strokeWidth="1.4">
            <path d="M2 2 L10 10 M10 2 L2 10" />
          </svg>
        </button>
      </div>

      <div className="thin-scroll flex-1 overflow-y-auto">
        {/* ---------------------------------------------------------------- */}
        <Group
          id="surface"
          icon="surface"
          title="Surface"
          open={groups.surface}
          onToggle={toggleGroup}
          visible={(noImagery ? 0 : 1) + (overlayTrekLayer && hirise && !noImagery ? 1 : 0)}
          total={overlayTrekLayer ? 2 : 1}
          onToggleAll={() => {
            if (noImagery) setBaseLayer(baseLayerKey);
            else setBaseLayer('none');
          }}
        >
          {baseTrekLayer && (
            <>
              <Layer
                id={baseLayerKey}
                icon="raster"
                name={imageryCfg.baseName || `${baseTrekLayer.shortLabel || baseTrekLayer.label} imagery`}
                mode="radio"
                on={baseLayer === baseLayerKey}
                selected={selected === baseLayerKey}
                onSelect={(id) => {
                  setBaseLayer(baseLayerKey);
                  pick(id);
                }}
                badge={<DatasetLink id={baseTrekLayer.datasetId} />}
              />
              {selected === baseLayerKey && (
                <Detail>
                  <p className="note">{imageryCfg.baseDescription}</p>
                  <Ramp gradient={GREY_RAMP} left="dark" right="bright" />
                </Detail>
              )}
            </>
          )}

          <Layer
            id="none"
            icon="hillshade"
            name="No imagery"
            mode="radio"
            on={noImagery}
            selected={selected === 'none'}
            onSelect={(id) => {
              setBaseLayer('none');
              pick(id);
            }}
          />
          {selected === 'none' && (
            <Detail>
              <p className="note">Hides the photograph and shows shaded relief built from the elevation data, which makes landforms easier to read.</p>
            </Detail>
          )}

          {overlayTrekLayer && (
            <Layer
              id="hirise"
              icon="detail"
              name={imageryCfg.detailOverlayName || `${overlayTrekLayer.shortLabel || overlayTrekLayer.label} detail`}
              on={hirise && !noImagery}
              disabled={noImagery}
              selected={selected === 'hirise'}
              onSelect={pick}
              onToggle={() => setValue('hirise', !hirise)}
              badge={<DatasetLink id={overlayTrekLayer.datasetId} />}
            />
          )}
          {overlayTrekLayer && selected === 'hirise' && (
            <Detail>
              <p className="note">{imageryCfg.detailOverlayDescription}</p>
              {patch && (
                <p className="note mt-1.5 rounded border border-line px-2 py-1.5">
                  <span className="num text-slate-300">{patch.sizeKm.toFixed(1)} km</span> window · {patch.imagery}
                  {patch.zoom ? ` (zoom ${patch.zoom})` : ''}
                  {patch.magnified && <span className="text-interpreted"> · shown beyond its resolution</span>}
                </p>
              )}
            </Detail>
          )}
        </Group>

        {/* ---------------------------------------------------------------- */}
        <Group
          id="analysis"
          icon="analysis"
          title="Terrain analysis"
          open={groups.analysis}
          onToggle={toggleGroup}
          visible={analysisOn}
          total={4}
          onToggleAll={() => setAnalysis(analysisOn === 0)}
        >
          {!hasElevation && (
            <p className="mx-2.5 mb-1.5 rounded border border-interpreted/30 bg-interpreted/10 px-2 py-1.5 text-[10.5px] leading-snug text-interpreted">
              No elevation data prepared — these layers need it.
            </p>
          )}

          <Layer
            id="hillshade"
            icon="hillshade"
            name="Hillshade"
            on={hillshadeOn}
            disabled={!hasElevation}
            locked={noImagery}
            lockNote="Always on while imagery is off"
            selected={selected === 'hillshade'}
            onSelect={pick}
            onToggle={() => toggleOverlay('hillshade')}
          />
          {selected === 'hillshade' && (
            <Detail>
              <p className="note">Simulated sunlight over the elevation model. Slopes facing the light look bright, slopes facing away look dark.</p>
            </Detail>
          )}

          <Layer
            id="elevation"
            swatch={VIRIDIS}
            name="Elevation"
            on={overlays.elevation}
            disabled={!hasElevation}
            selected={selected === 'elevation'}
            onSelect={pick}
            onToggle={() => toggleOverlay('elevation')}
          />
          {selected === 'elevation' && (
            <Detail>
              <p className="note">Height above the Mars datum, coloured low to high.</p>
              {meta ? (
                <Ramp gradient={VIRIDIS} left={`${Math.round(meta.min)} m`} right={`${Math.round(meta.max)} m`} />
              ) : (
                <p className="note mt-1 text-interpreted">Range unknown until the elevation model loads.</p>
              )}
            </Detail>
          )}

          <Layer
            id="slope"
            swatch={SLOPE_RAMP}
            name="Slope"
            on={overlays.slope}
            disabled={!hasElevation}
            selected={selected === 'slope'}
            onSelect={pick}
            onToggle={() => toggleOverlay('slope')}
          />
          {selected === 'slope' && (
            <Detail>
              <p className="note">How steep the ground is, computed from neighbouring elevation samples. Steep ground is hard for a rover and for a person on foot.</p>
              <Ramp gradient={SLOPE_RAMP} left="0°" middle="15°" right="30°+" />
            </Detail>
          )}

          <Layer
            id="contours"
            icon="contours"
            name="Contours"
            on={overlays.contours}
            disabled={!hasElevation}
            selected={selected === 'contours'}
            onSelect={pick}
            onToggle={() => toggleOverlay('contours')}
          />
          {selected === 'contours' && (
            <Detail>
              <p className="note">Lines joining points of equal height. Lines close together mean steep ground.</p>
              <div className="mt-1.5 flex gap-1">
                {[50, 100, 200, 500].map((v) => (
                  <button
                    key={v}
                    type="button"
                    className={`btn num flex-1 px-0 py-1 text-[10px] ${contourInterval === v ? 'btn-accent' : ''}`}
                    onClick={() => setValue('contourInterval', v)}
                  >
                    {v} m
                  </button>
                ))}
              </div>
            </Detail>
          )}

          {/* One opacity control, for the selected analysis layer only. */}
          {overlaySelected && (
            <div className="layer-detail">
              <div className="flex items-center justify-between">
                <span className="note">Opacity</span>
                <span className="num text-[10px] text-slate-300">{Math.round(overlayOpacity * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="1"
                step="0.05"
                value={overlayOpacity}
                onChange={(e) => setValue('overlayOpacity', parseFloat(e.target.value))}
                aria-label="Analysis layer opacity"
              />
            </div>
          )}
        </Group>

        {/* ---------------------------------------------------------------- */}
        <Group
          id="exploration"
          icon="exploration"
          title="Exploration"
          open={groups.exploration}
          onToggle={toggleGroup}
          visible={exploreOn}
          total={4}
          onToggleAll={() => setExplore(exploreOn === 0)}
        >
          <Layer
            id="traverse"
            icon="path"
            name={`${roverName} traverse`}
            on={show.traverse}
            selected={selected === 'traverse'}
            onSelect={pick}
            onToggle={() => toggleShow('traverse')}
            badge={<DatasetLink id={(roverCfg && roverCfg.traverseDatasetId) || 'D13'} />}
          />
          {selected === 'traverse' && (
            <Detail>
              <p className="note">
                The path the rover has actually driven {(roverCfg && roverCfg.landedText) || 'since landing'}, from
                NASA&rsquo;s published track.
              </p>
            </Detail>
          )}

          <Layer
            id="waypoints"
            icon="waypoint"
            name="Drive waypoints"
            on={show.waypoints}
            selected={selected === 'waypoints'}
            onSelect={pick}
            onToggle={() => toggleShow('waypoints')}
            badge={<DatasetLink id={(roverCfg && roverCfg.waypointDatasetId) || 'D12'} />}
          />
          {selected === 'waypoints' && (
            <Detail>
              <p className="note">Where the rover stopped at the end of each drive. Visible within about 90 km — click one to inspect that sol.</p>
            </Detail>
          )}

          <Layer
            id="landmarks"
            icon="place"
            name="Named places"
            on={show.landmarks}
            selected={selected === 'landmarks'}
            onSelect={pick}
            onToggle={() => toggleShow('landmarks')}
            badge={<DatasetLink id={landmarkSet.nameDatasetId || 'D21'} />}
          />
          {selected === 'landmarks' && (
            <Detail>
              <p className="note">Official IAU names are shown in capitals; informal mission names (given by the science team) are in mixed case.</p>
            </Detail>
          )}

          <Layer
            id="drillSites"
            icon="drill"
            name={landmarkSet.detailLayerName || 'Drill sites'}
            on={show.drillSites && show.landmarks}
            disabled={!show.landmarks}
            selected={selected === 'drillSites'}
            onSelect={pick}
            onToggle={() => toggleShow('drillSites')}
          />
          {selected === 'drillSites' && (
            <Detail>
              <p className="note">{landmarkSet.detailLayerDescription || `Individual holes ${roverName} drilled for sample analysis. Shown within about 30 km, positioned from the rover record for the drill sol.`}</p>
            </Detail>
          )}
        </Group>

        {/* ---------------------------------------------------------------- */}
        <Group
          id="geology"
          icon="geology"
          title="Geology"
          open={groups.geology}
          onToggle={toggleGroup}
          visible={0}
          total={0}
        >
          <Layer
            id="units"
            icon="geology"
            name="Rock unit polygons"
            mode="unavailable"
            on={false}
            lockNote={geologyCfg.polygonsLockNote}
            selected={selected === 'units'}
            onSelect={pick}
            badge={<EvidenceBadge kind="Interpreted" />}
          />
          {selected === 'units' && (
            <Detail>
              <p className="note">{geologyCfg.polygonsNote}</p>
            </Detail>
          )}
        </Group>
      </div>

      {/* Terrain display control + provenance, docked at the bottom. */}
      <div className="shrink-0 border-t px-2.5 py-2" style={{ borderColor: 'var(--g-line)' }}>
        <div className="flex items-center justify-between">
          <span className="note">Vertical exaggeration</span>
          <span className={`num text-[10px] ${exaggeration !== 1 ? 'text-interpreted' : 'text-slate-300'}`}>
            {exaggeration.toFixed(1)}×
          </span>
        </div>
        <input
          type="range"
          min="1"
          max="5"
          step="0.5"
          value={exaggeration}
          disabled={!hasElevation}
          onChange={(e) => setValue('exaggeration', parseFloat(e.target.value))}
          aria-label="Vertical exaggeration"
        />

        <details className="science-details mt-1.5">
          <summary>Data sources</summary>
          <ul className="space-y-1.5 note">
            <li>
              Crater-wide elevation:{' '}
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
                  <DatasetLink id={terrain.roverMeta.dataset_id || 'D01'} /> tiles at{' '}
                  {terrain.roverMeta.levels.map((l) => `${Math.round(l.res_m)} m`).join(', ')}
                </>
              ) : (
                <span className="text-interpreted">not prepared</span>
              )}
            </li>
            {patch && patch.heightSource && (
              <li>
                Detail heights: {patch.heightSource}, every {patch.spacingM.toFixed(0)} m
              </li>
            )}
            <li>1× is true scale. Readouts always report true elevations.</li>
          </ul>
        </details>

        <details className="science-details mt-1.5">
          <summary>Not available ({unavailableLayers.length})</summary>
          <ul className="space-y-2">
            {unavailableLayers.map((l) => (
              <li key={l.name}>
                <div className="flex items-start justify-between gap-2">
                  <span className="text-[11px] leading-snug text-slate-300">{l.name}</span>
                  <EvidenceBadge kind={l.evidence} />
                </div>
                <p className="note">{l.reason}</p>
              </li>
            ))}
          </ul>
        </details>
      </div>
    </aside>
  );
}
