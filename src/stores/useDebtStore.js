// FinTrack RD — Debt Store

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { generateId } from '../utils/formatters';

const useDebtStore = create(
  persist(
    (set, get) => ({
      debts: [],
      payments: [],

      addDebt: (debt) =>
        set((state) => ({
          debts: [
            ...state.debts,
            {
              ...debt,
              id: generateId(),
              originalAmount: Number(debt.originalAmount),
              currentBalance: Number(debt.currentBalance || debt.originalAmount),
              interestRate: Number(debt.interestRate) || 0,
              monthlyPayment: Number(debt.monthlyPayment),
              status: 'active',
              createdAt: new Date().toISOString(),
            },
          ],
        })),

      updateDebt: (id, updates) =>
        set((state) => ({
          debts: state.debts.map((d) => (d.id === id ? { ...d, ...updates } : d)),
        })),

      deleteDebt: (id) =>
        set((state) => ({
          debts: state.debts.filter((d) => d.id !== id),
          payments: state.payments.filter((p) => p.debtId !== id),
        })),

      addPayment: (debtId, amount, date, notes = '') => {
        const debt = get().debts.find((d) => d.id === debtId);
        if (!debt) return;

        const newBalance = Math.max(0, Number(debt.currentBalance) - Number(amount));
        const payment = {
          id: generateId(),
          debtId,
          amount: Number(amount),
          date,
          remainingBalance: newBalance,
          notes,
          createdAt: new Date().toISOString(),
        };

        set((state) => ({
          payments: [...state.payments, payment],
          debts: state.debts.map((d) =>
            d.id === debtId
              ? {
                  ...d,
                  currentBalance: newBalance,
                  status: newBalance <= 0 ? 'paid_off' : 'active',
                }
              : d
          ),
        }));
      },

      getPaymentsByDebt: (debtId) => {
        return get().payments.filter((p) => p.debtId === debtId).sort((a, b) => a.date.localeCompare(b.date));
      },

      getTotalDebt: () => {
        return get()
          .debts.filter((d) => d.status === 'active')
          .reduce((sum, d) => sum + Number(d.currentBalance), 0);
      },

      getTotalMonthlyPayment: () => {
        return get()
          .debts.filter((d) => d.status === 'active')
          .reduce((sum, d) => sum + Number(d.monthlyPayment), 0);
      },

      getActiveDebts: () => get().debts.filter((d) => d.status === 'active'),
    }),
    {
      name: 'fintrack-debts',
    }
  )
);

export default useDebtStore;
