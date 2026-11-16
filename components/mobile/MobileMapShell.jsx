'use client';
// The mobile map interface.
//
// The terrain viewport keeps the whole screen; everything else is either a
// slim bar at an edge or a bottom sheet that is only mounted while it is
// open. Nothing here owns map state: the sheets are driven by the same
// `sidebarOpen`, `infoOpen` and `infoTab` flags the desktop panels use, so
// the top bar's own buttons, `startPicking` and every other existing action
// drive this interface without knowing it exists.
//
// The panels inside the sheets are the desktop components themselves —
// LayerSidebar, InfoPanel, Readout and SolTimeline — so every layer, control,
// value and dataset link is present and behaves identically. Only their
// framing changes.
//
// Layout contract, so nothing can ever overlap at any supported size:
//   top         header (44px + safe area), then the MAP/PLAY row
//   right edge  floating terrain controls, anchored below those two rows
//   bottom      compact status panel, then the panel tab bar
// The floating controls are hidden while a sheet is open, because the sheet's
// backdrop covers them and would take their taps anyway.
import { useEffect, useState } from 'react';
import { useStore } from '@/store/useStore';
import TopBar from '@/components/panels/TopBar';
import StatusBanner from '@/components/panels/StatusBanner';
import LayerSidebar from '@/components/panels/LayerSidebar';
import InfoPanel from '@/components/panels/InfoPanel';
import DatasetInfo from '@/components/panels/DatasetInfo';
import RouteLegend from '@/components/panels/RouteLegend';
import Readout from '@/components/controls/Readout';
import SolTimeline from '@/components/controls/SolTimeline';
import BottomSheet from './BottomSheet';
import MapToolbar from './MapToolbar';
import MapStatusPanel from './MapStatusPanel';

/**
 * The vertical space a sheet may not use: the header and the MAP/PLAY row
 * above it (92px), plus the tab bar it now sits on top of (54px). Passed to
 * BottomSheet, which caps its snap points at the screen height minus this.
 */
const SHEET_CLEARANCE = 92 + 54;

const TABS = [
  { id: 'layers', label: 'Layers' },
  { id: 'selection', label: 'Inspect' },
  { id: 'plan', label: 'Plan' },
  { id: 'weather', label: 'Weather' },
  { id: 'units', label: 'Geology' },
];

function TabIcon({ name }) {
  const p = {
    width: 17,
    height: 17,
    viewBox: '0 0 16 16',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.35,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
  };
  switch (name) {
    case 'layers':
      return (
        <svg {...p}>
          <path d="M8 1.8 L14.2 5 L8 8.2 L1.8 5 Z M1.8 8 L8 11.2 L14.2 8 M1.8 11 L8 14.2 L14.2 11" />
        </svg>
      );
    case 'selection':
      return (
        <svg {...p}>
          <circle cx="8" cy="8" r="5.4" />
          <path d="M8 2.6 V5 M8 11 v2.4 M2.6 8 H5 M11 8 h2.4" />
        </svg>
      );
    case 'plan':
      return (
        <svg {...p}>
          <path d="M2 12 L12 2 L14 4 L4 14 Z M5 9 l1.2 1.2 M7 7 l1.2 1.2 M9 5 l1.2 1.2" />
        </svg>
      );
    case 'weather':
      return (
        <svg {...p}>
          <path d="M4.5 10.5 a2.6 2.6 0 0 1 0-5.2 a3.4 3.4 0 0 1 6.5 0.6 a2.3 2.3 0 0 1-0.4 4.6 Z" />
        </svg>
      );
    case 'units':
      return (
        <svg {...p}>
          <path d="M8 2.2 L13.6 5.6 L13.6 10.4 L8 13.8 L2.4 10.4 L2.4 5.6 Z M2.4 5.6 L8 9 L13.6 5.6 M8 9 V13.8" />
        </svg>
      );
    default:
      return null;
  }
}

