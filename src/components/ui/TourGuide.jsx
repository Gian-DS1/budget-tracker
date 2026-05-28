import { useEffect } from 'react';
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import { tourSteps } from '../../utils/tourConfig';

export default function TourGuide() {
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
  }, []);

  return null;
}
