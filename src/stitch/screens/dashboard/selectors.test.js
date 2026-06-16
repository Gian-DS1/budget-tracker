import { describe, it, expect } from 'vitest';
import { getCategoryBreakdown, getBudgetUsage, getBudgetPace, getNetWorthSplit, getLiquidCash, getLiquidDelta, getFirstDataMonth, getCumulativeLiquidWealth, getCashShortfall, canAffordPayment } from './selectors';

const cats = [
  { id: 'c1', name: 'Supermercado', color: '#aaa' },
  { id: 'c2', name: 'Transporte', color: '#bbb' },
  { id: 'c3', name: 'Restaurantes', color: '#ccc' },
  { id: 'c4', name: 'Suscripciones', color: '#ddd' },
  { id: 'c5', name: 'Salud', color: '#eee' },
  { id: 'c6', name: 'Ropa', color: '#fff' },
  { id: 'c7', name: 'Otros gastos', color: '#111' },
];
const tx = (categoryId, amount, type = 'variable_expense', cashbackEarned = 0) => ({ categoryId, amount, type, cashbackEarned });

describe('getCategoryBreakdown', () => {
  it('sin gastos → arreglo vacío', () => {
    expect(getCategoryBreakdown([], cats)).toEqual([]);
  });

  it('ignora ingresos y ahorros; resta cashback', () => {
    const txs = [tx('c1', 1000, 'income'), tx('c1', 500, 'savings'), tx('c1', 200, 'variable_expense', 20)];
    const r = getCategoryBreakdown(txs, cats);
    expect(r).toHaveLength(1);
    expect(r[0].name).toBe('Supermercado');
    expect(r[0].value).toBe(180); // 200 - 20 cashback
  });

  it('con ≤5 categorías no agrega "Otros"', () => {
    const txs = [tx('c1', 500), tx('c2', 400), tx('c3', 300)];
    const r = getCategoryBreakdown(txs, cats);
    expect(r.map((x) => x.name)).toEqual(['Supermercado', 'Transporte', 'Restaurantes']);
    expect(r.some((x) => x.name === 'Otros')).toBe(false);
  });

  it('con >5 categorías deja top 5 y agrega "Otros" con el resto', () => {
    const txs = [tx('c1', 600), tx('c2', 500), tx('c3', 400), tx('c4', 300), tx('c5', 200), tx('c6', 100), tx('c7', 50)];
    const r = getCategoryBreakdown(txs, cats);
    expect(r).toHaveLength(6); // top 5 + Otros
    expect(r[5].name).toBe('Otros');
    expect(r[5].value).toBe(150); // 100 + 50
  });

  it('ordena de mayor a menor', () => {
    const txs = [tx('c2', 100), tx('c1', 900)];
    const r = getCategoryBreakdown(txs, cats);
    expect(r[0].name).toBe('Supermercado');
    expect(r[0].value).toBe(900);
  });
});

describe('getBudgetUsage', () => {
  it('sin ingreso ni plan → null', () => {
    expect(getBudgetUsage({ estado: 'neutral', gastosFijosPlan: 0, gastosVariablesPlan: 0, ahorroPlan: 0, gastosFijosReal: 0, variableGastado: 0, ahorroReal: 0 })).toBeNull();
  });

  it('calcula gastado, presupuestado, pct y estado', () => {
    const r = getBudgetUsage({ estado: 'good', gastosFijosPlan: 20000, gastosVariablesPlan: 10000, ahorroPlan: 5000, gastosFijosReal: 18000, variableGastado: 7000, ahorroReal: 5000 });
    expect(r.budgeted).toBe(35000); // 20000+10000+5000
    expect(r.spent).toBe(30000);    // 18000+7000+5000
    expect(r.pct).toBeCloseTo((30000 / 35000) * 100);
    expect(r.estado).toBe('good');
    expect(r.overBudget).toBe(false);
  });

  it('marca sobregiro cuando gastado supera presupuestado', () => {
    const r = getBudgetUsage({ estado: 'danger', gastosFijosPlan: 10000, gastosVariablesPlan: 0, ahorroPlan: 0, gastosFijosReal: 12000, variableGastado: 0, ahorroReal: 0 });
    expect(r.overBudget).toBe(true);
    expect(r.pct).toBe(100); // tope visual
  });
});

