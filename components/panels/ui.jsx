'use client';
// Small shared interface pieces.
import { DATASETS, EVIDENCE } from '@/lib/data/registry';
import { useStore } from '@/store/useStore';

export function EvidenceBadge({ kind }) {
  const e = EVIDENCE[kind];
  if (!e) return null;
  return (
    <span className={`chip ${e.color}`} title={e.note}>
      {kind}
    </span>
  );
}

export function DatasetLink({ id }) {
  const open = useStore((s) => s.setValue);
  const d = DATASETS[id];
  if (!d) return <span className="num text-slate-400">{id}</span>;
  return (
    <button
      type="button"
      onClick={() => open('datasetInfo', id)}
      className="num rounded border border-line px-1 text-[10px] text-slate-300 transition hover:border-accent/50 hover:text-accent"
      title={d.name}
    >
      {id}
    </button>
  );
}

export function Row({ label, children }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1">
      <span className="shrink-0 text-xs text-slate-400">{label}</span>
      <span className="text-right text-xs text-slate-100">{children}</span>
    </div>
  );
}

export function Section({ title, right, children }) {
  return (
    <section className="border-t border-line px-3 py-3 first:border-t-0">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="label">{title}</h3>
        {right}
      </div>
      {children}
    </section>
  );
}

export function Toggle({ checked, onChange, label, hint, disabled }) {
  return (
    <label className={`flex cursor-pointer items-start gap-2 py-1 ${disabled ? 'cursor-not-allowed opacity-40' : ''}`}>
      <input
        type="checkbox"
        className="mt-0.5 h-3.5 w-3.5 accent-[#e8884a]"
        checked={checked}
        disabled={disabled}
        onChange={onChange}
      />
      <span className="flex-1">
        <span className="block text-xs text-slate-100">{label}</span>
        {hint && <span className="block text-[11px] leading-snug text-slate-500">{hint}</span>}
      </span>
    </label>
  );
}

export const fmt = (v, digits = 1, unit = '') =>
  v === null || v === undefined || Number.isNaN(v) ? '—' : `${v.toFixed(digits)}${unit}`;
