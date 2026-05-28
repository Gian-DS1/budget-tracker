export const getTourSteps = (navigate) => [
  {
    popover: {
      title: '¡Bienvenido a FinTrack RD! 🎉',
      description: 'Te daremos un breve recorrido para que aprendas a utilizar tu nuevo sistema de presupuesto base cero. Haz clic en "Siguiente" para continuar.',
      side: 'over',
      align: 'center'
    }
  },
  {
    element: '#tour-dashboard-summary',
    popover: {
      title: 'Tu Resumen Global',
      description: 'Aquí verás un vistazo rápido de tus finanzas: cuánto ganas, cuánto gastas y tu saldo real.',
      side: 'bottom',
      align: 'start'
    },
    onNextClick: (element, step, { state }) => {
      navigate('/transacciones');
      setTimeout(() => state.driver.moveNext(), 300);
    }
  },
  {
    // Element removed so it centers the popover on the transactions page, or we could target the header
    popover: {
      title: 'Añadir Transacciones',
      description: 'En esta pestaña registrarás todos tus ingresos y gastos. Asegúrate de categorizarlos correctamente para mantener tu presupuesto al día.',
      side: 'over',
      align: 'center'
    },
    onNextClick: (element, step, { state }) => {
      navigate('/presupuesto');
      setTimeout(() => state.driver.moveNext(), 300);
    },
    onPrevClick: (element, step, { state }) => {
      navigate('/');
      setTimeout(() => state.driver.movePrevious(), 300);
    }
  },
  {
    popover: {
      title: 'Presupuesto Base Cero',
      description: 'Aquí ocurre la magia. Planificarás el destino de cada peso antes de gastarlo. El objetivo es que la tarjeta "Por Asignar" siempre sea 0.00.',
      side: 'over',
      align: 'center'
    },
    onNextClick: (element, step, { state }) => {
      navigate('/ahorros');
      setTimeout(() => state.driver.moveNext(), 300);
    },
    onPrevClick: (element, step, { state }) => {
      navigate('/transacciones');
      setTimeout(() => state.driver.movePrevious(), 300);
    }
  },
  {
    popover: {
      title: 'Ahorros y Metas',
      description: 'Crea metas de ahorro a largo plazo (fondo de emergencia, vacaciones) y sepáralos en "sobres" virtuales.',
      side: 'over',
      align: 'center'
    },
    onNextClick: (element, step, { state }) => {
      navigate('/deudas');
      setTimeout(() => state.driver.moveNext(), 300);
    },
    onPrevClick: (element, step, { state }) => {
      navigate('/presupuesto');
      setTimeout(() => state.driver.movePrevious(), 300);
    }
  },
  {
    popover: {
      title: 'Gestión de Deudas',
      description: 'Registra tus préstamos o tarjetas de crédito aquí. El sistema calculará tu progreso automáticamente conforme vayas pagando.',
      side: 'over',
      align: 'center'
    },
    onNextClick: (element, step, { state }) => {
      navigate('/');
      setTimeout(() => state.driver.moveNext(), 300);
    },
    onPrevClick: (element, step, { state }) => {
      navigate('/ahorros');
      setTimeout(() => state.driver.movePrevious(), 300);
    }
  },
  {
    popover: {
      title: '¡Todo listo! 🚀',
      description: 'Ya estás preparado para tomar el control total de tus finanzas. ¡El dashboard te espera!',
      side: 'over',
      align: 'center'
    },
    onPrevClick: (element, step, { state }) => {
      navigate('/deudas');
      setTimeout(() => state.driver.movePrevious(), 300);
    }
  }
];
