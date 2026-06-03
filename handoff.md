# Handoff técnico — Rediseño Stitch (FinTrack)

## Estado del proyecto

Rama de trabajo: `rebuild/stitch-pure`. NO subir a producción. `origin/main` (commit `1c1ecec`) es la app vieja en Vercel y debe permanecer intacta. Todo el trabajo es local. No hacer merge ni push a ningún remoto hasta orden explícita.

App: FinTrack, presupuesto personal para República Dominicana. Stack: Vite 8 + React 19, React Router 7, Zustand 5 (persist), Supabase (RLS), Recharts, Framer Motion 12.40, Material Symbols (íconos UI), JoyPixels v10 vía emoji-toolkit (emojis de categoría), react-hot-toast.

UI activa: `src/main.jsx` monta SOLO `src/stitch/StitchApp.jsx`. La UI vieja (`src/App.jsx`, `src/pages/`, `src/components/`, `src/styles/`, `src/index.css`, `useThemeStore`, atajos de teclado) YA FUE ELIMINADA (commit `dbc4677`). `src/` ahora contiene solo: `stitch/` (UI), `stores/`, `utils/`, `data/`, `lib/` (supabase), `contexts/AuthContext.jsx`. Deps podadas a 13 (se quitaron driver.js, lucide-react, date-fns). Lint pasa con 0 errores.

Tailwind v4 vía `@tailwindcss/vite`; config en CSS con `@theme` dentro de `src/stitch/stitch.css` (NO hay tailwind.config.js). Los tokens de spacing (sm/md/lg/xl) hacen que utilidades de ancho homónimas (`max-w-md`, `max-w-xl`) resuelvan a 8–40px; usar valores arbitrarios `max-w-[Nrem]` en su lugar.

Modo demo/QA: flag sessionStorage `fintrack-demo-mode`, solo en localhost. Botón "Entrar como demo" en `StitchAuth`. Siembra los stores Zustand en memoria sin tocar Supabase. En demo NO hay sesión, así que las acciones de los stores (que escriben al backend) salen sin efecto; por eso existen mutadores en memoria en `src/stitch/demoMode.js` (`demoAddTransaction`, etc.). Cualquier página con formularios de alta/edición DEBE ramificar `if (isDemoActive()) demoXxx(); else await storeAction()` y mostrar el toast manualmente en demo.

Servidor dev corriendo en http://localhost:5173/. HEAD de la rama: `c6234ff`.

Tests: 104 pasan (`npm run test`). Build limpio (`npm run build`). Lint: 0 errores (`npm run lint`). El easing `EASE_OUT` vive en `src/stitch/motionTokens.js` (separado de StitchMotion.jsx para no romper fast-refresh).

PLAN FUSIONADO EN AHORROS: la página Plan dejó de existir. Se eliminaron la ruta `/plan`, la entrada de menú, el store `usePlanStore.js` y `StitchStrategy.jsx`. Las metas de ahorro ganaron un campo `horizon` opcional (short/medium/long/null) que es SOLO etiqueta para agrupar/filtrar (no cambia la lógica). Migración SQL `supabase/add_savings_horizon.sql` (correr a mano): añade la columna `horizon` a `savings` y copia `plans → savings`. La tabla `plans` queda huérfana, NO se borra (el usuario decide). El Dashboard ahora lee las "metas próximas" desde `savings` (enlaza a `/ahorros`).

