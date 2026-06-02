// FinTrack — Shortcuts registry
//
// Permite que cada página registre las acciones que sus atajos de teclado
// pueden disparar (nueva transacción, mes anterior/siguiente, etc.) sin que el
// listener global tenga que conocer el estado de cada página. El listener vive
// en el Layout (useKeyboardShortcuts) y lee el registro al momento de la tecla.

import { createContext, useContext, useRef, useCallback } from 'react';

const ShortcutsContext = createContext(null);

export function ShortcutsProvider({ children }) {
  const registryRef = useRef({});

  // Registra un conjunto de callbacks y devuelve una función de limpieza que
  // elimina exactamente esos callbacks (por identidad), para no pisar los de
  // otra página montada.
  const register = useCallback((callbacks) => {
    registryRef.current = { ...registryRef.current, ...callbacks };
    return () => {
      const next = { ...registryRef.current };
      Object.keys(callbacks).forEach((key) => {
        if (next[key] === callbacks[key]) delete next[key];
      });
      registryRef.current = next;
    };
  }, []);

  const getCallbacks = useCallback(() => registryRef.current, []);

  return (
    <ShortcutsContext.Provider value={{ register, getCallbacks }}>
      {children}
    </ShortcutsContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useShortcutsRegistry() {
  return useContext(ShortcutsContext);
}
