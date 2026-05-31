// FinTrack RD — Formatters

import { CURRENCIES } from './constants';

/**
 * Format a number as currency
 */
export function formatCurrency(amount, currencyCode = 'DOP') {
  const currency = CURRENCIES[currencyCode] || CURRENCIES.DOP;
  const absAmount = Math.abs(amount);

  const formatted = new Intl.NumberFormat('es-DO', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(absAmount);

  const sign = amount < 0 ? '-' : '';
  return `${sign}${currency.symbol} ${formatted}`;
}

/**
 * Format a number as compact currency (e.g., RD$ 1.5K)
 */
export function formatCurrencyCompact(amount, currencyCode = 'DOP') {
  const currency = CURRENCIES[currencyCode] || CURRENCIES.DOP;
  const absAmount = Math.abs(amount);

  let formatted;
  if (absAmount >= 1_000_000) {
    formatted = (absAmount / 1_000_000).toFixed(1) + 'M';
  } else if (absAmount >= 1_000) {
    formatted = (absAmount / 1_000).toFixed(1) + 'K';
  } else {
    formatted = absAmount.toFixed(2);
  }

  const sign = amount < 0 ? '-' : '';
  return `${sign}${currency.symbol} ${formatted}`;
}

/**
 * Format a number as percentage
 */
export function formatPercent(value, decimals = 1) {
  return `${value.toFixed(decimals)}%`;
}

/**
 * Format a date string to localized display
 */
export function formatDate(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('es-DO', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Format date as ISO (YYYY-MM-DD)
 */
export function toISODate(date) {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  // Use local calendar components (not toISOString, which is UTC and would
  // roll over to the next day during the evening in negative-offset zones
  // like República Dominicana, GMT-4).
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Get today's date as ISO string
 */
export function todayISO() {
  return toISODate(new Date());
}

/**
 * Generate a unique ID
 */
export function generateId() {
  return crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2);
}

/**
 * Pone en mayúscula la primera letra de cada palabra, dejando el resto tal cual
 * (no fuerza minúsculas, para no dañar siglas como "ATM" o "USD").
 * Ej: "supermercado nacional" → "Supermercado Nacional".
 */
export function titleCase(str) {
  if (!str) return '';
  return str.replace(/(^|\s)(\p{L})/gu, (m, sep, ch) => sep + ch.toUpperCase());
}

/**
 * Get transaction type label in Spanish
 */
export function getTypeLabel(type) {
  const labels = {
    income: 'Ingreso',
    expense: 'Gasto',
    savings: 'Ahorro',
    debt_payment: 'Pago Deuda',
    fixed_expense: 'Gasto Fijo',
    variable_expense: 'Gasto Variable',
  };
  return labels[type] || type;
}

/**
 * Get badge class for transaction type
 */
export function getTypeBadgeClass(type) {
  const classes = {
    income: 'badge-income',
    expense: 'badge-expense',
    fixed_expense: 'badge-fixed',
    variable_expense: 'badge-variable',
    savings: 'badge-savings',
    debt_payment: 'badge-debt',
  };
  return classes[type] || '';
}
