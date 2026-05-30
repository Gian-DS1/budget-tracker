// FinTrack RD — Financial Calculations

/**
 * Calculate the sum of amounts for given transactions
 */
export function sumAmounts(transactions) {
  return transactions.reduce((sum, t) => sum + Number(t.amount), 0);
}

/**
 * Calculate income for a period
 */
export function calculateIncome(transactions) {
  return sumAmounts(transactions.filter(t => t.type === 'income'));
}

/**
 * Calculate expenses for a period (includes fixed and variable expense types)
 */
export function calculateExpenses(transactions) {
  return sumAmounts(
    transactions.filter(
      t => t.type === 'expense' || t.type === 'fixed_expense' || t.type === 'variable_expense'
    )
  );
}

/**
 * Calculate savings for a period
 */
export function calculateSavings(transactions) {
  return sumAmounts(transactions.filter(t => t.type === 'savings'));
}

/**
 * Calculate balance (income - expenses - savings - debt payments)
 */
export function calculateBalance(transactions) {
  const income = calculateIncome(transactions);
  const expenses = calculateExpenses(transactions);
  return income - expenses;
}

/**
 * Calculate savings rate (% of income going to savings)
 */
export function calculateSavingsRate(transactions) {
  const income = calculateIncome(transactions);
  if (income === 0) return 0;
  const savings = calculateSavings(transactions);
  return (savings / income) * 100;
}

/**
 * Calculate percentage change between two values
 */
export function calculatePercentChange(current, previous) {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / Math.abs(previous)) * 100;
}

/**
 * Calculate budget progress percentage
 */
export function calculateBudgetProgress(actual, estimated) {
  if (!estimated || estimated === 0) return 0;
  return (actual / estimated) * 100;
}

/**
 * Get progress status based on percentage
 */
export function getProgressStatus(percentage) {
  if (percentage <= 80) return 'good';
  if (percentage <= 100) return 'warning';
  return 'danger';
}

/**
 * Group transactions by category
 */
export function groupByCategory(transactions, categories) {
  const grouped = {};
  transactions.forEach(t => {
    const catId = t.categoryId;
    if (!grouped[catId]) {
      const cat = categories.find(c => c.id === catId);
      grouped[catId] = {
        category: cat || { id: catId, name: 'Sin Categoría', icon: '❓', color: '#94a3b8' },
        transactions: [],
        total: 0,
      };
    }
    grouped[catId].transactions.push(t);
    grouped[catId].total += Number(t.amount);
  });
  return Object.values(grouped);
}

/**
 * Calculate monthly amortization schedule for a debt
 */
export function calculateAmortization(balance, interestRate, monthlyPayment) {
  const schedule = [];
  let remaining = balance;
  const monthlyRate = interestRate / 100 / 12;
  let month = 0;

  while (remaining > 0 && month < 600) {
    month++;
    const interest = remaining * monthlyRate;
    const principal = Math.min(monthlyPayment - interest, remaining);

    if (principal <= 0) break; // Payment doesn't cover interest

    remaining = Math.max(0, remaining - principal);
    schedule.push({
      month,
      payment: monthlyPayment,
      principal,
      interest,
      balance: remaining,
    });
  }

  return schedule;
}

/**
 * Calculate months to reach savings goal
 */
export function monthsToGoal(currentAmount, targetAmount, monthlyContribution) {
  if (monthlyContribution <= 0) return Infinity;
  const remaining = targetAmount - currentAmount;
  if (remaining <= 0) return 0;
  return Math.ceil(remaining / monthlyContribution);
}

/**
 * Calculate projected date of completion
 */
export function projectedCompletionDate(currentAmount, targetAmount, monthlyContribution) {
  const months = monthsToGoal(currentAmount, targetAmount, monthlyContribution);
  if (months === Infinity) return null;
  const date = new Date();
  date.setMonth(date.getMonth() + months);
  return date;
}

/**
 * Moving average for projections
 */
export function movingAverage(data, windowSize = 3) {
  if (data.length < windowSize) return data;
  const result = [];
  for (let i = windowSize - 1; i < data.length; i++) {
    const window = data.slice(i - windowSize + 1, i + 1);
    const avg = window.reduce((sum, val) => sum + val, 0) / windowSize;
    result.push(avg);
  }
  return result;
}

