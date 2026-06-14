// Selectores puros del Dashboard. Helpers NUEVOS no cubiertos por utils:
// desglose top5+Otros, uso de presupuesto, split de patrimonio. La salud
// (getFinancialHealthScore) y la capacidad (getMonthlySavingCapacity) se reusan
// directo desde utils/calculations en el shell.
import { groupByCategory, getEffectiveAmount } from '../../../utils/calculations';
import { tr } from '../../../i18n/runtime';

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

// Efectivo disponible (líquido) DERIVADO de los movimientos: arranca en el saldo
// inicial declarado, sube con ingresos, baja con gastos (netos de cashback) y con
// lo apartado a ahorro (transacciones tipo 'savings'). Una sola fuente de verdad:
// las transacciones. No se almacena un saldo mutable.
export function getLiquidCash(transactions, initialCashBalance) {
  let cash = Number(initialCashBalance) || 0;
  for (const t of transactions || []) {
    if (t.type === 'income') cash += Number(t.amount) || 0;
    else if (EXPENSE_TYPES.includes(t.type)) cash -= getEffectiveAmount(t);
    else if (t.type === 'savings') cash -= Number(t.amount) || 0;
  }
  return cash;
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
