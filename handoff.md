# Handoff técnico — Rediseño Stitch (FinTrack)

## Estado del proyecto

Rama de trabajo: `rebuild/stitch-pure`. NO subir a producción. `origin/main` (commit `1c1ecec`) es la app vieja en Vercel y debe permanecer intacta. Todo el trabajo es local. No hacer merge ni push a ningún remoto hasta orden explícita.

App: FinTrack, presupuesto personal para República Dominicana. Stack: Vite 8 + React 19, React Router 7, Zustand 5 (persist), Supabase (RLS), Recharts, Framer Motion 12.40, Material Symbols (íconos UI), JoyPixels v10 vía emoji-toolkit (emojis de categoría), react-hot-toast.

UI activa: `src/main.jsx` monta SOLO `src/stitch/StitchApp.jsx`. La UI vieja (`src/App.jsx`, `src/pages/`, `src/components/`, `src/styles/`, `src/index.css`, `useThemeStore`, atajos de teclado) YA FUE ELIMINADA (commit `dbc4677`). `src/` ahora contiene solo: `stitch/` (UI), `stores/`, `utils/`, `data/`, `lib/` (supabase), `contexts/AuthContext.jsx`. Deps podadas a 13 (se quitaron driver.js, lucide-react, date-fns). Lint pasa con 0 errores.

Tailwind v4 vía `@tailwindcss/vite`; config en CSS con `@theme` dentro de `src/stitch/stitch.css` (NO hay tailwind.config.js). Los tokens de spacing (sm/md/lg/xl) hacen que utilidades de ancho homónimas (`max-w-md`, `max-w-xl`) resuelvan a 8–40px; usar valores arbitrarios `max-w-[Nrem]` en su lugar.

Modo demo/QA: flag sessionStorage `fintrack-demo-mode`, solo en localhost. Botón "Entrar como demo" en `StitchAuth`. Siembra los stores Zustand en memoria sin tocar Supabase. En demo NO hay sesión, así que las acciones de los stores (que escriben al backend) salen sin efecto; por eso existen mutadores en memoria en `src/stitch/demoMode.js` (`demoAddTransaction`, etc.). Cualquier página con formularios de alta/edición DEBE ramificar `if (isDemoActive()) demoXxx(); else await storeAction()` y mostrar el toast manualmente en demo.

Servidor dev corriendo en http://localhost:5173/. HEAD de la rama: `92fe95e`.

Tests: 68 pasan (`npm run test`). Build limpio (`npm run build`). Lint: 0 errores (`npm run lint`). El easing `EASE_OUT` vive en `src/stitch/motionTokens.js` (separado de StitchMotion.jsx para no romper fast-refresh).

Página de referencia: `src/stitch/screens/StitchLedger.jsx` (Transacciones) es la ÚNICA página totalmente pulida bajo las 14 pautas; usarla como plantilla/ejemplo de cómo aplicar todos los componentes y patrones en las páginas restantes. Las demás páginas (`StitchBudget`, `StitchCards`, `StitchDebts`, `StitchVaults`, `StitchStrategy`, `StitchDashboard`, `StitchReports`, `StitchCalendar`, `StitchSettings`, `StitchFeedback`) ya tienen datos reales cableados y emojis migrados, pero AÚN usan `<select>`/`<input type=date>`/inputs de número nativos y NO tienen el branching de modo demo en sus formularios.

## Componentes creados (infraestructura reutilizable)

