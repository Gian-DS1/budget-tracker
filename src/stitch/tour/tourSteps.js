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

export const TOUR_STEPS = [
  // ── 1. Bienvenida ────────────────────────────────────────────────────────────
  {
    id: 'welcome',
    route: '/',
    anchor: null,
    placement: 'center',
    title: '¡Bienvenido a FinTrack! 👋',
    body: 'Te muestro lo esencial en un minuto: cómo registrar tu dinero y cómo organizarlo con un presupuesto. Puedes salir cuando quieras con “Saltar”.',
  },

  // ── 2. Navegación ──────────────────────────────────────────────────────────────
  {
    id: 'nav',
    route: '/',
    anchor: '[data-tour="nav"]',
    placement: 'right',
    padding: 10,
    title: 'Tu menú',
    body: 'Desde aquí llegas a todo, en tres bloques: Principal (tu día a día), Patrimonio (lo que tienes y lo que debes) y Herramientas (calendario, reportes y categorías).',
  },

  // ── 3. Transacciones: el corazón (flujo del dinero) ──────────────────────────
  {
    id: 'ledger',
    route: '/transacciones',
    anchor: '[data-tour="ledger-new"]',
    placement: 'left',
    title: 'Registra tu dinero',
    body: 'Este es el corazón de la app. Con “Nueva transacción” anotas cada ingreso o gasto. No eliges si es ingreso o gasto: lo define la categoría que escojas. Y al escribir la descripción, la app sugiere la categoría sola.',
  },

  // ── 4. Presupuesto por niveles ───────────────────────────────────────────────
  {
    id: 'budget-levels',
    route: '/presupuesto',
    anchor: '[data-tour="budget-mode"]',
    placement: 'bottom',
    title: 'Tu presupuesto, por niveles',
    body: 'Tu presupuesto crece contigo. “Seguimiento” solo observa tus gastos; “50/30/20” reparte tu dinero en necesidades, gustos y ahorro; “Base cero” asigna cada peso a un sobre. Empieza simple y sube de nivel cuando quieras.',
  },

  // ── 5. Cuánto puedes gastar (integración sin duplicar) ───────────────────────
  {
    id: 'budget-spend',
    route: '/presupuesto',
    anchor: '[data-tour="budget-summary"]',
    placement: 'bottom',
    title: 'Cuánto puedes gastar',
    body: 'Aquí ves cuánto tienes comprometido (gastos fijos, ahorro y deudas) y cuánto te queda libre. Lo mejor: tus deudas, tarjetas y metas de ahorro se descuentan solas desde sus módulos, sin que las cuentes dos veces.',
  },

  // ── 6. Todo conectado (cierre conceptual) ────────────────────────────────────
  {
    id: 'connected',
    route: '/',
    anchor: '[data-tour="dashboard-grid"]',
    placement: 'center',
    title: 'Todo conectado',
    body: 'Todo lo que registras se conecta solo. Este resumen, el calendario de vencimientos y los reportes se llenan a partir de tus transacciones. No hay nada más que configurar: explora a tu ritmo.',
  },

  // ── 7. Cierre ────────────────────────────────────────────────────────────────
  {
    id: 'done',
    route: '/',
    anchor: null,
    placement: 'center',
    title: '¡Listo! 🎉',
    body: 'Ya conoces lo esencial. Empieza registrando tus primeros movimientos y arma tu presupuesto. ¿Quieres repetir el tutorial? Está en tu menú de cuenta, arriba a la derecha.',
  },
];
