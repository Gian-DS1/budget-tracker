import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { USD_TO_DOP_RATE } from '../utils/constants';

const useDebtStore = create((set, get) => ({
  debts: [],
  payments: [],
  loading: false,

  fetchDebtsAndPayments: async () => {
    set({ loading: true });
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return set({ debts: [], payments: [], loading: false });

    const [debtsRes, paymentsRes] = await Promise.all([
      supabase.from('debts').select('*').eq('user_id', user.id),
      supabase.from('debt_payments').select('*').eq('user_id', user.id)
    ]);

    let formattedDebts = [];
    if (!debtsRes.error && debtsRes.data) {
      formattedDebts = debtsRes.data.map(d => {
        const isUSD = d.creditor_name && d.creditor_name.endsWith(' [USD]');
        return {
          id: d.id,
          creditorName: isUSD ? d.creditor_name.slice(0, -6) : d.creditor_name,
          originalAmount: Number(d.total_amount),
          currentBalance: Number(d.current_balance),
          interestRate: Number(d.interest_rate),
          monthlyPayment: Number(d.minimum_payment),
          due_date: d.due_date,
          status: d.status,
          currency: isUSD ? 'USD' : 'DOP',
          createdAt: d.created_at
        };
      });
    }

    let formattedPayments = [];
    if (!paymentsRes.error && paymentsRes.data) {
      formattedPayments = paymentsRes.data.map(p => ({
        id: p.id,
        debtId: p.debt_id,
        amount: Number(p.amount),
        date: p.date,
        remainingBalance: Number(p.remaining_balance),
        notes: p.notes,
        createdAt: p.created_at
      }));
    }

    set({ debts: formattedDebts, payments: formattedPayments, loading: false });
  },

  addDebt: async (debt) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const currentBal = Number(debt.currentBalance !== undefined ? debt.currentBalance : debt.originalAmount);
    const initialStatus = currentBal <= 0 ? 'paid_off' : 'active';
    const dbName = debt.currency === 'USD' ? `${debt.creditorName} [USD]` : debt.creditorName;

    const dbPayload = {
      user_id: user.id,
      creditor_name: dbName,
      total_amount: Number(debt.originalAmount),
      current_balance: currentBal,
      interest_rate: Number(debt.interestRate) || 0,
      minimum_payment: Number(debt.monthlyPayment) || 0,
      due_date: debt.dueDate || null,
      status: initialStatus
    };

    const { data, error } = await supabase.from('debts').insert(dbPayload).select().single();
    if (!error && data) {
      const formatted = {
        id: data.id,
        creditorName: debt.currency === 'USD' ? data.creditor_name.slice(0, -6) : data.creditor_name,
        originalAmount: Number(data.total_amount),
        currentBalance: Number(data.current_balance),
        interestRate: Number(data.interest_rate),
        monthlyPayment: Number(data.minimum_payment),
        dueDate: data.due_date,
        status: data.status,
        currency: debt.currency || 'DOP',
        createdAt: data.created_at
      };
      set((state) => ({ debts: [...state.debts, formatted] }));
    }
  },

  updateDebt: async (id, updates) => {
    const goal = get().debts.find(d => d.id === id);
    const currentCurrency = updates.currency !== undefined ? updates.currency : (goal?.currency || 'DOP');

    const dbUpdates = {};
    if (updates.creditorName !== undefined || updates.currency !== undefined) {
      const name = updates.creditorName !== undefined ? updates.creditorName : (goal?.creditorName || '');
      dbUpdates.creditor_name = currentCurrency === 'USD' ? `${name} [USD]` : name;
    }
    
    if (updates.originalAmount !== undefined) dbUpdates.total_amount = Number(updates.originalAmount);

    let newCurrent = goal?.currentBalance || 0;
    if (updates.currentBalance !== undefined) {
      newCurrent = Number(updates.currentBalance);
      dbUpdates.current_balance = newCurrent;
      const newStatus = newCurrent <= 0 ? 'paid_off' : 'active';
      dbUpdates.status = newStatus;
      updates.status = newStatus;
    }

    if (updates.interestRate !== undefined) dbUpdates.interest_rate = Number(updates.interestRate);
    if (updates.monthlyPayment !== undefined) dbUpdates.minimum_payment = Number(updates.monthlyPayment);
    if (updates.dueDate !== undefined) dbUpdates.due_date = updates.dueDate || null;

    const { error } = await supabase.from('debts').update(dbUpdates).eq('id', id);
    if (!error) {
      set((state) => ({
        debts: state.debts.map((d) => (d.id === id ? { ...d, ...updates, currentBalance: newCurrent, status: updates.status || d.status, currency: currentCurrency } : d)),
      }));
    }
  },

  deleteDebt: async (id) => {
    // Due to ON DELETE CASCADE on debt_payments, deleting debt will delete its payments in DB
    const { error } = await supabase.from('debts').delete().eq('id', id);
    if (!error) {
      set((state) => ({
        debts: state.debts.filter((d) => d.id !== id),
        payments: state.payments.filter((p) => p.debtId !== id),
      }));
    }
  },

  addPayment: async (debtId, amount, date, notes = '') => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const debt = get().debts.find((d) => d.id === debtId);
    if (!debt) return;

    const newBalance = Math.max(0, Number(debt.currentBalance) - Number(amount));
    const newStatus = newBalance <= 0 ? 'paid_off' : 'active';

    const paymentPayload = {
      user_id: user.id,
      debt_id: debtId,
      amount: Number(amount),
      date: date,
      remaining_balance: newBalance,
      notes: notes || null
    };

    // We do both: insert payment and update debt
    const { data: paymentData, error: paymentError } = await supabase.from('debt_payments').insert(paymentPayload).select().single();
    if (paymentError) {
      console.error("Error adding payment", paymentError);
      return;
    }

    const { error: debtError } = await supabase.from('debts').update({ current_balance: newBalance, status: newStatus }).eq('id', debtId);
    
    if (!debtError && paymentData) {
      const formattedPayment = {
        id: paymentData.id,
        debtId: paymentData.debt_id,
        amount: Number(paymentData.amount),
        date: paymentData.date,
        remainingBalance: Number(paymentData.remaining_balance),
        notes: paymentData.notes,
        createdAt: paymentData.created_at
      };

      set((state) => ({
        payments: [...state.payments, formattedPayment],
        debts: state.debts.map((d) =>
          d.id === debtId
            ? { ...d, currentBalance: newBalance, status: newStatus }
            : d
        ),
      }));
    }
  },

  getPaymentsByDebt: (debtId) => {
    return get().payments.filter((p) => p.debtId === debtId).sort((a, b) => a.date.localeCompare(b.date));
  },

  getTotalDebt: () => {
    const rate = USD_TO_DOP_RATE;
    return get()
      .debts.filter((d) => d.status === 'active')
      .reduce((sum, d) => {
        const val = Number(d.currentBalance);
        return sum + (d.currency === 'USD' ? val * rate : val);
      }, 0);
  },

  getTotalMonthlyPayment: () => {
    const rate = USD_TO_DOP_RATE;
    return get()
      .debts.filter((d) => d.status === 'active')
      .reduce((sum, d) => {
        const val = Number(d.monthlyPayment);
        return sum + (d.currency === 'USD' ? val * rate : val);
      }, 0);
  },

  getActiveDebts: () => get().debts.filter((d) => d.status === 'active'),
}));

export default useDebtStore;
