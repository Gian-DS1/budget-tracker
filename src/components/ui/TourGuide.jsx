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

    const timer = setTimeout(() => {
      driverRef.current = driver({
        showProgress: true,
        nextBtnText: 'Siguiente →',
        prevBtnText: '← Anterior',
        doneBtnText: '¡Empezar!',
        allowClose: false,
        overlayColor: 'rgba(0, 0, 0, 0.7)',
        steps: tourSteps,
        
        onNextClick: (element, step, { state }) => {
          const currentStepIndex = state.activeIndex;
          const nextIndex = currentStepIndex + 1;
          
          // Navegar a la nueva pagina
          if (currentStepIndex === 1) navigate('/transacciones');
          if (currentStepIndex === 2) navigate('/presupuesto');
          if (currentStepIndex === 3) navigate('/ahorros');
          if (currentStepIndex === 4) navigate('/deudas');
          if (currentStepIndex === 5) navigate('/');
          
          // Mover al siguiente paso (se centrara si el elemento aun no existe)
          driverRef.current.moveNext();

          // Esperar a que React renderice el nuevo DOM y re-evaluar la posicion
          setTimeout(() => {
             driverRef.current.drive(nextIndex);
          }, 150);
        },
        
        onPrevClick: (element, step, { state }) => {
          const currentStepIndex = state.activeIndex;
          const prevIndex = currentStepIndex - 1;
          
          if (currentStepIndex === 2) navigate('/');
          if (currentStepIndex === 3) navigate('/transacciones');
          if (currentStepIndex === 4) navigate('/presupuesto');
          if (currentStepIndex === 5) navigate('/ahorros');
          if (currentStepIndex === 6) navigate('/deudas');
          
          driverRef.current.movePrevious();

          setTimeout(() => {
             driverRef.current.drive(prevIndex);
          }, 150);
        },

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
  }, []); // Dependencia vacia, solo se ejecuta al montar

  return null;
}
