// TourProvider — cerebro del tutorial guiado.
//
// Orquesta: estado del paso actual, navegación entre páginas (react-router),
// lógica de "forzar demo" para usuarios sin datos, persistencia de "ya visto", y
// expone start/next/prev/skip/finish vía contexto. Renderiza <Spotlight> cuando
// el tour está activo. Debe montarse DENTRO del BrowserRouter (usa useNavigate).

import { useCallback, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { TourContext } from './useTour';
import Spotlight from './Spotlight';
import { TOUR_STEPS } from './tourSteps';
import useTransactionStore from '../../stores/useTransactionStore';
import usePrefsStore from '../../stores/usePrefsStore';
import { isDemoActive, enterDemo, exitDemo } from '../demoMode';

export default function TourProvider({ children }) {
  const navigate = useNavigate();
  const [active, setActive] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  // ¿El tour activó el demo (usuario sin datos)? Para revertirlo al cerrar.
  const forcedDemoRef = useRef(false);

  const setTutorialSeen = usePrefsStore((s) => s.setTutorialSeen);

  const total = TOUR_STEPS.length;
  const step = active ? TOUR_STEPS[stepIndex] : null;

  // Inicia el tour. Si el usuario no tiene datos y no está en demo, siembra el
  // demo para que cada pantalla se vea poblada (se revierte al cerrar).
  const start = useCallback(() => {
    const hasData = useTransactionStore.getState().transactions.length > 0;
    if (!hasData && !isDemoActive()) {
      const ok = enterDemo(); // solo surte efecto en entornos con demo permitido
      forcedDemoRef.current = !!ok;
    } else {
      forcedDemoRef.current = false;
    }
    setStepIndex(0);
    setActive(true);
  }, []);

  // Cierra el tour (fin o saltar). Marca "ya visto" y revierte el demo forzado.
  const close = useCallback(() => {
    setActive(false);
    setTutorialSeen(true);
    if (forcedDemoRef.current) {
      forcedDemoRef.current = false;
      exitDemo();
      // Volver a la cuenta real (vacía): recargar limpia los stores sembrados.
      window.location.reload();
    }
  }, [setTutorialSeen]);

  const next = useCallback(() => {
    setStepIndex((i) => {
      if (i >= total - 1) { close(); return i; }
      return i + 1;
    });
  }, [total, close]);

  const prev = useCallback(() => {
    setStepIndex((i) => Math.max(0, i - 1));
  }, []);

  const goTo = useCallback((i) => {
    setStepIndex(() => Math.min(total - 1, Math.max(0, i)));
  }, [total]);

  const value = useMemo(
    () => ({ active, stepIndex, total, start, next, prev, skip: close, finish: close, goTo }),
    [active, stepIndex, total, start, next, prev, close, goTo],
  );

  return (
    <TourContext.Provider value={value}>
      {children}
      {active && step && (
        <Spotlight
          step={step}
          stepIndex={stepIndex}
          total={total}
          navigate={navigate}
          onNext={next}
          onPrev={prev}
          onSkip={close}
        />
      )}
    </TourContext.Provider>
  );
}
