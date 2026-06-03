# Diseño — Dashboard estético (bento grid) · Stitch

Fecha: 2026-06-03 · Rama: `rebuild/stitch-pure` (local, no subir).

## Contexto

`StitchDashboard.jsx` (Resumen) es la siguiente página a pulir. Es de SOLO
LECTURA (sin CRUD, sin demo branching de formularios). Hoy: un archivo de ~240
líneas que mezcla cálculo + presentación; hero con un "área chart" hecho a mano
con `clipPath` polygon (sin ejes, tooltip ni hover); 4 métricas KPI; rail lateral
de recordatorios. Reportes (`StitchReports`) ya usa Recharts; el Dashboard
diverge. Falta `Stagger` de entrada (todas las demás páginas pulidas lo tienen).

Objetivo (palabras del usuario): un resumen estético, simétrico con el resto de la
app, que aporte valor en una sola mirada, con gráficos y visualizaciones
concretas usando los datos ya obtenidos, aplicando todas las buenas prácticas y
las 14 pautas. Las visualizaciones siguen un ORDEN DE IMPORTANCIA para guiar al
usuario hacia lo que importa primero.

## Decisiones (acordadas en brainstorming)

1. **Gráfico principal:** migrar el polígono casero a un `AreaChart` de Recharts
   (gradiente periwinkle, tooltip, eje X de meses, curva suave). Consistente con
   Reportes.
2. **Visualizaciones nuevas (las 4):** donut de gastos por categoría, barra de
   presupuesto usado, anillo de salud financiera, barra de patrimonio (ahorro vs
   deuda). Todas con datos ya disponibles.
3. **Layout:** bento grid uniforme, ordenado por importancia (estado accionable →
   tendencia → desglose → contexto → seguimiento).
4. **Estado vacío:** placeholder por celda (cada celda maneja su propio vacío con
   micro-mensaje). El Dashboard nunca se ve roto.

## Arquitectura — shell + carpeta de sub-componentes (patrón de las páginas pulidas)

Carpeta nueva `src/stitch/screens/dashboard/`:

| Archivo | Rol |
|---|---|
| `selectors.js` | Lógica de cálculo PURA y testeable, extraída del componente. |
| `selectors.test.js` | Tests TDD de los selectores nuevos. |
| `dashboardUi.jsx` | Primitivas locales: `BentoCell` (celda glass con título + slot), `EmptyCell` (micro-placeholder), `Stat`. |
| `FlowChart.jsx` | AreaChart de Recharts (flujo 6 meses). |
| `CategoryDonut.jsx` | Donut de gastos por categoría (PieChart). |
| `BudgetBar.jsx` | Barra de presupuesto usado. |
| `NetWorthBar.jsx` | Barra apilada ahorro vs deuda. |
| `HealthRing.jsx` | Anillo de salud financiera (RadialBarChart). |
| `SignalsRail.jsx` | Recordatorios (lógica extraída del componente actual). |

`StitchDashboard.jsx` queda como SHELL: llama a los selectores, arma el bento grid
con `Stagger` y coloca las celdas. NO contiene lógica de cálculo.

### selectors.js — funciones puras

- `getMonthFlow(monthTx)` → `{ income, expense, balance, savingsRate }`.
- `getSixMonthSeries(transactions, year, month)` → `[{ label, inc, exp, net }]`
  (la serie de 6 meses que ya se calcula; movida aquí).
- `getCategoryBreakdown(monthTx, categories)` → top 5 categorías de gasto + "Otros"
  como `[{ name, value, color }]`. Solo gastos (`fixed_expense`/`variable_expense`/
  `expense`), resta cashback, ordena desc, agrega el resto en "Otros" (gris). Vacío
  si no hay gastos.
- `getBudgetUsage(summary)` → `{ spent, budgeted, pct, estado, overBudget }` o
  `null` si no hay presupuesto.
- `getNetWorthSplit(totalSaved, totalDebt)` → `{ saved, debt, savedPct, debtPct,
  netWorth, hasData }`.
- `getHealthScore({ savingsRate, budgetEstado, netWorth })` → `{ score (0–100),
  label, hasData }`. Fórmula transparente documentada en el código: combina tasa
  de ahorro (peso mayor), holgura de presupuesto (estado ok/warning/danger) y
  signo del patrimonio. label: "Sólida" (≥70) / "Estable" (≥40) / "En riesgo"
  (<40). `hasData=false` si no hay ingresos ni presupuesto.
