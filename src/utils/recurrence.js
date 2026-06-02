// FinTrack — Lógica pura de recurrencia

import { toISODate } from './formatters';

/**
 * Avanza una fecha ISO (YYYY-MM-DD) según la frecuencia.
 * - weekly: +7 días, biweekly: +14 días.
 * - monthly: mismo día del mes siguiente, recortado a la longitud del mes
 *   destino (ej. 31 ene → 28/29 feb).
 */
export function advanceDate(iso, frequency) {
  const [y, m, d] = iso.split('-').map(Number);
  if (frequency === 'weekly' || frequency === 'biweekly') {
    const dt = new Date(y, m - 1, d);
    dt.setDate(dt.getDate() + (frequency === 'weekly' ? 7 : 14));
    return toISODate(dt);
  }
  // monthly
  let ny = y;
  let nm = m + 1;
  if (nm > 12) { nm = 1; ny += 1; }
  const lastDay = new Date(ny, nm, 0).getDate();
  const day = Math.min(d, lastDay);
  return `${ny}-${String(nm).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}
