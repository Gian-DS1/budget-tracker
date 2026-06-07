// StitchApp — app real sobre la carrocería Stitch.
// Replica el flujo de src/App.jsx (auth, fetches de stores, rutas protegidas,
// keep-alive, recurrentes) renderizando el shell + pantallas Stitch.

import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import toast from 'react-hot-toast';
import { useEffect, useState } from 'react';

import StitchHead from './StitchHead';
import StitchShell from './StitchShell';
import StitchAuth from './screens/StitchAuth';
import StitchLanding from './screens/StitchLanding';
import StitchDashboard from './screens/StitchDashboard';
import StitchLedger from './screens/StitchLedger';
import StitchBudget from './screens/StitchBudget';
import StitchCards from './screens/StitchCards';
import StitchDebts from './screens/StitchDebts';
import StitchVaults from './screens/StitchVaults';
import StitchReports from './screens/StitchReports';
import StitchCalendar from './screens/StitchCalendar';
import StitchSettings from './screens/StitchSettings';
import StitchFeedback from './screens/StitchFeedback';
import StitchCategories from './screens/StitchCategories';
import { DEFAULT_TITLE } from './usePageTitle';
import './stitch.css';

import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { isDemoActive, seedDemoStores } from './demoMode';
import useCategoryStore from '../stores/useCategoryStore';
import useTransactionStore from '../stores/useTransactionStore';
import useBudgetStore from '../stores/useBudgetStore';
import useSavingsStore from '../stores/useSavingsStore';
import useDebtStore from '../stores/useDebtStore';
import useCreditCardStore from '../stores/useCreditCardStore';
import useRateStore from '../stores/useRateStore';
import useRecurringStore from '../stores/useRecurringStore';
import usePrefsStore from '../stores/usePrefsStore';

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

// Gate de autenticación que vive DENTRO del router para poder leer la ruta
// y redirigir a / cuando no hay sesión, evitando URLs residuales.
function AuthGate() {
  const { user, loading, isRecoveringPassword } = useAuth();
  const location = useLocation();

  const demo = isDemoActive();
  const authedUser = user || (demo ? { id: 'demo', email: 'demo@local' } : null);
  const isPublic = !authedUser || isRecoveringPassword;

  const [showAuth, setShowAuth] = useState(false);

  const fetchCategories = useCategoryStore((s) => s.fetchCategories);
  const fetchTransactions = useTransactionStore((s) => s.fetchTransactions);
  const fetchBudgets = useBudgetStore((s) => s.fetchBudgets);
  const fetchGoals = useSavingsStore((s) => s.fetchGoals);
  const fetchDebtsAndPayments = useDebtStore((s) => s.fetchDebtsAndPayments);
  const fetchCards = useCreditCardStore((s) => s.fetchCards);
  const fetchPrefs = usePrefsStore((s) => s.fetchPrefs);
  const fetchRecurring = useRecurringStore((s) => s.fetchRecurring);
  const materializeDue = useRecurringStore((s) => s.materializeDue);
  const fetchRate = useRateStore((s) => s.fetchRate);

  useEffect(() => {
    if (demo) {
      queueMicrotask(seedDemoStores);
      // En demo no corre el effect de fetches (no hay user real); fetchPrefs marca
      // prefsLoaded para que el auto-arranque del tutorial pueda decidir.
      fetchPrefs();
    }
  }, [demo, fetchPrefs]);

  useEffect(() => { fetchRate(); }, [fetchRate]);

  useEffect(() => {
    if (!user) return;
    const ping = async () => {
      try { await supabase.from('categories').select('id').limit(1); } catch (e) { console.warn('keep-alive', e); }
    };
    ping();
    const id = setInterval(ping, 15 * 60 * 1000);
    return () => clearInterval(id);
  }, [user]);

  useEffect(() => {
    if (!user) return;
    fetchCategories();
    fetchTransactions();
    fetchBudgets();
    fetchGoals();
    fetchDebtsAndPayments();
    fetchCards();
    fetchPrefs();
  }, [user, fetchCategories, fetchTransactions, fetchBudgets, fetchGoals, fetchDebtsAndPayments, fetchCards, fetchPrefs]);

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

  // Restaurar título por defecto cuando no hay sesión.
  useEffect(() => {
    if (isPublic) document.title = DEFAULT_TITLE;
  }, [isPublic]);

  // Cargando sesión de Supabase: spinner neutral sin tocar la URL.
  if (loading && !demo) {
    return <LoadingScreen label="Cargando aplicación…" />;
  }

  // Sin sesión: redirigir a / para limpiar cualquier URL residual, luego
  // mostrar landing o auth desde la ruta raíz.
  if (isPublic) {
    if (location.pathname !== '/') {
      return <Navigate to="/" replace />;
    }
    const showLanding = !isRecoveringPassword && !showAuth;
    return showLanding
      ? <StitchLanding onAccess={() => setShowAuth(true)} />
      : <StitchAuth />;
  }

  // App autenticada: renderizar las rutas protegidas.
  return (
    <Routes>
      <Route element={<StitchShell />}>
        <Route index element={<StitchDashboard />} />
        <Route path="transacciones" element={<StitchLedger />} />
        <Route path="presupuesto" element={<StitchBudget />} />
        <Route path="tarjetas" element={<StitchCards />} />
        <Route path="deudas" element={<StitchDebts />} />
        <Route path="ahorros" element={<StitchVaults />} />
        <Route path="reportes" element={<StitchReports />} />
        <Route path="calendario" element={<StitchCalendar />} />
        <Route path="categorias" element={<StitchCategories />} />
        <Route path="ajustes" element={<StitchSettings />} />
        <Route path="feedback" element={<StitchFeedback />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

export default function StitchApp() {
  return (
    <>
      <StitchHead />
      <Toaster {...toasterOptions} />
      <BrowserRouter>
        <AuthGate />
      </BrowserRouter>
    </>
  );
}
