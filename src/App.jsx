import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import toast from 'react-hot-toast';
import { useEffect, lazy, Suspense } from 'react';

import Layout from './components/layout/Layout';
import useThemeStore from './stores/useThemeStore';
import useCategoryStore from './stores/useCategoryStore';
import useTransactionStore from './stores/useTransactionStore';
import useBudgetStore from './stores/useBudgetStore';
import useSavingsStore from './stores/useSavingsStore';
import useDebtStore from './stores/useDebtStore';
import usePlanStore from './stores/usePlanStore';
import useCreditCardStore from './stores/useCreditCardStore';
import useRateStore from './stores/useRateStore';
import useRecurringStore from './stores/useRecurringStore';
import { useAuth } from './contexts/AuthContext';
import { supabase } from './lib/supabase';
import AuthPage from './pages/AuthPage';

// Lazy-loaded routes: keeps heavy deps (recharts, xlsx) out of the initial
// bundle so each page loads its own chunk on demand.
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const TransactionsPage = lazy(() => import('./pages/TransactionsPage'));
const BudgetPage = lazy(() => import('./pages/BudgetPage'));
const SavingsPage = lazy(() => import('./pages/SavingsPage'));
const DebtsPage = lazy(() => import('./pages/DebtsPage'));
const PlanPage = lazy(() => import('./pages/PlanPage'));
const ReportsPage = lazy(() => import('./pages/ReportsPage'));
const CalendarPage = lazy(() => import('./pages/CalendarPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const FeedbackPage = lazy(() => import('./pages/FeedbackPage'));
const CreditCardsPage = lazy(() => import('./pages/CreditCardsPage'));
// Landing pública (visitantes no logueados). Lazy para mantener framer-motion
// fuera del bundle de la app interna.
const LandingPage = lazy(() => import('./pages/LandingPage'));
import TourGuide from './components/ui/TourGuide';

const PageLoader = () => (
  <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)' }}>
    Cargando...
  </div>
);

function App() {
  const { theme } = useThemeStore();
  const { user, loading, isRecoveringPassword } = useAuth();
  
  const fetchCategories = useCategoryStore((state) => state.fetchCategories);
  const fetchTransactions = useTransactionStore((state) => state.fetchTransactions);
  const fetchBudgets = useBudgetStore((state) => state.fetchBudgets);
  const fetchGoals = useSavingsStore((state) => state.fetchGoals);
  const fetchDebtsAndPayments = useDebtStore((state) => state.fetchDebtsAndPayments);
  const fetchPlans = usePlanStore((state) => state.fetchPlans);
  const fetchCards = useCreditCardStore((state) => state.fetchCards);
  const fetchRecurring = useRecurringStore((state) => state.fetchRecurring);
  const materializeDue = useRecurringStore((state) => state.materializeDue);

  const fetchRate = useRateStore((state) => state.fetchRate);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Tasa USD→DOP actual: se obtiene una vez al cargar (es pública, no depende
  // de la sesión) y queda cacheada para valorar deudas/balances en USD.
  useEffect(() => {
    fetchRate();
  }, [fetchRate]);

  // Supabase Database Keep-Alive Trigger to prevent sleep on the free tier
  useEffect(() => {
    if (!user) return;

    const keepAlive = async () => {
      try {
        await supabase.from('categories').select('id').limit(1);
      } catch (err) {
        console.warn('Supabase keep-alive ping failed', err);
      }
    };

    // Trigger immediately on mount/login
    keepAlive();

    // Trigger every 15 minutes
    const intervalId = setInterval(keepAlive, 15 * 60 * 1000);

    return () => clearInterval(intervalId);
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchCategories();
      fetchTransactions();
      fetchBudgets();
      fetchGoals();
      fetchDebtsAndPayments();
      fetchPlans();
      fetchCards();
    }
  }, [user, fetchCategories, fetchTransactions, fetchBudgets, fetchGoals, fetchDebtsAndPayments, fetchPlans, fetchCards]);

  // Transacciones recurrentes: carga las plantillas y materializa las
  // ocurrencias vencidas (con aviso). Separado para poder encadenar fetch →
  // materialize sin condicionar el bloque de arriba.
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      await fetchRecurring();
      if (cancelled) return;
      const res = await materializeDue();
      if (!cancelled && res.count > 0) {
        toast.success(
          `Se ${res.count === 1 ? 'registró' : 'registraron'} ${res.count} transacción${res.count === 1 ? '' : 'es'} recurrente${res.count === 1 ? '' : 's'}`
        );
      }
    })();
    return () => { cancelled = true; };
  }, [user, fetchRecurring, materializeDue]);

  if (loading) {
    return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>Cargando aplicación...</div>;
  }

  if (!user || isRecoveringPassword) {
    return (
      <BrowserRouter>
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: 'var(--bg-card)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-primary)',
            }
          }}
        />
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {isRecoveringPassword ? (
              // Recuperación de contraseña: AuthPage en cualquier ruta (intacto).
              <Route path="*" element={<AuthPage />} />
            ) : (
              <>
                {/* Visitante no logueado: la raíz muestra la landing; los CTA
                    navegan a /acceder, que renderiza el flujo de auth. */}
                <Route path="/" element={<LandingPage />} />
                <Route path="*" element={<AuthPage />} />
              </>
            )}
          </Routes>
        </Suspense>
      </BrowserRouter>
    );
  }

  return (
    <BrowserRouter>
      <Toaster 
        position="top-right" 
        toastOptions={{
          style: {
            background: 'var(--bg-card)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border-primary)',
          }
        }} 
      />
      {user && !loading && <TourGuide />}
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<DashboardPage />} />
            <Route path="transacciones" element={<TransactionsPage />} />
            <Route path="presupuesto" element={<BudgetPage />} />
            <Route path="ahorros" element={<SavingsPage />} />
            <Route path="deudas" element={<DebtsPage />} />
            <Route path="plan" element={<PlanPage />} />
            <Route path="reportes" element={<ReportsPage />} />
            <Route path="calendario" element={<CalendarPage />} />
            <Route path="ajustes" element={<SettingsPage />} />
            <Route path="feedback" element={<FeedbackPage />} />
            <Route path="tarjetas" element={<CreditCardsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
