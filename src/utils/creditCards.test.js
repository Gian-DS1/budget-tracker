import { describe, it, expect } from 'vitest';
import { getCardCycles, getStatementAmount, isStatementPaid, computeCashback, getStatementHistory, getLifetimeCashback, paidCyclesToPayments, getCardBalances } from './creditCards';

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
  it('detecta el ciclo marcado como pagado (formato legado: strings)', () => {
    const card = { paidCycles: ['2026-05-20'] };
    expect(isStatementPaid(card, '2026-05-20')).toBe(true);
    expect(isStatementPaid(card, '2026-06-20')).toBe(false);
  });

  it('detecta el ciclo pagado (formato nuevo: objetos snapshot)', () => {
    const card = { paidCycles: [{ cycleEnd: '2026-05-20', amount: 1000, cashback: 30 }] };
    expect(isStatementPaid(card, '2026-05-20')).toBe(true);
    expect(isStatementPaid(card, '2026-06-20')).toBe(false);
  });

  it('soporta historiales mixtos (string + objeto)', () => {
    const card = { paidCycles: ['2026-04-20', { cycleEnd: '2026-05-20', cashback: 30 }] };
    expect(isStatementPaid(card, '2026-04-20')).toBe(true);
    expect(isStatementPaid(card, '2026-05-20')).toBe(true);
  });
});

describe('getStatementHistory / getLifetimeCashback', () => {
  it('ordena del más reciente al más antiguo y normaliza strings legados', () => {
    const card = { paidCycles: ['2026-03-20', { cycleEnd: '2026-05-20', amount: 1000, cashback: 30 }] };
    const hist = getStatementHistory(card);
    expect(hist.map((h) => h.cycleEnd)).toEqual(['2026-05-20', '2026-03-20']);
    expect(hist[1].cashback).toBe(0); // el legado no tenía cashback
  });

  it('suma el cashback acumulado de por vida', () => {
    const card = { paidCycles: [{ cycleEnd: '2026-04-20', cashback: 12.5 }, { cycleEnd: '2026-05-20', cashback: 30 }] };
    expect(getLifetimeCashback(card)).toBe(42.5);
  });

  it('devuelve vacío/0 si no hay historial', () => {
    expect(getStatementHistory({})).toEqual([]);
    expect(getLifetimeCashback({})).toBe(0);
  });
});

describe('computeCashback', () => {
  const card = {
    cashbackRules: [
      { categoryId: 'super', percentage: 3 },
      { categoryId: 'all', percentage: 1 },
    ],
  };

  it('aplica la regla de la categoría específica', () => {
    expect(computeCashback(card, 'super', 1000)).toBe(30);
  });

  it("usa la regla 'all' cuando no hay regla específica", () => {
    expect(computeCashback(card, 'otra', 1000)).toBe(10);
  });

  it('devuelve 0 si la tarjeta no tiene reglas o el monto es inválido', () => {
    expect(computeCashback({ cashbackRules: [] }, 'super', 1000)).toBe(0);
    expect(computeCashback(card, 'super', 0)).toBe(0);
    expect(computeCashback(null, 'super', 1000)).toBe(0);
  });

  it('soporta porcentajes con decimales', () => {
    expect(computeCashback({ cashbackRules: [{ categoryId: 'all', percentage: 1.5 }] }, 'x', 150)).toBe(2.25);
  });
});

describe('paidCyclesToPayments', () => {
  it('convierte entradas objeto usando su monto guardado', () => {
    const card = { id: 'c1', cutoffDay: 20, paidCycles: [
      { cycleEnd: '2026-04-20', amount: 8000, cashback: 200, paidAt: '2026-05-01' },
    ] };
    const out = paidCyclesToPayments(card, []);
    expect(out).toEqual([
      { id: 'mig-2026-04-20', amount: 8000, date: '2026-05-01', note: 'Migrado: estado de cuenta pagado' },
    ]);
  });

  it('reconstruye el monto de entradas string legado desde las transacciones', () => {
    const card = { id: 'c1', cutoffDay: 20, paidCycles: ['2026-04-20'] };
    // Ventana del ciclo que cierra el 2026-04-20: (2026-03-21 .. 2026-04-20)
    const txs = [
      { cardId: 'c1', date: '2026-04-10', amount: 3000, cashbackEarned: 0 },
      { cardId: 'c1', date: '2026-05-10', amount: 9999, cashbackEarned: 0 }, // fuera de la ventana
    ];
    const out = paidCyclesToPayments(card, txs);
    expect(out).toEqual([
      { id: 'mig-2026-04-20', amount: 3000, date: '2026-04-20', note: 'Migrado: estado de cuenta pagado' },
    ]);
  });

  it('descarta entradas que dan monto 0 y soporta tarjetas sin paidCycles', () => {
    expect(paidCyclesToPayments({ id: 'c1', cutoffDay: 20, paidCycles: ['2026-04-20'] }, [])).toEqual([]);
    expect(paidCyclesToPayments({ id: 'c1', cutoffDay: 20 }, [])).toEqual([]);
    expect(paidCyclesToPayments(null, [])).toEqual([]);
  });

  it('resta el cashback al reconstruir el monto de una entrada legada', () => {
    const card = { id: 'c1', cutoffDay: 20, paidCycles: ['2026-04-20'] };
    const txs = [{ cardId: 'c1', date: '2026-04-10', amount: 3000, cashbackEarned: 100 }];
    expect(paidCyclesToPayments(card, txs)).toEqual([
      { id: 'mig-2026-04-20', amount: 2900, date: '2026-04-20', note: 'Migrado: estado de cuenta pagado' },
    ]);
  });
});

