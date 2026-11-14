// MAP and PLAY for any crater in the registry that does not have pages of its
// own. Additive: /explore/gale/map and the other static segments keep taking
// precedence, so their behaviour is unchanged. This exists so the MAP/PLAY
// links in the shell resolve for a crater added by configuration alone.
//
// No generateStaticParams: the static routes already pre-generate those paths,
// and generating them from here too would be a build-time collision.
import { notFound } from 'next/navigation';
import CraterWorkspace from '@/components/CraterWorkspace';
import { getCrater } from '@/lib/mars/craters';

const MODES = { map: 'MAP', play: 'PLAY' };

export default async function CraterModePage({ params }) {
  const { crater: id, mode } = await params;
  const crater = getCrater(id);
  const resolved = MODES[String(mode).toLowerCase()];
  if (!crater || !resolved) notFound();
  return <CraterWorkspace crater={crater} mode={resolved} />;
}
