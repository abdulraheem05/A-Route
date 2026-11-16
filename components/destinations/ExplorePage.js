'use client';
// The destination selector.
//
// The thumbnails are the only thing here that takes noticeable time, so the
// loading screen waits for them to settle — loaded or failed, whichever comes
// first for each — rather than on a timer. A ceiling makes sure a slow or
// missing file can never leave a viewer on this screen; the cards handle a
// missing thumbnail on their own with a placeholder.
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { destinations } from '@/lib/destinations';
import MarsLoadingScreen from '@/components/ui/MarsLoadingScreen';
import DestinationSelection from './DestinationSelection';

const CEILING_MS = 6000;

export default function ExplorePage() {
  const router = useRouter();
  const [settled, setSettled] = useState(0);
  const [done, setDone] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const total = useRef(0);

  useEffect(() => {
    const urls = destinations.map((d) => d.image).filter(Boolean);
    total.current = urls.length;
    if (!urls.length) {
      setDone(true);
      return undefined;
    }
    let live = true;
    let settledCount = 0;
    const images = [];
    const tick = () => {
      if (!live) return;
      settledCount += 1;
      setSettled(settledCount);
      if (settledCount >= urls.length) setDone(true);
    };
    for (const url of urls) {
      const img = new Image();
      img.onload = tick;
      img.onerror = tick;
      img.src = url;
      images.push(img);
    }
    const ceiling = setTimeout(() => setDone(true), CEILING_MS);
    return () => {
      live = false;
      clearTimeout(ceiling);
      for (const img of images) {
        img.onload = null;
        img.onerror = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!done) return undefined;
    setLeaving(true);
    const t = setTimeout(() => setLeaving(false), 520);
    return () => clearTimeout(t);
  }, [done]);

  return (
    <main className="aroute-safe-page relative min-h-dvh overflow-hidden bg-black">
      <DestinationSelection onBack={() => router.push('/')} />
      {(!done || leaving) && (
        <div className={done ? 'mars-load-exit' : undefined}>
          <MarsLoadingScreen
            variant="explore"
            stages={[
              { label: 'Preparing planetary systems', done: true },
              {
                label: 'Loading exploration environment',
                done,
                detail: total.current ? `${settled} of ${total.current} destinations` : null,
              },
            ]}
          />
        </div>
      )}
    </main>
  );
}
