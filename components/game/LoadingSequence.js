'use client';

export default function LoadingSequence({ steps, error }) {
  const doneCount = steps.filter((s) => s.done).length;
  return (
    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-coal-950 fade-in">
      <div className="text-[11px] uppercase tracking-hud text-mars-300">MarsWalk</div>
      <div className="mt-3 text-2xl font-light tracking-wide text-mars-50">Descending to Jezero Crater</div>
      <div className="mt-1 font-mono text-xs text-mars-200/60">18.4446° N · 77.4509° E · Octavia E. Butler Landing</div>
      <div className="mt-8 h-px w-72 overflow-hidden bg-mars-200/15">
        <div className="h-full bg-mars-400 transition-all duration-500" style={{ width: `${(doneCount / steps.length) * 100}%` }} />
      </div>
      <ul className="mt-6 space-y-1.5 text-xs">
        {steps.map((s) => (
          <li key={s.label} className={`flex items-center gap-3 ${s.done ? 'text-mars-100' : 'text-mars-200/40'}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${s.done ? 'bg-mars-400' : 'bg-mars-200/20'}`} />
            {s.label}
            {s.detail && s.done && <span className="font-mono text-[10px] text-mars-200/50">{s.detail}</span>}
          </li>
        ))}
      </ul>
      {error && (
        <div className="mt-8 max-w-md rounded border border-red-400/40 bg-red-950/40 p-4 text-xs leading-relaxed text-red-100">
          <div className="mb-1 font-semibold uppercase tracking-[0.14em]">Could not load the world</div>
          {error}
        </div>
      )}
    </div>
  );
}
