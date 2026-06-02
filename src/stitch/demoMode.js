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

const categories = [
  { id: 'c-sal', name: 'Salario', type: 'income', icon: '💼', color: '#bdd200', slug: 'salario', keywords: [], isActive: true, sortOrder: 0, isAccumulative: false, accumulationStart: null },
  { id: 'c-alq', name: 'Alquiler', type: 'fixed_expense', icon: '🏠', color: '#9aa0ff', slug: 'alquiler', keywords: [], isActive: true, sortOrder: 1, isAccumulative: false, accumulationStart: null },
  { id: 'c-sup', name: 'Supermercado', type: 'variable_expense', icon: '🛒', color: '#ffb689', slug: 'supermercado', keywords: ['supermercado', 'nacional', 'jumbo'], isActive: true, sortOrder: 2, isAccumulative: false, accumulationStart: null },
  { id: 'c-tra', name: 'Transporte', type: 'variable_expense', icon: '🚗', color: '#50d8e9', slug: 'transporte', keywords: ['uber', 'gasolina'], isActive: true, sortOrder: 3, isAccumulative: false, accumulationStart: null },
  { id: 'c-aho', name: 'Ahorro', type: 'savings', icon: '🏦', color: '#bec2ff', slug: 'ahorro', keywords: [], isActive: true, sortOrder: 4, isAccumulative: false, accumulationStart: null },
  { id: 'c-ocio', name: 'Ocio', type: 'variable_expense', icon: '🎬', color: '#e9a0d8', slug: 'ocio', keywords: ['cine', 'netflix'], isActive: true, sortOrder: 5, isAccumulative: false, accumulationStart: null },
];

const tx = (id, catId, amount, type, description, day, cashback = 0) => ({
  id, categoryId: catId, cardId: null, amount, type, description, date: dayOf(day),
  notes: null, currency: 'DOP', cashbackEarned: cashback, createdAt: new Date().toISOString(),
});

const transactions = [
  tx('t1', 'c-sal', 85000, 'income', 'Salario quincenal', 1),
  tx('t2', 'c-sal', 85000, 'income', 'Salario quincenal', 16),
  tx('t3', 'c-alq', 32000, 'fixed_expense', 'Alquiler', 2),
  tx('t4', 'c-sup', 4250, 'variable_expense', 'Supermercado Nacional', 4),
  tx('t5', 'c-sup', 3120, 'variable_expense', 'Jumbo', 12),
  tx('t6', 'c-tra', 1800, 'variable_expense', 'Gasolina', 6),
  tx('t7', 'c-tra', 950, 'variable_expense', 'Uber', 9),
  tx('t8', 'c-ocio', 2400, 'variable_expense', 'Cine + cena', 14),
  tx('t9', 'c-aho', 15000, 'savings', 'Abono a meta: Fondo de emergencia', 16),
];

const budgets = [
  { id: 'b1', categoryId: 'c-alq', year: yearIdx, month: monthIdx, estimatedAmount: 32000, currency: 'DOP', createdAt: '' },
  { id: 'b2', categoryId: 'c-sup', year: yearIdx, month: monthIdx, estimatedAmount: 12000, currency: 'DOP', createdAt: '' },
  { id: 'b3', categoryId: 'c-tra', year: yearIdx, month: monthIdx, estimatedAmount: 5000, currency: 'DOP', createdAt: '' },
  { id: 'b4', categoryId: 'c-aho', year: yearIdx, month: monthIdx, estimatedAmount: 20000, currency: 'DOP', createdAt: '' },
  { id: 'b5', categoryId: 'c-ocio', year: yearIdx, month: monthIdx, estimatedAmount: 6000, currency: 'DOP', createdAt: '' },
  { id: 'b6', categoryId: 'c-sal', year: yearIdx, month: monthIdx, estimatedAmount: 170000, currency: 'DOP', createdAt: '' },
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
