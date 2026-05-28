import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import { tourSteps } from '../../utils/tourConfig';

export default function TourGuide() {
  const navigate = useNavigate();

  useEffect(() => {
    const hasSeenTour = localStorage.getItem('fintrack-tour-seen');
    
    if (!hasSeenTour) {
      // Pequeno retraso para asegurar que los elementos del DOM han sido renderizados
      const timer = setTimeout(() => {
        const driverObj = driver({
          showProgress: true,
          nextBtnText: 'Siguiente →',
          prevBtnText: '← Anterior',
          doneBtnText: '¡Empezar!',
          allowClose: false,
          overlayColor: 'rgba(0, 0, 0, 0.7)',
          steps: tourSteps,
          
          // Intercept clicks to navigate before moving the driver
          onNextClick: (element, step, { state }) => {
            const currentStepIndex = state.activeIndex;
            
            if (currentStepIndex === 1) navigate('/transacciones');
            if (currentStepIndex === 2) navigate('/presupuesto');
            if (currentStepIndex === 3) navigate('/ahorros');
            if (currentStepIndex === 4) navigate('/deudas');
            if (currentStepIndex === 5) navigate('/');
            
            // Allow React a tiny moment to start rendering the new route
            setTimeout(() => {
              driverObj.moveNext();
            }, 200);
          },
          
          onPrevClick: (element, step, { state }) => {
            const currentStepIndex = state.activeIndex;
            
            if (currentStepIndex === 2) navigate('/');
            if (currentStepIndex === 3) navigate('/transacciones');
            if (currentStepIndex === 4) navigate('/presupuesto');
            if (currentStepIndex === 5) navigate('/ahorros');
            if (currentStepIndex === 6) navigate('/deudas');
            
            setTimeout(() => {
              driverObj.movePrevious();
            }, 200);
          },

          onDestroyStarted: () => {
            if (!driverObj.hasNextStep() || window.confirm("¿Seguro que quieres saltar el tutorial?")) {
              localStorage.setItem('fintrack-tour-seen', 'true');
              driverObj.destroy();
            }
          },
        });
        driverObj.drive();
      }, 800);

      return () => clearTimeout(timer);
    }
  }, [navigate]);

  return null;
}
