import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

const mapFromDb = (c) => ({
  id: c.id,
  name: c.name,
  bank: c.bank || '',
  cutoffDay: Number(c.cutoff_day),
  dueDay: Number(c.due_day),
  color: c.color || '#6366f1',
  paidCycles: Array.isArray(c.paid_cycles) ? c.paid_cycles : [],
  cashbackRules: Array.isArray(c.cashback_rules) ? c.cashback_rules : [],
  createdAt: c.created_at,
});

const useCreditCardStore = create(
  persist(
    (set, get) => ({
      cards: [],
      loading: false,

      fetchCards: async () => {
        set({ loading: true });
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return set({ cards: [], loading: false });

        const { data, error } = await supabase
          .from('credit_cards')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: true });

        if (!error && data) {
          set({ cards: data.map(mapFromDb), loading: false });
        } else {
          set({ loading: false });
        }
      },

      addCard: async (card) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const payload = {
          user_id: user.id,
          name: card.name,
          bank: card.bank || null,
          cutoff_day: Number(card.cutoffDay),
          due_day: Number(card.dueDay),
          color: card.color || '#6366f1',
          cashback_rules: Array.isArray(card.cashbackRules) ? card.cashbackRules : [],
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

      markStatementPaid: async (cardId, cycleEndISO) => {
        const card = get().cards.find((c) => c.id === cardId);
        if (!card) return;
        if (card.paidCycles.includes(cycleEndISO)) return;

        const newPaid = [...card.paidCycles, cycleEndISO];
        const { error } = await supabase.from('credit_cards').update({ paid_cycles: newPaid }).eq('id', cardId);
        if (error) {
          console.error('Mark paid error:', error);
          toast.error('Error al marcar como pagado');
          return;
        }
        set((state) => ({
          cards: state.cards.map((c) => (c.id === cardId ? { ...c, paidCycles: newPaid } : c)),
        }));
        toast.success('Estado de cuenta marcado como pagado');
      },
    }),
    {
      name: 'fintrack-cards-cache',
      partialize: (state) => ({ cards: state.cards }),
    }
  )
);

export default useCreditCardStore;