describe('getCardBalances', () => {
  const card = { id: 'c1', cutoffDay: 20, dueDay: 5, payments: [] };
  const ref = new Date(2026, 4, 28); // corte 2026-05-20, pago 2026-06-05

  it('caso clienta: paga al corte, arrastra el ciclo abierto', () => {
    const txs = [
      { cardId: 'c1', date: '2026-05-10', amount: 10000, cashbackEarned: 0 }, // facturado
      { cardId: 'c1', date: '2026-05-25', amount: 5000, cashbackEarned: 0 },  // ciclo abierto
    ];
    const b0 = getCardBalances(card, txs, ref);
    expect(b0.billed).toBe(10000);
    expect(b0.open).toBe(5000);
    expect(b0.pendingBilled).toBe(10000);
    expect(b0.openCycle).toBe(5000);
    expect(b0.totalBalance).toBe(15000);
    expect(b0.isPaid).toBe(false);

    const paidCard = { ...card, payments: [{ id: 'a1', amount: 10000, date: '2026-05-21' }] };
    const b1 = getCardBalances(paidCard, txs, ref);
    expect(b1.pendingBilled).toBe(0);
    expect(b1.isPaid).toBe(true);
    expect(b1.openCycle).toBe(5000);
    expect(b1.totalBalance).toBe(5000);
  });

  it('caso sobregasto: abono parcial deja saldo arrastrado', () => {
    const txs = [{ cardId: 'c1', date: '2026-05-10', amount: 20000, cashbackEarned: 0 }];
    const c1 = { ...card, payments: [{ id: 'a1', amount: 12000, date: '2026-05-21' }] };
    expect(getCardBalances(c1, txs, ref).pendingBilled).toBe(8000);
    const c2 = { ...card, payments: [
      { id: 'a1', amount: 12000, date: '2026-05-21' },
      { id: 'a2', amount: 3000, date: '2026-05-28' },
    ] };
    expect(getCardBalances(c2, txs, ref).pendingBilled).toBe(5000);
  });

  it('sobre-abono (prepago): el excedente reduce el ciclo abierto, nada negativo', () => {
    const txs = [
      { cardId: 'c1', date: '2026-05-10', amount: 10000, cashbackEarned: 0 },
      { cardId: 'c1', date: '2026-05-25', amount: 5000, cashbackEarned: 0 },
    ];
    const c = { ...card, payments: [{ id: 'a1', amount: 12000, date: '2026-05-21' }] };
    const b = getCardBalances(c, txs, ref);
    expect(b.pendingBilled).toBe(0);
    expect(b.overpay).toBe(2000);
    expect(b.openCycle).toBe(3000);
    expect(b.totalBalance).toBe(3000);
  });

  it('spansMultipleCycles cuando hay saldo de meses anteriores sin pagar', () => {
    const txs = [
      { cardId: 'c1', date: '2026-03-10', amount: 5000, cashbackEarned: 0 },  // ciclo viejo
      { cardId: 'c1', date: '2026-05-10', amount: 10000, cashbackEarned: 0 }, // ciclo actual
    ];
    expect(getCardBalances({ ...card }, txs, ref).spansMultipleCycles).toBe(true);
    const conAbono = { ...card, payments: [{ id: 'a1', amount: 5000, date: '2026-05-21' }] };
    expect(getCardBalances(conAbono, txs, ref).spansMultipleCycles).toBe(false);
  });

  it('descuenta el cashback del monto facturado', () => {
    const txs = [{ cardId: 'c1', date: '2026-05-10', amount: 10000, cashbackEarned: 300 }];
    expect(getCardBalances(card, txs, ref).billed).toBe(9700);
    expect(getCardBalances(card, txs, ref).pendingBilled).toBe(9700);
  });

  it('un paidCycle legado cuenta como abonado (saldo cuadra)', () => {
    const txs = [{ cardId: 'c1', date: '2026-04-10', amount: 8000, cashbackEarned: 0 }];
    const legacy = { id: 'c1', cutoffDay: 20, dueDay: 5, payments: [],
      paidCycles: [{ cycleEnd: '2026-04-20', amount: 8000, paidAt: '2026-05-01' }] };
    const b = getCardBalances(legacy, txs, ref);
    expect(b.billed).toBe(8000);
    expect(b.paid).toBe(8000);
    expect(b.pendingBilled).toBe(0);
    expect(b.isPaid).toBe(true);
  });
});
