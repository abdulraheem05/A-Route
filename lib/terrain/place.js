// Places a lon/lat on the rendered surface.
import { elevToY, lonLatToXZ } from '@/lib/coordinates/projection';
import { heightProvider } from '@/lib/terrain/heightProvider';

// Returns [x, y, z] in scene units. Height comes from MarsWalk's terrain where
// available, otherwise from the dataset's own elevation (fallbackElev, metres),
// otherwise the flat reference surface.
export function scenePosition(lon, lat, fallbackElev, exaggeration, liftM = 0) {
  const [x, z] = lonLatToXZ(lon, lat);
  let h = heightProvider.height(lon, lat);
  if (Number.isNaN(h)) h = heightProvider.hasData() && fallbackElev != null ? fallbackElev : 0;
  if (!heightProvider.hasData()) h = 0;
  const y = elevToY(h, exaggeration) + (liftM * Math.max(1, exaggeration)) / 1000;
  return [x, y, z];
}
