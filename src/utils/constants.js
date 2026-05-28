// FinTrack RD — Constants

export const CURRENCIES = {
  DOP: { code: 'DOP', symbol: 'RD$', name: 'Peso Dominicano' },
  USD: { code: 'USD', symbol: 'US$', name: 'Dólar Estadounidense' },
};

export const DEFAULT_CURRENCY = 'DOP';

// Tasa de cambio USD → DOP (ajustar según tasa actual)
export const USD_TO_DOP_RATE = 60;

export const TRANSACTION_TYPES = {
  INCOME: 'income',
  EXPENSE: 'expense',
  SAVINGS: 'savings',
  DEBT_PAYMENT: 'debt_payment',
};

export const CATEGORY_TYPES = {
  INCOME: 'income',
  FIXED_EXPENSE: 'fixed_expense',
  VARIABLE_EXPENSE: 'variable_expense',
  SAVINGS: 'savings',
};

export const RECURRENCE_PATTERNS = {
  WEEKLY: 'weekly',
  BIWEEKLY: 'biweekly',
  MONTHLY: 'monthly',
};

export const SAVINGS_STATUS = {
  ACTIVE: 'active',
  COMPLETED: 'completed',
  PAUSED: 'paused',
};

export const DEBT_STATUS = {
  ACTIVE: 'active',
  PAID_OFF: 'paid_off',
};

export const PLAN_HORIZONS = {
  SHORT: 'short',
  MEDIUM: 'medium',
  LONG: 'long',
};

export const PLAN_STATUSES = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
};

export const MONTHS_ES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

export const MONTHS_SHORT_ES = [
  'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
  'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic',
];

export const DAYS_ES = [
  'Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado',
];

export const DAYS_SHORT_ES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
