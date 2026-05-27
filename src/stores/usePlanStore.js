import { create } from 'zustand';
import { supabase } from '../lib/supabase';

const usePlanStore = create((set, get) => ({
  plans: [],
  loading: false,

  fetchPlans: async () => {
    set({ loading: true });
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return set({ plans: [], loading: false });

    const { data, error } = await supabase.from('plans').select('*').eq('user_id', user.id);
    if (!error && data) {
      const formatted = data.map(p => ({
        id: p.id,
        title: p.title,
        description: p.description,
        targetAmount: Number(p.target_amount),
        currentAmount: Number(p.current_amount),
        deadline: p.deadline,
        type: p.type, // 'short_term', 'medium_term', 'long_term' (mapped to horizon in UI?)
        status: p.status,
        horizon: p.type, // keeping horizon for UI compatibility
        createdAt: p.created_at
      }));
      set({ plans: formatted, loading: false });
    } else {
      set({ loading: false });
    }
  },

  addPlan: async (plan) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const dbPayload = {
      user_id: user.id,
      title: plan.title,
      description: plan.description || null,
      target_amount: Number(plan.targetAmount),
      current_amount: Number(plan.currentAmount) || 0,
      deadline: plan.deadline || null,
      type: plan.horizon || plan.type || null,
      status: 'pending'
    };

    const { data, error } = await supabase.from('plans').insert(dbPayload).select().single();
    if (!error && data) {
      const formatted = {
        id: data.id,
        title: data.title,
        description: data.description,
        targetAmount: Number(data.target_amount),
        currentAmount: Number(data.current_amount),
        deadline: data.deadline,
        type: data.type,
        horizon: data.type,
        status: data.status,
        createdAt: data.created_at
      };
      set((state) => ({ plans: [...state.plans, formatted] }));
    }
  },

  updatePlan: async (id, updates) => {
    const dbUpdates = {};
    if (updates.title !== undefined) dbUpdates.title = updates.title;
    if (updates.description !== undefined) dbUpdates.description = updates.description;
    if (updates.targetAmount !== undefined) dbUpdates.target_amount = Number(updates.targetAmount);
    if (updates.currentAmount !== undefined) dbUpdates.current_amount = Number(updates.currentAmount);
    if (updates.deadline !== undefined) dbUpdates.deadline = updates.deadline;
    if (updates.horizon !== undefined || updates.type !== undefined) dbUpdates.type = updates.horizon || updates.type;
    if (updates.status !== undefined) dbUpdates.status = updates.status;

    const { error } = await supabase.from('plans').update(dbUpdates).eq('id', id);
    if (!error) {
      set((state) => ({
        plans: state.plans.map((p) => (p.id === id ? { ...p, ...updates } : p)),
      }));
    }
  },

  deletePlan: async (id) => {
    const { error } = await supabase.from('plans').delete().eq('id', id);
    if (!error) {
      set((state) => ({ plans: state.plans.filter((p) => p.id !== id) }));
    }
  },

  updateStatus: async (id, status) => {
    await get().updatePlan(id, { status });
  },

  getPlansByHorizon: (horizon) => {
    return get().plans.filter((p) => p.horizon === horizon || p.type === horizon);
  },

  getPlansByStatus: (status) => {
    return get().plans.filter((p) => p.status === status);
  },
}));

export default usePlanStore;
