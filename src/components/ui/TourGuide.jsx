import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import { tourSteps } from '../../utils/tourConfig';

export default function TourGuide() {
  const navigate = useNavigate();
  const driverRef = useRef(null);

  useEffect(() => {
    // Evitar multiples inicializaciones si el componente se re-renderiza
    if (driverRef.current) return;

    const hasSeenTour = localStorage.getItem('fintrack-tour-seen');
    if (hasSeenTour) return;

    // Navega (si hace falta) a la página del paso `index` y luego lo resalta.
    // La ruta de cada paso vive en `tourConfig` (campo `route`), así no hay
    // índices cableados: agregar o reordenar pasos no rompe la navegación.
    const goToStep = (index) => {
      const step = tourSteps[index];
      if (!step || !driverRef.current) return;
      const needsNav = step.route && window.location.pathname !== step.route;
      if (needsNav) navigate(step.route);
      // Si cambiamos de página, esperamos a que React monte el nuevo DOM
      // (incluye la carga diferida de la ruta) antes de resaltar la zona.
      setTimeout(() => {
        if (driverRef.current) driverRef.current.drive(index);
      }, needsNav ? 400 : 0);
    };

    const timer = setTimeout(() => {
      driverRef.current = driver({
        showProgress: true,
        nextBtnText: 'Siguiente →',
        prevBtnText: '← Anterior',
        doneBtnText: '¡Empezar!',
        allowClose: true,
        showButtons: ['next', 'previous', 'close'],
        overlayColor: 'rgba(0, 0, 0, 0.7)',
        stagePadding: 6,
        stageRadius: 8,
        steps: tourSteps,

        onNextClick: (element, step, { state }) => goToStep(state.activeIndex + 1),
        onPrevClick: (element, step, { state }) => goToStep(state.activeIndex - 1),

        onDestroyStarted: () => {
          if (!driverRef.current.hasNextStep() || window.confirm("¿Seguro que quieres saltar el tutorial?")) {
            localStorage.setItem('fintrack-tour-seen', 'true');
            driverRef.current.destroy();
          }
        },
      });
      
      driverRef.current.drive();
    }, 800);

    return () => clearTimeout(timer);
    // Solo se inicializa al montar; `navigate` es estable en react-router.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
