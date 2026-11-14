'use client';
// Makes the active crater configuration available to the interface.
//
// The configuration object itself is also published to lib/mars/activeCrater.js
// for the plain modules (projection, elevation grids, adapters) that run inside
// render loops and cannot use a hook. Both read the same object.
import { createContext, useContext, useMemo } from 'react';
import { defaultCrater } from '@/lib/mars/craters';
import { setActiveCrater } from '@/lib/mars/activeCrater';

const CraterContext = createContext(defaultCrater);

export function CraterProvider({ crater, children }) {
  const value = crater || defaultCrater;
  // Published before the children render, so the first frame of the scene
  // already projects with this crater's origin.
  useMemo(() => setActiveCrater(value), [value]);
  return <CraterContext.Provider value={value}>{children}</CraterContext.Provider>;
}

export function useCrater() {
  return useContext(CraterContext);
}

export default CraterContext;