describe('getBudgetPace', () => {
  const usage = (spent, budgeted, overBudget = spent > budgeted) => ({ spent, budgeted, overBudget, pct: Math.min(100, (spent / budgeted) * 100), estado: 'good' });

  it('mes pasado o sin presupuesto → null', () => {
    expect(getBudgetPace(usage(100, 1000), { isCurrentMonth: false, dayOfMonth: 10, daysInMonth: 30 })).toBeNull();
    expect(getBudgetPace(null, { isCurrentMonth: true, dayOfMonth: 10, daysInMonth: 30 })).toBeNull();
  });

  it('gasto por debajo del ritmo → ontrack con sobrante proyectado', () => {
    // Día 15 de 30 (50% del mes), gastado 40% del presupuesto.
    const r = getBudgetPace(usage(4000, 10000), { isCurrentMonth: true, dayOfMonth: 15, daysInMonth: 30 });
    expect(r.verdict).toBe('ontrack');
    expect(r.monthPct).toBeCloseTo(50);
    expect(r.projected).toBeCloseTo(8000); // 4000/15*30
    expect(r.leftover).toBeCloseTo(2000);
    expect(r.runOutDay).toBeNull();
  });

  it('gasto acelerado → fast con día estimado de agotamiento', () => {
    // Día 10 de 30, gastado 50%: proyección 15000 sobre 10000.
    const r = getBudgetPace(usage(5000, 10000), { isCurrentMonth: true, dayOfMonth: 10, daysInMonth: 30 });
    expect(r.verdict).toBe('fast');
    expect(r.projected).toBeCloseTo(15000);
    expect(r.runOutDay).toBe(20); // 10000 / (5000/10)
  });

  it('ya sobregirado → over', () => {
    const r = getBudgetPace(usage(12000, 10000), { isCurrentMonth: true, dayOfMonth: 20, daysInMonth: 30 });
    expect(r.verdict).toBe('over');
  });

  it('día 1 no divide por cero y clampa al rango del mes', () => {
    const r = getBudgetPace(usage(500, 10000), { isCurrentMonth: true, dayOfMonth: 0, daysInMonth: 30 });
    expect(r.verdict).toBe('fast'); // 500/1*30 = 15000 > 10000
    expect(r.runOutDay).toBe(20);
  });
});

describe('getLiquidCash', () => {
  it('sin transacciones → solo el saldo inicial', () => {
    expect(getLiquidCash([], 50000, [])).toBe(50000);
  });

  it('los ingresos suben el efectivo', () => {
    const txs = [tx('c1', 1000, 'income')];
    expect(getLiquidCash(txs, 0, [])).toBe(1000);
  });

  it('los gastos SIN tarjeta bajan el efectivo, netos de cashback', () => {
    // gasto 200 con 20 de cashback, sin tarjeta → resta 180
    const txs = [tx('c1', 200, 'variable_expense', 20)];
    expect(getLiquidCash(txs, 1000, [])).toBe(820);
  });

  it('los gastos CON tarjeta NO bajan el efectivo (sigue en el banco)', () => {
    // gasto con cardId: el efectivo no se mueve hasta pagar la tarjeta
    const txs = [{ categoryId: 'c1', amount: 500, type: 'variable_expense', cashbackEarned: 0, cardId: 'cc1' }];
    expect(getLiquidCash(txs, 1000, [])).toBe(1000);
  });

  it('los pagos de tarjeta SÍ bajan el efectivo', () => {
    const cards = [{ id: 'cc1', payments: [{ id: 'p1', amount: 300 }, { id: 'p2', amount: 200 }] }];
    expect(getLiquidCash([], 1000, cards)).toBe(500);
  });

  it('los apartados a ahorro (savings) bajan el efectivo', () => {
    const txs = [tx('c1', 500, 'savings')];
    expect(getLiquidCash(txs, 1000, [])).toBe(500);
  });

  it('combina saldo, ingresos, gastos sin/con tarjeta, ahorros y pagos de tarjeta', () => {
    const txs = [
      tx('c1', 2000, 'income'),
      tx('c2', 300, 'variable_expense', 0),                                              // sin tarjeta: resta 300
      { categoryId: 'c3', amount: 800, type: 'variable_expense', cashbackEarned: 0, cardId: 'cc1' }, // con tarjeta: no resta
      tx('c4', 500, 'savings'),                                                          // resta 500
    ];
    const cards = [{ id: 'cc1', payments: [{ id: 'p1', amount: 600 }] }];               // pago tarjeta: resta 600
    // 1000 + 2000 - 300 - 500 - 600 = 1600
    expect(getLiquidCash(txs, 1000, cards)).toBe(1600);
  });

  it('saldo inicial inválido o ausente → tratado como 0; cards opcional', () => {
    expect(getLiquidCash([tx('c1', 100, 'income')], undefined, undefined)).toBe(100);
  });
});

