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
