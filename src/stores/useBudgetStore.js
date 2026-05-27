import { create } from 'zustand';
import { supabase } from '../lib/supabase';

const useBudgetStore = create((set, get) => ({
  budgets: [],
  loading: false,

  fetchBudgets: async () => {
    set({ loading: true });
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return set({ budgets: [], loading: false });

    const { data, error } = await supabase.from('budgets').select('*').eq('user_id', user.id);
    if (!error && data) {
      const formatted = data.map(b => {
        const [y, m] = b.month.split('-');
        return {
          id: b.id,
          categoryId: b.category_id,
          year: parseInt(y, 10),
          month: parseInt(m, 10),
          estimatedAmount: Number(b.amount),
          currency: 'DOP',
          createdAt: b.created_at
        };
      });
      set({ budgets: formatted, loading: false });
    } else {
      set({ loading: false });
    }
  },

  setBudget: async (categoryId, year, month, estimatedAmount) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const dbMonth = `${year}-${month}`;
    const dbPayload = {
      user_id: user.id,
      category_id: categoryId,
      amount: Number(estimatedAmount),
      month: dbMonth
    };

    // Upsert automatically handles inserts or updates based on the UNIQUE constraint
    const { data, error } = await supabase
      .from('budgets')
      .upsert(dbPayload, { onConflict: 'user_id, category_id, month' })
      .select()
      .single();
    
    if (!error && data) {
      const formatted = {
        id: data.id,
        categoryId: data.category_id,
        year: year,
        month: month,
        estimatedAmount: Number(data.amount),
        currency: 'DOP',
        createdAt: data.created_at
      };
      
      set((state) => {
        const existingIdx = state.budgets.findIndex(b => b.categoryId === categoryId && b.year === year && b.month === month);
        if (existingIdx >= 0) {
          const newB = [...state.budgets];
          newB[existingIdx] = formatted;
          return { budgets: newB };
        } else {
          return { budgets: [...state.budgets, formatted] };
        }
      });
    } else {
      console.error("Budget upsert error", error);
      import('react-hot-toast').then(toast => toast.default.error("Error guardando presupuesto"));
    }
  },

  getBudgetsByMonth: (year, month) => {
    return get().budgets.filter((b) => b.year === year && b.month === month);
  },

  deleteBudget: async (id) => {
    const { error } = await supabase.from('budgets').delete().eq('id', id);
    if (!error) {
      set((state) => ({ budgets: state.budgets.filter((b) => b.id !== id) }));
    }
  },

  copyBudgetFromPreviousMonth: async (year, month) => {
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

    const newBudgetsToCopy = previousBudgets
      .filter((pb) => !currentBudgets.some((cb) => cb.categoryId === pb.categoryId));

    if (newBudgetsToCopy.length === 0) return true;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const dbPayload = newBudgetsToCopy.map(pb => ({
      user_id: user.id,
      category_id: pb.categoryId,
      amount: pb.estimatedAmount,
      month: `${year}-${month}`
    }));

    const { data, error } = await supabase.from('budgets').insert(dbPayload).select();
    if (!error && data) {
       const formatted = data.map(b => {
        const [y, m] = b.month.split('-');
        return {
          id: b.id,
          categoryId: b.category_id,
          year: parseInt(y, 10),
          month: parseInt(m, 10),
          estimatedAmount: Number(b.amount),
          currency: 'DOP',
          createdAt: b.created_at
        };
      });
      set((state) => ({ budgets: [...state.budgets, ...formatted] }));
      return true;
    }
    return false;
  },
}));

export default useBudgetStore;
