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
    searchPlaceholder: 'screens.ledger.searchPlaceholder',
    allTypes: 'common.allTypes',
    allCategories: 'common.allCategories',
    from: 'common.from',
    to: 'common.to',
    income: 'common.income',
    expense: 'transactions.expense',
    variableExpense: 'transactions.variableExpense',
    fixedExpense: 'transactions.fixedExpense',
    transfer: 'transactions.transfer',
    recurringTransaction: 'screens.ledger.recurringTransaction',
    editTransaction: 'transactions.editTransaction',
    newTransaction: 'common.newTransaction',
    typeFilterAll: 'common.allTypes',
    categoryFilterAll: 'common.allCategories',
    transactionsUpdated: 'screens.ledger.transactionsUpdated',
  },

  // Vaults / Ahorros
  vaults: {
    title: 'nav.savings',
    activeSystem: 'common.activeSystem',
    totalSaved: 'common.totalSaved',
    goal: 'savings.goal',
    monthlyContribution: 'screens.vaults.monthlyContribution',
    targetDate: 'savings.targetDate',
    daysRemaining: 'screens.vaults.daysRemaining',
    monthsRemaining: 'screens.vaults.monthsRemaining',
    completed: 'screens.vaults.completed',
    inProgress: 'screens.vaults.inProgress',
    listInMonths: 'screens.vaults.listInMonths',
    monthlyDeposit: 'screens.vaults.monthlyDeposit',
    fundAsOf: 'screens.vaults.fundAsOf',
  },

  // Debts / Deudas
  debts: {
    title: 'nav.debts',
    activeDebt: 'screens.debts.activeDebt',
    debtPayoffStrategy: 'pages.debtPayoffStrategy',
    avalanche: 'pages.avalanche',
    snowball: 'pages.snowball',
    creditor: 'debts.creditor',
    balance: 'common.balance',
    interestRate: 'debts.interestRate',
    minimumPayment: 'debts.minimumPayment',
    monthlyQuota: 'screens.debts.monthlyQuota',
    daysUntilFree: 'screens.debts.daysUntilFree',
    totalInterest: 'screens.debts.totalInterest',
    paid: 'screens.debts.paid',
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
    trackingMode: 'screens.budget.trackingMode',
    zeroMode: 'screens.budget.zeroMode',
    available: 'screens.budget.available',
    optimalState: 'screens.budget.optimalState',
    period: 'screens.budget.period',
    incomeMonth: 'common.income',
    expensesMonth: 'common.expenses',
    balanceMonth: 'common.balance',
    whereMoneyWent: 'screens.budget.whereMoneyWent',
    category: 'common.category',
    allocate: 'screens.budget.allocate',
    estimated: 'screens.budget.estimated',
    spent: 'budget.spent',
    percentage: 'screens.budget.percentage',
  },

  // Calendar
  calendar: {
    title: 'nav.calendar',
    monthlyView: 'screens.calendar.monthlyView',
    selectDay: 'common.selectDay',
    upcomingPayments: 'screens.calendar.upcomingPayments',
    daysAway: 'screens.calendar.daysAway',
    dueDate: 'screens.calendar.dueDate',
  },

  // Reports
  reports: {
    title: 'nav.reports',
    analysisCenter: 'screens.reports.analysisCenter',
    financialHealth: 'dashboard.financialHealth',
    savingsRate: 'dashboard.savingsRate',
    monthlyExpense: 'screens.reports.monthlyExpense',
    topMonth: 'screens.reports.topMonth',
    topCategory: 'screens.reports.topCategory',
    analysis: 'pages.analysis',
    trends: 'pages.trends',
    insights: 'pages.insights',
    lastMonths: 'screens.reports.lastMonths',
    incomeVsExpenses: 'screens.reports.incomeVsExpenses',
  },

  // Chart labels (dashboard gráficos)
  charts: {
    income: 'common.income',
    expenses: 'common.expenses',
    last6Months: 'screens.charts.last6Months',
    noMovements: 'screens.charts.noMovements',
    balance: 'common.balance',
    estimationWithMonth: 'dashboard.estimation',
    basedOn: 'dashboard.basedOn',
    months: 'dashboard.months',
    atRisk: 'dashboard.risk',
    excellent: 'dashboard.excellent',
    netWorth: 'dashboard.netWorth',
    saved: 'savings.saved',
    debt: 'debts.debt',
    others: 'screens.charts.others',
    noExpensesThisMonth: 'screens.charts.noExpensesThisMonth',
    noMovementsIn: 'screens.charts.noMovementsIn',
    defineBudget: 'screens.charts.defineBudget',
    budgetOfMonth: 'screens.charts.budgetOfMonth',
    of: 'screens.charts.of',
    overBudgetMonth: 'screens.charts.overBudgetMonth',
    noSavingsOrDebts: 'screens.charts.noSavingsOrDebts',
    paceOnTrack: 'screens.charts.paceOnTrack',
    paceFast: 'screens.charts.paceFast',
    paceTick: 'screens.charts.paceTick',
    debtFree: 'screens.charts.debtFree',
    healthFactorSavings: 'screens.charts.healthFactorSavings',
    healthFactorSpending: 'screens.charts.healthFactorSpending',
    healthFactorDebt: 'screens.charts.healthFactorDebt',
  },

  // Categories
  categories: {
    title: 'nav.categories',
    description: 'screens.categories.description',
    incomeSection: 'common.income',
    fixedExpensesSection: 'screens.categories.fixedExpensesSection',
    variableExpensesSection: 'screens.categories.variableExpensesSection',
    savingsSection: 'savings.title',
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
    date: 'transactions.date',
    description: 'common.description',
    category: 'common.category',
    amount: 'common.amount',
    type: 'common.type',
    income: 'transactions.income',
    expense: 'transactions.expense',
    monthlyAmount: 'screens.form.monthlyAmount',
    goalAmount: 'savings.goalAmount',
    monthlyPayment: 'screens.form.monthlyPayment',
    interestRate: 'debts.interestRate',
    creditLimit: 'creditCards.creditLimit',
  },

  // Status messages
  status: {
    noData: 'pages.noData',
    loading: 'common.loading',
    noTransactions: 'transactions.noTransactions',
    noPayments: 'dashboard.noUpcomingPayments',
    completedGoal: 'screens.status.completedGoal',
    debtFree: 'screens.status.debtFree',
    allSet: 'screens.status.allSet',
  },
};
