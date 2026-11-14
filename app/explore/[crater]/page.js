// Route for any crater in the registry that does not have a page of its own.
//
// Additive: /explore/gale and /explore/jezero are static segments and keep
// taking precedence, so their behaviour is unchanged. This exists so adding a
// crater needs only a configuration file — no new route, no change to a shared
// component. An id that is not registered is a 404.
// No generateStaticParams: /explore/gale has its own page, and pre-generating
// the same path from both would be a build-time collision. Rendered on demand.
import { notFound, redirect } from 'next/navigation';
import { getCrater } from '@/lib/mars/craters';

// Mirrors /explore/gale and /explore/jezero, which redirect to their MAP.
export default async function CraterPage({ params }) {
  const { crater: id } = await params;
  const crater = getCrater(id);
  if (!crater) notFound();
  redirect(`/explore/${crater.id}/map`);
}