Estado de las páginas (pulidas = aplican las 14 pautas + demo branching):
- PULIDAS: Transacciones (`StitchLedger.jsx`), Presupuesto (`StitchBudget.jsx` + carpeta `screens/budget/`), Tarjetas (`StitchCards.jsx` + `screens/cards/`), Deudas (`StitchDebts.jsx` + `screens/debts/`), Ahorros (`StitchVaults.jsx` + `screens/vaults/`, ahora con horizonte y filtro), Dashboard (`StitchDashboard.jsx` + `screens/dashboard/`, bento grid con Recharts), Reportes (`StitchReports.jsx` + `screens/reports/`, centro de análisis con Recharts).
- PENDIENTES (datos reales y emojis ya migrados, pero AÚN con `<select>`/`<input type=date>`/inputs nativos y SIN demo branching en formularios): Calendario (`StitchCalendar.jsx`), Ajustes (`StitchSettings.jsx` — ya tiene el selector de nivel de presupuesto; ahora se accede desde el menú del avatar, no del sidebar), Feedback (`StitchFeedback.jsx`).

REPORTES (centro de análisis): `screens/reports/` con shell + selectores PUROS testeados (`selectors.js`/`selectors.test.js`: `getIncomeVsExpenseSeries`/`getCategoryTrend`/`getMonthComparison`/`getInsights`) + visualizaciones temporales DISTINTAS al Dashboard: `IncomeExpenseBars` (barras agrupadas), `CategoryTrendLines` (líneas multi-serie), `MonthComparison` (barras divergentes vs mes anterior), `InsightsRow` (4 tarjetas) + `reportsUi.jsx`. Selector de rango 6/12/24 meses (estado) que recalcula todo. Salud reusa getFinancialHealthScore + getMonthlySavingCapacity con includeCurrent=true (incluye mes actual, como el Dashboard). Tooltips fijos (isAnimationActive=false).

DASHBOARD (bento): `screens/dashboard/` — KPIs + FlowChart (área) + CategoryDonut (con hover active-shape) + HealthRing compacto + BudgetBar + NetWorthBar + SignalsRail. Selector de mes global (solo afecta lo mensual; patrimonio/tarjetas/salud/recordatorios son de hoy). InfoTip en KPIs. Salud con includeCurrent + etiqueta "basado en N meses". Layout jerárquico: hero dominante, salud+patrimonio apiladas a su lado, donut ancho completo.

TOPBAR/CUENTA: el avatar abre `AccountMenu.jsx` (hub de cuenta: Ajustes, Feedback, cerrar sesión / salir demo) vía DropdownPanel. Se quitaron el buscador y las notificaciones (no tenían función). Ajustes salió del sidebar (vive en el menú del avatar).

DASHBOARD (bento): `screens/dashboard/` con shell delgado + selectores PUROS testeados (`selectors.js`/`selectors.test.js`: `getCategoryBreakdown`/`getBudgetUsage`/`getNetWorthSplit`) + sub-componentes de visualización (`FlowChart` AreaChart, `CategoryDonut`, `BudgetBar`, `NetWorthBar`, `HealthRing` RadialBar, `SignalsRail`) + `dashboardUi.jsx` (BentoCell/EmptyCell/Stat). REUSA utilidades probadas: `getFinancialHealthScore` + `getMonthlySavingCapacity` (salud) y `groupByCategory` (donut) — no duplica lógica. Charts con Recharts (igual que Reportes). Orden por importancia: KPI → presupuesto+flujo → salud → donut → patrimonio → recordatorios. Placeholder por celda (`EmptyCell`) cuando faltan datos.

Plantilla de referencia: cualquier página ya pulida sirve de ejemplo. Para una página CON sub-componentes + modales + demo branching + toast Deshacer + historial, usar `screens/debts/` o `screens/cards/` (patrón espejo: shell delgado + carpeta de sub-componentes + `Ui.jsx` local con Modal/Field/FormActions).

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
- `src/stores/usePrefsStore.js`: preferencias del usuario (hoy `budgetLevel`). Híbrido: persist local + Supabase `profiles` con sesión; en demo solo caché. `fetchPrefs()` se llama en el arranque de StitchApp. Patrón a extender para futuras preferencias.

## Archivos modificados clave

