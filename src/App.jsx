import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useEffect } from 'react';

import Layout from './components/layout/Layout';
import useThemeStore from './stores/useThemeStore';

import DashboardPage from './pages/DashboardPage';
import TransactionsPage from './pages/TransactionsPage';
import BudgetPage from './pages/BudgetPage';
import SavingsPage from './pages/SavingsPage';
import DebtsPage from './pages/DebtsPage';
import PlanPage from './pages/PlanPage';
import ReportsPage from './pages/ReportsPage';
import CalendarPage from './pages/CalendarPage';
import SettingsPage from './pages/SettingsPage';

function App() {
  const { theme } = useThemeStore();

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

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
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
