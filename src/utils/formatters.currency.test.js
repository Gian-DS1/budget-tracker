import { describe, it, expect, beforeEach } from 'vitest';
import { formatCurrency, formatCurrencyCompact } from './formatters';
import { setRuntimeCurrency } from './currencyRuntime';
import { setRuntimeLanguage } from '../i18n/runtime';

describe('formatCurrency global', () => {
  beforeEach(() => { setRuntimeLanguage('es'); setRuntimeCurrency(null); });

  it('sin moneda explícita usa la del usuario (runtime)', () => {
    setRuntimeCurrency('EUR');
    expect(formatCurrency(1234.5)).toMatch(/€/);
    expect(formatCurrency(1234.5)).toMatch(/1.?234[.,]50/);
  });

  it('default DOP cuando no hay moneda elegida', () => {
    expect(formatCurrency(100)).toMatch(/DOP|RD\$/);
  });

  it('negativos llevan signo', () => {
    setRuntimeCurrency('USD');
    expect(formatCurrency(-50)).toMatch(/-/);
  });

  it('código explícito sigue ganando (transición)', () => {
    setRuntimeCurrency('EUR');
    expect(formatCurrency(10, 'USD')).toMatch(/US\$|\$/);
  });

  it('compact abrevia miles y millones con símbolo', () => {
    setRuntimeCurrency('USD');
    expect(formatCurrencyCompact(1500)).toMatch(/1[.,]5\s?K/i);
    expect(formatCurrencyCompact(2_300_000)).toMatch(/2[.,]3\s?M/i);
  });

  it('moneda desconocida no explota (cae al código tal cual)', () => {
    setRuntimeCurrency('XXX');
    expect(() => formatCurrency(10)).not.toThrow();
  });
});
