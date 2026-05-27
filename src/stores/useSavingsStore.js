import { create } from 'zustand';
import { supabase } from '../lib/supabase';

const useSavingsStore = create((set, get) => ({
  goals: [],
  loading: false,

  fetchGoals: async () => {
    set({ loading: true });
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return set({ goals: [], loading: false });

    const { data, error } = await supabase.from('savings').select('*').eq('user_id', user.id);
    if (!error && data) {
      const formatted = data.map(g => ({
        id: g.id,
        title: g.title,
        targetAmount: Number(g.target_amount),
        currentAmount: Number(g.current_amount),
        deadline: g.deadline,
        icon: g.icon,
        color: g.color,
        status: g.status,
        createdAt: g.created_at
      }));
      set({ goals: formatted, loading: false });
    } else {
      set({ loading: false });
    }
  },

  addGoal: async (goal) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const dbPayload = {
      user_id: user.id,
      title: goal.title,
      target_amount: Number(goal.targetAmount),
      current_amount: Number(goal.currentAmount) || 0,
      deadline: goal.deadline || null,
      icon: goal.icon || null,
      color: goal.color || null,
      status: 'active'
    };

    const { data, error } = await supabase.from('savings').insert(dbPayload).select().single();
    if (!error && data) {
      const formatted = {
        id: data.id,
        title: data.title,
        targetAmount: Number(data.target_amount),
        currentAmount: Number(data.current_amount),
        deadline: data.deadline,
        icon: data.icon,
        color: data.color,
        status: data.status,
        createdAt: data.created_at
      };
      set((state) => ({ goals: [...state.goals, formatted] }));
    } else {
      console.error("Error adding saving goal", error);
    }
  },

  updateGoal: async (id, updates) => {
    const goal = get().goals.find(g => g.id === id);
    if (!goal) return;
    const newCurrent = updates.currentAmount !== undefined ? Number(updates.currentAmount) : goal.currentAmount;
    const newTarget = updates.targetAmount !== undefined ? Number(updates.targetAmount) : goal.targetAmount;
    const newStatus = (newCurrent >= newTarget) ? 'completed' : (updates.status || goal.status);

    const dbUpdates = {};
    if (updates.title !== undefined) dbUpdates.title = updates.title;
    if (updates.targetAmount !== undefined) dbUpdates.target_amount = newTarget;
    if (updates.currentAmount !== undefined) dbUpdates.current_amount = newCurrent;
    if (updates.deadline !== undefined) dbUpdates.deadline = updates.deadline;
    if (updates.icon !== undefined) dbUpdates.icon = updates.icon;
    if (updates.color !== undefined) dbUpdates.color = updates.color;
    dbUpdates.status = newStatus;

    const { error } = await supabase.from('savings').update(dbUpdates).eq('id', id);
    if (!error) {
      set((state) => ({
        goals: state.goals.map((g) => (g.id === id ? { ...g, ...updates, currentAmount: newCurrent, targetAmount: newTarget, status: newStatus } : g)),
      }));
    }
  },

  deleteGoal: async (id) => {
    const { error } = await supabase.from('savings').delete().eq('id', id);
    if (!error) {
      set((state) => ({ goals: state.goals.filter((g) => g.id !== id) }));
    }
  },

  addContribution: async (id, amount) => {
    const goal = get().goals.find(g => g.id === id);
    if (!goal) return;
    
    const newAmount = Number(goal.currentAmount) + Number(amount);
    await get().updateGoal(id, { currentAmount: newAmount });
  },

  togglePause: async (id) => {
    const goal = get().goals.find(g => g.id === id);
    if (!goal) return;
    
    const newStatus = goal.status === 'paused' ? 'active' : 'paused';
    await get().updateGoal(id, { status: newStatus });
  },

  getTotalSaved: () => {
    return get().goals.reduce((sum, g) => sum + Number(g.currentAmount), 0);
  },

  getActiveGoals: () => get().goals.filter((g) => g.status === 'active'),
}));

export default useSavingsStore;
