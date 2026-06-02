// Modo QA / Demo — SOLO para localhost. Permite revisar las 11 pantallas con
// datos de ejemplo SIN tocar Supabase ni producción. No persiste nada en el
// backend; siembra los stores Zustand en memoria.
//
// Activación: botón "Entrar como demo" en StitchAuth (visible solo en localhost).
// Salida: cerrar sesión limpia el flag y recarga.

import useCategoryStore from '../stores/useCategoryStore';
import useTransactionStore from '../stores/useTransactionStore';
import useBudgetStore from '../stores/useBudgetStore';
import useSavingsStore from '../stores/useSavingsStore';
import useDebtStore from '../stores/useDebtStore';
import usePlanStore from '../stores/usePlanStore';
import useCreditCardStore from '../stores/useCreditCardStore';
import { defaultCategories } from '../data/defaultCategories';

const FLAG = 'fintrack-demo-mode';

// Solo se permite demo en localhost / 127.0.0.1 (nunca en producción).
export function isLocalhost() {
  if (typeof window === 'undefined') return false;
  const h = window.location.hostname;
  return h === 'localhost' || h === '127.0.0.1' || h === '[::1]';
}

export function isDemoActive() {
  return isLocalhost() && sessionStorage.getItem(FLAG) === '1';
}

export function exitDemo() {
  sessionStorage.removeItem(FLAG);
}

// ── Datos de ejemplo (en memoria) ───────────────────────────────────────────
const today = new Date();
const iso = (d) => {
  const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, '0'), day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};
const dayOf = (n) => iso(new Date(today.getFullYear(), today.getMonth(), n));
const monthIdx = today.getMonth();
const yearIdx = today.getFullYear();

// Demo usa las 37 categorías REALES (con sus ~405 keywords) para que el
// autocompletado tenga material de verdad. Mapean al formato del store.
const categories = defaultCategories.map((c, i) => ({
  id: c.id,
  name: c.name,
  type: c.type,
  icon: c.icon,
  color: c.color,
  slug: c.slug || null,
  keywords: c.keywords || [],
  isActive: c.isActive !== false,
  sortOrder: i,
  isAccumulative: c.isAccumulative || false,
  accumulationStart: c.accumulationStart || null,
}));

// Resuelve el id real de una categoría por nombre (las default generan ids).
const catId = (name) => categories.find((c) => c.name === name)?.id || '';

const tx = (id, catName, amount, type, description, day, cashback = 0, cardId = null) => ({
  id, categoryId: catId(catName), cardId, amount, type, description, date: dayOf(day),
  notes: null, currency: 'DOP', cashbackEarned: cashback, createdAt: new Date().toISOString(),
});

// Algunos consumos van con la tarjeta demo (cc1) para que Tarjetas muestre saldos
// y cashback reales. El cashback es 1% (regla 'all' de la tarjeta).
const transactions = [
  tx('t1', 'Salario', 85000, 'income', 'Salario quincenal', 1),
  tx('t2', 'Salario', 85000, 'income', 'Salario quincenal', 16),
  tx('t3', 'Alquiler', 32000, 'fixed_expense', 'Alquiler', 2),
  tx('t4', 'Supermercado', 4250, 'variable_expense', 'Supermercado Nacional', 4, 42.5, 'cc1'),
  tx('t5', 'Supermercado', 3120, 'variable_expense', 'Jumbo', 12, 31.2, 'cc1'),
  tx('t6', 'Combustible', 1800, 'variable_expense', 'Gasolina', 6, 18, 'cc1'),
  tx('t7', 'Taxi y Transporte', 950, 'variable_expense', 'Uber', 9),
  tx('t8', 'Restaurantes y Delivery', 2400, 'variable_expense', 'Cena fuera', 14, 24, 'cc1'),
  tx('t9', 'Suscripciones Digitales', 590, 'variable_expense', 'Netflix', 10),
];

const budgets = [
  { id: 'b1', categoryId: catId('Alquiler'), year: yearIdx, month: monthIdx, estimatedAmount: 32000, currency: 'DOP', createdAt: '' },
  { id: 'b2', categoryId: catId('Supermercado'), year: yearIdx, month: monthIdx, estimatedAmount: 12000, currency: 'DOP', createdAt: '' },
  { id: 'b3', categoryId: catId('Taxi y Transporte'), year: yearIdx, month: monthIdx, estimatedAmount: 5000, currency: 'DOP', createdAt: '' },
  { id: 'b4', categoryId: catId('Restaurantes y Delivery'), year: yearIdx, month: monthIdx, estimatedAmount: 6000, currency: 'DOP', createdAt: '' },
  { id: 'b5', categoryId: catId('Suscripciones Digitales'), year: yearIdx, month: monthIdx, estimatedAmount: 2000, currency: 'DOP', createdAt: '' },
  { id: 'b6', categoryId: catId('Salario'), year: yearIdx, month: monthIdx, estimatedAmount: 170000, currency: 'DOP', createdAt: '' },
];

