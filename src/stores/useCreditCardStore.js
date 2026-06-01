import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { todayISO } from '../utils/formatters';

const mapFromDb = (c) => ({
  id: c.id,
  name: c.name,
  bank: c.bank || '',
  cutoffDay: Number(c.cutoff_day),
  dueDay: Number(c.due_day),
  color: c.color || '#6366f1',
  paidCycles: Array.isArray(c.paid_cycles) ? c.paid_cycles : [],
  payments: Array.isArray(c.payments) ? c.payments : [],
  cashbackRules: Array.isArray(c.cashback_rules) ? c.cashback_rules : [],
  catalogId: c.catalog_id || null,
  createdAt: c.created_at,
});

const useCreditCardStore = create(
  persist(
    (set, get) => ({
      cards: [],
      loading: false,

      fetchCards: async () => {
        set({ loading: true });
        const { data: { session } } = await supabase.auth.getSession();
        const user = session?.user;
        if (!user) return set({ cards: [], loading: false });

        const { data, error } = await supabase
          .from('credit_cards')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: true });

        if (!error && data) {
          set({ cards: data.map(mapFromDb), loading: false });
        } else {
          console.error('Error fetching cards:', error);
          toast.error('No se pudieron cargar las tarjetas');
          set({ loading: false });
        }
      },

      addCard: async (card) => {
        const { data: { session } } = await supabase.auth.getSession();
        const user = session?.user;
        if (!user) return;

        const payload = {
          user_id: user.id,
          name: card.name,
          bank: card.bank || null,
          cutoff_day: Number(card.cutoffDay),
          due_day: Number(card.dueDay),
          color: card.color || '#6366f1',
          cashback_rules: Array.isArray(card.cashbackRules) ? card.cashbackRules : [],
          catalog_id: card.catalogId || null,
        };

        const { data, error } = await supabase.from('credit_cards').insert(payload).select().single();
        if (error) {
          console.error('Card insert error:', error);
          toast.error('Error al guardar la tarjeta');
          return;
        }
        set((state) => ({ cards: [...state.cards, mapFromDb(data)] }));
        toast.success('Tarjeta guardada');
      },

      updateCard: async (id, updates) => {
        const dbUpdates = {};
        if (updates.name !== undefined) dbUpdates.name = updates.name;
        if (updates.bank !== undefined) dbUpdates.bank = updates.bank || null;
        if (updates.cutoffDay !== undefined) dbUpdates.cutoff_day = Number(updates.cutoffDay);
        if (updates.dueDay !== undefined) dbUpdates.due_day = Number(updates.dueDay);
        if (updates.color !== undefined) dbUpdates.color = updates.color;
        if (updates.cashbackRules !== undefined) dbUpdates.cashback_rules = updates.cashbackRules;
        if (updates.catalogId !== undefined) dbUpdates.catalog_id = updates.catalogId || null;

        const { error } = await supabase.from('credit_cards').update(dbUpdates).eq('id', id);
        if (error) {
          console.error('Card update error:', error);
          toast.error('Error al actualizar la tarjeta');
          return;
        }
        set((state) => ({
          cards: state.cards.map((c) => (c.id === id ? { ...c, ...updates } : c)),
        }));
        toast.success('Tarjeta actualizada');
      },

      deleteCard: async (id) => {
        const { error } = await supabase.from('credit_cards').delete().eq('id', id);
        if (!error) {
          set((state) => ({ cards: state.cards.filter((c) => c.id !== id) }));
        }
      },

      // Un abono LIQUIDA el saldo de la tarjeta; nunca es un gasto del presupuesto
      // (el gasto ya se contó al registrar cada consumo). Se guarda en `payments`.
      addCardPayment: async (cardId, { amount, date, note } = {}) => {
        const card = get().cards.find((c) => c.id === cardId);
        if (!card) return;
        const value = Number(amount) || 0;
        if (value <= 0) return;

        const entry = {
          id: (globalThis.crypto?.randomUUID?.() || `p-${Date.now()}-${Math.random().toString(36).slice(2)}`),
          amount: value,
          date: date || todayISO(),
          note: note || '',
        };
        const newPayments = [...(card.payments || []), entry];

        const { error } = await supabase.from('credit_cards').update({ payments: newPayments }).eq('id', cardId);
        if (error) {
          console.error('Add card payment error:', error);
          toast.error('Error al registrar el abono');
          return;
        }
        set((state) => ({
          cards: state.cards.map((c) => (c.id === cardId ? { ...c, payments: newPayments } : c)),
        }));
        toast.success('Abono registrado');
      },

      deleteCardPayment: async (cardId, paymentId) => {
        const card = get().cards.find((c) => c.id === cardId);
        if (!card) return;
        const newPayments = (card.payments || []).filter((p) => p.id !== paymentId);

        const { error } = await supabase.from('credit_cards').update({ payments: newPayments }).eq('id', cardId);
        if (error) {
          console.error('Delete card payment error:', error);
          toast.error('Error al eliminar el abono');
          return;
        }
        set((state) => ({
          cards: state.cards.map((c) => (c.id === cardId ? { ...c, payments: newPayments } : c)),
        }));
        toast.success('Abono eliminado');
      },
    }),
    {
      name: 'fintrack-cards-cache',
      partialize: (state) => ({ cards: state.cards }),
    }
  )
);

export default useCreditCardStore;