- `src/stitch/Emoji.jsx`: `<Emoji e="🏠" size={18} />`. Resuelve el codepoint con emoji-toolkit (maneja ZWJ, variation selectors, banderas) y sirve el PNG desde `cdn.jsdelivr.net/gh/joypixels/emoji-assets@10.0.0/png/64/<cp>.png`. Fallback al emoji nativo con `onError`. Cache de codepoints. El path oficial `/joypixels/assets/` está detrás de licencia (403); usar SIEMPRE el mirror gh.
- `src/stitch/dropdownShared.js`: constantes `TRIGGER_BASE` (trigger tamaño formulario) y `TRIGGER_COMPACT` (h-[34px], barra de filtros). Única fuente de los estilos de trigger.
- `src/stitch/DropdownPanel.jsx`: panel flotante compartido. Renderiza en PORTAL a `document.body` con `position:fixed`. Posicionamiento inteligente: flip arriba si no cabe abajo, alinear a la derecha si se saldría por la derecha, alto máximo según viewport. Ancho: `minWidth` = ancho del trigger (el panel CRECE para que el contenido quepa, sin scroll horizontal) con tope `maxWidth` = viewport; los wrappers internos llevan `overflow-x-hidden`. Anima con personalidad Emil (ease-out 0.16s, scale 0.96, origin-aware, respeta reduced-motion). Lleva la clase `stitch-scroll` (ver GOTCHA del portal más abajo). Props: `triggerRef`, `panelRef`, `open`, `reduce`, `matchTriggerWidth` (default true), `maxHeight` (default 320), `scroll` (default true; si false el hijo gestiona su scroll interno — usado por el buscador fijo de CategorySelect). Recalcula en resize y scroll (capture).
  - GOTCHA RESUELTO: el portal queda FUERA de `.stitch-root` (que es un `<div>` hijo de `<body>`), por lo que las reglas de scrollbar `.stitch-root ::-webkit-scrollbar` NO lo alcanzan. Solución: clase explícita `.stitch-scroll` (no scopeada) en stitch.css, aplicada al panel y a sus contenedores con scroll. Cualquier contenido nuevo en portal con scroll DEBE llevar `stitch-scroll`.
- `src/stitch/StitchSelect.jsx`: select genérico custom (reemplaza `<select>` nativo). Props: `value`, `onChange(value)`, `options=[{value,label,icon?}]`, `placeholder`, `compact`, `className`, `id`. Teclado completo (flechas, Enter, Esc, Home/End), roles ARIA. value vacío se muestra atenuado como placeholder.
- `src/stitch/StitchCategorySelect.jsx`: select de categoría con `<Emoji>` por opción + buscador fijo (37 categorías). Props: `value`, `onChange(id)`, `options=categories`, `placeholder`, `includeAllOption`, `allLabel`, `compact`, `className`, `id`. Buscador pinneado arriba, solo la lista scrollea.
- `src/stitch/StitchDatePicker.jsx`: calendario custom (reemplaza `<input type=date>`). Props: `value`(ISO), `onChange(iso)`, `min`, `max`, `placeholder`, `compact`, `className`, `id`. Lunes primero, nombres ES, navegación de mes, hoy con anillo periwinkle, seleccionado relleno periwinkle, rango con min/max (días fuera atenuados/no clicables), acciones Hoy/Limpiar. ISO local sin corrimiento UTC (importante en GMT-4).
- `src/stitch/StitchCurrencyInput.jsx` (previo): input de moneda con formateo de miles en vivo (1,234.50) y caret que respeta el punto decimal. `value` es string crudo sin comas; `onChange(raw)`.
- `src/stitch/AutoCatChip.jsx` (previo): chip "Auto" cuando la categoría se asignó por keywords.

## Archivos modificados clave

- `src/stitch/stitch.css`: tokens `@theme`; `.stitch-check` (checkbox oscuro); reglas globales de date inputs nativos en oscuro; SCROLLBAR DEL TEMA (thumb `#353436`, hover `#454655`, pista transparente, 8px) en DOS selectores: `.stitch-root` (UI normal) Y `.stitch-scroll` (contenido en portal, fuera de `.stitch-root`); feedback de press en botones.
- `src/stitch/screens/StitchLedger.jsx` (Transacciones): página más trabajada. Usa StitchCurrencyInput, StitchCategorySelect, StitchSelect, StitchDatePicker, AutoCatChip, Emoji. Tipo de transacción DERIVADO de la categoría (no se elige a mano; se muestra `TypeBadge` de solo lectura). Columnas Fecha y Monto ordenables (`SortHeader`, asc/desc, flecha periwinkle activa). Filtros: búsqueda, tipo, categoría, rango de fechas; todos h-[34px]. Demo branching en alta/edición/borrado con toast manual.
- `src/data/defaultCategories.js` (previo): 37 categorías, ~405 keywords. `autoCategorize(desc, categories)` con matching por prefijo de la última palabra (≥3 chars) además de palabra completa.
- `src/stitch/demoMode.js`: siembra las 37 categorías reales; mutadores en memoria.
- Emojis migrados a `<Emoji>` en: StitchLedger (tabla), StitchCalendar, StitchBudget, StitchSettings, StitchVaults (tarjeta + picker), StitchFeedback. Los `<option>` de `<select>` nativos NO admiten `<img>`; por eso se reemplazaron esos selects por StitchSelect/StitchCategorySelect donde había emojis.

