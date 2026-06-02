// Inyecta en runtime lo que cada pantalla Stitch trae en su <head>:
//   - Tailwind CDN (con plugins forms + container-queries)
//   - la config de Tailwind (stitchTailwindConfig)
//   - fuentes Inter + Manrope + Material Symbols Outlined
//
// 1:1 con Stitch: Stitch genera HTML con Tailwind CDN y Material Symbols. Esta es
// la vía honesta de reproducirlo dentro de la app React sin reescribir a clases
// propias. Se monta una sola vez (en StitchApp).

import { useEffect } from 'react';
import { stitchTailwindConfig } from './stitchTheme';

function ensureTag(make, id) {
  if (document.getElementById(id)) return;
  const el = make();
  el.id = id;
  document.head.appendChild(el);
}

export default function StitchHead() {
  useEffect(() => {
    // Config de Tailwind ANTES de cargar el script CDN.
    if (!window.tailwind) {
      window.tailwind = {};
    }
    window.tailwind.config = stitchTailwindConfig;

    ensureTag(() => {
      const s = document.createElement('script');
      s.src = 'https://cdn.tailwindcss.com?plugins=forms,container-queries';
      return s;
    }, 'stitch-tailwind-cdn');

    ensureTag(() => {
      const l = document.createElement('link');
      l.rel = 'stylesheet';
      l.href =
        'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Manrope:wght@500;520;600;700;800&display=swap';
      return l;
    }, 'stitch-fonts');

    ensureTag(() => {
      const l = document.createElement('link');
      l.rel = 'stylesheet';
      l.href =
        'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap';
      return l;
    }, 'stitch-material-symbols');
  }, []);

  return null;
}
