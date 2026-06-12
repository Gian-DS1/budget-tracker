// Inyecta Material Symbols Outlined (iconos). Inter + Manrope se cargan desde
// index.html con solo los pesos que el código usa. (Tailwind ya NO se carga por
// CDN: se compila vía @tailwindcss/vite + los tokens @theme en stitch.css.)

import { useEffect } from 'react';
import { useI18n } from '../contexts/I18nContext';

function ensureLink(href, id) {
  if (document.getElementById(id)) return;
  const l = document.createElement('link');
  l.rel = 'stylesheet';
  l.href = href;
  l.id = id;
  document.head.appendChild(l);
}

export default function StitchHead() {
  const { language } = useI18n();

  useEffect(() => {
    ensureLink(
      'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap',
      'stitch-material-symbols'
    );
  }, []);

  // Actualizar lang en el documento cuando cambia el idioma
  useEffect(() => {
    document.documentElement.lang = language === 'es' ? 'es-DO' : 'en';
  }, [language]);

  return null;
}