describe('getLiquidDelta', () => {
  it('sin transacciones → 0', () => {
    expect(getLiquidDelta([])).toBe(0);
  });

  it('income − gastos sin tarjeta netos − savings del mes', () => {
    const txs = [
      tx('c1', 5000, 'income'),
      tx('c2', 1200, 'variable_expense', 200), // sin tarjeta, neto 1000
      tx('c3', 500, 'savings'),
    ];
    // 5000 - 1000 - 500 = 3500
    expect(getLiquidDelta(txs)).toBe(3500);
  });

  it('los gastos con tarjeta NO afectan el delta', () => {
    const txs = [
      tx('c1', 5000, 'income'),
      { categoryId: 'c2', amount: 2000, type: 'variable_expense', cashbackEarned: 0, cardId: 'cc1' },
    ];
    expect(getLiquidDelta(txs)).toBe(5000);
  });

  it('los pagos de tarjeta del mes restan del delta', () => {
    const txs = [tx('c1', 5000, 'income')];
    // pago de tarjeta en el mes del cálculo (year/month)
    const cards = [{ id: 'cc1', payments: [{ id: 'p1', amount: 1200, date: '2026-06-10' }] }];
    expect(getLiquidDelta(txs, cards, 2026, 5)).toBe(3800); // 5000 - 1200
  });

  it('mes negativo cuando se gasta más de lo que entra', () => {
    const txs = [tx('c1', 1000, 'income'), tx('c2', 1500, 'fixed_expense', 0)];
    expect(getLiquidDelta(txs)).toBe(-500);
  });
});

describe('getNetWorthSplit', () => {
  it('sin datos → hasData false', () => {
    const r = getNetWorthSplit(0, 0);
    expect(r.hasData).toBe(false);
  });

  it('solo ahorro → 100% ahorro', () => {
    const r = getNetWorthSplit(50000, 0);
    expect(r.savedPct).toBe(100);
    expect(r.debtPct).toBe(0);
    expect(r.netWorth).toBe(50000);
    expect(r.hasData).toBe(true);
  });

  it('ahorro + deuda → proporciones y patrimonio neto', () => {
    const r = getNetWorthSplit(60000, 40000);
    expect(r.savedPct).toBeCloseTo(60);
    expect(r.debtPct).toBeCloseTo(40);
    expect(r.netWorth).toBe(20000);
  });
});

describe('getFirstDataMonth', () => {
  const dtx = (date, type = 'income') => ({ categoryId: 'c1', amount: 100, type, cashbackEarned: 0, date });

  it('sin transacciones → null', () => {
    expect(getFirstDataMonth([])).toBeNull();
  });

  it('devuelve el {y, m} de la transacción más antigua', () => {
    const txs = [dtx('2026-03-10'), dtx('2026-01-05'), dtx('2026-06-20')];
    expect(getFirstDataMonth(txs)).toEqual({ y: 2026, m: 0 }); // enero = 0
  });

  it('cruza el cambio de año', () => {
    const txs = [dtx('2026-02-01'), dtx('2025-11-15')];
    expect(getFirstDataMonth(txs)).toEqual({ y: 2025, m: 10 }); // noviembre = 10
  });
});

