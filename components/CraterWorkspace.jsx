'use client';
// Workspace shell for one crater: the MAP / PLAY switch and whichever of the
// two is showing.
//
// This is the original GaleWorkspace generalised. The markup, classes and copy
// are unchanged for Gale; the crater name and the PLAY placeholder text come
// from the crater configuration, and a crater that has a PLAY experience
// passes it in as `play`.
//
// `mode` is supplied by the MAP or PLAY route, so refreshes preserve the
// selected experience. `crater.backHref` returns to the destination selector.
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { defaultCrater } from '@/lib/mars/craters';

const Explorer = dynamic(() => import('@/components/Explorer'), { ssr: false });

export default function CraterWorkspace({ crater = defaultCrater, mode = 'MAP', play = null }) {
  const routeBase = `/explore/${crater.id}`;
  return <div className="relative h-screen w-screen overflow-hidden bg-black text-bone">
    <nav className="absolute left-1/2 top-3 z-[60] flex -translate-x-1/2 items-center gap-1 rounded border border-white/10 bg-black/75 p-1 backdrop-blur-xl">
      {crater.backHref && (
        <Link href={crater.backHref} className="px-3 py-2 text-[10px] tracking-[.22em] text-white/45 transition hover:text-white" aria-label={crater.backLabel || 'Back'}>
          {crater.backLabel || '← BACK'}
        </Link>
      )}
      {['MAP','PLAY'].map((tab) => <Link key={tab} href={`${routeBase}/${tab.toLowerCase()}`} aria-current={mode===tab?'page':undefined} className={`px-5 py-2 text-[10px] tracking-[.28em] transition ${mode===tab?'bg-mars-500/25 text-mars-100':'text-white/45 hover:text-white'}`}>{tab}</Link>)}
    </nav>
    {mode === 'MAP' ? <Explorer crater={crater} /> : play || <div className="flex h-full items-center justify-center bg-[radial-gradient(ellipse_at_center,#25110b_0%,#080606_55%,#000_100%)]"><div className="max-w-md px-8 text-center"><p className="mb-4 text-[10px] tracking-[.4em] text-mars-300">{crater.playHeading}</p><h1 className="mb-3 text-3xl tracking-wide">PLAY MODE</h1><p className="text-sm leading-7 text-white/55">{crater.playNote}</p><Link className="btn mt-7 inline-block" href={`${routeBase}/map`}>RETURN TO MAP</Link></div></div>}
  </div>;
}
