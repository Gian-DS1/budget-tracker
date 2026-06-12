// Limpieza centralizada de datos de usuario en el cliente.
//
// Borra TANTO el estado en memoria de los stores Zustand COMO su caché
// persistida en sessionStorage. Debe correr en CUALQUIER fin de sesión
// (signOut manual, expiración de token, cierre desde otra pestaña), no solo
// en el botón de salir: si queda dato residual, otra persona que inicie
// sesión en la misma pestaña vería las finanzas del usuario anterior.
//
// Se invoca desde AuthContext en el evento SIGNED_OUT de Supabase, que cubre
// todos los caminos anteriores.

import useTransactionStore from './useTransactionStore';
import useCategoryStore from './useCategoryStore';
import useBudgetStore from './useBudgetStore';
import useSavingsStore from './useSavingsStore';
import useDebtStore from './useDebtStore';
import useCreditCardStore from './useCreditCardStore';
import useRecurringStore from './useRecurringStore';
import usePrefsStore from './usePrefsStore';

const RESETS = [
  [useTransactionStore, { transactions: [] }],
  [useCategoryStore, { categories: [] }],
  [useBudgetStore, { budgets: [] }],
  [useSavingsStore, { goals: [], contributions: [] }],
  [useDebtStore, { debts: [], payments: [] }],
  [useCreditCardStore, { cards: [] }],
  [useRecurringStore, { recurring: [] }],
  [usePrefsStore, { budgetLevel: 'tracking', tutorialSeen: false, currency: null, prefsLoaded: false }],
];

export function clearUserData() {
  for (const [store, initial] of RESETS) {
    store.setState(initial);
    store.persist.clearStorage();
  }
}