describe('getCumulativeLiquidWealth', () => {
  const ref = new Date('2026-03-15T00:00:00');
  const t = (amount, type, date, extra = {}) => ({ categoryId: 'c1', amount, type, cashbackEarned: 0, date, ...extra });

  it('acumula efectivo + ahorros al cierre de cada mes (saldo corrido)', () => {
    const txs = [
      t(1000, 'income', '2026-01-10'),          // ene: +1000 efectivo
      t(300, 'variable_expense', '2026-02-05'), // feb: -300 efectivo (sin tarjeta)
      t(200, 'savings', '2026-03-08'),          // mar: -200 efectivo, +200 ahorro
    ];
    // saldo inicial 500, 3 meses, currentSavings hoy = 200 (el unico aporte).
    const r = getCumulativeLiquidWealth(txs, 500, 3, ref, [], 200);
    expect(r).toHaveLength(3);
    // ene: efectivo 500+1000=1500, ahorro 200-200(aporte mar posterior)=0 → wealth 1500
    expect(r[0].wealth).toBe(1500);
    // feb: efectivo 1500-300=1200, ahorro 0 → wealth 1200
    expect(r[1].wealth).toBe(1200);
    // mar: efectivo 1200-200=1000, ahorro 200 → wealth 1200 (apartar no cambia el total)
    expect(r[2].wealth).toBe(1200);
  });

  it('desglosa wealth en cash (efectivo) y savings (ahorro) por mes', () => {
    const txs = [
      t(1000, 'income', '2026-01-10'),  // ene: efectivo +1000
      t(200, 'savings', '2026-03-08'),  // mar: efectivo -200, ahorro +200
    ];
    // currentSavings (hoy) = 200 (solo el aporte registrado, sin saldo previo).
    const r = getCumulativeLiquidWealth(txs, 500, 3, ref, [], 200);
    // mar: cash = 500+1000-200 = 1300, savings = 200, wealth = 1500
    expect(r[2].cash).toBe(1300);
    expect(r[2].savings).toBe(200);
    expect(r[2].wealth).toBe(r[2].cash + r[2].savings);
  });

  it('el ahorro parte del total REAL de hoy (incluye saldo previo de las metas)', () => {
    // currentSavings hoy = 605000 (metas con saldo previo). Solo 1 aporte de 5000
    // registrado en marzo. El mes actual debe mostrar 605000, no 5000.
    const txs = [t(5000, 'savings', '2026-03-10')];
    const r = getCumulativeLiquidWealth(txs, 0, 3, ref, [], 605000);
    const mar = r[r.length - 1]; // mes actual (marzo, = ref)
    expect(mar.savings).toBe(605000);
  });

  it('reconstruye el ahorro historico restando aportes posteriores', () => {
    // Hoy hay 600000 ahorrado. En marzo se aporto 100000. Antes de marzo (feb y
    // ene) el ahorro era 600000 - 100000 = 500000. La tx de enero asegura un rango
    // de 3 meses (el clamp no acorta por falta de datos previos).
    const txs = [t(1, 'income', '2026-01-02'), t(100000, 'savings', '2026-03-15')];
    const r = getCumulativeLiquidWealth(txs, 0, 3, ref, [], 600000);
    expect(r).toHaveLength(3);
    expect(r[0].savings).toBe(500000); // enero: antes del aporte de marzo
    expect(r[1].savings).toBe(500000); // febrero: idem
    expect(r[2].savings).toBe(600000); // marzo: ya incluye el aporte
  });

  it('los gastos con tarjeta no bajan el efectivo de la línea', () => {
    const txs = [
      t(1000, 'income', '2026-03-01'),
      t(400, 'variable_expense', '2026-03-05', { cardId: 'cc1' }), // con tarjeta: no resta
    ];
    const r = getCumulativeLiquidWealth(txs, 0, 1, ref);
    expect(r[r.length - 1].wealth).toBe(1000);
  });

  it('los pagos de tarjeta SÍ bajan el efectivo de la línea, según su fecha', () => {
    // El pago de tarjeta es cuando el efectivo sale del banco: debe restar del
    // efectivo acumulado en los meses ≥ a su fecha, no antes. Misma regla que
    // getLiquidCash (consistencia entre el gráfico y "Mis finanzas").
    const txs = [t(1000, 'income', '2026-01-10')]; // ene: +1000 efectivo
    const cards = [{ id: 'cc1', cutoffDay: 25, dueDay: 5, payments: [
      { id: 'p1', amount: 400, date: '2026-02-15' }, // pago en febrero
    ] }];
    const r = getCumulativeLiquidWealth(txs, 0, 3, ref, cards, 0);
    expect(r[0].cash).toBe(1000); // ene: antes del pago → sin restar
    expect(r[1].cash).toBe(600);  // feb: ya restó el pago de 400
    expect(r[2].cash).toBe(600);  // mar: sigue restado
  });

  it('calcula savingsRate por mes: (income − gasto) / income', () => {
    const txs = [t(5000, 'income', '2026-03-02'), t(1000, 'variable_expense', '2026-03-09')];
    const r = getCumulativeLiquidWealth(txs, 0, 1, ref);
    const mar = r[r.length - 1];
    // (5000 - 1000) / 5000 = 0.8 → 80%
    expect(mar.savingsRate).toBeCloseTo(80);
  });

  it('savingsRate es 0 cuando no hay ingresos del mes', () => {
    const txs = [t(500, 'variable_expense', '2026-03-09')];
    const r = getCumulativeLiquidWealth(txs, 0, 1, ref);
    expect(r[r.length - 1].savingsRate).toBe(0);
  });

  it('cardsDue: 0 si no se pasan tarjetas; usa getCardBalances si se pasan', () => {
    const txs = [t(5000, 'income', '2026-03-02')];
    const sinCards = getCumulativeLiquidWealth(txs, 0, 1, ref);
    expect(sinCards[0].cardsDue).toBe(0);
  });

  it('incluye income y expense del mes en cada punto (para las barras)', () => {
    const txs = [t(5000, 'income', '2026-03-02'), t(1200, 'variable_expense', '2026-03-09')];
    const r = getCumulativeLiquidWealth(txs, 0, 1, ref);
    const mar = r[r.length - 1];
    expect(mar.income).toBe(5000);
    expect(mar.expense).toBe(1200);
  });
});

