import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import useRateStore from './useRateStore';
import useCategoryStore from './useCategoryStore';
import useTransactionStore from './useTransactionStore';

const useDebtStore = create(
  persist(
    (set, get) => ({
  debts: [],
  payments: [],
  loading: false,

  fetchDebtsAndPayments: async () => {
    set({ loading: true });
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) return set({ debts: [], payments: [], loading: false });

    const [debtsRes, paymentsRes] = await Promise.all([
      supabase.from('debts').select('*').eq('user_id', user.id),
      supabase.from('debt_payments').select('*').eq('user_id', user.id)
    ]);

    if (debtsRes.error || paymentsRes.error) {
      console.error('Error fetching debts/payments:', debtsRes.error || paymentsRes.error);
      toast.error('No se pudieron cargar las deudas');
    }

    let formattedDebts = [];
    if (!debtsRes.error && debtsRes.data) {
      formattedDebts = debtsRes.data.map(d => {
        // Moneda desde la columna `currency`. Para filas legadas (creadas antes
        // de la migraciÃ³n) que aÃºn llevan el sufijo " [USD]" en el nombre, se
        // detecta por el sufijo y se limpia el nombre al mostrarlo.
        const hasSuffix = d.creditor_name && d.creditor_name.endsWith(' [USD]');
        const currency = d.currency || (hasSuffix ? 'USD' : 'DOP');
        const creditorName = hasSuffix ? d.creditor_name.slice(0, -6) : d.creditor_name;
        return {
          id: d.id,
          creditorName,
          originalAmount: Number(d.total_amount),
          currentBalance: Number(d.current_balance),
          interestRate: Number(d.interest_rate),
          monthlyPayment: Number(d.minimum_payment),
          due_date: d.due_date,
          status: d.status,
          currency,
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
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) return;

    const currentBal = Number(debt.currentBalance !== undefined ? debt.currentBalance : debt.originalAmount);
    const initialStatus = currentBal <= 0 ? 'paid_off' : 'active';
    const currency = debt.currency || 'DOP';

    const dbPayload = {
      user_id: user.id,
      creditor_name: debt.creditorName,
      total_amount: Number(debt.originalAmount),
      current_balance: currentBal,
      interest_rate: Number(debt.interestRate) || 0,
      minimum_payment: Number(debt.monthlyPayment) || 0,
      due_date: debt.dueDate || null,
      status: initialStatus,
      currency,
    };

    const { data, error } = await supabase.from('debts').insert(dbPayload).select().single();
    if (!error && data) {
      const formatted = {
        id: data.id,
        creditorName: data.creditor_name,
        originalAmount: Number(data.total_amount),
        currentBalance: Number(data.current_balance),
        interestRate: Number(data.interest_rate),
        monthlyPayment: Number(data.minimum_payment),
        due_date: data.due_date,
        status: data.status,
        currency: data.currency || currency,
        createdAt: data.created_at
      };
      set((state) => ({ debts: [...state.debts, formatted] }));
    }
  },

  updateDebt: async (id, updates) => {
    const goal = get().debts.find(d => d.id === id);
    const currentCurrency = updates.currency !== undefined ? updates.currency : (goal?.currency || 'DOP');

    const dbUpdates = {};
    if (updates.creditorName !== undefined) dbUpdates.creditor_name = updates.creditorName;
    if (updates.currency !== undefined) dbUpdates.currency = updates.currency;

    if (updates.originalAmount !== undefined) dbUpdates.total_amount = Number(updates.originalAmount);

    let newCurrent = goal?.currentBalance || 0;
    // Track the resulting status in a local variable instead of mutating the
    // caller's `updates` object (mutating function args is a side-effect trap).
    let nextStatus = goal?.status || 'active';
    if (updates.currentBalance !== undefined) {
      newCurrent = Number(updates.currentBalance);
      dbUpdates.current_balance = newCurrent;
      nextStatus = newCurrent <= 0 ? 'paid_off' : 'active';
      dbUpdates.status = nextStatus;
    }

    if (updates.interestRate !== undefined) dbUpdates.interest_rate = Number(updates.interestRate);
    if (updates.monthlyPayment !== undefined) dbUpdates.minimum_payment = Number(updates.monthlyPayment);
    if (updates.dueDate !== undefined) dbUpdates.due_date = updates.dueDate || null;

    const { error } = await supabase.from('debts').update(dbUpdates).eq('id', id);
    if (!error) {
      set((state) => ({
        debts: state.debts.map((d) => (d.id === id ? { ...d, ...updates, currentBalance: newCurrent, status: nextStatus, currency: currentCurrency } : d)),
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
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
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
      
      // Sync with Transactions
      try {
        const categories = useCategoryStore.getState().categories;
        // Buscar por slug estable; respaldo por nombre para cuentas previas a la
        // migraciÃ³n del slug.
        const loanCategory =
          categories.find((c) => c.slug === 'pago-deuda') ||
          categories.find((c) => c.name === 'Pago de PrÃ©stamos y Deudas' || (c.name && c.name.includes('PrÃ©stamos')));
        
        if (loanCategory) {
          const addTransaction = useTransactionStore.getState().addTransaction;
          const currency = debt.currency || 'DOP';
          
          addTransaction({
            amount: Number(amount),
            type: 'fixed_expense',
            description: `Pago cuota - ${debt.creditorName}`,
            date: date,
            categoryId: loanCategory.id,
            currency: currency,
            notes: notes || 'Generado automÃ¡ticamente desde Deudas'
          });
        }
      } catch (err) {
        console.error('Error syncing debt payment with transactions:', err);
      }
    }
  },

  getPaymentsByDebt: (debtId) => {
    return get().payments.filter((p) => p.debtId === debtId).sort((a, b) => a.date.localeCompare(b.date));
  },

  getTotalDebt: () => {
    const rate = useRateStore.getState().getRate();
    return get()
      .debts.filter((d) => d.status === 'active')
      .reduce((sum, d) => {
        const val = Number(d.currentBalance);
        return sum + (d.currency === 'USD' ? val * rate : val);
      }, 0);
  },

  getTotalMonthlyPayment: () => {
    const rate = useRateStore.getState().getRate();
    return get()
      .debts.filter((d) => d.status === 'active')
      .reduce((sum, d) => {
        const val = Number(d.monthlyPayment);
        return sum + (d.currency === 'USD' ? val * rate : val);
      }, 0);
  },

  getActiveDebts: () => get().debts.filter((d) => d.status === 'active'),
}),
{
  name: 'fintrack-debts-cache',
  partialize: (state) => ({ debts: state.debts, payments: state.payments }),
}
)
);

export default useDebtStore;
