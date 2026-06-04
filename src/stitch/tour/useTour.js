// Acceso al contexto del tour. Separado del Provider para no romper fast-refresh
// (un archivo exporta solo el hook; el Provider exporta el componente).
import { createContext, useContext } from 'react';

export const TourContext = createContext(null);

export function useTour() {
  const ctx = useContext(TourContext);
  if (!ctx) throw new Error('useTour debe usarse dentro de <TourProvider>');
  return ctx;
}
