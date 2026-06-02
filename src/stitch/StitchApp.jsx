// StitchApp — app real sobre la carrocería Stitch.
// Replica el flujo de src/App.jsx (auth, fetches de stores, rutas protegidas,
// keep-alive, recurrentes) renderizando el shell + pantallas Stitch.

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import toast from 'react-hot-toast';
import { useEffect } from 'react';

import StitchHead from './StitchHead';
import StitchShell from './StitchShell';
import StitchAuth from './screens/StitchAuth';
import StitchDashboard from './screens/StitchDashboard';
import StitchLedger from './screens/StitchLedger';
import StitchBudget from './screens/StitchBudget';
import StitchCards from './screens/StitchCards';
import StitchDebts from './screens/StitchDebts';
import StitchVaults from './screens/StitchVaults';
import StitchStrategy from './screens/StitchStrategy';
import StitchReports from './screens/StitchReports';
import StitchCalendar from './screens/StitchCalendar';
import StitchSettings from './screens/StitchSettings';
import StitchFeedback from './screens/StitchFeedback';
import './stitch.css';

import { useAuth } from '../contexts/AuthContext';
import { ShortcutsProvider } from '../contexts/ShortcutsContext';
import { supabase } from '../lib/supabase';
import useCategoryStore from '../stores/useCategoryStore';
import useTransactionStore from '../stores/useTransactionStore';
import useBudgetStore from '../stores/useBudgetStore';
import useSavingsStore from '../stores/useSavingsStore';
import useDebtStore from '../stores/useDebtStore';
import usePlanStore from '../stores/usePlanStore';
import useCreditCardStore from '../stores/useCreditCardStore';
import useRateStore from '../stores/useRateStore';
import useRecurringStore from '../stores/useRecurringStore';

const toasterOptions = {
  position: 'top-right',
  toastOptions: {
    style: {
      background: '#101112',
      color: '#e5e2e3',
      border: '1px solid #232426',
      fontSize: '13px',
    },
  },
};

function LoadingScreen({ label }) {
  return (
    <div className="stitch-root flex items-center justify-center min-h-screen">
      <div className="flex items-center gap-sm font-mono-data text-mono-data text-text-muted uppercase tracking-widest">
        <span className="w-2 h-2 rounded-full bg-primary status-glow-live" />
        {label}
      </div>
    </div>
  );
}

export default function StitchApp() {
  const { user, loading, isRecoveringPassword } = useAuth();

  const fetchCategories = useCategoryStore((s) => s.fetchCategories);
  const fetchTransactions = useTransactionStore((s) => s.fetchTransactions);
  const fetchBudgets = useBudgetStore((s) => s.fetchBudgets);
  const fetchGoals = useSavingsStore((s) => s.fetchGoals);
  const fetchDebtsAndPayments = useDebtStore((s) => s.fetchDebtsAndPayments);
  const fetchPlans = usePlanStore((s) => s.fetchPlans);
  const fetchCards = useCreditCardStore((s) => s.fetchCards);
  const fetchRecurring = useRecurringStore((s) => s.fetchRecurring);
  const materializeDue = useRecurringStore((s) => s.materializeDue);
  const fetchRate = useRateStore((s) => s.fetchRate);

  // Tasa USD→DOP: pública, una vez al cargar.
  useEffect(() => { fetchRate(); }, [fetchRate]);

  // Keep-alive de Supabase (free tier).
  useEffect(() => {
    if (!user) return;
    const ping = async () => {
      try { await supabase.from('categories').select('id').limit(1); } catch (e) { console.warn('keep-alive', e); }
    };
    ping();
    const id = setInterval(ping, 15 * 60 * 1000);
    return () => clearInterval(id);
  }, [user]);

  // Carga de datos del usuario al iniciar sesión.
  useEffect(() => {
    if (!user) return;
    fetchCategories();
    fetchTransactions();
    fetchBudgets();
    fetchGoals();
    fetchDebtsAndPayments();
    fetchPlans();
    fetchCards();
  }, [user, fetchCategories, fetchTransactions, fetchBudgets, fetchGoals, fetchDebtsAndPayments, fetchPlans, fetchCards]);

  // Recurrentes: cargar plantillas y materializar las vencidas.
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      await fetchRecurring();
      if (cancelled) return;
      const res = await materializeDue();
      if (!cancelled && res.count > 0) {
        toast.success(`Se ${res.count === 1 ? 'registró' : 'registraron'} ${res.count} transacción${res.count === 1 ? '' : 'es'} recurrente${res.count === 1 ? '' : 's'}`);
      }
    })();
    return () => { cancelled = true; };
  }, [user, fetchRecurring, materializeDue]);

  if (loading) {
    return (
      <>
        <StitchHead />
        <LoadingScreen label="Cargando aplicación…" />
      </>
    );
  }

  // Sin sesión (o recuperando contraseña): pantalla de acceso Stitch.
  if (!user || isRecoveringPassword) {
    return (
      <>
        <StitchHead />
        <Toaster {...toasterOptions} />
        <StitchAuth />
      </>
    );
  }

  // App autenticada.
  return (
    <>
      <StitchHead />
      <Toaster {...toasterOptions} />
      <BrowserRouter>
        <ShortcutsProvider>
          <Routes>
            <Route element={<StitchShell />}>
              <Route index element={<StitchDashboard />} />
              <Route path="transacciones" element={<StitchLedger />} />
              <Route path="presupuesto" element={<StitchBudget />} />
              <Route path="tarjetas" element={<StitchCards />} />
              <Route path="deudas" element={<StitchDebts />} />
              <Route path="ahorros" element={<StitchVaults />} />
              <Route path="plan" element={<StitchStrategy />} />
              <Route path="reportes" element={<StitchReports />} />
              <Route path="calendario" element={<StitchCalendar />} />
              <Route path="ajustes" element={<StitchSettings />} />
              <Route path="feedback" element={<StitchFeedback />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </ShortcutsProvider>
      </BrowserRouter>
    </>
  );
}
