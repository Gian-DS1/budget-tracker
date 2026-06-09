// Mapeo de strings de pantalla a claves de traducción.
// Los componentes importan desde aquí en lugar de hardcodear strings.
// Esto garantiza que TODOS los strings se traducen automáticamente.

export const SCREEN_STRINGS = {
  // Botones de acción principales
  buttons: {
    newTransaction: 'common.newTransaction',
    newGoal: 'common.newGoal',
    newDebt: 'common.newDebt',
    newCard: 'common.newCard',
    newCategory: 'common.newCategory',
    payDebt: 'common.payDebt',
    pay: 'common.pay',
    addPayment: 'creditCards.advancePayment',
  },

  // Ledger / Transacciones
  ledger: {
    title: 'nav.transactions',
    records: 'common.records',
    synchronized: 'common.synchronized',
    searchPlaceholder: 'Search description or notes...',
    allTypes: 'common.allTypes',
    allCategories: 'common.allCategories',
    from: 'common.from',
    to: 'common.to',
    income: 'common.income',
    expense: 'transactions.expense',
    variableExpense: 'Variable expense',
    fixedExpense: 'Fixed expense',
    transfer: 'transactions.transfer',
    recurringTransaction: 'Recurring transaction',
    editTransaction: 'Edit transaction',
    newTransaction: 'common.newTransaction',
    typeFilterAll: 'All types',
    categoryFilterAll: 'All categories',
    transactionsUpdated: 'Transactions updated',
  },

  // Vaults / Ahorros
  vaults: {
    title: 'nav.savings',
    activeSystem: 'common.activeSystem',
    totalSaved: 'common.totalSaved',
    goal: 'savings.goal',
    monthlyContribution: 'Monthly contribution',
    targetDate: 'savings.targetDate',
    daysRemaining: 'Days remaining',
    monthsRemaining: 'Months remaining',
    completed: 'Completed',
    inProgress: 'In progress',
    listInMonths: 'List in',
    monthlyDeposit: 'Monthly deposit',
    fundAsOf: 'Fund as of',
  },

  // Debts / Deudas
  debts: {
    title: 'nav.debts',
    activeDebt: 'Active debt',
    debtPayoffStrategy: 'pages.debtPayoffStrategy',
    avalanche: 'pages.avalanche',
    snowball: 'pages.snowball',
    creditor: 'debts.creditor',
    balance: 'common.balance',
    interestRate: 'debts.interestRate',
    minimumPayment: 'debts.minimumPayment',
    monthlyQuota: 'Monthly quota',
    daysUntilFree: 'Days until free',
    totalInterest: 'Total interest',
    paid: 'Paid',
    basedOn: 'dashboard.basedOn',
    months: 'dashboard.months',
  },

  // Cards / Tarjetas
  cards: {
    title: 'nav.creditCards',
    activeCards: 'creditCards.title',
    openCycle: 'creditCards.openCycle',
    cutoffOn: 'creditCards.nextCutoff',
    toPay: 'creditCards.toPay',
    upToDate: 'creditCards.upToDate',
    advancePayment: 'creditCards.advancePayment',
    totalBalance: 'creditCards.totalBalance',
    cashback: 'creditCards.cashback',
    paymentHistory: 'common.paymentHistory',
  },

  // Budget
  budget: {
    title: 'nav.budget',
    trackingMode: 'Budget tracking',
    zeroMode: 'Base zero',
    available: 'Available to spend',
    optimalState: 'Optimal state',
    period: 'Period',
    incomeMonth: 'common.income',
    expensesMonth: 'common.expenses',
    balanceMonth: 'common.balance',
    whereMoneyWent: 'Where money went',
    category: 'common.category',
    allocate: 'Allocate',
    estimated: 'Estimated',
    spent: 'Spent',
    percentage: 'Percentage',
  },

  // Calendar
  calendar: {
    title: 'nav.calendar',
    monthlyView: 'Monthly view',
    selectDay: 'common.selectDay',
    upcomingPayments: 'Upcoming payments',
    daysAway: 'days away',
    dueDate: 'Due date',
  },

  // Reports
  reports: {
    title: 'nav.reports',
    analysisCenter: 'Analysis center',
    financialHealth: 'dashboard.financialHealth',
    savingsRate: 'dashboard.savingsRate',
    monthlyExpense: 'Monthly expense',
    topMonth: 'Top month',
    topCategory: 'Top category',
    analysis: 'pages.analysis',
    trends: 'pages.trends',
    insights: 'pages.insights',
    lastMonths: 'Last months',
    incomeVsExpenses: 'Income vs Expenses',
  },

  // Categories
  categories: {
    title: 'nav.categories',
    description: 'Create, edit or delete transaction categories.',
    incomeSection: 'Income',
    fixedExpensesSection: 'Fixed expenses',
    variableExpensesSection: 'Variable expenses',
    savingsSection: 'Savings',
  },

  // Settings
  settings: {
    title: 'nav.settings',
    language: 'settings.language',
    spanish: 'settings.spanish',
    english: 'settings.english',
  },

  // Form labels
  form: {
    date: 'common.type',
    description: 'common.description',
    category: 'common.category',
    amount: 'common.amount',
    type: 'common.type',
    income: 'transactions.income',
    expense: 'transactions.expense',
    monthlyAmount: 'Monthly amount',
    goalAmount: 'savings.goalAmount',
    monthlyPayment: 'Monthly payment',
    interestRate: 'Interest rate',
    creditLimit: 'creditCards.creditLimit',
  },

  // Status messages
  status: {
    noData: 'pages.noData',
    loading: 'common.loading',
    noTransactions: 'transactions.noTransactions',
    noPayments: 'dashboard.noUpcomingPayments',
    completedGoal: 'Goal completed',
    debtFree: 'Debt free!',
    allSet: 'All set',
  },
};

// Helper para traducir automáticamente
export function getTranslationKey(key, fallback = key) {
  // Navega por el objeto SCREEN_STRINGS para encontrar la clave
  const parts = key.split('.');
  let current = SCREEN_STRINGS;
  for (const part of parts) {
    if (current[part]) {
      current = current[part];
    } else {
      return fallback;
    }
  }
  return typeof current === 'string' ? current : fallback;
}
