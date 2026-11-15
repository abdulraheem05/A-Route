'use client';
// Gale's workspace.
//
// MAP is the shared crater explorer driven by Gale's configuration, so the
// route, the markup and the copy are unchanged. PLAY is the same first-person
// game Jezero uses, given Gale's terrain, campaign and traverse — not a
// second game.
import dynamic from 'next/dynamic';
import CraterWorkspace from '@/components/CraterWorkspace';
import gale from '@/lib/mars/craters/gale';
import { GALE_GAME } from '@/lib/mars/gameCraters';

const Game = dynamic(() => import('@/components/game/Game'), { ssr: false });

export default function GaleWorkspace({ mode = 'MAP' }) {
  return <CraterWorkspace crater={gale} mode={mode} play={<Game crater={GALE_GAME} />} />;
}
