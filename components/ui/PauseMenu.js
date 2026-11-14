'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Lock, Play } from 'lucide-react';
import { useGame } from '@/lib/store';
import { MISSIONS, sourceList } from '@/lib/scientific-data';
import { missionProgress, objectiveDone } from '@/lib/missions';

export default function PauseMenu() {
  const router = useRouter();
  const missionIndex = useGame((g) => g.missionIndex);
  const done = useGame((g) => g.done);
  const allComplete = useGame((g) => g.allComplete);
  const [open, setOpen] = useState(missionIndex);
  const [confirmReset, setConfirmReset] = useState(false);

  function resume() {
    useGame.getState().setPaused(false);
    const canvas = document.querySelector('canvas');
    if (canvas && canvas.requestPointerLock) { const r = canvas.requestPointerLock(); if (r && r.catch) r.catch(() => {}); }
  }

  return (
    <div className="absolute inset-0 z-[35] flex items-center justify-center bg-coal-950/70 backdrop-blur-sm fade-in">
      <div className="panel flex max-h-[84vh] w-[min(760px,92vw)] flex-col">
        <header className="flex items-center justify-between border-b border-mars-200/10 px-6 py-4">
          <div>
            <div className="text-[10px] uppercase tracking-hud text-mars-300">Paused</div>
            <div className="text-xl font-light">Mission log</div>
          </div>
          <button type="button" className="btn-primary" onClick={resume}> Resume</button>
        </header>

        <div className="thin-scroll flex-1 overflow-y-auto px-6 py-4">
          {MISSIONS.map((m, i) => {
            const locked = i > missionIndex;
            const p = missionProgress(m, done);
            const complete = i < missionIndex || (allComplete && i === missionIndex);
            return (
              <div key={m.id} className="border-b border-mars-200/10 py-2.5 last:border-0">
                <button type="button" disabled={locked} onClick={() => setOpen(open === i ? -1 : i)} className="flex w-full items-center gap-3 text-left disabled:opacity-45">
                  <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[10px] ${complete ? 'border-mars-300 bg-mars-500/40' : locked ? 'border-mars-200/20' : 'border-mars-400'}`}>
                    {complete ? <Check size={11} /> : locked ? <Lock size={10} /> : m.sequence}
                  </span>
                  <span className="flex-1">
                    <span className="block text-sm text-mars-50">{m.title}</span>
                    <span className="block text-[11px] text-mars-200/60">{m.location} · sols {m.sols}</span>
                  </span>
                  {!locked && <span className="font-mono text-[11px] text-mars-200/70">{p.requiredDone}/{p.required}{p.optional ? ` · +${p.optionalDone}/${p.optional}` : ''}</span>}
                </button>
                {open === i && !locked && (
                  <div className="ml-9 mt-2 space-y-2 text-[12px] leading-relaxed text-mars-100/85">
                    <p><span className="hud-label mr-2">Explore</span>{m.objective}</p>
                    <p><span className="hud-label mr-2">Science</span>{m.scientificObjective}</p>
                    <p>{m.scientificContext}</p>
                    <ul className="space-y-1">
                      {m.objectives.map((o) => (
                        <li key={o.id} className="flex items-center gap-2">
                          <span className={`flex h-3.5 w-3.5 items-center justify-center rounded-sm border ${objectiveDone(o, done) ? 'border-mars-300 bg-mars-500/50' : 'border-mars-200/30'}`}>{objectiveDone(o, done) && <Check size={9} />}</span>
                          <span className={o.required ? '' : 'text-mars-100/60'}>{o.label}{o.required ? '' : ' (optional)'}</span>
                        </li>
                      ))}
                    </ul>
                    {complete && <p className="rounded border border-mars-200/15 bg-coal-950/40 p-2"><span className="hud-label mr-2">Learned</span>{m.discovery}</p>}
                    <div className="text-[10px] leading-snug text-mars-200/55">
                      {sourceList(m.sources).map((s) => <div key={s.id}>{s.citation}</div>)}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <footer className="flex flex-wrap items-center gap-2 border-t border-mars-200/10 px-6 py-3">
          <button type="button" className="btn" onClick={() => useGame.getState().openSettings()}>Settings</button>
          <button type="button" className="btn" onClick={() => { useGame.getState().setPaused(false); useGame.getState().openMap(); }}>Map</button>
          <button type="button" className="btn" onClick={() => useGame.getState().openNotice()}>Data notes</button>
          <span className="flex-1" />
          {confirmReset ? (
            <>
              <span className="text-[11px] text-amber-100">Erase mission progress?</span>
              <button type="button" className="btn" onClick={() => { useGame.getState().resetProgress(); setConfirmReset(false); setOpen(0); }}>Yes, reset</button>
              <button type="button" className="btn" onClick={() => setConfirmReset(false)}>Keep</button>
            </>
          ) : (
            <button type="button" className="btn" onClick={() => setConfirmReset(true)}>Reset progress</button>
          )}
          <button type="button" className="btn" onClick={() => { useGame.getState().save(); router.push('/'); }}>Exit to destinations</button>
        </footer>
      </div>
    </div>
  );
}
