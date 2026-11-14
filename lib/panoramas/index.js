// Projection helpers for the supplied Mastcam-Z panoramas.
// The files are cylindrical mosaics, NOT 2:1 equirectangular spheres, so each is mapped
// onto a band of a sphere whose angular size comes from the catalogue.
const D2R = Math.PI / 180;

export function projectionVerified(p) {
  return p.type === 'cylindrical-360' && p.solSource !== 'unknown';
}

/** Returns sphere-band parameters (radians) for THREE.SphereGeometry. */
export function bandForPanorama(p, azimuthSpanOverride) {
  const proj = p.projection;
  const span = Math.min(360, Math.max(30, azimuthSpanOverride || proj.azimuthSpanDeg));
  let vSpan = span / p.aspect; // equal degrees per pixel on both axes (assumption, see catalogue)
  vSpan = Math.min(vSpan, 170);
  let elTop = (proj.horizonFromTop || 0.12) * vSpan;
  if (elTop - vSpan < -90) elTop = vSpan - 90;
  if (elTop > 89) elTop = 89;
  return {
    spanDeg: span, vSpanDeg: vSpan, elTopDeg: elTop, elBottomDeg: elTop - vSpan,
    phiStart: 0, phiLength: span * D2R,
    thetaStart: (90 - elTop) * D2R, thetaLength: vSpan * D2R,
    centreYaw: Math.atan2(-Math.cos((span / 2) * D2R), -Math.sin((span / 2) * D2R)),
  };
}

export function describePanorama(p, site, mission) {
  const parts = [];
  if (p.mastcamZPanoramaNumber) parts.push(`Mastcam-Z 360° Panorama #${p.mastcamZPanoramaNumber}.`);
  if (p.sols) parts.push(p.sols[0] === p.sols[1] ? `Acquired on sol ${p.sols[0]}.` : `Acquired over sols ${p.sols[0]}-${p.sols[1]}.`);
  else parts.push('Acquisition sol not established.');
  if (mission) parts.push(`${mission.campaign}: ${mission.location}.`);
  return parts.join(' ');
}

export function projectionSummary(p) {
  if (p.type === 'vertical-projection') return 'Vertical (map-like) projection, shown flat.';
  if (projectionVerified(p)) return 'Full 360° cylindrical mosaic (ASU collection). Vertical scale and horizon height are estimated; heading is not registered to map north.';
  return 'Azimuth coverage of this file is not published. The wrap angle below is a guess you can adjust.';
}
