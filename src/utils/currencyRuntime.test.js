import { describe, it, expect, beforeEach } from 'vitest';
import { getCurrency, setRuntimeCurrency } from './currencyRuntime';

describe('currencyRuntime', () => {
  beforeEach(() => setRuntimeCurrency(null));

  it('por defecto devuelve DOP (compatibilidad con datos existentes)', () => {
    expect(getCurrency()).toBe('DOP');
  });

  it('devuelve la moneda fijada', () => {
    setRuntimeCurrency('EUR');
    expect(getCurrency()).toBe('EUR');
  });

  it('ignora valores no ISO (3 letras)', () => {
    setRuntimeCurrency('eur');
    expect(getCurrency()).toBe('EUR'); // normaliza a mayúsculas
    setRuntimeCurrency('x');
    expect(getCurrency()).toBe('DOP'); // inválido → default
  });
});