- `getSignals({ cards, debts, goals, transactions, fxRate, now })` → los
  recordatorios (lógica actual extraída; ya lee metas de `savings`).

Los selectores reciben datos ya cargados (no tocan stores); el shell los obtiene
de los stores y los pasa, envueltos en `useMemo`.

## Layout del bento (orden de importancia)

12 columnas, responsive (1 col móvil → expande en md/xl). `Stagger` anima en el
orden de lectura, reforzando la jerarquía.

1. **Estado inmediato** — fila de 4 KPI: Puedes gastar · Tarjetas por pagar · Tasa
   de ahorro · Patrimonio neto. (Lo accionable/urgente primero.)
2. **¿Voy bien este mes?** — `BudgetBar` + `FlowChart` (hero, col-span mayor).
3. **Salud** — `HealthRing` al lado del hero (score de una mirada).
4. **¿En qué gasto?** — `CategoryDonut`.
5. **Patrimonio** — `NetWorthBar` (ahorro vs deuda).
6. **¿Qué viene?** — `SignalsRail` (recordatorios, full width abajo; lo urgente en
   rojo). Pasa de rail lateral a celda full-width para encajar en el bento;
   mantiene click-to-navigate.

Simetría Stitch: todas las celdas `glass-card`/`glass-panel` + `inner-glow`,
bordes `border-subtle`, radios y paddings como las demás páginas, gaps uniformes.

## Las 4 visualizaciones (datos + colores + placeholder)

Tokens: primary `#bec2ff`, tertiary `#bdd200`, warning ámbar, error rojo,
secondary cian.

- **CategoryDonut:** `getCategoryBreakdown`. PieChart con `innerRadius` (donut),
  centro = gasto total del mes. Color real de cada categoría; "Otros" gris.
  Tooltip = categoría + monto + %. Placeholder: "Sin gastos registrados este mes".
- **BudgetBar:** `getBudgetUsage`. Barra de progreso con %; color por estado
  (tertiary/warning/error); texto "Has usado X de Y (NN%)"; sobregiro >100% en
  rojo. Placeholder: "Define un presupuesto para ver tu avance".
- **NetWorthBar:** `getNetWorthSplit`. Barra apilada horizontal (ahorro tertiary +
  deuda error, proporcional) + etiqueta del patrimonio neto. Placeholder: "Aún sin
  ahorros ni deudas registrados".
- **HealthRing:** `getHealthScore`. RadialBarChart (anillo), color por rango,
  número grande al centro + label. Placeholder: anillo gris con "—".

Transversal: íconos Material Symbols `!text-[Npx]`; español sentence-case;
`formatCurrency` para montos; `Stagger` de entrada (respeta reduced-motion);
`ResponsiveContainer` en todos los charts (no rompen en resize); `useMemo` en los
selectores.

## Testing y verificación

- `selectors.test.js` (TDD): `getCategoryBreakdown` (vacío; ≤5 sin "Otros"; >5 con
  "Otros"; ignora ingresos/ahorros; resta cashback), `getBudgetUsage` (sin
  presupuesto → null; bajo/medio/sobre 100%), `getHealthScore` (sólida/estable/en
  riesgo/sin datos), `getNetWorthSplit` (solo ahorro; solo deuda; ambos; ninguno).
- Los componentes de chart NO se testean unitariamente (Recharts + DOM); se
  validan vía build + carga.
- `npm run test` (82 existentes + nuevos), `npm run build` (limpio, confirma
  Recharts e imports), `npm run lint` (0 errores).
- Dev server: `GET /` 200; módulos de `dashboard/` se transforman 200.
- Demo: las 4 visualizaciones pobladas y en orden de importancia; placeholder por
  celda cuando falten datos.
- NOTA: no se conducen clics/hover (tooltips) sin driver de navegador; eso se
  valida en QA demo.

## Fuera de alcance (YAGNI)

- Segundo micro-gráfico de barras ingresos/gastos en el hero (recargaría).
- Configurar/personalizar el dashboard (widgets movibles).
- Datos nuevos del backend: todo sale de lo ya cargado en los stores.
- Tests de los componentes de chart (solo los selectores puros).
