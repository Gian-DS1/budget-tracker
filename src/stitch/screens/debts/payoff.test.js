import { describe, it, expect } from 'vitest';
import { getPayoff } from './payoff';

describe('getPayoff', () => {
  it('proyecta liquidación con interés: meses > 0 e intereses > 0', () => {
    const r = getPayoff({ currentBalance: 100000, interestRate: 12, monthlyPayment: 5000, currency: 'DOP' });
    expect(r.coversInterest).toBe(true);
    expect(r.months).toBeGreaterThan(0);
    expect(r.totalInterest).toBeGreaterThan(0);
    expect(r.payoffDate).toBeInstanceOf(Date);
  });

  it('con interés 0 liquida en ceil(saldo/cuota) meses sin intereses', () => {
    const r = getPayoff({ currentBalance: 10000, interestRate: 0, monthlyPayment: 2500, currency: 'DOP' });
    expect(r.coversInterest).toBe(true);
    expect(r.months).toBe(4); // 10000 / 2500
    expect(r.totalInterest).toBe(0);
  });

  it('cuando la cuota no cubre el interés, coversInterest=false sin NaN', () => {
    // 100000 * 24%/12 = 2000 de interés mensual; cuota 1500 no alcanza.
    const r = getPayoff({ currentBalance: 100000, interestRate: 24, monthlyPayment: 1500, currency: 'DOP' });
    expect(r.coversInterest).toBe(false);
    expect(r.months).toBeNull();
    expect(r.totalInterest).toBeNull();
    expect(r.payoffDate).toBeNull();
  });

  it('cuota 0 → coversInterest=false', () => {
    const r = getPayoff({ currentBalance: 5000, interestRate: 5, monthlyPayment: 0, currency: 'DOP' });
    expect(r.coversInterest).toBe(false);
  });
});
