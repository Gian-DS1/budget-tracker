import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '../lib/supabase';

const useBudgetStore = create(
  persist(
    (set, get) => ({
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
          month: parseInt(m, 10) - 1,
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
    // Get current budgets state for potential rollback
    const previousBudgets = [...get().budgets];

    // Optimistically update the state synchronously first
    const optimisticFormatted = {
      id: `temp-${categoryId}-${year}-${month}`,
      categoryId: categoryId,
      year: year,
      month: month,
      estimatedAmount: Number(estimatedAmount),
      currency: 'DOP',
      createdAt: new Date().toISOString()
    };

    set((state) => {
      const existingIdx = state.budgets.findIndex(
        (b) => b.categoryId === categoryId && b.year === year && b.month === month
      );
      if (existingIdx >= 0) {
        const newB = [...state.budgets];
        newB[existingIdx] = {
          ...newB[existingIdx],
          estimatedAmount: Number(estimatedAmount)
        };
        return { budgets: newB };
      } else {
        return { budgets: [...state.budgets, optimisticFormatted] };
      }
    });

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("Usuario no autenticado");
      }

      const dbMonth = `${year}-${String(month + 1).padStart(2, '0')}`;
      const dbPayload = {
        user_id: user.id,
        category_id: categoryId,
        amount: Number(estimatedAmount),
        month: dbMonth
      };

      // Manual check to bypass database unique constraint missing errors on upsert
      const { data: existingData } = await supabase
        .from('budgets')
        .select('id')
        .eq('user_id', user.id)
        .eq('category_id', categoryId)
        .eq('month', dbMonth)
        .maybeSingle();

      let result;
      if (existingData) {
        result = await supabase
          .from('budgets')
          .update({ amount: Number(estimatedAmount) })
          .eq('id', existingData.id)
          .select()
          .single();
      } else {
        result = await supabase
          .from('budgets')
          .insert(dbPayload)
          .select()
          .single();
      }

      const { data, error } = result;
      
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
        
        // Update the state with the actual database-persisted record
        set((state) => {
          const existingIdx = state.budgets.findIndex(
            (b) => b.categoryId === categoryId && b.year === year && b.month === month
          );
          if (existingIdx >= 0) {
            const newB = [...state.budgets];
            newB[existingIdx] = formatted;
            return { budgets: newB };
          } else {
            return { budgets: [...state.budgets, formatted] };
          }
        });

        // Trigger a subtle success toast indicating the change has been successfully saved
        import('react-hot-toast').then(toast => toast.default.success("Presupuesto guardado"));
      } else {
        throw error || new Error("Error en la respuesta de Supabase");
      }
    } catch (error) {
      console.error("Budget save error:", error);
      // Rollback to previous state on failure
      set({ budgets: previousBudgets });
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
      month: `${year}-${String(month + 1).padStart(2, '0')}`
    }));

    const { data, error } = await supabase.from('budgets').insert(dbPayload).select();
    if (!error && data) {
       const formatted = data.map(b => {
        const [y, m] = b.month.split('-');
        return {
          id: b.id,
          categoryId: b.category_id,
          year: parseInt(y, 10),
          month: parseInt(m, 10) - 1,
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
}),
{
  name: 'fintrack-budgets-cache',
  partialize: (state) => ({ budgets: state.budgets }),
}
)
);

export default useBudgetStore;