## PAUTAS DE DISEÑO Y LÓGICA — aplicar en TODAS las páginas sin excepción

1. Emojis: SIEMPRE `<Emoji e={...} size={n} />` (JoyPixels v10), nunca el emoji nativo crudo en el render. No usar emojis dentro de `<option>` nativo; usar StitchSelect/StitchCategorySelect.
2. Selects: nunca `<select>` nativo. Usar `StitchSelect` (genérico) o `StitchCategorySelect` (con emoji+buscador). Variante `compact` en barras de filtro (h-[34px]); variante normal en formularios.
3. Fechas: nunca `<input type=date>` nativo. Usar `StitchDatePicker`. Trabajar siempre en ISO local 'YYYY-MM-DD'; nunca toISOString (corre el día en GMT-4).
4. Montos de entrada: SIEMPRE `StitchCurrencyInput` (formateo de miles en vivo). Para mostrar montos: `formatCurrency` de utils/formatters.
5. Dropdowns/popovers: todos via `DropdownPanel` (portal, no recortan, flip/align, mismo panel y animación). Si un panel tiene zona fija + zona scrollable (buscador), usar `scroll={false}` y gestionar el scroll solo en la lista interna. NUNCA permitir que un dropdown genere scroll en la página o cree su propia barra externa; el scroll, si lo hay, va dentro del panel.
6. Scroll: el scrollbar del tema es global; no introducir scrollbars nativos blancos. Contenedores con overflow dentro de `.stitch-root` lo heredan; cualquier contenido renderizado en PORTAL (fuera de `.stitch-root`) DEBE llevar la clase `stitch-scroll` para que el scrollbar quede oscuro. Nunca scroll horizontal en dropdowns (usar `overflow-x-hidden` y dejar que el panel crezca a su contenido).
7. Animación (filosofía Emil Kowalski): ease-out `cubic-bezier(0.23,1,0.32,1)` (constante `EASE_OUT` en StitchMotion), duraciones <300ms (paneles 0.16s), entrada con scale desde 0.96 (nunca 0), origin-aware, press scale(0.97) en botones (ya global en CSS), respetar `prefers-reduced-motion` (usar `useReducedMotion`). No animar acciones de alta frecuencia.
8. Íconos: Material Symbols vía `<MS name="..." />`. Forzar tamaño con `!text-[Npx]` cuando la fuente los agrande de más. Mantener simetría de tamaño entre íconos adyacentes en una misma fila/campo.
9. Tipografía/colores: usar tokens del tema (text-on-surface, text-text-muted, text-primary periwinkle, etc.). Chips/badges pequeños y discretos (8–10px), no compitiendo con los labels. Un control con value vacío (placeholder/"Todos…") se muestra atenuado (text-text-muted).
10. Consistencia de altura: en barras de filtro todos los controles comparten altura (h-[34px]). En formularios, el ancho/alto de los campos en una misma fila debe coincidir.
11. Idioma: TODO en español (UI, labels, toasts). Sentence-case en copy, sin em dashes.
12. Tipo de transacción: se DERIVA de la categoría (cat.type: income/fixed_expense/variable_expense/savings). No pedirlo a mano. El motor de presupuesto base-cero separa fixed_expense de variable_expense (ver src/utils/calculations.js).
13. Modo demo: toda página con alta/edición/borrado DEBE funcionar en demo vía mutadores en memoria de demoMode.js + toast manual, porque sin sesión Supabase las acciones del store no hacen nada.
14. Checkboxes: clase `.stitch-check` (caja oscura, check periwinkle), nunca el checkbox blanco nativo.

## Specs de lógica de negocio (docs/specs/)

`docs/specs/` contiene los specs de la LÓGICA financiera (presupuesto, sobres acumulativos, tarjetas, abonos parciales, cashback) + el concepto NUEVO de niveles progresivos. HALLAZGO CLAVE: casi toda esa lógica YA ESTÁ implementada en `src/utils/` y los stores (con columnas reales en Supabase); lo que falta es exponerla en la UI Stitch (la UI vieja que la mostraba fue borrada). Leer `docs/specs/README.md` PRIMERO: tiene la tabla feature→estado (qué lógica/BD ya existe vs. qué falta cablear en cada screen). Los specs referencian componentes viejos en sus secciones de UI; reinterpretarlas con los componentes Stitch nuevos.

