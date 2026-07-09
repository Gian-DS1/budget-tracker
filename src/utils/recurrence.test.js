import { describe, it, expect } from 'vitest';
import { advanceDate, nextMonthlyOccurrence } from './recurrence';

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

describe('nextMonthlyOccurrence', () => {
  it('el día de pago ya pasó → rueda al mes siguiente (jul 26 → ago 26)', () => {
    // Caso del enunciado: la próxima fecha de pago avanza sola cuando el día pasa.
    expect(nextMonthlyOccurrence('2026-07-26', new Date(2026, 7, 1))).toBe('2026-08-26');
  });

  it('el mismo día de pago aún cuenta como hoy (no rueda todavía)', () => {
    expect(nextMonthlyOccurrence('2026-07-26', new Date(2026, 6, 26))).toBe('2026-07-26');
  });

  it('el día después del pago rueda al mes siguiente', () => {
    expect(nextMonthlyOccurrence('2026-07-26', new Date(2026, 6, 27))).toBe('2026-08-26');
  });

  it('ancla en el futuro se conserva (no se adelanta a un ciclo anterior)', () => {
    expect(nextMonthlyOccurrence('2026-09-15', new Date(2026, 6, 8))).toBe('2026-09-15');
  });

  it('conserva el día 31 recortándolo por mes al rodar', () => {
    // Feb se recorta a 28, pero marzo recupera el 31 (no se queda pegado en 28).
    expect(nextMonthlyOccurrence('2026-01-31', new Date(2026, 2, 1))).toBe('2026-03-31');
  });

  it('rueda cruzando el fin de año', () => {
    expect(nextMonthlyOccurrence('2026-12-20', new Date(2027, 0, 5))).toBe('2027-01-20');
  });

  it('ancla nula o vacía → null', () => {
    expect(nextMonthlyOccurrence('', new Date(2026, 6, 8))).toBeNull();
    expect(nextMonthlyOccurrence(null, new Date(2026, 6, 8))).toBeNull();
  });

  it('ignora la parte de hora del ancla', () => {
    expect(nextMonthlyOccurrence('2026-07-26T14:30:00', new Date(2026, 7, 1))).toBe('2026-08-26');
  });
});
