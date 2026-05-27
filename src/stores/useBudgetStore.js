// FinTrack RD — Budget Store

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { generateId } from '../utils/formatters';

const useBudgetStore = create(
  persist(
    (set, get) => ({
      budgets: [],

      setBudget: (categoryId, year, month, estimatedAmount, currency = 'DOP') => {
        const existing = get().budgets.find(
          (b) => b.categoryId === categoryId && b.year === year && b.month === month
        );

        if (existing) {
          set((state) => ({
            budgets: state.budgets.map((b) =>
              b.id === existing.id ? { ...b, estimatedAmount: Number(estimatedAmount) } : b
            ),
          }));
        } else {
          set((state) => ({
            budgets: [
              ...state.budgets,
              {
                id: generateId(),
                categoryId,
                year,
                month,
                estimatedAmount: Number(estimatedAmount),
                currency,
                createdAt: new Date().toISOString(),
              },
            ],
          }));
        }
      },

      getBudgetsByMonth: (year, month) => {
        return get().budgets.filter((b) => b.year === year && b.month === month);
      },

      deleteBudget: (id) =>
        set((state) => ({
          budgets: state.budgets.filter((b) => b.id !== id),
        })),

      copyBudgetFromPreviousMonth: (year, month) => {
        let prevMonth = month - 1;
        let prevYear = year;
        if (prevMonth < 0) {
          prevMonth = 11;
          prevYear = year - 1;
        }

        const previousBudgets = get().budgets.filter(
          (b) => b.year === prevYear && b.month === prevMonth
        );

        if (previousBudgets.length === 0) return false;

        const currentBudgets = get().budgets.filter(
          (b) => b.year === year && b.month === month
        );

        const newBudgets = previousBudgets
          .filter((pb) => !currentBudgets.some((cb) => cb.categoryId === pb.categoryId))
          .map((pb) => ({
            ...pb,
            id: generateId(),
            year,
            month,
            createdAt: new Date().toISOString(),
          }));

        if (newBudgets.length > 0) {
          set((state) => ({
            budgets: [...state.budgets, ...newBudgets],
          }));
        }

        return true;
      },
    }),
    {
      name: 'fintrack-budgets',
    }
  )
);

export default useBudgetStore;
