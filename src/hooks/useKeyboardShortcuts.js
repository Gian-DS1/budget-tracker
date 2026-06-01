import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useShortcutsRegistry } from '../contexts/ShortcutsContext';

// Atajos globales. Vive una sola vez (en el Layout) y lee el registro de la
// página activa al momento de pulsar la tecla, así que siempre dispara la acción
// más reciente sin closures obsoletos.
//
//   Cmd/Ctrl + T   → nueva transacción (modal si la página lo registra; si no, navega)
//   Cmd/Ctrl + E   → ajustes / exportar
//   Ctrl + ← / →   → mes anterior / siguiente (páginas con navegación por mes)
//
// Escape lo maneja cada Modal por su cuenta; no se intercepta aquí.
export function useKeyboardShortcuts() {
  const navigate = useNavigate();
  const registry = useShortcutsRegistry();

  useEffect(() => {
    const handleKeyDown = (e) => {
      const cb = registry ? registry.getCallbacks() : {};
      const isMac = /Mac|iPhone|iPad|iPod/.test(navigator.platform);
      const mod = isMac ? e.metaKey : e.ctrlKey;

      // No secuestrar teclas mientras el usuario escribe.
      const el = e.target;
      const tag = (el?.tagName || '').toLowerCase();
      const typing =
        tag === 'input' || tag === 'textarea' || tag === 'select' || el?.isContentEditable;

      if (mod && e.key.toLowerCase() === 't') {
        e.preventDefault();
        if (cb.newTransaction) cb.newTransaction();
        else navigate('/transacciones');
        return;
      }

      if (mod && e.key.toLowerCase() === 'e') {
        e.preventDefault();
        navigate('/ajustes');
        return;
      }

      // Navegación por mes: Ctrl+flechas, solo si la página la registró y el
      // foco no está en un campo (donde las flechas mueven el cursor).
      if (e.ctrlKey && !typing && e.key === 'ArrowLeft' && cb.previousMonth) {
        e.preventDefault();
        cb.previousMonth();
        return;
      }
      if (e.ctrlKey && !typing && e.key === 'ArrowRight' && cb.nextMonth) {
        e.preventDefault();
        cb.nextMonth();
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate, registry]);
}

// Hook para páginas: registra las acciones que sus atajos pueden disparar.
// Usa una ref para que los wrappers registrados llamen siempre a la última
// versión del callback (sin closures obsoletos ni re-registros por render).
export function usePageShortcuts(callbacks) {
  const registry = useShortcutsRegistry();
  const ref = useRef(callbacks);

  // Mantener la ref con la última versión de los callbacks (fuera de render).
  useEffect(() => {
    ref.current = callbacks;
  });

  useEffect(() => {
    if (!registry) return undefined;
    const keys = Object.keys(ref.current);
    const wrappers = {};
    keys.forEach((key) => {
      wrappers[key] = (...args) => ref.current[key]?.(...args);
    });
    return registry.register(wrappers);
  }, [registry]);
}
