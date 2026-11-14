import ExperienceRoot from '@/components/ExperienceRoot';

/**
 * Phase 1 is a single route: the cinematic intro and destination selection are
 * two stages of one continuous scene rather than separate pages, so the WebGL
 * context is never recreated and the starfield never restarts.
 */
export default function Page() {
  return <ExperienceRoot />;
}
