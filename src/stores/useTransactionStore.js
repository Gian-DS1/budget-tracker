import { create } from 'zustand';
import { supabase } from '../lib/supabase';

const useTransactionStore = create((set, get) => ({
  transactions: [],
  loading: false,

  fetchTransactions: async () => {
    set({ loading: true });
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      set({ transactions: [], loading: false });
      return;
    }

    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', user.id)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false });

    if (!error && data) {
      const formattedData = data.map(t => ({
        ...t,
        categoryId: t.category_id,
        createdAt: t.created_at
      }));
      set({ transactions: formattedData, loading: false });
    } else {
      set({ loading: false });
    }
  },

  addTransaction: async (transaction) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const dbTx = {
      user_id: user.id,
      category_id: transaction.categoryId,
      amount: transaction.amount,
      type: transaction.type,
      description: transaction.description,
      date: transaction.date,
      notes: transaction.notes || null,
      currency: 'DOP'
    };

    const { data, error } = await supabase.from('transactions').insert(dbTx).select().single();
    if (error) {
      console.error("Transaction insert error:", error);
      import('react-hot-toast').then(toast => toast.default.error("Error al guardar: " + error.message));
      return;
    }

    if (data) {
      const newTx = { ...data, categoryId: data.category_id, createdAt: data.created_at };
      set((state) => ({ transactions: [newTx, ...state.transactions] }));
      import('react-hot-toast').then(toast => toast.default.success("Transacción guardada exitosamente"));
    }
  },

  updateTransaction: async (id, updates) => {
    const dbUpdates = { ...updates };
    if (updates.categoryId !== undefined) {
      dbUpdates.category_id = updates.categoryId;
      delete dbUpdates.categoryId;
    }

    const { error } = await supabase.from('transactions').update(dbUpdates).eq('id', id);
    if (!error) {
      set((state) => ({
        transactions: state.transactions.map((t) =>
          t.id === id ? { ...t, ...updates } : t
        ),
      }));
    }
  },

  deleteTransaction: async (id) => {
    const { error } = await supabase.from('transactions').delete().eq('id', id);
    if (!error) {
      set((state) => ({
        transactions: state.transactions.filter((t) => t.id !== id),
      }));
    }
  },

  bulkAddTransactions: async (transactions) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const dbTxs = transactions.map(t => ({
      user_id: user.id,
      category_id: t.categoryId,
      amount: t.amount,
      type: t.type,
      description: t.description,
      date: t.date,
      notes: t.notes || null,
      currency: 'DOP'
    }));

    const { data, error } = await supabase.from('transactions').insert(dbTxs).select();
    if (!error && data) {
      const newTxs = data.map(d => ({ ...d, categoryId: d.category_id, createdAt: d.created_at }));
      // Prepend to array
      set((state) => ({ transactions: [...newTxs, ...state.transactions] }));
    }
  },

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
}));

export default useTransactionStore;
