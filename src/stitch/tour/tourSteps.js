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
// Lenguaje: español sencillo, directo, sin jerga. Qué es · para qué sirve · cómo.

export const TOUR_STEPS = [
  // ── Bienvenida ──────────────────────────────────────────────────────────────
  {
    id: 'welcome',
    route: '/',
    anchor: null,
    placement: 'center',
    title: '¡Bienvenido a FinTrack! 👋',
    body: 'Te voy a mostrar la app en un minuto. Verás para qué sirve cada parte y cómo hacer lo importante. Puedes salir cuando quieras con “Saltar”.',
  },

  // ── Navegación ───────────────────────────────────────────────────────────────
  {
    id: 'nav',
    route: '/',
    anchor: '[data-tour="nav"]',
    placement: 'right',
    padding: 10,
    title: 'Tu menú de navegación',
    body: 'Desde aquí llegas a todo. Está dividido en tres bloques: Principal (tu día a día), Patrimonio (lo que tienes y lo que debes) y Herramientas (calendario y reportes).',
  },

  // ── Resumen / Dashboard ──────────────────────────────────────────────────────
  {
    id: 'dashboard',
    route: '/',
    anchor: '[data-tour="dashboard-grid"]',
    placement: 'center',
    title: 'Resumen: tu foto del mes',
    body: 'Esta es tu pantalla principal. De un vistazo ves cuánto puedes gastar, tus ingresos y gastos, tu patrimonio y tu “salud financiera”. Es el mejor lugar para empezar cada día.',
  },

  // ── Transacciones ────────────────────────────────────────────────────────────
  {
    id: 'ledger-intro',
    route: '/transacciones',
    anchor: '[data-tour="ledger-new"]',
    placement: 'left',
    title: 'Registra tus movimientos',
    body: 'Aquí anotas cada ingreso y gasto. Pulsa “Nueva transacción” para añadir uno. Al escribir la descripción, la app intenta adivinar la categoría sola para ahorrarte tiempo.',
  },
  {
    id: 'ledger-filters',
    route: '/transacciones',
    anchor: '[data-tour="ledger-filters"]',
    placement: 'bottom',
    title: 'Busca y filtra',
    body: 'Encuentra cualquier movimiento por texto, tipo, categoría o rango de fechas. Útil cuando tienes muchos registros y buscas algo puntual.',
  },
  {
    id: 'ledger-bulk',
    route: '/transacciones',
    anchor: '[data-tour="ledger-table"]',
    placement: 'top',
    title: 'Edita en bloque',
    body: 'Pasa el mouse sobre una fila y aparece una casilla. Marca varias para cambiarles la categoría o la tarjeta, o borrarlas, todas a la vez desde la barra que aparece abajo.',
  },

  // ── Presupuesto ──────────────────────────────────────────────────────────────
  {
    id: 'budget-mode',
    route: '/presupuesto',
    anchor: '[data-tour="budget-mode"]',
    placement: 'bottom',
    title: 'Tu presupuesto, a tu ritmo',
    body: 'Hay tres modos. “Seguimiento” solo observa tus gastos; “50/30/20” reparte tu dinero en necesidades, gustos y ahorro; “Base cero” asigna cada peso a un sobre. Empieza simple y sube de nivel cuando quieras.',
  },
  {
    id: 'budget-summary',
    route: '/presupuesto',
    anchor: '[data-tour="budget-summary"]',
    placement: 'bottom',
    title: 'Cuánto puedes gastar',
    body: 'Aquí ves lo que tienes comprometido (gastos fijos, ahorro y deudas) y lo que te queda libre. Las deudas se cuentan solas desde tu módulo de Deudas, sin contarlas dos veces.',
  },

  // ── Ahorros ──────────────────────────────────────────────────────────────────
  {
    id: 'vaults',
    route: '/ahorros',
    anchor: '[data-tour="vaults-new"]',
    placement: 'left',
    title: 'Metas de ahorro',
    body: 'Crea objetivos (un viaje, un fondo de emergencia…) con “Nueva meta”. Aporta poco a poco y mira crecer la barra de progreso hasta llegar a tu meta.',
  },

  // ── Deudas ───────────────────────────────────────────────────────────────────
  {
    id: 'debts',
    route: '/deudas',
    anchor: '[data-tour="debts-new"]',
    placement: 'left',
    title: 'Control de deudas',
    body: 'Registra tus préstamos y tarjetas con “Nueva deuda”. La app usa la estrategia “avalancha” para sugerirte cuál pagar primero y salir de deudas más rápido pagando menos intereses.',
  },

  // ── Tarjetas ─────────────────────────────────────────────────────────────────
  {
    id: 'cards',
    route: '/tarjetas',
    anchor: '[data-tour="cards-new"]',
    placement: 'left',
    title: 'Tarjetas de crédito',
    body: 'Añade tus tarjetas con sus fechas de corte y pago. La app calcula tu saldo, te avisa antes del pago y suma el cashback que ganas por categoría.',
  },

  // ── Calendario ───────────────────────────────────────────────────────────────
  {
    id: 'calendar',
    route: '/calendario',
    anchor: '[data-tour="calendar-grid"]',
    placement: 'center',
    title: 'Calendario financiero',
    body: 'Mira en qué días caen tus pagos, cortes de tarjeta y movimientos. Toca un día para ver el detalle. Ideal para no perder de vista ninguna fecha importante.',
  },

  // ── Reportes ─────────────────────────────────────────────────────────────────
  {
    id: 'reports',
    route: '/reportes',
    anchor: '[data-tour="reports-content"]',
    placement: 'center',
    title: 'Reportes y tendencias',
    body: 'Aquí ves tu dinero a lo largo del tiempo: en qué gastas más, cómo cambian tus meses y tu progreso. Te ayuda a tomar mejores decisiones con datos claros.',
  },

  // ── Cuenta / Ajustes ─────────────────────────────────────────────────────────
  {
    id: 'account',
    route: '/',
    anchor: '[data-tour="account"]',
    placement: 'bottom',
    title: 'Tu cuenta y ajustes',
    body: 'Desde tu avatar abres Ajustes (importar/exportar datos, tasa de cambio, nivel de presupuesto), dejas Feedback y, cuando quieras, vuelves a ver este tutorial.',
  },

  // ── Cierre ───────────────────────────────────────────────────────────────────
  {
    id: 'done',
    route: '/',
    anchor: null,
    placement: 'center',
    title: '¡Listo! 🎉',
    body: 'Ya conoces lo esencial. Empieza registrando tus primeros movimientos y arma tu presupuesto. ¿Quieres repetir el tutorial? Lo encuentras en tu menú de cuenta, arriba a la derecha.',
  },
];
