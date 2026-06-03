import { describe, it, expect } from 'vitest';
import { countUpValue } from './countUpValue';

describe('countUpValue', () => {
  it('progress 0 → from', () => {
    expect(countUpValue(100, 500, 0)).toBe(100);
  });

  it('progress 1 → to', () => {
    expect(countUpValue(100, 500, 1)).toBe(500);
  });

  it('clamp: progress <0 → from, >1 → to', () => {
    expect(countUpValue(0, 500, -0.5)).toBe(0);
    expect(countUpValue(0, 500, 2)).toBe(500);
  });

  it('a media animación está entre from y to (ease-out: ya pasó la mitad)', () => {
    const v = countUpValue(0, 100, 0.5);
    expect(v).toBeGreaterThan(0);
    expect(v).toBeLessThan(100);
    // ease-out: a la mitad del tiempo va MÁS de la mitad del recorrido.
    expect(v).toBeGreaterThan(50);
  });

  it('es monótona creciente en el tiempo (from<to)', () => {
    const a = countUpValue(0, 100, 0.25);
    const b = countUpValue(0, 100, 0.5);
    const c = countUpValue(0, 100, 0.75);
    expect(b).toBeGreaterThan(a);
    expect(c).toBeGreaterThan(b);
  });

  it('funciona con valores decrecientes (from>to)', () => {
    expect(countUpValue(500, 100, 0)).toBe(500);
    expect(countUpValue(500, 100, 1)).toBe(100);
    const mid = countUpValue(500, 100, 0.5);
    expect(mid).toBeLessThan(500);
    expect(mid).toBeGreaterThan(100);
  });
});
