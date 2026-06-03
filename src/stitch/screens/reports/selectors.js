// Selectores analíticos puros de Reportes. Operan sobre transacciones ya
// cargadas; reusan getEffectiveAmount/groupByCategory de utils. Todos toman un
// rango en meses y una refDate (último mes del rango).
import { getEffectiveAmount, groupByCategory } from '../../../utils/calculations';
import { MONTHS_SHORT_ES } from '../../../utils/constants';

const EXPENSE_TYPES = ['expense', 'fixed_expense', 'variable_expense'];
const isExpense = (t) => EXPENSE_TYPES.includes(t.type);

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

// Ingreso y gasto (neto de cashback) por mes del rango.
export function getIncomeVsExpenseSeries(transactions, range, refDate = new Date()) {
  return monthsRange(range, refDate).map(({ y, m }) => {
    let income = 0, expense = 0;
    for (const t of transactions) {
      if (!inMonth(t, y, m)) continue;
      if (t.type === 'income') income += Number(t.amount) || 0;
      else if (isExpense(t)) expense += getEffectiveAmount(t);
    }
    return { label: MONTHS_SHORT_ES[m], income, expense };
  });
}

// Tendencia de gasto de las topN categorías a lo largo del rango.
export function getCategoryTrend(transactions, categories, range, refDate = new Date(), topN = 5) {
  const months = monthsRange(range, refDate);
  const expenses = transactions.filter(isExpense);
  if (expenses.length === 0) return { months: months.map((x) => MONTHS_SHORT_ES[x.m]), series: [] };

  // Top categorías por gasto total en el rango.
  const inRange = expenses.filter((t) => months.some(({ y, m }) => inMonth(t, y, m)));
  const grouped = groupByCategory(inRange, categories).sort((a, b) => b.total - a.total).slice(0, topN);

  const series = grouped.map((g) => ({
    name: g.category.name,
    color: g.category.color || '#bec2ff',
    data: months.map(({ y, m }) => g.transactions
      .filter((t) => inMonth(t, y, m))
      .reduce((s, t) => s + getEffectiveAmount(t), 0)),
  }));
  return { months: months.map((x) => MONTHS_SHORT_ES[x.m]), series };
}

// Comparativa por categoría: mes actual vs mes anterior (relativo a refDate).
export function getMonthComparison(transactions, categories, refDate = new Date()) {
  const curY = refDate.getFullYear(), curM = refDate.getMonth();
  let prevM = curM - 1, prevY = curY;
  if (prevM < 0) { prevM = 11; prevY -= 1; }

  const expenses = transactions.filter(isExpense);
  const map = new Map(); // name -> { name, color, current, previous }
  const bump = (t, key) => {
    const cat = categories.find((c) => c.id === t.categoryId);
    const name = cat?.name || 'Sin categoría';
    const color = cat?.color || '#94a3b8';
    if (!map.has(name)) map.set(name, { name, color, current: 0, previous: 0 });
    map.get(name)[key] += getEffectiveAmount(t);
  };
  for (const t of expenses) {
    if (inMonth(t, curY, curM)) bump(t, 'current');
    else if (inMonth(t, prevY, prevM)) bump(t, 'previous');
  }
  return [...map.values()]
    .map((x) => ({
      ...x,
      deltaPct: x.previous > 0 ? ((x.current - x.previous) / x.previous) * 100 : null,
    }))
    .sort((a, b) => Math.abs(b.current - b.previous) - Math.abs(a.current - a.previous));
}

// Insights derivados del rango.
export function getInsights(transactions, categories, range, refDate = new Date()) {
  const months = monthsRange(range, refDate);
  const expenses = transactions.filter(isExpense);

  // Gasto por mes (del rango).
  const perMonth = months.map(({ y, m }) => ({
    label: MONTHS_SHORT_ES[m],
    amount: expenses.filter((t) => inMonth(t, y, m)).reduce((s, t) => s + getEffectiveAmount(t), 0),
  }));
  const monthsWithExpense = perMonth.filter((x) => x.amount > 0);
  const avgMonthlyExpense = monthsWithExpense.length
    ? monthsWithExpense.reduce((s, x) => s + x.amount, 0) / monthsWithExpense.length
    : 0;
  const topMonth = monthsWithExpense.length
    ? monthsWithExpense.reduce((best, x) => (x.amount > best.amount ? x : best))
    : null;

  // Categoría más cara del rango.
  const inRange = expenses.filter((t) => months.some(({ y, m }) => inMonth(t, y, m)));
  const grouped = groupByCategory(inRange, categories).sort((a, b) => b.total - a.total);
  const topCategory = grouped.length ? { name: grouped[0].category.name, amount: grouped[0].total } : null;

  // Tasa de ahorro promedio sobre meses con ingreso.
  const rates = [];
  for (const { y, m } of months) {
    let inc = 0, exp = 0;
    for (const t of transactions) {
      if (!inMonth(t, y, m)) continue;
      if (t.type === 'income') inc += Number(t.amount) || 0;
      else if (isExpense(t)) exp += getEffectiveAmount(t);
    }
    if (inc > 0) rates.push((inc - exp) / inc);
  }
  const avgSavingsRate = rates.length ? rates.reduce((s, r) => s + r, 0) / rates.length : 0;

  return { avgMonthlyExpense, topMonth, topCategory, avgSavingsRate };
}
