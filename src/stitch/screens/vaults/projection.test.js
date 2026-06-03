import { describe, it, expect } from 'vitest';
import { getProjection } from './projection';

describe('getProjection', () => {
  it('con aporte mensual proyecta meses, fecha y restante', () => {
    const r = getProjection({ currentAmount: 60000, targetAmount: 100000, monthlyContribution: 10000 });
    expect(r.done).toBe(false);
    expect(r.reachable).toBe(true);
    expect(r.months).toBe(4); // (100000-60000)/10000
    expect(r.remaining).toBe(40000);
    expect(r.projectedDate).toBeInstanceOf(Date);
    expect(r.pct).toBeCloseTo(60);
  });

  it('meta completada → done=true, remaining 0, sin proyección de meses', () => {
    const r = getProjection({ currentAmount: 90000, targetAmount: 90000, monthlyContribution: 5000 });
    expect(r.done).toBe(true);
    expect(r.remaining).toBe(0);
    expect(r.months).toBe(0);
    expect(r.pct).toBe(100);
    expect(r.projectedDate).toBeNull();
  });

  it('saldo por encima de la meta → done, pct tope 100, remaining 0', () => {
    const r = getProjection({ currentAmount: 120000, targetAmount: 100000, monthlyContribution: 5000 });
    expect(r.done).toBe(true);
    expect(r.remaining).toBe(0);
    expect(r.pct).toBe(100);
  });

  it('aporte mensual 0 → no reachable, sin fecha', () => {
    const r = getProjection({ currentAmount: 10000, targetAmount: 50000, monthlyContribution: 0 });
    expect(r.reachable).toBe(false);
    expect(r.projectedDate).toBeNull();
    expect(r.done).toBe(false);
    expect(r.remaining).toBe(40000);
    expect(r.months).toBeNull();
  });

  it('meta 0 → pct 0 sin dividir por cero', () => {
    const r = getProjection({ currentAmount: 0, targetAmount: 0, monthlyContribution: 1000 });
    expect(r.pct).toBe(0);
    expect(r.done).toBe(false);
    expect(r.reachable).toBe(false);
    expect(r.months).toBeNull();
    expect(r.projectedDate).toBeNull();
    expect(r.remaining).toBe(0);
  });
});
