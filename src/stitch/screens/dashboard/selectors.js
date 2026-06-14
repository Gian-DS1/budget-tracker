// Selectores puros del Dashboard. Helpers NUEVOS no cubiertos por utils:
// desglose top5+Otros, uso de presupuesto, split de patrimonio. La salud
// (getFinancialHealthScore) y la capacidad (getMonthlySavingCapacity) se reusan
// directo desde utils/calculations en el shell.
import { groupByCategory, getEffectiveAmount } from '../../../utils/calculations';
import { tr, monthShort } from '../../../i18n/runtime';

const OTROS_COLOR = '#6b7280';
const OTROS_ICON = '📦';

// Top 5 categorías de gasto del mes + "Otros". Reusa groupByCategory (que ya
// resta cashback vía getEffectiveAmount). Devuelve [{ name, value, color, icon }].
export function getCategoryBreakdown(monthTransactions, categories) {
  const expenses = monthTransactions.filter((t) =>
    ['expense', 'fixed_expense', 'variable_expense'].includes(t.type));
  if (expenses.length === 0) return [];

  const grouped = groupByCategory(expenses, categories)
    .map((g) => ({ name: g.category.name, value: g.total, color: g.category.color, icon: g.category.icon }))
    .filter((g) => g.value > 0)
    .sort((a, b) => b.value - a.value);
  if (grouped.length === 0) return [];

  if (grouped.length <= 5) return grouped;
  const top = grouped.slice(0, 5);
  const rest = grouped.slice(5).reduce((s, g) => s + g.value, 0);
  return [...top, { name: tr('screens.charts.others'), value: rest, color: OTROS_COLOR, icon: OTROS_ICON }];
}

// Uso del presupuesto del mes a partir del summary de getBudgetSummary.
// Presupuestado = planes fijos+variables+ahorro; gastado = reales+ahorro.
// null si no hay nada presupuestado.
export function getBudgetUsage(summary) {
  const budgeted = (Number(summary.gastosFijosPlan) || 0)
    + (Number(summary.gastosVariablesPlan) || 0)
    + (Number(summary.ahorroPlan) || 0);
  if (budgeted <= 0) return null;
  const spent = (Number(summary.gastosFijosReal) || 0)
    + (Number(summary.variableGastado) || 0)
    + (Number(summary.ahorroReal) || 0);
  const rawPct = (spent / budgeted) * 100;
  return {
    spent,
    budgeted,
    pct: Math.min(100, rawPct),
    overBudget: spent > budgeted,
    estado: summary.estado,
  };
}

// Ritmo del presupuesto del mes EN CURSO: compara el avance del gasto contra el
// avance del calendario y proyecta el cierre a ritmo constante. Para meses
// pasados (o sin presupuesto) devuelve null y la barra se muestra sin marcador.
// Devuelve { monthPct, projected, leftover, runOutDay, verdict } con verdict:
//   'over'    — ya se superó lo presupuestado
//   'fast'    — aún no, pero la proyección lo supera (runOutDay = día estimado)
//   'ontrack' — la proyección cierra dentro del presupuesto (leftover = sobrante)
export function getBudgetPace(usage, { isCurrentMonth, dayOfMonth, daysInMonth }) {
  if (!usage || !isCurrentMonth || !daysInMonth || daysInMonth <= 0) return null;
  const day = Math.max(1, Math.min(dayOfMonth, daysInMonth));
  const monthPct = (day / daysInMonth) * 100;

  const dailyRate = usage.spent / day;
  const projected = dailyRate * daysInMonth;
  const leftover = usage.budgeted - projected;

  let verdict, runOutDay = null;
  if (usage.overBudget) {
    verdict = 'over';
  } else if (projected > usage.budgeted) {
    verdict = 'fast';
    runOutDay = Math.min(daysInMonth, Math.ceil(usage.budgeted / dailyRate));
  } else {
    verdict = 'ontrack';
  }

  return { monthPct, projected, leftover, runOutDay, verdict };
}

const EXPENSE_TYPES = ['expense', 'fixed_expense', 'variable_expense'];

// Suma todos los pagos registrados a tarjetas (card.payments). Esos pagos son el
// momento en que el efectivo REALMENTE sale del banco para saldar la tarjeta.
function sumCardPayments(cards) {
  let total = 0;
  for (const c of cards || []) {
    for (const p of c.payments || []) total += Number(p.amount) || 0;
  }
  return total;
}

