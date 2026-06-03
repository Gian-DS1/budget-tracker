// Interpolación pura con easing ease-out (cubic) para el count-up. Separada de
// CountUp.jsx para no romper fast-refresh (que exige que los .jsx solo exporten
// componentes). progress se clampa a [0,1].
export function countUpValue(from, to, progress) {
  const p = Math.max(0, Math.min(1, progress));
  const eased = 1 - Math.pow(1 - p, 3); // ease-out cubic
  return from + (to - from) * eased;
}
