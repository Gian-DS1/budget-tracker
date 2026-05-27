// FinTrack RD — Transaction Store

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { generateId } from '../utils/formatters';

const useTransactionStore = create(
  persist(
    (set, get) => ({
      transactions: [],

      addTransaction: (transaction) =>
        set((state) => ({
          transactions: [
            {
              ...transaction,
              id: generateId(),
              createdAt: new Date().toISOString(),
            },
            ...state.transactions,
          ],
        })),

      updateTransaction: (id, updates) =>
        set((state) => ({
          transactions: state.transactions.map((t) =>
            t.id === id ? { ...t, ...updates } : t
          ),
        })),

      deleteTransaction: (id) =>
        set((state) => ({
          transactions: state.transactions.filter((t) => t.id !== id),
        })),

      bulkAddTransactions: (transactions) =>
        set((state) => ({
          transactions: [
            ...transactions.map((t) => ({
              ...t,
              id: t.id || generateId(),
              createdAt: t.createdAt || new Date().toISOString(),
            })),
            ...state.transactions,
          ],
        })),

      getTransactionsByMonth: (year, month) => {
        return get().transactions.filter((t) => {
          const date = new Date(t.date + 'T00:00:00');
          return date.getFullYear() === year && date.getMonth() === month;
        });
      },

      getTransactionsByDateRange: (startDate, endDate) => {
        return get().transactions.filter((t) => {
          return t.date >= startDate && t.date <= endDate;
        });
      },

      getTransactionsByCategory: (categoryId) => {
        return get().transactions.filter((t) => t.categoryId === categoryId);
      },

      getTransactionsByType: (type) => {
        return get().transactions.filter((t) => t.type === type);
      },
    }),
    {
      name: 'fintrack-transactions',
    }
  )
);

export default useTransactionStore;