const goals = [
  { id: 'g1', title: 'Fondo de emergencia', targetAmount: 180000, currentAmount: 105000, deadline: iso(new Date(yearIdx + 1, 2, 1)), icon: '🆘', color: '#bec2ff', status: 'active', currency: 'DOP', createdAt: '' },
  { id: 'g2', title: 'Viaje a Europa', targetAmount: 250000, currentAmount: 60000, deadline: iso(new Date(yearIdx + 1, 7, 1)), icon: '✈️', color: '#50d8e9', status: 'active', currency: 'DOP', createdAt: '' },
  { id: 'g3', title: 'Laptop nueva', targetAmount: 90000, currentAmount: 90000, deadline: null, icon: '💻', color: '#bdd200', status: 'completed', currency: 'DOP', createdAt: '' },
];

const debts = [
  { id: 'd1', creditorName: 'Préstamo vehículo', originalAmount: 600000, currentBalance: 360000, interestRate: 12.5, monthlyPayment: 14500, due_date: dayOf(28), status: 'active', currency: 'DOP', createdAt: '' },
  { id: 'd2', creditorName: 'Tarjeta departamental', originalAmount: 45000, currentBalance: 18000, interestRate: 6.0, monthlyPayment: 3000, due_date: dayOf(25), status: 'active', currency: 'DOP', createdAt: '' },
];

const plans = [
  { id: 'p1', title: 'Comprar apartamento', description: 'Inicial 20%', targetAmount: 2000000, currentAmount: 350000, deadline: iso(new Date(yearIdx + 4, 0, 1)), type: 'long', horizon: 'long', status: 'in_progress', createdAt: '' },
  { id: 'p2', title: 'Maestría', description: '', targetAmount: 400000, currentAmount: 120000, deadline: iso(new Date(yearIdx + 2, 0, 1)), type: 'medium', horizon: 'medium', status: 'in_progress', createdAt: '' },
];

const cards = [
  { id: 'cc1', name: 'Visa Popular', bank: 'Banco Popular', cutoffDay: 20, dueDay: 5, color: '#bec2ff', paidCycles: [], payments: [], cashbackRules: [{ categoryId: 'all', percentage: 1 }], catalogId: null, createdAt: '' },
];

// Siembra todos los stores con los datos demo y marca loading=false.
export function seedDemoStores() {
  useCategoryStore.setState({ categories, loading: false });
  useTransactionStore.setState({ transactions, loading: false });
  useBudgetStore.setState({ budgets, loading: false });
  useSavingsStore.setState({ goals, loading: false });
  useDebtStore.setState({ debts, payments: [], loading: false });
  usePlanStore.setState({ plans, loading: false });
  useCreditCardStore.setState({ cards, loading: false });
}

// Activa el modo demo: marca el flag y siembra los datos.
export function enterDemo() {
  if (!isLocalhost()) return false;
  sessionStorage.setItem(FLAG, '1');
  seedDemoStores();
  return true;
}

// ── Mutadores en memoria para el modo demo ──────────────────────────────────
// En demo NO hay sesión Supabase, así que las acciones de los stores (que
// escriben al backend) salen sin hacer nada. Estas funciones aplican la mutación
// SOLO al estado local, para que crear/editar/borrar funcione en QA. No persiste.
const demoId = () =>
  (globalThis.crypto?.randomUUID?.() || `demo-${Date.now()}-${Math.random().toString(36).slice(2)}`);

// Transacciones
export function demoAddTransaction(tx) {
  const row = {
    id: demoId(), categoryId: tx.categoryId || '', cardId: tx.cardId || null,
    amount: Number(tx.amount), type: tx.type, description: tx.description || '',
    date: tx.date, notes: tx.notes || null, currency: tx.currency || 'DOP',
    cashbackEarned: Number(tx.cashbackEarned) || 0, createdAt: new Date().toISOString(),
  };
  useTransactionStore.setState((s) => ({ transactions: [row, ...s.transactions] }));
  return row.id;
}
export function demoUpdateTransaction(id, updates) {
  useTransactionStore.setState((s) => ({
    transactions: s.transactions.map((t) => (t.id === id ? { ...t, ...updates, amount: Number(updates.amount ?? t.amount) } : t)),
  }));
}
export function demoDeleteTransaction(id) {
  useTransactionStore.setState((s) => ({ transactions: s.transactions.filter((t) => t.id !== id) }));
}
export function demoRestoreTransaction(tx) {
  useTransactionStore.setState((s) => ({ transactions: [{ ...tx, id: demoId() }, ...s.transactions] }));
}

