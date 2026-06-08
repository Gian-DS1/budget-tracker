# Tutorial resumido + limpieza del proyecto — Diseño

Fecha: 2026-06-08
Autor: Giancarlos (con Claude)
Estado: aprobado para implementación

## Contexto y objetivo

FinTrack ya está en producción (`main`, desplegando en Vercel). El encargo tiene dos
mitades:

1. **Rehacer el tutorial guiado** para que explique el sistema de la mejor forma
   posible, fácil de entender, con la **mínima cantidad de pasos**, enfocándose solo
   en el núcleo / lo más difícil de entender.
2. **Dejar el proyecto limpio**: documentación al día, sin código basura, sin bugs ni
   malas prácticas.

Decisiones de producto tomadas en el brainstorming:

- **Longitud del tour:** ~6-7 pasos, solo el núcleo (hoy son 17).
- **Núcleo a priorizar:** (a) flujo del dinero y (b) niveles de presupuesto. El resto
  (patrimonio sin duplicar, herramientas de apoyo) se menciona de pasada o se descubre
  solo.
- **Estructura elegida:** "Flujo narrado" (Opción A) — cuenta cómo entra y se organiza
  el dinero, no un recorrido de menús.
- **Alcance de limpieza:** los cuatro focos (docs obsoletas, código muerto, bugs/malas
  prácticas, SQL de Supabase).
- **SQL de un solo uso:** mover a `supabase/scratch/` con README (reversible).

## Parte 1 — Nuevo tour (7 pasos)

Se reescribe `src/stitch/tour/tourSteps.js`. **No se tocan** `TourProvider.jsx`,
`Spotlight.jsx`, `useTour.js` ni las pantallas: el motor del tour es declarativo y
todas las anclas `data-tour` que usaremos ya existen en el DOM.

Anclas existentes verificadas (no hay que crear ninguna):
`[data-tour="nav"]`, `[data-tour="ledger-new"]`, `[data-tour="budget-mode"]`,
`[data-tour="budget-summary"]`, `[data-tour="dashboard-grid"]`,
`[data-tour="account"]` (este último ya no se usa como paso propio, pero el atributo
puede quedarse: lo apunta "Ver tutorial" en el menú de cuenta).

### Guión

| # | id | ruta | ancla | placement | título |
|---|----|----|----|----|----|
| 1 | `welcome` | `/` | null | center | ¡Bienvenido a FinTrack! 👋 |
| 2 | `nav` | `/` | `[data-tour="nav"]` | right | Tu menú |
| 3 | `ledger` | `/transacciones` | `[data-tour="ledger-new"]` | left | Registra tu dinero |
| 4 | `budget-levels` | `/presupuesto` | `[data-tour="budget-mode"]` | bottom | Tu presupuesto, por niveles |
| 5 | `budget-spend` | `/presupuesto` | `[data-tour="budget-summary"]` | bottom | Cuánto puedes gastar |
| 6 | `connected` | `/` | `[data-tour="dashboard-grid"]` | center | Todo conectado |
| 7 | `done` | `/` | null | center | ¡Listo! 🎉 |

### Textos (body)

1. **welcome:** "Te muestro lo esencial en un minuto: cómo registrar tu dinero y cómo
   organizarlo con un presupuesto. Puedes salir cuando quieras con 'Saltar'."
2. **nav:** "Desde aquí llegas a todo, en tres bloques: Principal (tu día a día),
   Patrimonio (lo que tienes y lo que debes) y Herramientas (calendario, reportes y
   categorías)."
3. **ledger:** "Este es el corazón de la app. Con 'Nueva transacción' anotas cada
   ingreso o gasto. No eliges si es ingreso o gasto: lo define la categoría que escojas.
   Y al escribir la descripción, la app sugiere la categoría sola."
4. **budget-levels:** "Tu presupuesto crece contigo. 'Seguimiento' solo observa tus
   gastos; '50/30/20' reparte tu dinero en necesidades, gustos y ahorro; 'Base cero'
   asigna cada peso a un sobre. Empieza simple y sube de nivel cuando quieras."
5. **budget-spend:** "Aquí ves cuánto tienes comprometido (gastos fijos, ahorro y
   deudas) y cuánto te queda libre. Lo mejor: tus deudas, tarjetas y metas de ahorro se
   descuentan solas desde sus módulos, sin que las cuentes dos veces."
6. **connected:** "Todo lo que registras se conecta solo. Este resumen, el calendario
   de vencimientos y los reportes se llenan a partir de tus transacciones. No hay nada
   más que configurar: explora a tu ritmo."
7. **done:** "Ya conoces lo esencial. Empieza registrando tus primeros movimientos y
   arma tu presupuesto. ¿Quieres repetir el tutorial? Está en tu menú de cuenta, arriba
   a la derecha."

### Comportamiento (sin cambios)

- Auto-arranque la 1ª vez (cuando `tutorialSeen === false` y `prefsLoaded === true`),
  con delay de 700 ms (`TourAutoStart` en `StitchShell.jsx`).
- Si el usuario no tiene datos, el tour fuerza el modo demo para que cada pantalla se
  vea poblada, y lo revierte al cerrar (`TourProvider.start/close`).
- Accesible siempre desde el menú de cuenta → "Ver tutorial".
- Teclado: Esc=saltar, →/Enter=siguiente, ←=atrás. Progreso por puntos.

## Parte 2 — Limpieza de documentación

