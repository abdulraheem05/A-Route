'use client';
// Rover localisation for the crater being explored. The endpoints come from
// crater.rover; a crater with no rover mission sets status 'unavailable' and
// the interface reports that instead of failing.
import { useEffect } from 'react';
import { useStore } from '@/store/useStore';
import { useCrater } from '@/lib/mars/CraterContext';
import { joinWaypointsToTraverse, parseTraverse, parseWaypoints } from '@/lib/data/roverAdapter';

async function load(url) {
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
  return {
    json: await res.json(),
    origin: res.headers.get('X-MarsWalk-Origin'),
    retrieved: res.headers.get('X-MarsWalk-Retrieved'),
  };
}

export function useRoverData() {
  const crater = useCrater();
  const rover = crater.rover || null;
  const waypointsUrl = rover && rover.waypointsUrl;
  const traverseUrl = rover && rover.traverseUrl;
  const bounds = (rover && rover.bounds) || crater.bounds;

  useEffect(() => {
    let dead = false;
    const { setRover, setSol } = useStore.getState();

    if (!waypointsUrl) {
      setRover({
        status: 'unavailable',
        waypoints: [],
        traverse: null,
        join: null,
        error: 'No rover mission dataset is configured for this crater.',
      });
      return undefined;
    }

    (async () => {
      try {
        const wp = await load(waypointsUrl);
        if (dead) return;
        const { waypoints, rejected } = parseWaypoints(wp.json, bounds);
        if (!waypoints.length) throw new Error('Waypoint file contained no usable records');
        setRover({ status: 'ready', origin: wp.origin, retrieved: wp.retrieved, waypoints, rejected });
        setSol(waypoints[waypoints.length - 1].sol);

        // The traverse is larger; the waypoints are usable before it arrives.
        if (!traverseUrl) {
          setRover({ traverse: null, join: null });
          return;
        }
        try {
          const tr = await load(traverseUrl);
          if (dead) return;
          const traverse = parseTraverse(tr.json, 1.5, bounds);
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
  }, [waypointsUrl, traverseUrl, bounds]);
}
