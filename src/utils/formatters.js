// FinTrack — Formatters

import { currentLocale, tr } from '../i18n/runtime';
import { getCurrency } from './currencyRuntime';

// Cachés módulo-level: Intl.NumberFormat es caro de construir (~25µs) y estas
// funciones corren por cada celda del Ledger y punto de chart en cada render.
const symbolCache = new Map();    // `${code}|${locale}` → símbolo
const amountFmtCache = new Map(); // locale → Intl.NumberFormat (2 decimales)

function amountFormatter(locale) {
  let fmt = amountFmtCache.get(locale);
  if (!fmt) {
    fmt = new Intl.NumberFormat(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    amountFmtCache.set(locale, fmt);
  }
  return fmt;
}

// Símbolo de una moneda en el locale actual (RD$, US$, €, £, MX$…).
// Estrategia: 'symbol' primero (da RD$, US$); si devuelve el mismo código ISO
// (p. ej. EUR→EUR en es-DO), intenta 'narrowSymbol' (EUR→€). Fallback: código.
// Nota: para códigos ISO reservados (XXX) Intl devuelve '¤'; para códigos
// malformados el constructor lanza y caemos al código vía catch.
function currencySymbol(code, locale) {
  const key = `${code}|${locale}`;
  const cached = symbolCache.get(key);
  if (cached !== undefined) return cached;
  let result;
  try {
    const fmt = (display) =>
      new Intl.NumberFormat(locale, {
        style: 'currency', currency: code, currencyDisplay: display,
      }).formatToParts(0).find((p) => p.type === 'currency')?.value;
    const sym = fmt('symbol');
    if (sym && sym !== code) {
      result = sym;
    } else {
      const narrow = fmt('narrowSymbol');
      result = narrow || code;
    }
  } catch {
    result = code;
  }
  symbolCache.set(key, result);
  return result;
}

/**
 * Format a number as currency. Sin `currencyCode` usa la moneda del usuario.
 */
export function formatCurrency(amount, currencyCode) {
  const code = currencyCode || getCurrency();
  const locale = currentLocale();
  const absAmount = Math.abs(amount);
  const formatted = amountFormatter(locale).format(absAmount);
  const sign = amount < 0 ? '-' : '';
  return `${sign}${currencySymbol(code, locale)} ${formatted}`;
}

/**
 * Format a number as compact currency (e.g., RD$ 1.5K)
 */
export function formatCurrencyCompact(amount, currencyCode) {
  const code = currencyCode || getCurrency();
  const locale = currentLocale();
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
  return `${sign}${currencySymbol(code, locale)} ${formatted}`;
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
  return date.toLocaleDateString(currentLocale(), {
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
 * Get transaction type label in the active language
 */
export function getTypeLabel(type) {
  return tr(`types.${type}`, type);
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