describe('getCashShortfall', () => {
  it('pago cubierto por el efectivo → shortfall 0', () => {
    const r = getCashShortfall([], 5000, [], 3000);
    expect(r.available).toBe(5000);
    expect(r.shortfall).toBe(0);
  });

  it('pago mayor que el efectivo → shortfall = diferencia', () => {
    const r = getCashShortfall([], 5000, [], 8000);
    expect(r.available).toBe(5000);
    expect(r.shortfall).toBe(3000);
  });

  it('considera los movimientos en el efectivo disponible', () => {
    const txs = [{ categoryId: 'c1', amount: 1000, type: 'income', cashbackEarned: 0 }];
    const r = getCashShortfall(txs, 5000, [], 7000);
    expect(r.available).toBe(6000);
    expect(r.shortfall).toBe(1000);
  });
});

describe('canAffordPayment', () => {
  it('alcanza cuando efectivo + ahorros ≥ pago', () => {
    expect(canAffordPayment(5000, 10000, 12000)).toBe(true);
  });

  it('no alcanza cuando efectivo + ahorros < pago', () => {
    expect(canAffordPayment(5000, 4000, 12000)).toBe(false);
  });

  it('límite exacto cuenta como alcanza', () => {
    expect(canAffordPayment(5000, 5000, 10000)).toBe(true);
  });
});

