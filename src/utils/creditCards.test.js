import { describe, it, expect } from 'vitest';
import { getCardCycles, getStatementAmount, isStatementPaid } from './creditCards';

describe('getCardCycles', () => {
  it('corte 20 / pago 5: el pago cae el mes siguiente al corte', () => {
    const c = getCardCycles({ cutoffDay: 20, dueDay: 5 }, new Date(2026, 4, 28));
    expect(c.lastCutoffISO).toBe('2026-05-20');
    expect(c.nextCutoffISO).toBe('2026-06-20');
    expect(c.openStartISO).toBe('2026-05-21');
    expect(c.openEndISO).toBe('2026-06-20');
    expect(c.closedStartISO).toBe('2026-04-21');
    expect(c.closedEndISO).toBe('2026-05-20');
    expect(c.dueDateISO).toBe('2026-06-05');
  });

  it('corte 5 / pago 25: el pago cae el mismo mes del corte', () => {
    const c = getCardCycles({ cutoffDay: 5, dueDay: 25 }, new Date(2026, 4, 28));
    expect(c.lastCutoffISO).toBe('2026-05-05');
    expect(c.nextCutoffISO).toBe('2026-06-05');
    expect(c.closedStartISO).toBe('2026-04-06');
    expect(c.closedEndISO).toBe('2026-05-05');
    expect(c.dueDateISO).toBe('2026-05-25');
  });

  it('ajusta el día 31 a meses cortos (febrero)', () => {
    const c = getCardCycles({ cutoffDay: 31, dueDay: 15 }, new Date(2026, 1, 15));
    expect(c.lastCutoffISO).toBe('2026-01-31');
    expect(c.nextCutoffISO).toBe('2026-02-28');
  });
});

describe('getStatementAmount', () => {
  it('suma solo las transacciones de esa tarjeta dentro de la ventana', () => {
    const txs = [
      { cardId: 'c1', date: '2026-05-10', amount: 1000 },
      { cardId: 'c1', date: '2026-05-25', amount: 500 },
      { cardId: 'c2', date: '2026-05-10', amount: 999 },
      { cardId: 'c1', date: '2026-04-30', amount: 200 },
    ];
    expect(getStatementAmount(txs, 'c1', '2026-05-01', '2026-05-20')).toBe(1000);
  });
});

describe('isStatementPaid', () => {
  it('detecta el ciclo marcado como pagado', () => {
    const card = { paidCycles: ['2026-05-20'] };
    expect(isStatementPaid(card, '2026-05-20')).toBe(true);
    expect(isStatementPaid(card, '2026-06-20')).toBe(false);
  });
});
