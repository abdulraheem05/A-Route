'use client';
// Observed weather for the crater being explored. The feed URL comes from
// crater.weather; a crater with no weather source sets status 'unavailable'
// and the panel says so rather than reporting an error.
import { useEffect } from 'react';
import { useStore } from '@/store/useStore';
import { useCrater } from '@/lib/mars/CraterContext';
import { parseWeather } from '@/lib/data/weatherAdapter';

export function useWeather() {
  const crater = useCrater();
  const url = crater.weather && crater.weather.url;

  useEffect(() => {
    let dead = false;
    const { setWeather } = useStore.getState();

    if (!url) {
      setWeather({
        status: 'unavailable',
        records: [],
        bySol: new Map(),
        error: 'No weather feed is configured for this crater.',
      });
      return undefined;
    }

    (async () => {
      try {
        const res = await fetch(url);
        if (!res.ok) {
          let msg = `HTTP ${res.status}`;
          try {
            msg = (await res.json()).error || msg;
          } catch (e) {
            /* keep default */
          }
          throw new Error(msg);
        }
        const parsed = parseWeather(await res.json());
        if (dead) return;
        setWeather({
          status: 'ready',
          origin: res.headers.get('X-MarsWalk-Origin'),
          retrieved: res.headers.get('X-MarsWalk-Retrieved'),
          ...parsed,
        });
      } catch (err) {
        if (!dead) setWeather({ status: 'error', error: err.message });
      }
    })();
    return () => {
      dead = true;
    };
  }, [url]);
}