CONCEPTO DE PRESUPUESTO (decisión vigente): evoluciona de "solo base cero" a NIVELES PROGRESIVOS (Seguimiento → 50/30/20 → Base cero), elegidos por el usuario, default = Seguimiento. Resuelve la resistencia al base cero sin perder potencia. Ver `docs/specs/2026-06-niveles-progresivos-design.md`. Esto afecta el diseño de la página Presupuesto (siguiente paso): NO implementar solo base cero; implementar los 3 niveles. Verificado que el motor (getBudgetSummary, getAccumulatedBalance, getCardBalances, computeCashback) ya soporta la lógica subyacente.

## Historial de commits relevantes (rama rebuild/stitch-pure, último arriba)

- `dbc4677` chore: elimina UI vieja (App/pages/components/styles/index.css), docs/, DESIGN.md, PRODUCT.md, useThemeStore, atajos de teclado, StitchPending; desinstala driver.js/lucide-react/date-fns; refactor StitchMotion (motionTokens.js) → lint 0; fix Emoji fallback. HEAD actual.
- `92fe95e` fix(dropdowns): scrollbar del tema en portal (clase `.stitch-scroll`) + sin scroll horizontal (minWidth/maxWidth + overflow-x-hidden).
- `4a81fbc` docs(handoff): este archivo (v1).
- `597a19e` fix(dropdowns): panel flotante en portal (DropdownPanel) — deja de recortar dentro del modal.
- `ba8196f` feat(transacciones): StitchSelect y StitchDatePicker unificados (misma animación que CategorySelect).
- `ac41f51` polish(transacciones): chip/badge más pequeños, filtros a h-[34px], orden por columna Fecha/Monto.
- `cd0b722` feat(transacciones): StitchCategorySelect (dropdown de categoría con emojis JoyPixels).
- `40209b6` feat(emojis): JoyPixels v10 (componente Emoji) en categorías + ajustes de UI.
- `671e106` fix(transacciones): tipo derivado de la categoría + calendarios nativos en oscuro.
- `0539872` y previos: caret decimal, guardado+aviso en demo, filtro fechas, autocompletado por prefijo, formateo de miles, favicon, rename a FinTrack + logo, landing + reset password, animaciones Emil.

Verificación tras la limpieza: build OK, 68 tests OK, lint 0 errores. Servidor 200.

## Siguiente paso lógico

EMPEZAR POR PRESUPUESTO (`src/stitch/screens/StitchBudget.jsx`). OJO: no es solo un barrido de consistencia — Presupuesto cambia de concepto a NIVELES PROGRESIVOS (ver docs/specs/2026-06-niveles-progresivos-design.md). Antes de codear, leer ese spec + docs/specs/README.md y probablemente hacer brainstorming del plan de implementación (preferencia budgetLevel, render de los 3 niveles, función "Puedes gastar"). Además del cambio de concepto, aplicar las pautas 1–14:
- Reemplazar cualquier `<input type=number>` / entrada de monto por `StitchCurrencyInput` (los sobres/envelope inputs).
- Reemplazar cualquier `<select>` por `StitchSelect`/`StitchCategorySelect`; `<input type=date>` por `StitchDatePicker`.
- Verificar emojis con `<Emoji>`.
- Implementar el branching de modo demo en setBudget/copyBudgetFromPreviousMonth (mismo bug "no guarda en demo" que tenía Transacciones).
- Revisar íconos (tamaño/simetría), animaciones de entrada (Stagger), y que ningún dropdown recorte.

Orden sugerido de páginas tras Presupuesto: Tarjetas (StitchCards), Deudas (StitchDebts), Ahorros (StitchVaults), Plan (StitchStrategy), luego Dashboard, Reportes, Calendario, Ajustes, Feedback. Revisión por página antes de pasar a la siguiente (el usuario revisa cada una).

Comandos de verificación por página: `npm run build`, `npm run lint` (debe pasar con 0 errores), `npm run test` (68 deben pasar). Confirmar que http://localhost:5173/ responde 200.
