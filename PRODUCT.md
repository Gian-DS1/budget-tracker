# Product

## Register

product

## Users

Personas en República Dominicana que manejan sus finanzas personales (y de hogar) y quieren dejar atrás las hojas de cálculo. Usan la app desde el móvil y el escritorio, normalmente en momentos de fricción financiera: registrar un gasto en caliente, revisar cuánto queda por asignar, decidir si pueden pagar una tarjeta o cuánto abonar a una deuda. Es un público amplio (cualquiera puede registrarse), no técnico, con la realidad local de pesos dominicanos, dólares a la tasa del día, ciclos de tarjeta y cashback.

El trabajo a realizar: tener una imagen clara y confiable de a dónde va el dinero, mantenerse dentro del presupuesto, y controlar deudas y tarjetas, todo sin esfuerzo de mantenimiento manual.

## Product Purpose

FinTrack es un hub de finanzas personales pensado para República Dominicana. Combina presupuesto base cero, control de tarjetas de crédito (ciclos, cashback, abonos), seguimiento de deudas, metas de ahorro, transacciones recurrentes, un plan financiero inteligente y reportes con detección de anomalías. Reemplaza la hoja de cálculo con algo que se mantiene solo (auto-categorización, recurrentes, sugerencias) y vive sincronizado en la nube (Supabase) con caché local para arrancar al instante.

El éxito se ve cuando el usuario abre la app y entiende su situación financiera en segundos, registra movimientos sin fricción, y confía en los números lo suficiente como para tomar decisiones (pagar, abonar, ahorrar) sin recurrir a Excel.

## Brand Personality

Claro, confiable y local. Voz en español dominicano natural, sin jerga financiera ni anglicismos innecesarios. El tono es sereno y de apoyo: ayuda a tomar control sin generar ansiedad, incluso cuando los números son malos. Honesto y directo con el dinero (muestra la realidad, no la maquilla), pero nunca frío ni intimidante. La meta emocional principal es **calma y control**: el usuario debe sentir que tiene el timón.

## Anti-references

- **Apps de banco corporativas y frías** (navy/gris estéril, formularios densos e intimidantes). FinTrack no debe sentirse como el portal de un banco grande.
- **La hoja de cálculo que reemplaza**: rejillas densas de números sin jerarquía, todo del mismo peso visual, nada que guíe la vista.
- **El look genérico de SaaS con IA**: degradados morados, glassmorphism por todas partes, rejillas de tarjetas idénticas (icono + título + texto), plantilla de métrica-héroe. Que no se pueda decir "esto lo hizo una IA".
- **Estética infantil / gamificada en exceso**: mascotas, confeti por defecto, cuteness caricaturesca que reste seriedad a datos de dinero.

## Design Principles

1. **Claridad sobre densidad.** Cada pantalla tiene una tarea principal y una jerarquía que la pone primero. Si compite con una hoja de cálculo, gana por ser más legible, no por mostrar más.
2. **Calma en los números difíciles.** Estar sobre presupuesto o endeudado se comunica con honestidad pero sin alarmismo: color, signo e ícono que informan, no que castigan.
3. **Confianza local.** Pesos, tasa del día, ciclos de tarjeta y lenguaje dominicano tratados como ciudadanos de primera clase, no como una localización pegada encima.
4. **Que se mantenga solo.** El valor está en lo automático (categorización, recurrentes, sugerencias). El diseño debe hacer que lo automático sea visible y editable, no una caja negra.
5. **Honestidad del dato.** Nunca esconder un mal número detrás de un buen diseño; el diseño existe para que el usuario actúe sobre la realidad.

## Accessibility & Inclusion

Objetivo WCAG 2.1 AA en toda la app: contraste de texto ≥4.5:1 (≥3:1 en texto grande), foco visible, navegación por teclado en modales y formularios. Nunca depender solo del color para señalar ingreso/gasto o sobre/bajo presupuesto: acompañar siempre con signo (+/−), ícono o etiqueta para usuarios con daltonismo. Respetar `prefers-reduced-motion` con alternativas (crossfade o transición instantánea) en toda animación. Modo claro y oscuro como soporte de legibilidad en distintos entornos de luz.
