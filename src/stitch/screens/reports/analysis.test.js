import { describe, it, expect } from 'vitest';
import { getAnalysis } from './analysis';

const base = {
  savingsRate: 0.1,
  topRising: null,
  concentration: null,
  trendDirection: 'flat',
  dti: 0,
  hasData: true,
};

describe('getAnalysis', () => {
  it('sin datos → un insight info neutro', () => {
    const r = getAnalysis({ ...base, hasData: false });
    expect(r).toHaveLength(1);
    expect(r[0].severity).toBe('info');
  });

  it('ahorro alto (>=20%) → insight good', () => {
    const r = getAnalysis({ ...base, savingsRate: 0.25 });
    const good = r.find((i) => i.severity === 'good');
    expect(good).toBeTruthy();
    expect(good.title.toLowerCase()).toContain('ahorr');
  });

  it('ahorro negativo → insight alert', () => {
    const r = getAnalysis({ ...base, savingsRate: -0.1 });
    const alert = r.find((i) => i.severity === 'alert');
    expect(alert).toBeTruthy();
  });

  it('categoría que sube → insight warn con nombre y %', () => {
    const r = getAnalysis({ ...base, topRising: { name: 'Restaurantes', deltaPct: 45, deltaAbs: 2000 } });
    const w = r.find((i) => i.severity === 'warn' && i.title.includes('Restaurantes'));
    expect(w).toBeTruthy();
    expect(w.body).toContain('45');
  });

  it('no genera insight de categoría si la subida es pequeña (<15%)', () => {
    const r = getAnalysis({ ...base, topRising: { name: 'Café', deltaPct: 5, deltaAbs: 50 } });
    expect(r.some((i) => i.title.includes('Café'))).toBe(false);
  });

  it('concentración >=50% → insight info con categoría y %', () => {
    const r = getAnalysis({ ...base, concentration: { name: 'Alquiler', pct: 60 } });
    const c = r.find((i) => i.title.includes('Alquiler') || i.body.includes('Alquiler'));
    expect(c).toBeTruthy();
    expect(c.body).toContain('60');
  });

  it('DTI alto (>=0.36) → insight warn de deuda', () => {
    const r = getAnalysis({ ...base, dti: 0.4 });
    const d = r.find((i) => i.severity === 'warn' && /deuda/i.test(i.title + i.body));
    expect(d).toBeTruthy();
  });

  it('ordena por severidad: alert antes que warn antes que good/info', () => {
    const r = getAnalysis({
      ...base,
      savingsRate: -0.05, // alert
      topRising: { name: 'Ocio', deltaPct: 30, deltaAbs: 800 }, // warn
      concentration: { name: 'Alquiler', pct: 55 }, // info
    });
    const order = r.map((i) => i.severity);
    const iAlert = order.indexOf('alert');
    const iWarn = order.indexOf('warn');
    expect(iAlert).toBeGreaterThanOrEqual(0);
    expect(iWarn).toBeGreaterThan(iAlert);
  });
});
