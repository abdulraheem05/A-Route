'use client';
import { useEffect } from 'react';
import { X, Camera } from 'lucide-react';
import { useGame } from '@/lib/store';
import { WORLD, MISSIONS, PANORAMA_BY_ID } from '@/lib/scientific-data';
import { siteUnlocked } from '@/lib/missions';

export default function InfoPopup() {
  const siteId=useGame(g=>g.activeSiteId), itemId=useGame(g=>g.activeItemId), missionIndex=useGame(g=>g.missionIndex);
  const site=siteId?WORLD.siteById[siteId]:null;
  const unlocked=site?siteUnlocked(site,missionIndex):false;
  const item=site?site.items.find(i=>i.id===itemId)||site.items[0]:null;
  useEffect(()=>{if(site&&unlocked&&item&&item.kind==='object')useGame.getState().recordEvent('inspect',item.id);},[site,unlocked,item]);
  if(!site||!item)return null;
  const mission=MISSIONS[site.missionIndex], obj=item.ref||{}, pano= item.kind==='panorama'?PANORAMA_BY_ID[item.id]:null;
  const overview = pano ? (pano.description||pano.summary||mission?.scientificContext||'Explore this landscape and its geological context.') : (obj.summary||obj.description||item.name);
  const image = obj.image||obj.photo||obj.thumbnail||obj.images?.[0]||null;
  return <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm" onMouseDown={e=>{if(e.target===e.currentTarget)useGame.getState().closeSite();}}>
    <section className="relative w-full max-w-5xl overflow-hidden rounded-xl border border-mars-300/25 bg-[#211810]/95 shadow-2xl">
      <button className="icon-btn absolute right-4 top-4 z-10" aria-label="Close" onClick={()=>useGame.getState().closeSite()}><X size={20}/></button>
      <header className="border-b border-mars-200/15 px-7 py-5 pr-16"><div className="text-xs uppercase tracking-[.2em] text-mars-300">MISSION {String((mission?.sequence)||site.missionIndex+1).padStart(2,'0')} · {site.name}</div><h2 className="mt-2 text-3xl font-light text-mars-50">{item.name||site.name}</h2></header>
      {!unlocked?<div className="p-10 text-center text-xl">Complete the previous mission to access this location.</div>: item.kind==='panorama' ? <div className="p-8 text-center"><p className="mx-auto mb-8 max-w-3xl text-2xl leading-relaxed text-mars-50">{overview}</p><button className="btn-primary mx-auto min-w-72 py-4 text-lg" onClick={()=>useGame.getState().openPanorama(pano.id)}><Camera size={18}/> View panorama</button></div> : <div className="grid min-h-[420px] md:grid-cols-2">
        <div className="flex min-h-[300px] items-center justify-center bg-black/25 p-6">{image?<img src={image} alt={item.name} className="max-h-[440px] w-full rounded-lg object-contain"/>:<div className="flex h-72 w-full items-center justify-center rounded-lg border border-dashed border-mars-200/30 text-center text-mars-200/60">Specimen image placeholder<br/><span className="text-sm">Add image to public folder and set image path in science-objects.json</span></div>}</div>
        <div className="flex flex-col justify-center p-8 md:p-10"><p className="mb-7 text-2xl leading-relaxed text-mars-50">{overview}</p><div className="space-y-4 text-lg leading-relaxed text-mars-100/80"><p>{obj.geologicalContext||obj.context||'Geological context documented by the rover team.'}</p>{obj.whyItMatters&&<p>{obj.whyItMatters}</p>}{obj.composition&&<p><span className="text-mars-300">Composition:</span> {obj.composition}</p>}{obj.evidence?.length>0&&<p><span className="text-mars-300">Evidence:</span> {obj.evidence.slice(0,2).map(e=>e.text||e).join(' · ')}</p>}</div></div>
      </div>}
    </section></div>;
}
