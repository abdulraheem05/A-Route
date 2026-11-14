'use client';
import { useEffect } from 'react';
import { useStore } from '@/store/useStore';
import { parseWeather } from '@/lib/data/weatherAdapter';

export function useWeather() {
  useEffect(() => {
    let dead = false;
    const { setWeather } = useStore.getState();
    (async () => {
      try {
        const res = await fetch('/api/weather');
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
  }, []);
}
