'use client';
import { useEffect } from 'react';
import { useStore } from '@/store/useStore';
import { joinWaypointsToTraverse, parseTraverse, parseWaypoints } from '@/lib/data/roverAdapter';

async function load(kind) {
  const res = await fetch(`/api/rover/${kind}`);
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      msg = (await res.json()).error || msg;
    } catch (e) {
      /* keep default */
    }
    throw new Error(msg);
  }
  return {
    json: await res.json(),
    origin: res.headers.get('X-MarsWalk-Origin'),
    retrieved: res.headers.get('X-MarsWalk-Retrieved'),
  };
}

export function useRoverData() {
  useEffect(() => {
    let dead = false;
    const { setRover, setSol } = useStore.getState();
    (async () => {
      try {
        const wp = await load('waypoints');
        if (dead) return;
        const { waypoints, rejected } = parseWaypoints(wp.json);
        if (!waypoints.length) throw new Error('Waypoint file contained no usable records');
        setRover({ status: 'ready', origin: wp.origin, retrieved: wp.retrieved, waypoints, rejected });
        setSol(waypoints[waypoints.length - 1].sol);

        // The traverse is larger; the waypoints are usable before it arrives.
        try {
          const tr = await load('traverse');
          if (dead) return;
          const traverse = parseTraverse(tr.json);
          const join = joinWaypointsToTraverse(waypoints, traverse);
          setRover({ traverse, join });
        } catch (err) {
          setRover({ traverse: null, join: null, error: `Traverse path unavailable: ${err.message}` });
        }
      } catch (err) {
        if (!dead) setRover({ status: 'error', error: err.message });
      }
    })();
    return () => {
      dead = true;
    };
  }, []);
}
