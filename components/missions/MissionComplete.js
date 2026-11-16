'use client';
import { useEffect } from 'react';
import { X } from 'lucide-react';
import { useGame } from '@/lib/store';
import { MISSIONS } from '@/lib/scientific-data';

/** Short cinematic notice when a mission's required observations are all made. */
export default function MissionComplete() {
  const completion = useGame((g) => g.completion);
  const dismiss = useGame((g) => g.dismissCompletion);
  useEffect(() => {
    if (!completion) return;
    const t = setTimeout(dismiss, 14000);
    return () => clearTimeout(t);
  }, [completion, dismiss]);
  if (!completion) return null;
  const mission = MISSIONS.find((m) => m.id === completion.missionId);
  const next = MISSIONS.find((m) => m.id === mission.nextMission);
  return (
    <div key={completion.at} className="rise-in pointer-events-auto absolute left-1/2 top-[calc(104px_+_var(--sa-t))] z-[45] w-[min(520px,90vw)] -translate-x-1/2 lg:top-16" role="status">
      <div className="panel sweep relative overflow-hidden px-5 py-4">
        <button type="button" onClick={dismiss} aria-label="Dismiss" className="m-hit absolute right-3 top-3 text-mars-200/60 hover:text-white"><X size={14} /></button>
        <div className="text-[10px] uppercase tracking-hud text-mars-300">Mission {String(mission.sequence).padStart(2, '0')} complete</div>
        <div className="mt-0.5 text-lg font-light text-mars-50">{mission.title}</div>
        

      </div>
    </div>
  );
}
