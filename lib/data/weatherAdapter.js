// Adapter for NASA's rover daily weather feed (Curiosity REMS: registry D22).
// The field names below are the feed's own, so a crater using a different
// source needs its own adapter rather than a change here.
// "--" and other non-numeric values become null: a missing measurement stays missing.
const num = (v) => {
  if (v === null || v === undefined) return null;
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : null;
};
const text = (v) => (v === null || v === undefined || v === '--' || v === '' ? null : String(v));

export function parseWeather(feed) {
  const soles = (feed && feed.soles) || [];
  const records = soles
    .map((r) => ({
      sol: num(r.sol),
      date: text(r.terrestrial_date),
      ls: num(r.ls),
      season: text(r.season),
      minAir: num(r.min_temp),
      maxAir: num(r.max_temp),
      minGround: num(r.min_gts_temp),
      maxGround: num(r.max_gts_temp),
      pressure: num(r.pressure),
      pressureNote: text(r.pressure_string),
      opacity: text(r.atmo_opacity),
      uv: text(r.local_uv_irradiance_index),
      sunrise: text(r.sunrise),
      sunset: text(r.sunset),
      // Kept so the interface can state plainly that these are absent.
      windSpeed: num(r.wind_speed),
      windDirection: text(r.wind_direction),
      humidity: num(r.abs_humidity),
    }))
    .filter((r) => r.sol !== null)
    .sort((a, b) => a.sol - b.sol);
  const bySol = new Map(records.map((r) => [r.sol, r]));
  const anyWind = records.some((r) => r.windSpeed !== null || r.windDirection !== null);
  return { records, bySol, anyWind, descriptions: (feed && feed.descriptions) || null };
}
