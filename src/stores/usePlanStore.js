// FinTrack RD — Plan Store

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { generateId } from '../utils/formatters';

const usePlanStore = create(
  persist(
    (set, get) => ({
      plans: [],

      addPlan: (plan) =>
        set((state) => ({
          plans: [
            ...state.plans,
            {
              ...plan,
              id: generateId(),
              status: 'pending',
              createdAt: new Date().toISOString(),
            },
          ],
        })),

      updatePlan: (id, updates) =>
        set((state) => ({
          plans: state.plans.map((p) => (p.id === id ? { ...p, ...updates } : p)),
        })),

      deletePlan: (id) =>
        set((state) => ({
          plans: state.plans.filter((p) => p.id !== id),
        })),

      updateStatus: (id, status) =>
        set((state) => ({
          plans: state.plans.map((p) => (p.id === id ? { ...p, status } : p)),
        })),

      getPlansByHorizon: (horizon) => {
        return get().plans.filter((p) => p.horizon === horizon);
      },

      getPlansByStatus: (status) => {
        return get().plans.filter((p) => p.status === status);
      },
    }),
    {
      name: 'fintrack-plans',
    }
  )
);

export default usePlanStore;
