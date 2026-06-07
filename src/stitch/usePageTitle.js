import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const DEFAULT_TITLE = 'FinTrack — Presupuesto y Control de Gastos';

const ROUTE_TITLES = {
  '/': 'Resumen · FinTrack',
  '/transacciones': 'Transacciones · FinTrack',
  '/presupuesto': 'Presupuesto · FinTrack',
  '/tarjetas': 'Tarjetas · FinTrack',
  '/deudas': 'Deudas · FinTrack',
  '/ahorros': 'Ahorros · FinTrack',
  '/reportes': 'Reportes · FinTrack',
  '/calendario': 'Calendario · FinTrack',
  '/categorias': 'Categorías · FinTrack',
  '/ajustes': 'Ajustes · FinTrack',
  '/feedback': 'Feedback · FinTrack',
};

export function usePageTitle(fallback = DEFAULT_TITLE) {
  const { pathname } = useLocation();
  useEffect(() => {
    document.title = ROUTE_TITLES[pathname] ?? fallback;
    return () => { document.title = DEFAULT_TITLE; };
  }, [pathname, fallback]);
}

export { DEFAULT_TITLE };
