// Hook que simplifica el acceso a strings traducidos de pantalla
import { useI18n } from '../contexts/I18nContext';
import { SCREEN_STRINGS } from './screenStrings';

export function useScreenStrings() {
  const { t } = useI18n();

  // Devuelve un objeto proxy que traduce automáticamente cualquier acceso
  // Ejemplo: strings.buttons.newTransaction -> traduce automáticamente
  return new Proxy(SCREEN_STRINGS, {
    get(target, prop) {
      const value = target[prop];
      if (typeof value === 'object' && value !== null) {
        // Si es un objeto anidado, devolver un proxy que traduzca sus valores
        return new Proxy(value, {
          get(innerTarget, innerProp) {
            const innerValue = innerTarget[innerProp];
            // Si es una clave de traducción (string), traduce
            if (typeof innerValue === 'string') {
              return t(innerValue);
            }
            return innerValue;
          },
        });
      }
      // Si es un string directo, traduce
      if (typeof value === 'string') {
        return t(value);
      }
      return value;
    },
  });
}