/**
 * Fuente única de verdad del resumen mensual del presupuesto base cero.
 * Todos los montos están en moneda base (DOP); el llamante debe pasar los
 * totales de deuda ya convertidos a DOP.
 *
 * Clasifica ingresos/gastos/ahorro por el TIPO DE LA CATEGORÍA (resuelto vía
 * categoryId), igual que BudgetPage, para garantizar cifras consistentes.
 *
 * @param {Object} params
 * @param {Array}  params.monthTransactions - transacciones del mes (DOP)
 * @param {Array}  params.monthBudgets - filas de presupuesto del mes ({categoryId, estimatedAmount})
 * @param {Array}  params.categories - todas las categorías ({id, type})
 * @param {number} params.debtPlanned - pago mensual de deuda planificado (DOP)
 * @param {number} params.debtPaid - pago de deuda real del mes (DOP)
 */
export function getBudgetSummary({
  monthTransactions = [],
  monthBudgets = [],
  categories = [],
  debtPlanned = 0,
  debtPaid = 0,
}) {
  const catById = new Map(categories.map((c) => [c.id, c]));

  const estimatedByType = { income: 0, fixed_expense: 0, variable_expense: 0, savings: 0 };
  let accumulativePlan = 0;
  for (const b of monthBudgets) {
    const cat = catById.get(b.categoryId);
    if (!cat) continue;
    const amt = Number(b.estimatedAmount) || 0;
    if (cat.isAccumulative) { accumulativePlan += amt; continue; }
    if (cat.type in estimatedByType) estimatedByType[cat.type] += amt;
  }

  const actualByType = { income: 0, fixed_expense: 0, variable_expense: 0, savings: 0 };
  let accumulativeSpent = 0;
  for (const t of monthTransactions) {
    const cat = catById.get(t.categoryId);
    if (!cat) continue;
    const amt = Number(t.amount) || 0;
    if (cat.isAccumulative) { accumulativeSpent += amt; continue; }
    if (cat.type in actualByType) actualByType[cat.type] += amt;
  }

  const ingresoRecibido = actualByType.income;
  const ingresoEstimado = estimatedByType.income;
  const gastosFijosPlan = estimatedByType.fixed_expense;
  const gastosVariablesPlan = estimatedByType.variable_expense;
  const ahorroPlan = estimatedByType.savings;
  const variableGastado = actualByType.variable_expense;
  const planDebt = Number(debtPlanned) || 0;

  const comprometido = gastosFijosPlan + planDebt + ahorroPlan + accumulativePlan;
  const disponible = ingresoRecibido - comprometido - variableGastado;
  const puedesGastar = Math.max(0, disponible);

  const porAsignar =
    ingresoEstimado - gastosFijosPlan - gastosVariablesPlan - ahorroPlan - accumulativePlan - planDebt;

  let estado;
  if (ingresoRecibido === 0) estado = 'neutral';
  else if (disponible < 0) estado = 'danger';
  else if (disponible < 0.1 * ingresoRecibido) estado = 'warning';
  else estado = 'good';

  return {
    ingresoRecibido,
    ingresoEstimado,
    gastosFijosPlan,
    gastosVariablesPlan,
    ahorroPlan,
    variableGastado,
    accumulativePlan,
    accumulativeSpent,
    debtPlanned: planDebt,
    debtPaid: Number(debtPaid) || 0,
    comprometido,
    disponible,
    puedesGastar,
    porAsignar,
    estado,
  };
}

/**
 * Bote acumulado (sinking fund) de una categoría: suma de aportes presupuestados
 * menos lo gastado, desde `accumulationStart` ('YYYY-MM') hasta (uptoYear, uptoMonth).
 * Todo en DOP. Devuelve { budgeted, spent, available }.
 */
