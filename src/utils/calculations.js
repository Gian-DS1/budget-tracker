// FinTrack — Financial Calculations

/**
 * Gasto/monto EFECTIVO de una transacción: el monto menos el cashback que
 * generó. El cashback solo existe en gastos con tarjeta (es 0 en ingresos,
 * ahorro y deuda), así que restarlo es seguro para cualquier tipo. Refleja
 * "lo que realmente gastaste" (p. ej. RD$1000 con RD$10 de cashback = RD$990).
 * No afecta lo que debes a la tarjeta (eso usa el monto bruto en creditCards.js).
 */
export function getEffectiveAmount(t) {
  return (Number(t?.amount) || 0) - (Number(t?.cashbackEarned) || 0);
}

/**
 * Calculate the sum of effective amounts for given transactions (neto de cashback)
 */
export function sumAmounts(transactions) {
  return transactions.reduce((sum, t) => sum + getEffectiveAmount(t), 0);
}

/**
 * Calculate budget progress percentage
 */
export function calculateBudgetProgress(actual, estimated) {
  if (!estimated || estimated === 0) return 0;
  return (actual / estimated) * 100;
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
    grouped[catId].total += getEffectiveAmount(t);
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
  debtCategoryId = null,
}) {
  const catById = new Map(categories.map((c) => [c.id, c]));

  const estimatedByType = { income: 0, fixed_expense: 0, variable_expense: 0, savings: 0 };
  let accumulativePlan = 0;
  for (const b of monthBudgets) {
    const cat = catById.get(b.categoryId);
    if (!cat) continue;
    // La categoría de deuda se gestiona desde el módulo Deudas (su compromiso es
    // la cuota mensual, no un sobre): se excluye del estimado para no contarla
    // dos veces si el usuario le pusiera un sobre a mano.
    if (debtCategoryId && b.categoryId === debtCategoryId) continue;
    const amt = Number(b.estimatedAmount) || 0;
    if (cat.isAccumulative) { accumulativePlan += amt; continue; }
    if (cat.type in estimatedByType) estimatedByType[cat.type] += amt;
  }

  const actualByType = { income: 0, fixed_expense: 0, variable_expense: 0, savings: 0 };
  let accumulativeSpent = 0;
  let debtPaidFromTx = 0; // pago real de deuda derivado de sus transacciones
  for (const t of monthTransactions) {
    const cat = catById.get(t.categoryId);
    if (!cat) continue;
    // Gasto efectivo (neto de cashback); en ingresos/ahorro el cashback es 0.
    const amt = getEffectiveAmount(t);
    // Las transacciones de pago de deuda viven en su propia categoría: NO se
    // suman a gastosFijosReal (la deuda se compromete vía cuota), se acumulan
    // aparte como respaldo de debtPaid.
    if (debtCategoryId && t.categoryId === debtCategoryId) { debtPaidFromTx += amt; continue; }
    if (cat.isAccumulative) { accumulativeSpent += amt; continue; }
    if (cat.type in actualByType) actualByType[cat.type] += amt;
  }

  const ingresoRecibido = actualByType.income;
  const ingresoEstimado = estimatedByType.income;
  const gastosFijosPlan = estimatedByType.fixed_expense;
  const gastosVariablesPlan = estimatedByType.variable_expense;
  const ahorroPlan = estimatedByType.savings;
  const gastosFijosReal = actualByType.fixed_expense;
  const variableGastado = actualByType.variable_expense;
  const ahorroReal = actualByType.savings;
  const planDebt = Number(debtPlanned) || 0;

  // Compromiso de deuda = max(cuota planificada, pagado real). Reserva la cuota;
  // si el pago del mes la supera (sobrepago), refleja lo realmente pagado. El
  // pagado real es el explícito (debtPaid, ya convertido a DOP por el llamante)
  // o, en su defecto, el derivado de las transacciones de la categoría de deuda.
  const debtPaidEffective = (Number(debtPaid) || 0) || debtPaidFromTx;
  const debtCommitted = Math.max(planDebt, debtPaidEffective);

  const comprometido = gastosFijosPlan + debtCommitted + ahorroPlan + accumulativePlan;
  const disponible = ingresoRecibido - comprometido - variableGastado;
  const puedesGastar = Math.max(0, disponible);

  // Base del presupuesto: el ingreso REAL recibido manda en cuanto entra el
  // primer peso del mes; mientras no haya ingreso registrado, se respalda en el
  // estimado para que el usuario pueda presupuestar a inicio de mes. Así "por
  // asignar" deja de depender de una predicción fija que puede no cumplirse.
  const ingresoBase = ingresoRecibido > 0 ? ingresoRecibido : ingresoEstimado;

  const porAsignar =
    ingresoBase - gastosFijosPlan - gastosVariablesPlan - ahorroPlan - accumulativePlan - debtCommitted;

  let estado;
  if (ingresoRecibido === 0) estado = 'neutral';
  else if (disponible < 0) estado = 'danger';
  else if (disponible < 0.1 * ingresoRecibido) estado = 'warning';
  else estado = 'good';

  return {
    ingresoRecibido,
    ingresoEstimado,
    ingresoBase,
    gastosFijosPlan,
    gastosVariablesPlan,
    ahorroPlan,
    gastosFijosReal,
    variableGastado,
    ahorroReal,
    accumulativePlan,
    accumulativeSpent,
    debtPlanned: planDebt,
    debtPaid: debtPaidEffective,
    debtCommitted,
    comprometido,
    disponible,
    puedesGastar,
    porAsignar,
    estado,
  };
}