export default function MobileMapShell() {
  const sidebarOpen = useStore((s) => s.sidebarOpen);
  const infoOpen = useStore((s) => s.infoOpen);
  const infoTab = useStore((s) => s.infoTab);
  const picking = useStore((s) => s.plan.picking);
  const setValue = useStore((s) => s.setValue);
  const stopPicking = useStore((s) => s.stopPicking);
  const [statusOpen, setStatusOpen] = useState(false);

  // The terrain is the interface on a phone, so both docks start closed. On
  // desktop these keep their original `true` defaults — this shell is the
  // only thing that changes them, and it only exists below 1024px.
  useEffect(() => {
    const s = useStore.getState();
    s.setValue('sidebarOpen', false);
    s.setValue('infoOpen', false);
  }, []);

  // The top bar's own inspector button opens the sheet without choosing a
  // section, so it lands on Inspect rather than on four collapsed headers.
  useEffect(() => {
    if (infoOpen && !infoTab) useStore.getState().setValue('infoTab', 'selection');
  }, [infoOpen, infoTab]);

  // While a route point is being picked the terrain has to be reachable, so
  // the sheet steps out of the way and a prompt takes its place. Setting the
  // point reopens the sheet through the store's own `setPlanPoint`.
  useEffect(() => {
    if (!picking) return;
    useStore.getState().setValue('infoOpen', false);
    setStatusOpen(false);
  }, [picking]);

  const openTab = (id) => {
    setStatusOpen(false);
    if (id === 'layers') {
      setValue('sidebarOpen', !sidebarOpen);
      if (!sidebarOpen) setValue('infoOpen', false);
      return;
    }
    if (infoOpen && infoTab === id) {
      setValue('infoOpen', false);
      return;
    }
    setValue('infoTab', id);
    setValue('infoOpen', true);
    setValue('sidebarOpen', false);
  };

  const isOn = (id) => (id === 'layers' ? sidebarOpen : infoOpen && infoTab === id);

  const sheetOpen = sidebarOpen || infoOpen || statusOpen;

  return (
    <>
      {/* The top bar is the desktop component: its layers, data, help and
          inspector buttons already drive the flags this shell reads. */}
      <TopBar />

      {/* Terrain controls, below the header and the MAP/PLAY row. Hidden while
          a sheet covers this area. */}
      {!sheetOpen && <MapToolbar style={{ top: 'calc(92px + var(--sa-t))', bottom: 'auto' }} />}

      {/* One column above the tab bar, laid out bottom-upwards by flexbox:
          the status panel, then the route legend, the picking prompt and any
          degraded-data notice. Nothing here is positioned by arithmetic, so a
          piece appearing cannot land on top of another. */}
      <div className="m-bottom-stack">
        <MapStatusPanel onOpen={() => setStatusOpen(true)} />

        <RouteLegend />

        {picking && (
          <div
            className="pointer-events-auto fade-in flex items-center gap-2 rounded-lg border px-3 py-2 text-[11px]"
            style={{
              borderColor: 'rgba(232,136,74,0.45)',
              background: 'rgba(9,11,15,0.92)',
              backdropFilter: 'blur(14px)',
            }}
            role="status"
          >
            <span className="flex-1 text-accent">Tap the terrain to set the {picking} point</span>
            <button type="button" className="btn shrink-0" onClick={stopPicking}>
              Cancel
            </button>
          </div>
        )}

        <StatusBanner />
      </div>

      {/* Layers: the whole layer tree, opening half-height and draggable to full. */}
      <BottomSheet
        open={sidebarOpen}
        onClose={() => setValue('sidebarOpen', false)}
        title="Layers"
        initialSnap="half"
        headerPx={SHEET_CLEARANCE}
      >
        <LayerSidebar />
      </BottomSheet>

      {/* Inspect, Measure & Plan, Weather and Geology are the four sections of
          the desktop inspector; the tab bar chooses which one is expanded. */}
      <BottomSheet
        open={infoOpen}
        onClose={() => setValue('infoOpen', false)}
        title={(TABS.find((t) => t.id === infoTab) || { label: 'Inspector' }).label}
        initialSnap="half"
        headerPx={SHEET_CLEARANCE}
      >
        <InfoPanel />
      </BottomSheet>

      {/* The desktop footer: pointer readout and sol timeline. */}
      <BottomSheet
        open={statusOpen}
        onClose={() => setStatusOpen(false)}
        title="Readout &amp; timeline"
        initialSnap="peek"
        headerPx={SHEET_CLEARANCE}
      >
        <div className="m-status-detail">
          <footer className="gale-footer">
            <Readout />
            <SolTimeline />
          </footer>
        </div>
      </BottomSheet>

      <nav className="m-tabbar pointer-events-auto" aria-label="Map panels">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className="m-tab"
            data-on={isOn(t.id) ? 'true' : 'false'}
            aria-pressed={isOn(t.id)}
            onClick={() => openTab(t.id)}
          >
            <TabIcon name={t.id} />
            <span className="m-tab-label">{t.label}</span>
          </button>
        ))}
      </nav>

      <DatasetInfo />
    </>
  );
}
