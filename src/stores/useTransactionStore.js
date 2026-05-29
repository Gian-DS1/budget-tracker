import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import useCreditCardStore from './useCreditCardStore';
import useRateStore from './useRateStore';
import { computeCashback } from '../utils/creditCards';

// Conversión histórica por fecha (para guardar la transacción al valor del día).
// Si la red falla, cae a la tasa efectiva del rate store (que respeta el
// override manual del usuario), no a un número fijo.
export async function fetchUSDRate(dateStr) {
  let rate = useRateStore.getState().getRate();
  try {
    const response = await fetch(`https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@${dateStr}/v1/currencies/usd.json`);
    if (response.ok) {
      const data = await response.json();
      if (data && data.usd && typeof data.usd.dop === 'number') {
        rate = data.usd.dop;
      }
    }
  } catch (e) {
    console.warn("Error fetching historical rate for USD:", e);
    try {
      const response = await fetch(`https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json`);
      if (response.ok) {
        const data = await response.json();
        if (data && data.usd && typeof data.usd.dop === 'number') {
          rate = data.usd.dop;
        }
      }
    } catch (err) {
      console.warn("Error fetching latest rate for USD:", err);
    }
  }

  // Dominican bank selling rate has a standard spread (aprox +1.2%)
  const bankSellingRate = Math.round(rate * 1.012 * 100) / 100;
  return bankSellingRate;
}