/**
 * Regla 50/30/20 derivada de los tipos de categoría, sobre el ingreso recibido:
 *   - Necesidades (50%) = gastos fijos reales.
 *   - Gustos (30%)      = gastos variables reales.
 *   - Ahorro/Deuda (20%) = ahorro real + pago de deuda real del mes.
 * Recibe el objeto `summary` de getBudgetSummary (no recalcula transacciones).
 * Cada balde: { limit, spent, pct }. Con ingreso 0 → límites y pct en 0 (sin
 * NaN/Infinity). `pct` se acota a 0 mínimo pero puede pasar de 100 (sobregasto).
 */
export function getBuckets503020(summary = {}) {
  const income = Number(summary.ingresoRecibido) || 0;
  const pct = (spent, limit) => (limit > 0 ? Math.max(0, (spent / limit) * 100) : 0);

  const necesidadesSpent = Number(summary.gastosFijosReal) || 0;
  const gustosSpent = Number(summary.variableGastado) || 0;
  const ahorroDeudaSpent = (Number(summary.ahorroReal) || 0) + (Number(summary.debtPaid) || 0);

  const necLimit = income * 0.5;
  const gusLimit = income * 0.3;
  const ahoLimit = income * 0.2;

  return {
    income,
    necesidades: { limit: necLimit, spent: necesidadesSpent, pct: pct(necesidadesSpent, necLimit) },
    gustos: { limit: gusLimit, spent: gustosSpent, pct: pct(gustosSpent, gusLimit) },
    ahorroDeuda: { limit: ahoLimit, spent: ahorroDeudaSpent, pct: pct(ahorroDeudaSpent, ahoLimit) },
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
    if (t.date >= startISO && t.date < endExclusiveISO) spent += getEffectiveAmount(t);
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
export function getMonthlySavingCapacity(transactions = [], refDate = new Date(), monthsBack = 3, includeCurrent = false) {
  const refYear = refDate.getFullYear();
  const refMonth = refDate.getMonth();

  // Índices (year*12+month) de los meses a considerar. Por defecto solo los
  // `monthsBack` meses ANTERIORES completos (tendencia estable, p. ej. Reportes).
  // Con includeCurrent=true se añade también el mes en curso, para una lectura
  // "en vivo" que reaccione a lo registrado hoy (p. ej. el Dashboard).
  const buckets = new Map(); // idx -> { income, expense }
  for (let i = includeCurrent ? 0 : 1; i <= monthsBack; i++) {
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
    const amt = getEffectiveAmount(t);
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
 * Sugerencia de presupuesto base cero: para cada categoría activa, propone el
 * promedio de lo registrado en los `monthsBack` meses ANTERIORES al mes objetivo
 * (year, month). El promedio se divide siempre entre `monthsBack` para que un
 * gasto esporádico no infle el presupuesto mensual. Devuelve solo categorías con
 * historial positivo: [{ categoryId, amount }].
 */
export function getBudgetSuggestions(transactions = [], categories = [], year, month, monthsBack = 3) {
  const targetIdx = year * 12 + month;
  const startIdx = targetIdx - monthsBack; // inclusivo
  const activeIds = new Set(categories.filter((c) => c.isActive).map((c) => c.id));

  const totals = new Map();
  for (const t of transactions) {
    if (!t.date || !t.categoryId || !activeIds.has(t.categoryId)) continue;
    const d = new Date(t.date + 'T00:00:00');
    const idx = d.getFullYear() * 12 + d.getMonth();
    if (idx >= startIdx && idx < targetIdx) {
      totals.set(t.categoryId, (totals.get(t.categoryId) || 0) + (Number(t.amount) || 0));
    }
  }

  const result = [];
  for (const [categoryId, sum] of totals) {
    const avg = Math.round((sum / monthsBack) * 100) / 100;
    if (avg > 0) result.push({ categoryId, amount: avg });
  }
  return result;
}

/**
 * Score de salud financiera (0-100) a partir de promedios mensuales en DOP.
 * Combina tres factores reconocidos:
 *   - Tasa de ahorro (45 pts): (ingreso − gasto) / ingreso; 20%+ = máximo.
 *   - Ratio de gasto (30 pts): gasto / ingreso; ≤50% = máximo, ≥100% = 0.
 *   - Carga de deuda / DTI (25 pts): pago mensual de deuda / ingreso; 0 = máximo, ≥36% = 0.
 * Devuelve { score, label, savingsRate, parts } donde parts desglosa los puntos
 * por factor (savings/45, spending/30, debt/25) para explicar el score en la UI.
 */
export function getFinancialHealthScore({ avgIncome = 0, avgExpense = 0, monthlyDebt = 0 }) {
  if (!avgIncome || avgIncome <= 0) {
    return { score: 0, label: 'Sin datos', savingsRate: 0, parts: null };
  }

  const savingsRate = (avgIncome - avgExpense) / avgIncome;
  const savingsPts = Math.max(0, Math.min(1, savingsRate / 0.2)) * 45;

  const expenseRatio = avgExpense / avgIncome;
  const expensePts = Math.max(0, Math.min(1, (1 - expenseRatio) / 0.5)) * 30;

  const dti = monthlyDebt / avgIncome;
  const debtPts = Math.max(0, Math.min(1, 1 - dti / 0.36)) * 25;

  const score = Math.round(savingsPts + expensePts + debtPts);
  // label queda en español (compat/tests); labelKey permite traducir en la UI.
  let label, labelKey;
  if (score >= 80) { label = 'Excelente'; labelKey = 'health.excellent'; }
  else if (score >= 60) { label = 'Buena'; labelKey = 'health.good'; }
  else if (score >= 40) { label = 'Regular'; labelKey = 'health.fair'; }
  else { label = 'Necesita atención'; labelKey = 'health.needsAttention'; }

  return {
    score, label, labelKey, savingsRate,
    parts: {
      savings: Math.round(savingsPts),
      spending: Math.round(expensePts),
      debt: Math.round(debtPts),
    },
  };
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