- `src/stitch/stitch.css`: tokens `@theme`; `.stitch-check` (checkbox oscuro); reglas globales de date inputs nativos en oscuro; SCROLLBAR DEL TEMA (thumb `#353436`, hover `#454655`, pista transparente, 8px) en DOS selectores: `.stitch-root` (UI normal) Y `.stitch-scroll` (contenido en portal, fuera de `.stitch-root`); feedback de press en botones.
- `src/stitch/screens/StitchLedger.jsx` (Transacciones): página más trabajada. Usa StitchCurrencyInput, StitchCategorySelect, StitchSelect, StitchDatePicker, AutoCatChip, Emoji. Tipo de transacción DERIVADO de la categoría (no se elige a mano; se muestra `TypeBadge` de solo lectura). Columnas Fecha y Monto ordenables (`SortHeader`, asc/desc, flecha periwinkle activa). Filtros: búsqueda, tipo, categoría, rango de fechas; todos h-[34px]. Demo branching en alta/edición/borrado con toast manual.
- `src/data/defaultCategories.js` (previo): 37 categorías, ~405 keywords. `autoCategorize(desc, categories)` con matching por prefijo de la última palabra (≥3 chars) además de palabra completa.
- `src/stitch/demoMode.js`: siembra las 37 categorías reales + datos de ejemplo. Mutadores en memoria por entidad (sin sesión Supabase): transacciones (`demoAddTransaction`/`demoUpdateTransaction`/`demoDeleteTransaction`/`demoRestoreTransaction`), presupuesto (`demoSetBudget`, `demoCopyBudgetFromPreviousMonth`), tarjetas (`demoAddCard`/`demoUpdateCard`/`demoDeleteCard`/`demoRestoreCard`/`demoAddCardPayment`/`demoDeleteCardPayment`), deudas (`demoAddDebt`/`demoUpdateDebt`/`demoDeleteDebt`/`demoRestoreDebt`/`demoAddDebtPayment`/`demoDeleteDebtPayment` + helper `demoLoanCategoryId`), ahorros (`demoAddGoal`/`demoUpdateGoal`/`demoDeleteGoal`/`demoRestoreGoal`/`demoAddContribution`/`demoDeleteContribution` + helper `demoSavingsCategoryId`), y genéricos `demoAdd`/`demoUpdate`/`demoDelete`. Los pagos de deuda y los aportes de ahorro demo CREAN su transacción enlazada (fiel a producción: deuda→fixed_expense, ahorro→savings). PENDIENTE: faltan mutadores demo solo para Plan (plans) — crearlos al pulir esa página.
- Emojis migrados a `<Emoji>` en: StitchLedger (tabla), StitchCalendar, StitchBudget, StitchSettings, StitchVaults (tarjeta + picker), StitchFeedback. Los `<option>` de `<select>` nativos NO admiten `<img>`; por eso se reemplazaron esos selects por StitchSelect/StitchCategorySelect donde había emojis.

## Patrón establecido para páginas con CRUD + modales

Páginas pulidas con formularios/pagos/historial (Tarjetas, Deudas) siguen este patrón espejo (copiar al pulir Ahorros/Plan):
- Carpeta `src/stitch/screens/<page>/` con: `<page>Ui.jsx` (Modal/Field/FormActions/inputCls locales, copia ~40 líneas, NO acoplar entre carpetas), `XItem.jsx` (tarjeta del grid), `XForm.jsx` (modal crear/editar), `PaymentModal.jsx`/`HistoryModal.jsx` si aplica, y helpers puros (`payoff.js` en deudas).
- La pantalla raíz (`StitchDebts.jsx`, `StitchCards.jsx`) queda como SHELL delgado: header + grid + estado de modales + orquestación + toast Deshacer de borrado.
- Demo branching en cada acción: `if (isDemoActive()) demoXxx(); else await storeAction();` + toast manual en demo.
- Borrado (entidad y sub-items): toast con botón "Deshacer" (6s), patrón de `StitchLedger.onDelete`. Si el borrado tiene efectos en cascada (deuda→pagos→tx), capturar el estado antes de borrar y restaurarlo en el Deshacer.
- Lógica de negocio: NUNCA reescribir; reusar las funciones de `src/utils/` y los stores. Helpers de presentación derivados (payoff, buckets) van en archivos puros testeables, no en el store.
- Modales: leer la entidad VIVA del store (no el prop snapshot) si su estado cambia dentro del modal (ej. HistoryModal lee la deuda del store para reflejar el saldo tras borrar pagos).

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

