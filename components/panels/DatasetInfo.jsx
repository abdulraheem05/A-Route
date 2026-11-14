'use client';
import { DATASETS } from '@/lib/data/registry';
import { useCrater } from '@/lib/mars/CraterContext';
import { useStore } from '@/store/useStore';
import { EvidenceBadge } from '@/components/panels/ui';

const FIELDS = [
  ['Instrument', 'instrument'],
  ['Mission', 'mission'],
  ['Resolution (native)', 'resolutionNative'],
  ['Resolution (as used)', 'resolutionEffective'],
  ['Coverage', 'coverage'],
  ['Units', 'units'],
  ['Known limitations', 'limitations'],
  ['Used in MarsWalk for', 'use'],
  ['Citation', 'citation'],
];

export default function DatasetInfo() {
  const registryDoc = useCrater().registryDoc;
  const id = useStore((s) => s.datasetInfo);
  const setValue = useStore((s) => s.setValue);
  const d = id ? DATASETS[id] : null;
  if (!d) return null;
  const close = () => setValue('datasetInfo', null);

  return (
    <div
      className="pointer-events-auto absolute inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={close}
      role="presentation"
    >
      <div
        className="panel fade-in thin-scroll max-h-[80vh] w-full max-w-lg overflow-y-auto p-5"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label={d.name}
      >
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <div className="mb-1 flex items-center gap-2">
              <span className="num text-xs text-slate-500">{d.id}</span>
              <EvidenceBadge kind={d.evidence} />
            </div>
            <h2 className="text-sm font-medium leading-snug text-slate-50">{d.name}</h2>
          </div>
          <button type="button" className="btn h-7 w-7 p-0" onClick={close} aria-label="Close">
            ×
          </button>
        </div>
        <dl className="space-y-2.5">
          {FIELDS.map(([label, key]) => (
            <div key={key}>
              <dt className="label">{label}</dt>
              <dd className="text-xs leading-relaxed text-slate-300">
                {d[key] || <span className="text-slate-600">not stated by source</span>}
              </dd>
            </div>
          ))}
          <div>
            <dt className="label">Source</dt>
            <dd className="break-all text-xs">
              <a href={d.sourceUrl} target="_blank" rel="noreferrer" className="text-accent hover:underline">
                {d.sourceUrl}
              </a>
            </dd>
          </div>
        </dl>
        {registryDoc && <p className="mt-4 text-[11px] text-slate-600">Full entry: {registryDoc}</p>}
      </div>
    </div>
  );
}
