// Inyecta las fuentes que usan las pantallas Stitch: Inter + Manrope + Material
// Symbols Outlined. (Tailwind ya NO se carga por CDN: se compila vía
// @tailwindcss/vite + los tokens @theme en stitch.css.)

import { useEffect } from 'react';

function ensureLink(href, id) {
  if (document.getElementById(id)) return;
  const l = document.createElement('link');
  l.rel = 'stylesheet';
  l.href = href;
  l.id = id;
  document.head.appendChild(l);
}

export default function StitchHead() {
  useEffect(() => {
    ensureLink(
      'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Manrope:wght@500;600;700;800&display=swap',
      'stitch-fonts'
    );
    ensureLink(
      'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap',
      'stitch-material-symbols'
    );
  }, []);

  return null;
}