### 2.1 Reescribir `handoff.md`
Su premisa quedó **falsa y engañosa**: dice que el trabajo vive en la rama
`rebuild/stitch-pure`, que NO debe subir a producción y que `origin/main` es "la app
vieja". La realidad: el rediseño Stitch ya está fusionado en `main` y desplegándose.
Se reescribe como documento de **arquitectura vigente**:
- Qué es la app + stack actual.
- Estructura `src/stitch/` (shell + `screens/` con patrón "shell delgado + carpeta").
- Las 14 pautas de diseño/lógica (siguen válidas, son el activo más útil del doc).
- Componentes reutilizables (Emoji, DropdownPanel, StitchSelect, etc.).
- Modo demo / QA.
- Sistema de tutorial **actualizado a 7 pasos** (núcleo: flujo del dinero + niveles).
- Estado: en producción.
- Se elimina: lenguaje de "rama temporal / no merge / no push", el historial de commits
  de la rama vieja y los "pendientes" ya resueltos.

### 2.2 Corregir `docs/specs/README.md`
La tabla feature→estado miente: marca PENDIENTE/PARCIAL features ya entregadas. Estado
real verificado contra código + handoff:
- Presupuesto base cero + 50/30/20 + Seguimiento: **HECHO** (`screens/budget/`).
- Tarjetas (ciclos, abonos parciales, "pagar todo", cashback, catálogo, historial):
  **HECHO** (`screens/cards/`).
- Cashback predefinido: **HECHO**.
- Niveles progresivos: **HECHO** (commit `71802fa`).
- Único pendiente real: **sobres acumulativos** (sinking funds) en la UI de Presupuesto
  base cero (lógica lista, falta el mini-modal por categoría).
Se actualiza la tabla y la prosa para reflejar esto.

### 2.3 Sincronizar memoria del tutorial
`MEMORY.md` indexa `tutorial-tour-system.md`, pero el archivo no existe (referencia
rota). Se crea el archivo con el estado correcto (7 pasos; núcleo = flujo del dinero +
niveles; anclas `data-tour`; auto-arranque con `prefsLoaded`; fuerza demo sin datos;
flag `tutorial_seen`). Si conviene, se ajusta el hook del índice.

### 2.4 Revisar README
Está prácticamente al día. Solo se verifica que la lista de features y la nota de tablas
sigan exactas tras los cambios. No se prevé reescritura.

## Parte 3 — Limpieza de código y SQL

### 3.1 Código muerto / nits
Lint ya da 0 errores; no hay imports sin usar. Cambios quirúrgicos detectados:
- `src/stitch/AccountMenu.jsx:90`: `name={demo ? 'logout' : 'logout'}` — ternario
  inútil (misma rama). Reemplazar por `name="logout"`.
- `src/stores/usePrefsStore.js:92-93`: indentación inconsistente (mezcla 2/6 espacios)
  en `storage:`/`partialize:`. Normalizar.
- Barrido de comentarios que referencien archivos/ramas borrados (p. ej. menciones a
  `src/pages/*`, `rebuild/stitch-pure`) dentro de `src/`; reescribir o quitar los que
  ya no apliquen, sin alterar lógica.
No hay `console.log/debug/info` sueltos (verificado); los `console.error` están gated
tras `import.meta.env.DEV` (correcto, se dejan).

### 3.2 Bugs y malas prácticas
Revisión dirigida, **sin refactors gratuitos**. Solo se arregla lo que sea bug real o
antipatrón claro; lo defendible se deja y se anota. Áreas a auditar:
- Flujos del tour: `window.location.reload()` al revertir demo forzado (¿necesario?),
  carrera de `prefsLoaded`/`loading` (ya documentada y resuelta — se valida que el guión
  nuevo no la reintroduzca).
- Manejo de errores en stores (rollback optimista — ya presente en prefs).
- Cualquier hallazgo se lista en el reporte final con su veredicto.

### 3.3 SQL de Supabase
~25 archivos en `supabase/`. `MIGRATIONS.md` documenta las migraciones reales
(idempotentes, parte del flujo). Scripts de un solo uso (diagnóstico/validación de
incidentes puntuales, no documentados como migración) se **mueven a `supabase/scratch/`**
con un `README.md` que aclare "scripts históricos de diagnóstico, no parte del esquema".
Candidatos (a confirmar al ejecutar, con `git mv` para preservar historial):
`diagnose_*.sql`, `validate_migration*.sql`, `set_card_balance_final.sql`,
`calc_exact_abono.sql`. **Se conservan en la raíz** todas las referenciadas por
`MIGRATIONS.md` y `schema.sql`. Tras mover, se verifica que ninguna ruta del repo/README
apunte a los archivos movidos.

## Verificación (obligatoria antes de declarar terminado)

Correr y reportar resultados reales:
- `npm run lint` → 0 errores.
- `npm run build` → build limpio.
- `npm run test` → todos los tests pasan (hoy: 126).
- Confirmar que el dev server sirve la app y que el tour de 7 pasos arranca y navega
  (validación visual en QA/demo cuando sea posible; el motor no cambió).

## Fuera de alcance (YAGNI)

- No se rediseña el Spotlight ni el motor del tour.
- No se crean anclas `data-tour` nuevas.
- No se implementan los sobres acumulativos (solo se documenta que están pendientes).
- No se borran SQL (solo se mueven a scratch).
- No se hacen refactors de código que funcione correctamente.
