'use client';
import { useState } from 'react';
import { useStore } from '@/store/useStore';

export default function StatusBanner() {
  const terrain = useStore((s) => s.terrain);
  const rover = useStore((s) => s.rover);
  const imagery = useStore((s) => s.imagery);
  const baseLayer = useStore((s) => s.baseLayer);
  const exaggeration = useStore((s) => s.exaggeration);
  const [dismissed, setDismissed] = useState(false);

  const messages = [];
  if (terrain.status === 'missing' && !dismissed) {
    messages.push({
      key: 'dem',
      tone: 'warn',
      text: (
        <>
          <strong className="font-medium">No elevation data prepared.</strong> You are looking at a flat reference
          surface carrying real orbital imagery — not Gale’s relief. Run{' '}
          <code className="num rounded bg-black/40 px-1">python scripts/prepare_terrain.py crater</code> and reload.
        </>
      ),
      dismiss: true,
    });
  }
  if (terrain.status === 'error') {
    messages.push({ key: 'demerr', tone: 'bad', text: `Elevation data could not be read: ${terrain.error}` });
  }
  if (rover.status === 'error') {
    messages.push({ key: 'rover', tone: 'bad', text: `Rover data unavailable: ${rover.error}` });
  }
  if (baseLayer === 'ctx' && imagery.done && imagery.requested > 0 && imagery.drawn === 0) {
    messages.push({
      key: 'img',
      tone: 'bad',
      text: 'No imagery tiles were received from NASA Mars Trek. Check the network connection of the machine running the app.',
    });
  }
  if (exaggeration !== 1) {
    messages.push({ key: 'exag', tone: 'note', text: `Vertical exaggeration ${exaggeration.toFixed(1)}× — relief is not at true scale.` });
  }
  if (!messages.length) return null;

  const tones = {
    warn: 'border-interpreted/40 bg-interpreted/10 text-interpreted',
    bad: 'border-rose-400/40 bg-rose-500/10 text-rose-200',
    note: 'border-line bg-black/60 text-slate-300',
  };

  return (
    <div className="pointer-events-none absolute inset-x-0 top-14 z-20 flex flex-col items-center gap-1.5 px-4">
      {messages.map((m) => (
        <div
          key={m.key}
          className={`fade-in pointer-events-auto flex max-w-xl items-start gap-3 rounded-md border px-3 py-1.5 text-xs leading-snug backdrop-blur ${tones[m.tone]}`}
        >
          <span>{m.text}</span>
          {m.dismiss && (
            <button type="button" className="shrink-0 opacity-70 hover:opacity-100" onClick={() => setDismissed(true)}>
              ×
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
