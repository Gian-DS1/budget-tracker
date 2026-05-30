// FinTrack RD — Configuración del tour guiado (driver.js)
//
// Cada paso lleva:
//   - route:   la página donde vive la zona a resaltar. TourGuide navega solo.
//   - element: el selector de la zona que se "sombrea" (resalta) en ese paso.
//              Si se omite, el popover aparece centrado (intro/cierre).
//   - popover: título y explicación.
//
// Las zonas (ids #tour-*) están repartidas por las páginas y la barra lateral.
// Todas existen aunque la cuenta esté vacía, para que el tour funcione desde el
// primer inicio de sesión.

export const tourSteps = [
  {
    route: '/',
    popover: {
      title: '¡Bienvenido a FinTrack RD! 🎉',
      description:
        'Este es tu centro de control financiero. En unos pasos te mostramos para qué sirve cada sección y cómo usarla. La idea es simple: registras lo que entra y sale, y la app te dice cuánto puedes gastar de verdad sin atrasarte. Haz clic en "Siguiente →".',
      side: 'over',
      align: 'center',
    },
  },
  {
    route: '/',
    element: '#tour-dashboard-nav',
    popover: {
      title: 'El menú de navegación',
      description:
        'Desde aquí saltas entre todas las secciones: Dashboard, Transacciones, Presupuesto, Ahorros, Deudas, Tarjetas, Plan, Calendario, Reportes y Ajustes. En el celular se abre con el botón ☰. ¡Vamos a recorrerlas!',
      side: 'right',
      align: 'start',
    },
  },
  {
    route: '/',
    element: '#tour-dashboard-hero',
    popover: {
      title: 'Tu cifra más importante: "Puedes gastar"',
      description:
        'Es cuánto te queda disponible este mes DESPUÉS de apartar tus gastos fijos, ahorros y pagos de deuda. Si está en verde, vas bien; en amarillo, con cuidado; en rojo, te estás pasando. Es el número que debes mirar antes de un gasto.',
      side: 'bottom',
      align: 'start',
    },
  },
  {
    route: '/',
    element: '#tour-dashboard-summary',
    popover: {
      title: 'Tu resumen del mes',
      description:
        'Un vistazo rápido: ingresos y gastos del mes (con el % de cambio frente al mes anterior), tu balance neto y tu deuda total. Así sabes en segundos cómo va el mes.',
      side: 'bottom',
      align: 'start',
    },
  },
  {
    route: '/',
    element: '#tour-dashboard-calendar',
    popover: {
      title: 'Actividad del mes',
      description:
        'Cada día se pinta según haya ingresos (verde), gastos (rojo) o ambos. Haz clic en cualquier día con movimiento para ver el detalle de sus transacciones sin salir del Dashboard.',
      side: 'left',
      align: 'start',
    },
  },
  {
    route: '/',
    element: '#tour-reminders',
    popover: {
      title: 'Recordatorios 🔔',
      description:
        'La campana te avisa de pagos próximos (≤ 7 días): estados de cuenta de tarjetas por pagar, cuotas de deudas con fecha de pago y transacciones recurrentes. El número rojo indica cuántos avisos tienes.',
      side: 'bottom',
      align: 'end',
    },
  },
  {
    route: '/transacciones',
    element: '#tour-transactions-content',
    popover: {
      title: 'Transacciones — el día a día',
      description:
        'Aquí registras cada ingreso y gasto con el botón "Nueva Transacción". La app sugiere la categoría sola según la descripción (que se capitaliza automáticamente). Si pagas con una tarjeta registrada, asígnasela: se calcula el cashback y se actualiza su estado de cuenta. ¿Un gasto que se repite (alquiler, Netflix)? Márcalo como recurrente y la app lo creará solo cada periodo. Puedes buscar, filtrar y editar todo desde la tabla.',
      side: 'over',
      align: 'center',
    },
  },
  {
    route: '/presupuesto',
    element: '#tour-budget-unassigned',
    popover: {
      title: 'Presupuesto base cero',
      description:
        'Aquí decides, ANTES de gastar, a qué va cada peso que ganas. La meta es que "Por Asignar" llegue a 0.00: cada peso tiene un trabajo (gasto, ahorro o pagar deuda). Abajo asignas un monto a cada categoría y comparas lo planificado con lo gastado real. Así nunca te preguntas "¿en qué se me fue el dinero?".',
      side: 'bottom',
      align: 'start',
    },
  },
  {
    route: '/ahorros',
    element: '#tour-savings-header',
    popover: {
      title: 'Ahorros — tus sobres virtuales',
      description:
        'Separa dinero en metas tipo sobre: fondo de emergencia, vacaciones, un equipo nuevo. Cada meta muestra su progreso y cuánto te falta. Registra aportes y retiros para mantenerla al día.',
      side: 'bottom',
      align: 'start',
    },
  },
  {
    route: '/deudas',
    element: '#tour-debts-header',
    popover: {
      title: 'Deudas — para salir de ellas',
      description:
        'Registra préstamos y tarjetas con saldo, su tasa de interés, pago mensual y fecha de pago (para que te avise la 🔔). Ves cuánto debes, el progreso y una estimación de en cuántos meses quedarás libre. Cada pago que registras baja el saldo y se anota como gasto automáticamente.',
      side: 'bottom',
      align: 'start',
    },
  },
  {
    route: '/tarjetas',
    element: '#tour-creditcards-content',
    popover: {
      title: 'Tarjetas — corte, pago y cashback',
      description:
        'Registra cada tarjeta con su día de corte y de pago, y sus reglas de cashback por categoría. La app suma lo que gastes con ella (desde Transacciones), te dice cuánto pagar este ciclo y cuándo vence. Al marcar el estado de cuenta como pagado, se guarda en el historial y se acumula tu cashback de por vida.',
      side: 'over',
      align: 'center',
    },
  },
  {
    route: '/plan',
    element: '#tour-plan-header',
    popover: {
      title: 'Plan Financiero — tus metas',
      description:
        'Define objetivos a corto, mediano y largo plazo (comprar algo, liquidar una tarjeta, fondo de 6 meses). El "Resumen inteligente" lee tus datos reales y te dice tu capacidad de ahorro mensual, si tus metas son alcanzables y si conviene priorizar pagar deuda antes que ahorrar.',
      side: 'bottom',
      align: 'start',
    },
  },
  {
    route: '/calendario',
    element: '#tour-calendar-header',
    popover: {
      title: 'Calendario — tus patrones',
      description:
        'Ve tus ingresos y gastos día por día en un mes completo, con el total de cada día y tu día de mayor gasto. Haz clic en un día para ver el detalle. Ideal para detectar en qué fechas se te va más dinero.',
      side: 'bottom',
      align: 'start',
    },
  },
  {
    route: '/reportes',
    element: '#tour-reports-header',
    popover: {
      title: 'Reportes — análisis inteligente',
      description:
        'Detecta gastos fuera de lo normal, proyecta cómo van tus finanzas y te muestra la mejor estrategia para pagar tus deudas más rápido. También puedes exportar tus datos.',
      side: 'bottom',
      align: 'start',
    },
  },
  {
    route: '/ajustes',
    element: '#tour-settings-header',
    popover: {
      title: 'Ajustes y Utilidades',
      description:
        'Cambia entre modo claro/oscuro, ajusta la tasa del dólar (automática o fija), gestiona tus categorías e importa o exporta tus datos. Tu configuración personal vive aquí.',
      side: 'bottom',
      align: 'start',
    },
  },
  {
    route: '/',
    popover: {
      title: '¡Todo listo! 🚀',
      description:
        'Recuerda el flujo: 1) registra tus transacciones, 2) arma tu presupuesto hasta dejar "Por Asignar" en 0, 3) revisa tu progreso en metas y deudas. La 🔔 te avisa de pagos próximos y los Reportes te dan el panorama completo. ¡A tomar el control de tus finanzas!',
      side: 'over',
      align: 'center',
    },
  },
];
