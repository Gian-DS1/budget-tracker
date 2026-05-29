// FinTrack RD — Lógica de ciclos de tarjetas de crédito (pura)

import { toISODate } from './formatters';

// Fecha del día `day` en (year, month0), ajustando a meses cortos.
function dayInMonth(year, month0, day) {
  const lastDay = new Date(year, month0 + 1, 0).getDate();
  return new Date(year, month0, Math.min(day, lastDay));
}

function addDaysISO(iso, n) {
  const d = new Date(iso + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return toISODate(d);
}

/**
 * Calcula las fechas del ciclo abierto y del estado de cuenta cerrado de una
 * tarjeta a partir de su día de corte y de pago.
 * @param {{cutoffDay:number, dueDay:number}} card
 * @param {Date} refDate - fecha de referencia (hoy)
 */
export function getCardCycles(card, refDate = new Date()) {
  const cutoff = Number(card.cutoffDay);
  const due = Number(card.dueDay);
  const y = refDate.getFullYear();
  const m = refDate.getMonth();
  const ref = new Date(y, m, refDate.getDate());

  const thisCutoff = dayInMonth(y, m, cutoff);
  let lastCutoff, nextCutoff;
  if (thisCutoff <= ref) {
    lastCutoff = thisCutoff;
    nextCutoff = dayInMonth(y, m + 1, cutoff);
  } else {
    lastCutoff = dayInMonth(y, m - 1, cutoff);
    nextCutoff = thisCutoff;
  }

  const prevCutoff = dayInMonth(lastCutoff.getFullYear(), lastCutoff.getMonth() - 1, cutoff);

  // Fecha de pago: primera ocurrencia del día de pago posterior al corte.
  let dueDate = dayInMonth(lastCutoff.getFullYear(), lastCutoff.getMonth(), due);
  if (dueDate <= lastCutoff) {
    dueDate = dayInMonth(lastCutoff.getFullYear(), lastCutoff.getMonth() + 1, due);
  }

  const lastCutoffISO = toISODate(lastCutoff);
  const prevCutoffISO = toISODate(prevCutoff);

  return {
    lastCutoffISO,
    nextCutoffISO: toISODate(nextCutoff),
    openStartISO: addDaysISO(lastCutoffISO, 1),
    openEndISO: toISODate(nextCutoff),
    closedStartISO: addDaysISO(prevCutoffISO, 1),
    closedEndISO: lastCutoffISO,
    dueDateISO: toISODate(dueDate),
  };
}

/**
 * Suma (en DOP) las transacciones de una tarjeta cuya fecha cae en [startISO, endISO].
 */
export function getStatementAmount(transactions, cardId, startISO, endISO) {
  return transactions.reduce((sum, t) => {
    if (t.cardId !== cardId) return sum;
    if (t.date >= startISO && t.date <= endISO) return sum + (Number(t.amount) || 0);
    return sum;
  }, 0);
}

/**
 * ¿El estado de cuenta que cerró en `closedEndISO` ya fue marcado como pagado?
 */
export function isStatementPaid(card, closedEndISO) {
  return Array.isArray(card.paidCycles) && card.paidCycles.includes(closedEndISO);
}

/**
 * Cashback (en DOP) que genera un monto en una tarjeta, según sus reglas.
 * Busca primero la regla de la categoría exacta y, si no hay, la regla 'all'.
 * `amount` debe estar en la moneda base (DOP); redondea a 2 decimales.
 * Fuente única de verdad — usado por el formulario (preview) y el store (guardado).
 */
export function computeCashback(card, categoryId, amount) {
  const amt = Number(amount);
  if (!card || !Array.isArray(card.cashbackRules) || !amt || isNaN(amt)) return 0;
  const rule =
    card.cashbackRules.find((r) => r.categoryId === categoryId) ||
    card.cashbackRules.find((r) => r.categoryId === 'all');
  if (!rule) return 0;
  return Math.round((amt * Number(rule.percentage)) / 100 * 100) / 100;
}
