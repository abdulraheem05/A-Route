'use client';
import { useState } from 'react';
import dynamic from 'next/dynamic';

const Explorer = dynamic(() => import('@/components/Explorer'), { ssr: false });

export default function GaleWorkspace() {
  const [mode, setMode] = useState('MAP');
  return <div className="relative h-screen w-screen overflow-hidden bg-black text-bone">
    <nav className="absolute left-1/2 top-3 z-[60] flex -translate-x-1/2 items-center gap-1 rounded border border-white/10 bg-black/75 p-1 backdrop-blur-xl">
      {['MAP','PLAY'].map((tab) => <button key={tab} onClick={() => setMode(tab)} className={`px-5 py-2 text-[10px] tracking-[.28em] transition ${mode===tab?'bg-mars-500/25 text-mars-100':'text-white/45 hover:text-white'}`}>{tab}</button>)}
    </nav>
    {mode === 'MAP' ? <Explorer /> : <div className="flex h-full items-center justify-center bg-[radial-gradient(ellipse_at_center,#25110b_0%,#080606_55%,#000_100%)]"><div className="max-w-md px-8 text-center"><p className="mb-4 text-[10px] tracking-[.4em] text-mars-300">GALE CRATER / SURFACE OPERATIONS</p><h1 className="mb-3 text-3xl tracking-wide">PLAY MODE</h1><p className="text-sm leading-7 text-white/55">Astronaut exploration, missions, sample collection and science notebook are planned for the next phase. The scientific MAP workspace is available now.</p><button className="btn mt-7" onClick={()=>setMode('MAP')}>RETURN TO MAP</button></div></div>}
  </div>;
}