CONCEPTO DE PRESUPUESTO: niveles progresivos (Seguimiento → 50/30/20 → Base cero) — YA IMPLEMENTADO (commit `71802fa`). Ver `docs/specs/2026-06-niveles-progresivos-design.md`. La preferencia `budgetLevel` vive en `src/stores/usePrefsStore.js` (híbrido: caché local con persist + tabla `profiles` en Supabase con sesión; en demo solo caché). Migración SQL en `supabase/add_profiles_table.sql` (el usuario la corre a mano). `getBuckets503020(summary)` y los campos `gastosFijosReal`/`ahorroReal` se agregaron a `src/utils/calculations.js`.

FEATURES DE LÓGICA YA EXPUESTAS EN UI (estado actualizado vs. docs/specs/README.md):
- Presupuesto base cero + 50/30/20 + Seguimiento: HECHO (`screens/budget/`).
- Tarjetas: ciclos + abonos parciales (getCardBalances) + "Pagar todo" + "Adelantar abono" (prepago) + historial + catálogo predefinido con cashback (resolveCardCashback): HECHO (`screens/cards/`).
- Deudas: avalancha + pagos con tx enlazada + payoff (calculateAmortization) + historial: HECHO (`screens/debts/`).
- Ahorros: metas + aportes registrados con tx enlazada + proyección (monthsToGoal/projectedCompletionDate) + historial con Deshacer: HECHO (`screens/vaults/`). NUEVA tabla `savings_contributions` (espejo de `debt_payments`) + columnas `currency` y `monthly_contribution` en `savings`: migración en `supabase/add_savings_contributions.sql` (el usuario la corre a mano; el código degrada con gracia si aún no se aplicó). Helper de proyección puro y testeado en `screens/vaults/projection.js`. El saldo inicial solo se declara al crear; tras crear, el saldo solo cambia vía aportes.
- PENDIENTE de exponer: sobres acumulativos (sinking funds) en Presupuesto base cero — la lógica (`getAccumulatedBalance`, columnas `is_accumulative`/`accumulation_start`) ya existe; falta el mini-modal por categoría en `screens/budget/BudgetZero.jsx`. Ver `docs/specs/2026-05-29-sobres-acumulativos-design.md`.

## Historial de commits relevantes (rama rebuild/stitch-pure, último arriba)

