# Product

## Register

product

## Users

Individuos y parejas en República Dominicana que hoy llevan sus finanzas en hojas de cálculo o en la cabeza. Usan la app en ratos cortos (registrar un gasto al momento, revisar el presupuesto a mitad de mes, conciliar la tarjeta cuando llega el estado de cuenta). Contexto móvil y desktop; español como idioma primario (i18n es/en disponible).

## Product Purpose

FinTrack reemplaza la hoja de cálculo de presupuesto: registro de transacciones con auto-categorización, presupuesto por niveles progresivos (Seguimiento → 50/30/20 → base cero), tarjetas de crédito con ciclos y cashback, deudas, metas de ahorro, calendario de vencimientos y análisis. Éxito = el usuario sabe en segundos cuánto puede gastar sin comprometer sus compromisos, y registrar un movimiento cuesta menos que anotarlo en Excel.

## Brand Personality

Calmado, preciso, cercano. Tema oscuro "Stitch" con acento periwinkle; lenguaje llano en español (sentence-case, sin tecnicismos bancarios). La app informa sin alarmar: severidades (alert/warn/good/info) con color, nunca pánico.

## Anti-references

- Dashboards bancarios corporativos (densidad ilegible, jerga).
- Apps fintech "gamificadas" con confeti y badges por todo.
- Plantillas admin genéricas (card grids idénticos, hero-metrics con gradiente).

## Design Principles

1. **La categoría manda**: el tipo de movimiento se deriva de la categoría; la UI nunca pide lo que puede inferir.
2. **Componentes propios, nunca nativos feos**: selects, datepickers, currency inputs y dropdowns custom (ver handoff.md, pautas obligatorias).
3. **Motion con propósito (filosofía Emil Kowalski)**: ease-out rápido (<300ms), scale desde 0.96, respeta reduced-motion, sin animar acciones de alta frecuencia.
4. **Datos primero, decoración después**: cada pantalla responde una pregunta financiera concreta; los gráficos existen para decidir, no para adornar.
5. **Todo funciona en demo**: cualquier flujo de alta/edición/borrado ramifica a mutadores en memoria en modo demo.

## Accessibility & Inclusion

Objetivo WCAG AA: contraste ≥4.5:1 sobre el tema oscuro, `prefers-reduced-motion` respetado en todas las animaciones (incluido el tour), navegación por teclado en tour y dropdowns. Montos siempre formateados con `formatCurrency` (DOP).
