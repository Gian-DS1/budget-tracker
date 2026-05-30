export const tourSteps = [
  {
    popover: {
      title: '¡Bienvenido a FinTrack RD! 🎉',
      description:
        'Este es tu centro de control financiero personal. En 1 minuto te explicamos para qué sirve cada sección y cómo usarla. La idea es simple: registras lo que entra y sale, y la app te dice cuánto puedes gastar de verdad sin atrasarte. Haz clic en "Siguiente".',
      side: 'over',
      align: 'center'
    }
  },
  {
    element: '#tour-dashboard-summary',
    popover: {
      title: '1. Dashboard — tu resumen',
      description:
        'Es la foto rápida del mes: cuánto ingresaste, cuánto gastaste y, lo más importante, cuánto "Puedes Gastar" sin tocar lo que ya tienes comprometido en pagos y metas. El calendario de abajo marca los días con movimiento: haz clic en un día para ver sus transacciones.',
      side: 'bottom',
      align: 'start'
    }
  },
  {
    element: '#tour-transactions-content',
    popover: {
      title: '2. Transacciones — el día a día',
      description:
        'Aquí anotas cada ingreso y cada gasto. La app sugiere la categoría sola según lo que escribas. Si pagas con una tarjeta de crédito registrada, asígnasela: se calcula el cashback y se actualiza tu estado de cuenta automáticamente. ¿Un gasto que se repite cada mes (alquiler, Netflix)? Márcalo como recurrente y se creará solo.',
      side: 'bottom',
      align: 'start'
    }
  },
  {
    element: '#tour-budget-unassigned',
    popover: {
      title: '3. Presupuesto — base cero',
      description:
        'Aquí decides, ANTES de gastar, a qué va cada peso que ganas. La meta es que "Por Asignar" llegue a 0.00: cada peso tiene un trabajo (gastos, ahorro o pagar deuda). Así nunca te preguntas "¿en qué se me fue el dinero?".',
      side: 'bottom',
      align: 'start'
    }
  },
  {
    element: '#tour-savings-header',
    popover: {
      title: '4. Ahorros — tus sobres',
      description:
        'Separa dinero en metas tipo "sobre virtual": fondo de emergencia, vacaciones, un equipo nuevo. Vas viendo el progreso de cada meta y cuánto te falta.',
      side: 'bottom',
      align: 'start'
    }
  },
  {
    element: '#tour-debts-header',
    popover: {
      title: '5. Deudas — para salir de ellas',
      description:
        'Registra préstamos y tarjetas con saldo. Ves cuánto debes, el progreso de pago y una estimación de en cuántos meses quedarás libre. Cada pago que registras baja el saldo automáticamente.',
      side: 'bottom',
      align: 'start'
    }
  },
  {
    element: '#tour-creditcards-content',
    popover: {
      title: '6. Tarjetas — corte, pago y cashback',
      description:
        'Registra tus tarjetas con su día de corte y de pago. La app suma todo lo que gastes con cada tarjeta (desde Transacciones), te dice cuánto debes pagar este ciclo, cuándo vence y cuánto cashback acumulaste. Marca el estado de cuenta como pagado cuando lo saldes.',
      side: 'bottom',
      align: 'start'
    }
  },
  {
    element: '#tour-plan-header',
    popover: {
      title: '7. Plan Financiero — tus metas',
      description:
        'Define objetivos a corto, mediano y largo plazo (comprar algo, liquidar una tarjeta, fondo de 6 meses). La app te sugiere cuánto ahorrar por mes para llegar a tiempo.',
      side: 'bottom',
      align: 'start'
    }
  },
  {
    element: '#tour-calendar-header',
    popover: {
      title: '8. Calendario — tus patrones',
      description:
        'Ve tus ingresos y gastos día por día. Útil para detectar en qué fechas se te va más dinero. Haz clic en cualquier día para ver el detalle de sus transacciones.',
      side: 'bottom',
      align: 'start'
    }
  },
  {
    element: '#tour-reports-header',
    popover: {
      title: '9. Reportes — análisis inteligente',
      description:
        'Detecta gastos fuera de lo normal, proyecta cómo van tus finanzas y te muestra la mejor estrategia para pagar tus deudas más rápido.',
      side: 'bottom',
      align: 'start'
    }
  },
  {
    popover: {
      title: '¡Todo listo! 🚀',
      description:
        'Recuerda el flujo: 1) registra tus transacciones, 2) arma tu presupuesto hasta dejar "Por Asignar" en 0, 3) revisa tu progreso en metas y deudas. La 🔔 del encabezado te avisa de pagos próximos. ¡A tomar el control!',
      side: 'over',
      align: 'center'
    }
  }
];