- `f23bc21` feat(dashboard): shell bento ordenado por importancia + Stagger. HEAD actual.
- `34d9bf6`…`cb95fd6` feat(dashboard): primitivas bento + FlowChart/CategoryDonut/BudgetBar/NetWorthBar/HealthRing/SignalsRail (`screens/dashboard/`).
- `5d6736a` feat(dashboard): selectores puros (breakdown/budget/patrimonio) + tests.
- `b1645b6` feat(plan): elimina Plan (fusionado en Ahorros) — ruta/menú/store/página borrados; metas con campo horizon; Dashboard lee metas de savings.
- `e7e0a33`…`b875cb4` feat(ahorros): fusión Plan→Ahorros — columna horizon + migración, store/demo/form/chip/filtro.
- `b1ca3d7` fix(ahorros): Deshacer reapunta aportes al id nuevo de la meta restaurada.
- `689d74d` feat(ahorros): shell delgado + integración de sub-componentes (sin tx manual duplicada).
- `54869d6`…`b5ef049` feat(ahorros): VaultItem/VaultForm/ContributionModal/HistoryModal/vaultsUi (`screens/vaults/`) + polish a11y.
- `12d65aa`…`a52309a` feat(ahorros): mutadores demo de metas y aportes (cascade + tx enlazada).
- `0d35743`…`d740947` feat(ahorros): store con aportes registrados + tx enlazada + currency/aporte mensual.
- `8ca3ddb`…`2f52a74` feat(ahorros): helper de proyección de meta + tests.
- `098a39f`…`00e9a63` feat(ahorros): migración savings_contributions + currency + monthly_contribution.
- `b34ecd1` feat(deudas): página completa — payoff + historial + demo branching + Stitch.
- `576ff3a` fix(tarjetas): permitir adelantar abono (prepago) en tarjeta al día.
- `548b83c` feat(tarjetas): página completa — abonos parciales + catálogo cashback + Stitch (`screens/cards/`).
- `71802fa` feat(presupuesto): niveles progresivos (Seguimiento/50-30-20/Base cero) (`screens/budget/`, usePrefsStore, getBuckets503020).
- `012763a` docs(specs): recupera specs de lógica + índice + concepto niveles progresivos (`docs/specs/`).
- `1e68628` docs(handoff): refleja limpieza.
- `dbc4677` chore: elimina UI vieja + docs + deps no usadas; refactor StitchMotion (motionTokens.js); fix Emoji fallback.
- `92fe95e` fix(dropdowns): scrollbar del tema en portal (`.stitch-scroll`) + sin scroll horizontal.
- `597a19e` fix(dropdowns): panel flotante en portal (DropdownPanel) — deja de recortar en modal.
- `ba8196f` feat(transacciones): StitchSelect y StitchDatePicker unificados.
- `cd0b722` feat(transacciones): StitchCategorySelect (dropdown con emojis JoyPixels).
- `40209b6` feat(emojis): JoyPixels v10 (componente Emoji).
- `671e106` y previos: tipo derivado de categoría, caret decimal, guardado en demo, formateo de miles, favicon, rename FinTrack + logo, landing + reset password, animaciones Emil.

Verificación tras `f23bc21`: build OK, 93 tests OK (82 previos + 11 de dashboard/selectors), lint 0 errores. App + los 9 módulos de `screens/dashboard/` se sirven 200 vía dev server (cadena de imports de Recharts resuelve). No se condujeron clics/hover reales (tooltips de Recharts; no hay driver de navegador instalado) — validar en QA demo. Recordar correr a mano en Supabase, antes de usar con sesión real: `supabase/add_savings_contributions.sql` y `supabase/add_savings_horizon.sql`.

Specs + planes en `docs/superpowers/specs/` y `docs/superpowers/plans/` (Ahorros: `2026-06-02-ahorros-stitch-*`; fusión Plan: `2026-06-03-fusion-plan-ahorros*`; Dashboard: `2026-06-03-dashboard-bento*`; Reportes: `2026-06-03-reportes-centro-analisis*`).

## Siguiente paso lógico

EMPEZAR POR CALENDARIO (`src/stitch/screens/StitchCalendar.jsx`). Revisar primero qué tiene (vista de calendario con eventos/vencimientos). El foco es aplicar las 14 pautas y consistencia con lo ya pulido: tokens del tema, `StitchSelect`/`StitchDatePicker` si hay selects/fechas nativos, íconos (`!text-[Npx]`), Stagger de entrada, placeholders, y demo branching SOLO si tiene formularios de alta/edición. Reusar utilidades de `src/utils/`; no reintroducir lógica.

Orden de páginas restante tras Calendario: Ajustes (`StitchSettings`), Feedback (`StitchFeedback`). Pendiente transversal: exponer sobres acumulativos en Presupuesto base cero (ver sección de specs). Revisión por página antes de pasar a la siguiente.

Comandos de verificación por página: `npm run build`, `npm run lint` (0 errores), `npm run test` (104 deben pasar). Confirmar que http://localhost:5173/ responde 200.
