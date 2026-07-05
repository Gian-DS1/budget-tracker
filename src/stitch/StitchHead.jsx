// Mantiene <html lang> sincronizado con el idioma elegido. Las fuentes (Inter,
// Manrope, Material Symbols) se cargan desde index.html para que el fetch
// arranque antes de que monte React. (Tailwind ya NO se carga por CDN: se
// compila vía @tailwindcss/vite + los tokens @theme en stitch.css.)

import { useEffect } from 'react';
import { useI18n } from '../contexts/I18nContext';

export default function StitchHead() {
  const { language } = useI18n();

  useEffect(() => {
    document.documentElement.lang = language === 'es' ? 'es-DO' : 'en';
  }, [language]);

  return null;
}