// Efectivo disponible (líquido) DERIVADO de los movimientos. Modela el efectivo
// REAL en la cuenta de banco:
//   + saldo inicial declarado
//   + ingresos
//   − gastos SIN tarjeta (netos de cashback)   ← un gasto con tarjeta NO sale del
//                                                 banco hasta pagar el estado de cuenta
//   − apartados a ahorro (tipo 'savings')
//   − pagos de tarjeta registrados (card.payments) ← aquí sí sale el efectivo
// Una sola fuente de verdad: transacciones + pagos de tarjeta. No se almacena saldo.
export function getLiquidCash(transactions, initialCashBalance, cards) {
  let cash = Number(initialCashBalance) || 0;
  for (const t of transactions || []) {
    if (t.type === 'income') cash += Number(t.amount) || 0;
    else if (EXPENSE_TYPES.includes(t.type)) {
      if (t.cardId) continue; // gasto con tarjeta: el efectivo sigue en el banco
      cash -= getEffectiveAmount(t);
    } else if (t.type === 'savings') cash -= Number(t.amount) || 0;
  }
  cash -= sumCardPayments(cards);
  return cash;
}

// Cambio del efectivo en el mes: income − gastos SIN tarjeta netos − apartados a
// ahorro − pagos de tarjeta hechos ESE mes. Misma regla que getLiquidCash pero sin
// saldo inicial (es un delta, no un saldo). `cards`/`year`/`month` son opcionales:
// si se pasan, se restan los pagos de tarjeta con fecha dentro de (year, month).
export function getLiquidDelta(monthTransactions, cards, year, month) {
  let delta = 0;
  for (const t of monthTransactions || []) {
    if (t.type === 'income') delta += Number(t.amount) || 0;
    else if (EXPENSE_TYPES.includes(t.type)) {
      if (t.cardId) continue; // gasto con tarjeta: no mueve el efectivo
      delta -= getEffectiveAmount(t);
    } else if (t.type === 'savings') delta -= Number(t.amount) || 0;
  }
  if (cards && year != null && month != null) {
    for (const c of cards) {
      for (const p of c.payments || []) {
        if (!p.date) continue;
        const d = new Date(p.date + 'T00:00:00');
        if (d.getFullYear() === year && d.getMonth() === month) delta -= Number(p.amount) || 0;
      }
    }
  }
  return delta;
}

// Lista de {y, m} para los `range` meses que terminan en refDate (incluido).
function monthsRange(range, refDate) {
  const out = [];
  for (let i = range - 1; i >= 0; i--) {
    let m = refDate.getMonth() - i;
    let y = refDate.getFullYear();
    while (m < 0) { m += 12; y -= 1; }
    out.push({ y, m });
  }
  return out;
}

const inMonth = (t, y, m) => {
  if (!t.date) return false;
  const d = new Date(t.date + 'T00:00:00');
  return d.getFullYear() === y && d.getMonth() === m;
};

// Ingreso y gasto (neto de cashback) por mes del rango. Movido desde reports/.
// Alimenta IncomeExpenseBars. Devuelve [{ label, income, expense }].
export function getIncomeVsExpenseSeries(transactions, range, refDate = new Date()) {
  return monthsRange(range, refDate).map(({ y, m }) => {
    let income = 0, expense = 0;
    for (const t of transactions) {
      if (!inMonth(t, y, m)) continue;
      if (t.type === 'income') income += Number(t.amount) || 0;
      else if (EXPENSE_TYPES.includes(t.type)) expense += getEffectiveAmount(t);
    }
    return { label: monthShort(m), income, expense };
  });
}

// Split patrimonio: proporciones ahorro/deuda y patrimonio neto.
export function getNetWorthSplit(totalSaved, totalDebt) {
  const saved = Number(totalSaved) || 0;
  const debt = Number(totalDebt) || 0;
  const sum = saved + debt;
  return {
    saved,
    debt,
    savedPct: sum > 0 ? (saved / sum) * 100 : 0,
    debtPct: sum > 0 ? (debt / sum) * 100 : 0,
    netWorth: saved - debt,
    hasData: sum > 0,
  };
}
