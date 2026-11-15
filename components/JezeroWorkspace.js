'use client';
// Jezero's workspace.
//
// MAP is the shared crater explorer driven by Jezero's configuration — the
// same renderer, panels, camera and data pipeline Gale uses. PLAY is the
// existing first-person game, passed in unchanged.
//
// The standalone Jezero terrain viewer this replaced had its own Canvas,
// mesh, controls and two-button sidebar; none of that is needed now.
import dynamic from 'next/dynamic';
import CraterWorkspace from '@/components/CraterWorkspace';
import jezero from '@/lib/mars/craters/jezero';
import { JEZERO_GAME } from '@/lib/mars/gameCraters';

const Game = dynamic(() => import('@/components/game/Game'), { ssr: false });

export default function JezeroWorkspace({ mode = 'MAP' }) {
  return <CraterWorkspace crater={jezero} mode={mode} play={<Game crater={JEZERO_GAME} />} />;
}
