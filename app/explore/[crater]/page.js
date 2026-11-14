// Route for any crater in the registry that does not have a page of its own.
//
// Additive: /explore/gale and /explore/jezero are static segments and keep
// taking precedence, so their behaviour is unchanged. This exists so adding a
// crater needs only a configuration file — no new route, no change to a shared
// component. An id that is not registered is a 404.
// No generateStaticParams: /explore/gale has its own page, and pre-generating
// the same path from both would be a build-time collision. Rendered on demand.
import { notFound } from 'next/navigation';
import CraterWorkspace from '@/components/CraterWorkspace';
import { getCrater } from '@/lib/mars/craters';

export default async function CraterPage({ params }) {
  const { crater: id } = await params;
  const crater = getCrater(id);
  if (!crater) notFound();
  return <CraterWorkspace crater={crater} />;
}
