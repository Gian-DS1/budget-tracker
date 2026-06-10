// Guión del tutorial guiado (product tour) de FinTrack.
//
// Cada paso es declarativo. El TourProvider navega a `route` (si difiere de la
// ruta actual), espera a que `anchor` exista en el DOM y el Spotlight lo ilumina
// mostrando el globo con `title` + `body`. Si `anchor` es null o no aparece, el
// paso se muestra centrado (sin recorte), útil para la intro y el cierre.
//
// `placement`: dónde se coloca el globo respecto al elemento iluminado
//   'top' | 'bottom' | 'left' | 'right' | 'center'. El Spotlight ajusta si no
//   cabe (clamp a viewport).
// `padding`: holgura (px) del halo alrededor del elemento. Default 8.
//
// Diseño del guión: 7 pasos, enfocados en el NÚCLEO (lo más difícil de entender):
// el flujo del dinero (transacciones → la categoría define el tipo) y los niveles
// de presupuesto. El patrimonio y las herramientas se mencionan de pasada; el
// usuario los descubre solo. Lenguaje: español sencillo, sentence-case, sin em
// dashes. Qué es · para qué sirve · cómo.

import { tr } from '../../i18n/runtime';

// title/body son GETTERS: se traducen con el idioma activo en el momento en que
// el Spotlight los lee (cambiar el idioma a mitad de tour también funciona).
const step = (def, titleKey, bodyKey) => ({
  ...def,
  get title() { return tr(titleKey); },
  get body() { return tr(bodyKey); },
});

export const TOUR_STEPS = [
  // ── 1. Bienvenida ────────────────────────────────────────────────────────────
  step({ id: 'welcome', route: '/', anchor: null, placement: 'center' },
    'tour.welcomeTitle', 'tour.welcomeBody'),

  // ── 2. Navegación ──────────────────────────────────────────────────────────────
  step({ id: 'nav', route: '/', anchor: '[data-tour="nav"]', placement: 'right', padding: 10 },
    'tour.navTitle', 'tour.navBody'),

  // ── 3. Transacciones: el corazón (flujo del dinero) ──────────────────────────
  step({ id: 'ledger', route: '/transacciones', anchor: '[data-tour="ledger-new"]', placement: 'left' },
    'tour.ledgerTitle', 'tour.ledgerBody'),

  // ── 4. Presupuesto por niveles ───────────────────────────────────────────────
  step({ id: 'budget-levels', route: '/presupuesto', anchor: '[data-tour="budget-mode"]', placement: 'bottom' },
    'tour.budgetLevelsTitle', 'tour.budgetLevelsBody'),

  // ── 5. Cuánto puedes gastar (integración sin duplicar) ───────────────────────
  step({ id: 'budget-spend', route: '/presupuesto', anchor: '[data-tour="budget-summary"]', placement: 'bottom' },
    'tour.budgetSpendTitle', 'tour.budgetSpendBody'),

  // ── 6. Todo conectado (cierre conceptual) ────────────────────────────────────
  step({ id: 'connected', route: '/', anchor: '[data-tour="dashboard-grid"]', placement: 'center' },
    'tour.connectedTitle', 'tour.connectedBody'),

  // ── 7. Cierre ────────────────────────────────────────────────────────────────
  step({ id: 'done', route: '/', anchor: null, placement: 'center' },
    'tour.doneTitle', 'tour.doneBody'),
];