const useTransactionStore = create(
  persist(
    (set, get) => ({
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
        cardId: t.card_id || null,
        cashbackEarned: t.cashback_earned ? Number(t.cashback_earned) : 0,
        createdAt: t.created_at
      }));
      set({ transactions: formattedData, loading: false });
    } else {
      console.error('Error fetching transactions:', error);
      toast.error('No se pudieron cargar las transacciones');
      set({ loading: false });
    }
  },

  addTransaction: async (transaction) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Convert USD to DOP if needed
    const currency = transaction.currency || 'DOP';
    let amount = Number(transaction.amount);
    let notes = transaction.notes || null;
    if (currency === 'USD') {
      const rate = await fetchUSDRate(transaction.date);
      const originalAmount = amount;
      amount = Math.round(amount * rate * 100) / 100;

      const formattedOriginal = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(originalAmount);
      const formattedConverted = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
      const formattedRate = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(rate);

      const conversionNote = `US$ ${formattedOriginal} → RD$ ${formattedConverted} - Tasa del día: ${formattedRate}`;
      notes = notes ? `${notes} (${conversionNote})` : conversionNote;
    }

    // Cashback se calcula sobre el monto YA convertido a DOP (no sobre el monto
    // ingresado, que puede estar en USD) y solo para gastos.
    let cashbackEarned = 0;
    if (transaction.cardId && transaction.type === 'expense') {
      const card = useCreditCardStore.getState().cards.find((c) => c.id === transaction.cardId);
      cashbackEarned = computeCashback(card, transaction.categoryId, amount);
    }

    const dbTx = {
      user_id: user.id,
      category_id: transaction.categoryId || null,
      card_id: transaction.cardId || null,
      amount: amount,
      type: transaction.type,
      description: transaction.description,
      date: transaction.date,
      notes: notes,
      currency: 'DOP',
      cashback_earned: cashbackEarned
    };

    const { data, error } = await supabase.from('transactions').insert(dbTx).select().single();
    if (error) {
      console.error("Transaction insert error:", error);
      toast.error("Error al guardar: " + error.message);
      return;
    }

    if (data) {
      const newTx = { 
        ...data, 
        categoryId: data.category_id, 
        cardId: data.card_id || null, 
        cashbackEarned: data.cashback_earned ? Number(data.cashback_earned) : 0,
        createdAt: data.created_at 
      };
      set((state) => ({ transactions: [newTx, ...state.transactions] }));
      toast.success("Transacción guardada exitosamente");
    }
  },

  updateTransaction: async (id, updates) => {
    // Whitelist only real DB columns. The edit form carries extra fields
    // (id, createdAt, currency, isRecurring, ...) that would make Supabase
    // reject the update with an "unknown column" error.
    const dbUpdates = {};
    if (updates.categoryId !== undefined) dbUpdates.category_id = updates.categoryId || null;
    if (updates.cardId !== undefined) dbUpdates.card_id = updates.cardId || null;
    if (updates.amount !== undefined) dbUpdates.amount = Number(updates.amount);
    if (updates.type !== undefined) dbUpdates.type = updates.type;
    if (updates.description !== undefined) dbUpdates.description = updates.description;
    if (updates.date !== undefined) dbUpdates.date = updates.date;
    if (updates.notes !== undefined) dbUpdates.notes = updates.notes || null;
    if (updates.cashbackEarned !== undefined) dbUpdates.cashback_earned = Number(updates.cashbackEarned);

    const { error } = await supabase.from('transactions').update(dbUpdates).eq('id', id);
    if (error) {
      console.error('Transaction update error:', error);
      toast.error('Error al actualizar: ' + error.message);
      return;
    }

    set((state) => ({
      transactions: state.transactions.map((t) =>
        t.id === id ? { ...t, ...updates } : t
      ),
    }));
    toast.success('Transacción actualizada');
  },

  deleteTransaction: async (id) => {
    const { error } = await supabase.from('transactions').delete().eq('id', id);
    if (!error) {
      set((state) => ({
        transactions: state.transactions.filter((t) => t.id !== id),
      }));
    }
  },

  bulkDeleteTransactions: async (ids) => {
    if (!ids || ids.length === 0) return;
    const { error } = await supabase.from('transactions').delete().in('id', ids);
    if (!error) {
      set((state) => ({
        transactions: state.transactions.filter((t) => !ids.includes(t.id)),
      }));
    } else {
      console.error('Bulk delete error:', error);
      toast.error('Error al eliminar transacciones');
    }
  },

  bulkAssignCard: async (ids, cardId) => {
    if (!ids || ids.length === 0) return;
    const dbCardId = cardId || null;
    
    const cards = useCreditCardStore.getState().cards;
    const card = dbCardId ? cards.find(c => c.id === dbCardId) : null;
    
    const transactionsToUpdate = get().transactions.filter(t => ids.includes(t.id));
    toast.loading('Asignando tarjeta...', { id: 'bulk-update' });
    
    const dbUpdatesPromises = transactionsToUpdate.map(t => {
      // Cashback solo para gastos; el monto ya está en DOP.
      const cashback = (card && t.type === 'expense')
        ? computeCashback(card, t.categoryId, t.amount)
        : 0;

      return supabase.from('transactions').update({
        card_id: dbCardId,
        cashback_earned: cashback 
      }).eq('id', t.id).then(({error}) => ({ id: t.id, error, cashback }));
    });
    
    const results = await Promise.all(dbUpdatesPromises);
    const hasError = results.some(r => r.error);
    
    if (hasError) {
      console.error('Bulk update error', results);
      toast.error('Error actualizando algunas transacciones', { id: 'bulk-update' });
    } else {
      toast.success('Transacciones actualizadas', { id: 'bulk-update' });
    }
    
    set((state) => ({
      transactions: state.transactions.map((t) => {
        if (ids.includes(t.id)) {
          const result = results.find(r => r.id === t.id);
          if (!result || result.error) return t;
          return { ...t, cardId: dbCardId, cashbackEarned: result.cashback };
        }
        return t;
      }),
    }));
  },

  bulkAddTransactions: async (transactions) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return 0;

    const dbTxs = transactions.map(t => ({
      user_id: user.id,
      category_id: t.categoryId || null,
      card_id: null,
      amount: t.amount,
      type: t.type,
      description: t.description,
      date: t.date,
      notes: t.notes || null,
      currency: 'DOP'
    }));

    // Insert in batches of 100 to avoid payload limits
    const batchSize = 100;
    let allInserted = [];
    let hasError = false;

    for (let i = 0; i < dbTxs.length; i += batchSize) {
      const batch = dbTxs.slice(i, i + batchSize);
      const { data, error } = await supabase.from('transactions').insert(batch).select();
      if (error) {
        console.error('Bulk insert error:', error);
        hasError = true;
        toast.error('Error importando lote: ' + error.message);
        break;
      }
      if (data) {
        allInserted = [...allInserted, ...data];
      }
    }

    if (allInserted.length > 0) {
      const newTxs = allInserted.map(d => ({ ...d, categoryId: d.category_id, cardId: d.card_id || null, createdAt: d.created_at }));
      set((state) => ({ transactions: [...newTxs, ...state.transactions] }));
    }

    if (hasError && allInserted.length > 0) {
      toast.success(`Se importaron ${allInserted.length} transacciones (algunas fallaron)`);
    }

    return allInserted.length;
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
}),
{
  name: 'fintrack-transactions-cache',
  // Cachear solo las 500 transacciones más recientes (ya vienen ordenadas
  // desc por fecha) para no exceder el límite de ~5MB de localStorage en
  // usuarios con mucho historial. Supabase sigue siendo la fuente completa.
  partialize: (state) => ({ transactions: state.transactions.slice(0, 500) }),
}
)
);

export default useTransactionStore;
