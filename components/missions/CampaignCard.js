'use client';
import { useGame } from '@/lib/store';
import { MISSIONS } from '@/lib/scientific-data';

export default function CampaignCard({ mode }) {
  if (!mode) return null;
  const mission = MISSIONS[0];
  const finish = mode === 'finish';
  return <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-5 backdrop-blur-md">
    <section className="w-full max-w-2xl rounded-2xl border border-mars-300/30 bg-[#211810]/95 p-8 text-center shadow-2xl md:p-12">
      <div className="text-sm uppercase tracking-[.28em] text-mars-300">MARSWALK · JEZERO CRATER</div>
      <div className="mt-5 text-xs uppercase tracking-[.25em] text-mars-200/70">{finish ? 'EXPEDITION COMPLETE' : `MISSION ${String(mission.sequence).padStart(2,'0')}`}</div>
      <h1 className="mt-3 text-4xl font-light leading-tight text-mars-50 md:text-5xl">{finish ? 'Missions completed successfully' : 'Explore Jezero Crater'}</h1>
      <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-mars-100/75">{finish ? 'You have completed the Jezero exploration campaign. Your scientific journey is complete.' : 'Explore rover panoramas, inspect significant rocks, and investigate real Perseverance drill sites.'}</p>
      {!finish && <div className="mt-7 rounded-lg border border-mars-200/15 bg-black/20 p-4"><div className="text-xs uppercase tracking-[.2em] text-mars-300">Mission 01 · {mission.title}</div><div className="mt-2 text-xl text-mars-50">{mission.location}</div><div className="mt-1 text-sm text-mars-100/60">{mission.objective}</div></div>}
      <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
        {finish ? <><button className="btn-primary min-w-48 py-3" onClick={()=>useGame.getState().dismissCompletion()}>Stay in the crater</button><button className="btn min-w-48 py-3" onClick={()=>{useGame.getState().returnToStart();useGame.getState().resetProgress();}}>Exit crater</button></> : <button className="btn-primary min-w-64 py-4 text-lg" onClick={()=>useGame.getState().startExploring()}>Start exploring</button>}
      </div>
    </section>
  </div>;
}
