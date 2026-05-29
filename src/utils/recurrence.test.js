import { describe, it, expect } from 'vitest';
import { advanceDate } from './recurrence';

describe('advanceDate', () => {
  it('semanal suma 7 días', () => {
    expect(advanceDate('2026-05-10', 'weekly')).toBe('2026-05-17');
  });

  it('quincenal suma 14 días', () => {
    expect(advanceDate('2026-05-10', 'biweekly')).toBe('2026-05-24');
  });

  it('semanal cruza el fin de mes', () => {
    expect(advanceDate('2026-05-28', 'weekly')).toBe('2026-06-04');
  });

  it('mensual conserva el día', () => {
    expect(advanceDate('2026-05-15', 'monthly')).toBe('2026-06-15');
  });

  it('mensual recorta el día 31 a la longitud del mes destino', () => {
    expect(advanceDate('2026-01-31', 'monthly')).toBe('2026-02-28');
  });

  it('mensual cruza el fin de año', () => {
    expect(advanceDate('2026-12-10', 'monthly')).toBe('2027-01-10');
  });
});
