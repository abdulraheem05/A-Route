'use client';
import { X } from 'lucide-react';
import { useGame } from '@/lib/store';

const Row = ({ label, hint, children }) => (
  <div className="flex flex-col items-stretch gap-2 border-b border-mars-200/10 py-3 last:border-0 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
    <div>
      <div className="text-sm text-mars-50">{label}</div>
      {hint && <div className="max-w-xs text-[11px] leading-snug text-mars-200/60">{hint}</div>}
    </div>
    <div className="shrink-0 sm:ml-auto">{children}</div>
  </div>
);

function Segmented({ value, options, onChange }) {
  return (
    <div className="flex overflow-hidden rounded border border-mars-200/25">
      {options.map((o) => (
        <button key={o.value} type="button" onClick={() => onChange(o.value)} className={`px-3 py-1.5 text-[11px] uppercase tracking-[0.12em] transition ${value === o.value ? 'bg-mars-500/70 text-white' : 'text-mars-100/70 hover:bg-mars-500/20'}`}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export default function SettingsPanel() {
  const s = useGame((g) => g.settings);
  const update = useGame((g) => g.updateSettings);
  const close = useGame((g) => g.closeSettings);
  return (
    <div className="absolute inset-0 z-[36] flex items-center justify-center bg-coal-950/70 backdrop-blur-sm fade-in">
      <div className="panel thin-scroll max-h-[88dvh] w-[min(560px,92vw)] overflow-y-auto px-5 py-4 sm:px-6">
        <header className="mb-1 flex items-center justify-between">
          <div className="text-xl font-light">Settings</div>
          <button type="button" className="icon-btn m-hit" aria-label="Close settings" onClick={close}><X size={15} /></button>
        </header>
        <Row label="Graphics quality" hint="Terrain mesh density and render resolution. Medium suits most desktop GPUs.">
          <Segmented value={s.quality} onChange={(quality) => update({ quality })} options={[{ value: 'low', label: 'Low' }, { value: 'medium', label: 'Medium' }, { value: 'high', label: 'High' }]} />
        </Row>
        <Row label="Travel pace" hint="Distances are real, so ×1 is a true walking pace (1.4 m/s). Higher values compress time, not distance.">
          <Segmented value={s.pace} onChange={(pace) => update({ pace })} options={[{ value: 1, label: '×1' }, { value: 5, label: '×5' }, { value: 10, label: '×10' }, { value: 40, label: '×40' }]} />
        </Row>
        <Row label="Mouse sensitivity">
          <input type="range" min="0.3" max="2.5" step="0.1" value={s.sensitivity} onChange={(e) => update({ sensitivity: +e.target.value })} className="w-full accent-mars-400 sm:w-44" aria-label="Mouse sensitivity" />
        </Row>
        <Row label="Field of view" hint={`${s.fov}°`}>
          <input type="range" min="50" max="95" step="1" value={s.fov} onChange={(e) => update({ fov: +e.target.value })} className="w-full accent-mars-400 sm:w-44" aria-label="Field of view" />
        </Row>
        <Row label="Rover traverse line">
          <Segmented value={s.showTraverse} onChange={(showTraverse) => update({ showTraverse })} options={[{ value: true, label: 'Show' }, { value: false, label: 'Hide' }]} />
        </Row>
        <Row label="Site labels">
          <Segmented value={s.showLabels} onChange={(showLabels) => update({ showLabels })} options={[{ value: true, label: 'Show' }, { value: false, label: 'Hide' }]} />
        </Row>
      </div>
    </div>
  );
}