export function getAccumulatedBalance({
  categoryId,
  accumulationStart,
  budgets = [],
  transactions = [],
  uptoYear,
  uptoMonth,
}) {
  const uptoIdx = uptoYear * 12 + uptoMonth;

  let startIdx;
  let startISO;
  if (accumulationStart && /^\d{4}-\d{2}$/.test(accumulationStart)) {
    const [sy, sm] = accumulationStart.split('-').map(Number);
    startIdx = sy * 12 + (sm - 1);
    startISO = `${accumulationStart}-01`;
  } else {
    startIdx = uptoIdx;
    startISO = `${uptoYear}-${String(uptoMonth + 1).padStart(2, '0')}-01`;
  }

  // Primer día del mes siguiente a `upto` (límite superior exclusivo para fechas).
  let nextMonth = uptoMonth + 1;
  let nextYear = uptoYear;
  if (nextMonth > 11) { nextMonth = 0; nextYear += 1; }
  const endExclusiveISO = `${nextYear}-${String(nextMonth + 1).padStart(2, '0')}-01`;

  let budgeted = 0;
  for (const b of budgets) {
    if (b.categoryId !== categoryId) continue;
    const idx = b.year * 12 + b.month;
    if (idx >= startIdx && idx <= uptoIdx) budgeted += Number(b.estimatedAmount) || 0;
  }

  let spent = 0;
  for (const t of transactions) {
    if (t.categoryId !== categoryId) continue;
    if (t.date >= startISO && t.date < endExclusiveISO) spent += Number(t.amount) || 0;
  }

  return { budgeted, spent, available: budgeted - spent };
}

/**
 * Capacidad de ahorro mensual estimada: promedio de (ingresos − gastos) de los
 * últimos `monthsBack` meses COMPLETOS (excluye el mes en curso, que está a
 * medias). Los ahorros no cuentan como gasto: son justamente lo que queremos
 * estimar que puedes apartar. Todo en moneda base (DOP).
 *
 * @returns {{ capacity:number, monthsCounted:number, avgIncome:number, avgExpense:number }}
 */
export function getMonthlySavingCapacity(transactions = [], refDate = new Date(), monthsBack = 3) {
  const refYear = refDate.getFullYear();
  const refMonth = refDate.getMonth();

  // Índices (year*12+month) de los últimos `monthsBack` meses completos.
  const buckets = new Map(); // idx -> { income, expense }
  for (let i = 1; i <= monthsBack; i++) {
    let m = refMonth - i;
    let y = refYear;
    while (m < 0) { m += 12; y -= 1; }
    buckets.set(y * 12 + m, { income: 0, expense: 0 });
  }

  for (const t of transactions) {
    if (!t.date) continue;
    const d = new Date(t.date + 'T00:00:00');
    const idx = d.getFullYear() * 12 + d.getMonth();
    const bucket = buckets.get(idx);
    if (!bucket) continue;
    const amt = Number(t.amount) || 0;
    if (t.type === 'income') bucket.income += amt;
    else if (t.type === 'expense' || t.type === 'fixed_expense' || t.type === 'variable_expense') {
      bucket.expense += amt;
    }
  }

  // Solo promediamos meses con alguna actividad, para no diluir con meses vacíos.
  const active = [...buckets.values()].filter((b) => b.income > 0 || b.expense > 0);
  const monthsCounted = active.length;
  if (monthsCounted === 0) {
    return { capacity: 0, monthsCounted: 0, avgIncome: 0, avgExpense: 0 };
  }
  const totalIncome = active.reduce((s, b) => s + b.income, 0);
  const totalExpense = active.reduce((s, b) => s + b.expense, 0);
  const avgIncome = totalIncome / monthsCounted;
  const avgExpense = totalExpense / monthsCounted;
  return { capacity: avgIncome - avgExpense, monthsCounted, avgIncome, avgExpense };
}

/**
 * Detect anomalies (values 2+ standard deviations from mean)
 */
export function detectAnomalies(values, threshold = 2) {
  if (values.length < 3) return [];
  const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
  const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
  const stdDev = Math.sqrt(variance);

  return values
    .map((value, index) => ({
      index,
      value,
      deviation: stdDev > 0 ? Math.abs(value - mean) / stdDev : 0,
      isAnomaly: stdDev > 0 ? Math.abs(value - mean) / stdDev >= threshold : false,
    }))
    .filter(item => item.isAnomaly);
}
