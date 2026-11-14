'use client';
// Gale's workspace. Everything it used to do inline is now the shared
// CraterWorkspace shell driven by Gale's configuration, so the route, the
// markup and the copy are unchanged.
import CraterWorkspace from '@/components/CraterWorkspace';
import gale from '@/lib/mars/craters/gale';

export default function GaleWorkspace() {
  return <CraterWorkspace crater={gale} />;
}