// Presupuesto (sobres). En demo, setBudget real haría rollback + toast rojo (no
// hay sesión), así que se muta el estado local directamente. Mismo formato que
// useBudgetStore: fila por (categoryId, year, month).
export function demoSetBudget(categoryId, year, month, amount) {
  const value = Number(amount) || 0;
  useBudgetStore.setState((s) => {
    const i = s.budgets.findIndex((b) => b.categoryId === categoryId && b.year === year && b.month === month);
    if (i >= 0) {
      const next = [...s.budgets];
      next[i] = { ...next[i], estimatedAmount: value };
      return { budgets: next };
    }
    const row = { id: demoId(), categoryId, year, month, estimatedAmount: value, currency: 'DOP', createdAt: new Date().toISOString() };
    return { budgets: [...s.budgets, row] };
  });
}

// Copia los sobres del mes anterior a (year, month), sin pisar los existentes.
// Devuelve true/false como el store (para que el toast del componente funcione).
export function demoCopyBudgetFromPreviousMonth(year, month) {
  let pm = month - 1, py = year;
  if (pm < 0) { pm = 11; py -= 1; }
  const { budgets } = useBudgetStore.getState();
  const prev = budgets.filter((b) => b.year === py && b.month === pm);
  if (prev.length === 0) return false;
  const current = budgets.filter((b) => b.year === year && b.month === month);
  const toCopy = prev.filter((pb) => !current.some((cb) => cb.categoryId === pb.categoryId));
  if (toCopy.length === 0) return true;
  const rows = toCopy.map((pb) => ({
    id: demoId(), categoryId: pb.categoryId, year, month,
    estimatedAmount: pb.estimatedAmount, currency: 'DOP', createdAt: new Date().toISOString(),
  }));
  useBudgetStore.setState((s) => ({ budgets: [...s.budgets, ...rows] }));
  return true;
}

// Genérico para colecciones simples (savings/debts/plans/cards) por si se usan.
export function demoAdd(store, key, row) {
  const r = { id: demoId(), createdAt: new Date().toISOString(), ...row };
  store.setState((s) => ({ [key]: [...s[key], r] }));
  return r;
}
export function demoUpdate(store, key, id, updates) {
  store.setState((s) => ({ [key]: s[key].map((x) => (x.id === id ? { ...x, ...updates } : x)) }));
}
export function demoDelete(store, key, id) {
  store.setState((s) => ({ [key]: s[key].filter((x) => x.id !== id) }));
}

// ── Tarjetas de crédito (en demo no hay sesión: las acciones del store fallan) ──
export function demoAddCard(card) {
  const row = {
    id: demoId(), name: card.name, bank: card.bank || '',
    cutoffDay: Number(card.cutoffDay), dueDay: Number(card.dueDay),
    color: card.color || '#bec2ff', paidCycles: [], payments: [],
    cashbackRules: Array.isArray(card.cashbackRules) ? card.cashbackRules : [],
    catalogId: card.catalogId || null, createdAt: new Date().toISOString(),
  };
  useCreditCardStore.setState((s) => ({ cards: [...s.cards, row] }));
  return row;
}
export function demoUpdateCard(id, updates) {
  useCreditCardStore.setState((s) => ({ cards: s.cards.map((c) => (c.id === id ? { ...c, ...updates } : c)) }));
}
export function demoDeleteCard(id) {
  useCreditCardStore.setState((s) => ({ cards: s.cards.filter((c) => c.id !== id) }));
}
// Re-inserta una tarjeta borrada con su id original (deshacer).
export function demoRestoreCard(card) {
  useCreditCardStore.setState((s) => ({ cards: [...s.cards, card] }));
}
export function demoAddCardPayment(cardId, { amount, date, note } = {}) {
  const value = Number(amount) || 0;
  if (value <= 0) return null;
  const entry = { id: demoId(), amount: value, date: date || iso(new Date()), note: note || '' };
  useCreditCardStore.setState((s) => ({
    cards: s.cards.map((c) => (c.id === cardId ? { ...c, payments: [...(c.payments || []), entry] } : c)),
  }));
  return entry;
}
export function demoDeleteCardPayment(cardId, paymentId) {
  useCreditCardStore.setState((s) => ({
    cards: s.cards.map((c) => (c.id === cardId ? { ...c, payments: (c.payments || []).filter((p) => p.id !== paymentId) } : c)),
  }));
}
