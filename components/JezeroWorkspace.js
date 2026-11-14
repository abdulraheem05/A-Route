'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';

const JezeroGame = dynamic(() => import('@/components/game/Game'), { ssr: false });

export default function JezeroWorkspace() {
  const [mode, setMode] = useState('MAP');
  const router = useRouter();

  return (
    <main className="jezero-workspace relative h-dvh w-screen overflow-hidden bg-black text-bone">
      <header className="absolute left-0 right-0 top-0 z-[90] flex h-14 items-center justify-between border-b border-white/10 bg-black/75 px-4 backdrop-blur-xl sm:px-6">
        <button onClick={() => router.push('/explore')} className="text-[10px] uppercase tracking-[.22em] text-white/55 transition hover:text-white">← Destinations</button>
        <div className="absolute left-1/2 -translate-x-1/2 text-[10px] uppercase tracking-[.28em] text-mars-200">Jezero Crater</div>
        <nav className="flex items-center gap-1 rounded border border-white/10 bg-black/60 p-1">
          {['MAP', 'PLAY'].map((tab) => (
            <button key={tab} onClick={() => setMode(tab)} className={`px-4 py-2 text-[10px] tracking-[.24em] transition sm:px-6 ${mode === tab ? 'bg-mars-500/25 text-mars-100' : 'text-white/45 hover:text-white'}`}>{tab}</button>
          ))}
        </nav>
      </header>
      {mode === 'MAP' ? (
        <section className="flex h-full items-center justify-center px-6 pt-14">
          <div className="max-w-lg text-center">
            <p className="mb-4 text-[10px] tracking-[.38em] text-mars-300">JEZERO CRATER / MAP</p>
            <h1 className="text-2xl font-light tracking-wide text-white sm:text-3xl">Scientific map workspace</h1>
            <p className="mt-3 text-sm leading-7 text-white/45">The Jezero map interface will be added here.</p>
            <button onClick={() => setMode('PLAY')} className="mt-7 inline-flex items-center gap-3 border border-mars-300/50 bg-mars-500/20 px-6 py-3 text-xs uppercase tracking-[.24em] text-mars-100 transition hover:bg-mars-500/35">Play · Surface exploration →</button>
          </div>
        </section>
      ) : (
        <div className="absolute inset-0 pt-14">
          <JezeroGame />
        </div>
      )}
    </main>
  );
}
