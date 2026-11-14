// Shown by Next.js while the Explore route segment loads: a real signal, not a
// timer. It disappears the moment the page is ready to render.
import MarsLoadingScreen from '@/components/ui/MarsLoadingScreen';

export default function Loading() {
  return <MarsLoadingScreen variant="explore" subtitle="Loading exploration environment…" />;
}
