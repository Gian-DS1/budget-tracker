// StitchApp — app real sobre la carrocería Stitch.
// Replica el flujo de src/App.jsx (auth, fetches de stores, rutas protegidas,
// keep-alive, recurrentes) renderizando el shell + pantallas Stitch.

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
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

export default function StitchApp() {
  const { user, loading, isRecoveringPassword } = useAuth();

  // Modo QA/Demo (solo localhost): trata al "usuario demo" como autenticado y
  // siembra los stores con datos de ejemplo, sin tocar Supabase ni producción.
  const demo = isDemoActive();
  const authedUser = user || (demo ? { id: 'demo', email: 'demo@local' } : null);

  // Visitante no logueado: landing por defecto; "Acceder" muestra el login.
  const [showAuth, setShowAuth] = useState(false);

  useEffect(() => {
    // Tras recargar con demo activo, re-sembrar los stores. Fuera del ciclo de
    // render (microtask) para no disparar setState síncrono dentro del effect.
    if (demo) queueMicrotask(seedDemoStores);
  }, [demo]);

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
    fetchCards();
    fetchPrefs();
  }, [user, fetchCategories, fetchTransactions, fetchBudgets, fetchGoals, fetchDebtsAndPayments, fetchCards, fetchPrefs]);

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

  // En modo demo no esperamos a Supabase: entramos directo.
  if (loading && !demo) {
    return (
      <>
        <StitchHead />
        <LoadingScreen label="Cargando aplicación…" />
      </>
    );
  }

  // Sin sesión: landing pública; "Acceder" o recuperación → pantalla de acceso.
  if (!authedUser || isRecoveringPassword) {
    const showLanding = !isRecoveringPassword && !showAuth;
    return (
      <>
        <StitchHead />
        <Toaster {...toasterOptions} />
        {showLanding ? <StitchLanding onAccess={() => setShowAuth(true)} /> : <StitchAuth />}
      </>
    );
  }

  // App autenticada.
  return (
    <>
      <StitchHead />
      <Toaster {...toasterOptions} />
      <BrowserRouter>
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
            <Route path="ajustes" element={<StitchSettings />} />
            <Route path="feedback" element={<StitchFeedback />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </>
  );
}
