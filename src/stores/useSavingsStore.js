// FinTrack RD — Savings Store

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { generateId } from '../utils/formatters';

const useSavingsStore = create(
  persist(
    (set, get) => ({
      goals: [],

      addGoal: (goal) =>
        set((state) => ({
          goals: [
            ...state.goals,
            {
              ...goal,
              id: generateId(),
              currentAmount: Number(goal.currentAmount) || 0,
              targetAmount: Number(goal.targetAmount),
              status: 'active',
              createdAt: new Date().toISOString(),
            },
          ],
        })),

      updateGoal: (id, updates) =>
        set((state) => ({
          goals: state.goals.map((g) => {
            if (g.id !== id) return g;
            const updated = { ...g, ...updates };
            // Auto-complete if target reached
            if (Number(updated.currentAmount) >= Number(updated.targetAmount)) {
              updated.status = 'completed';
            }
            return updated;
          }),
        })),

      deleteGoal: (id) =>
        set((state) => ({
          goals: state.goals.filter((g) => g.id !== id),
        })),

      addContribution: (id, amount) =>
        set((state) => ({
          goals: state.goals.map((g) => {
            if (g.id !== id) return g;
            const newAmount = Number(g.currentAmount) + Number(amount);
            return {
              ...g,
              currentAmount: newAmount,
              status: newAmount >= Number(g.targetAmount) ? 'completed' : g.status,
            };
          }),
        })),

      togglePause: (id) =>
        set((state) => ({
          goals: state.goals.map((g) => {
            if (g.id !== id) return g;
            return {
              ...g,
              status: g.status === 'paused' ? 'active' : 'paused',
            };
          }),
        })),

      getTotalSaved: () => {
        return get().goals.reduce((sum, g) => sum + Number(g.currentAmount), 0);
      },

      getActiveGoals: () => get().goals.filter((g) => g.status === 'active'),
    }),
    {
      name: 'fintrack-savings',
    }
  )
);

export default useSavingsStore;
