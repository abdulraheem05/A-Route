
'use client';

import { useRouter } from 'next/navigation';
import DestinationSelection from './DestinationSelection';

export default function ExplorePage() {
  const router = useRouter();

  return (
    <main className="relative min-h-dvh overflow-hidden bg-black">
      <DestinationSelection
        onBack={() => router.push('/')}
      />
    </main>
  );
}
