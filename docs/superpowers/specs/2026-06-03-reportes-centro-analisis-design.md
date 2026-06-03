# Diseño — Reportes como centro de análisis · Stitch

Fecha: 2026-06-03 · Rama: `rebuild/stitch-pure` (local, no subir).

## Contexto

`StitchReports.jsx` es la siguiente página a pulir (solo lectura). Ya usa Recharts
(AreaChart de balance neto 12 meses), datos reales, y reusa
`getFinancialHealthScore`/`groupByCategory`. Pero diverge del Dashboard recién
pulido y no llega a ser un verdadero centro de análisis:

- Salud financiera usa `getMonthlySavingCapacity(.., 3)` SIN `includeCurrent` → no
  cuenta el mes actual (mismo problema ya resuelto en el Dashboard).
- "Gasto por categoría" son barras planas, no el donut con hover del Dashboard
  (pero eso es del Dashboard; aquí queremos algo DISTINTO).
- Sin `Stagger` de entrada; tooltip del AreaChart sin `isAnimationActive={false}`
  (salta); sin selector de periodo; estados vacíos parciales.

Decisión del usuario: aplicar las 14 pautas y alinear la IDENTIDAD con el resto
(tokens, Stagger, tooltips fijos, salud honesta, placeholders), pero las
VISUALIZACIONES deben ser DISTINTAS al Dashboard. Reportes no es un resumen del
mes: es un centro de análisis temporal que responde preguntas que el Dashboard no
responde.

## Decisiones (acordadas en brainstorming)

1. **4 visualizaciones analíticas nuevas** (todas con datos ya disponibles):
   - Ingresos vs Gastos por mes (barras agrupadas).
   - Tendencia de categorías en el tiempo (líneas multi-serie).
   - Comparativa mes actual vs anterior por categoría (barras divergentes +/- %).
   - Promedios y récords (4 tarjetas de insight).
2. **Selector de rango** (6 / 12 / 24 meses) que controla TODOS los análisis
   temporales. `StitchSelect`, consistente con el Dashboard.
3. **4 tarjetas de insight:** mes de mayor gasto, gasto mensual promedio,
   categoría más cara del periodo, tasa de ahorro promedio.
4. **Identidad alineada, visualizaciones distintas:** reusa utils y tokens; NO
   reusa `CategoryDonut`/`FlowChart` del Dashboard (esos son del Dashboard).

## Arquitectura — shell + carpeta de sub-componentes + selectores puros

Carpeta nueva `src/stitch/screens/reports/`:

| Archivo | Rol |
|---|---|
| `selectors.js` | Selectores analíticos PUROS nuevos (ver abajo). |
| `selectors.test.js` | Tests TDD de los 4 selectores. |
| `reportsUi.jsx` | Primitivas: `ReportCard` (panel título+icono+slot), `InsightCard`, `Kpi`. |
| `IncomeExpenseBars.jsx` | Barras agrupadas ingresos vs gastos (Recharts BarChart). |
| `CategoryTrendLines.jsx` | Líneas multi-serie de tendencia (Recharts LineChart). |
| `MonthComparison.jsx` | Barras divergentes +/- % por categoría vs mes anterior. |
| `InsightsRow.jsx` | Las 4 tarjetas de insight. |

`StitchReports.jsx` queda como SHELL: header + selector de rango (estado) + KPIs
de salud + las 4 visualizaciones, todo con `Stagger`. No contiene cálculo pesado.

### selectors.js — funciones puras

- `getIncomeVsExpenseSeries(transactions, rangeMonths, refDate)` →
  `[{ label, income, expense }]` por mes (uno por mes del rango, terminando en el
  mes de refDate). Income = type 'income'; expense = fixed/variable/expense menos
  cashback.
- `getCategoryTrend(transactions, categories, rangeMonths, refDate, topN=5)` →
  `{ months: [labels], series: [{ name, color, data: [n por mes] }] }` para las
  topN categorías por gasto total del rango.
- `getMonthComparison(transactions, categories, refDate)` →
  `[{ name, color, current, previous, deltaPct }]` por categoría con gasto en el
  mes actual o anterior; `deltaPct` null si previous=0 (categoría nueva); ordenado
  por |delta| desc.
- `getInsights(transactions, rangeMonths, refDate)` →
  `{ avgMonthlyExpense, topMonth: { label, amount } | null, topCategory: { name, amount } | null, avgSavingsRate }`.
  Promedios solo sobre meses con actividad; valores seguros (0/null) sin datos.

Reciben datos ya cargados (no tocan stores); el shell los pasa, envueltos en
`useMemo` dependientes del rango.

## Layout (centro de análisis, arriba-abajo)

```
HEADER: "Reportes" + chip de periodo + [Selector rango 6/12/24]
FILA 1 · KPIs salud (4): Salud financiera · Tasa ahorro · Gasto del mes · Categorías
FILA 2 · Ingresos vs Gastos por mes (barras agrupadas, ancho completo)
FILA 3 · [ Tendencia de categorías (líneas, col-8) ] [ Insights (col-4, apilados) ]
FILA 4 · Comparativa mes actual vs anterior (barras divergentes, ancho completo)
```

`Stagger` en orden de lectura. Celdas con estilo `surface-panel`/`inner-glow`
(como el Reportes actual) o `glass-card`, consistente con el tema.

## Las 4 visualizaciones (datos + colores + placeholder)

Tokens: primary periwinkle `#bec2ff`, tertiary lima `#bdd200`, error rojo,
secondary cian, colores reales de categoría para las series.

- **IncomeExpenseBars:** Recharts `BarChart`, dos barras por mes — ingreso
  (tertiary) y gasto (error). Tooltip fijo (`isAnimationActive={false}`) con
  ingreso/gasto/balance. Eje X meses. Placeholder: "Sin movimientos en el periodo".
- **CategoryTrendLines:** Recharts `LineChart` multi-serie, una línea por top
  categoría (color real), `type="monotone"`, tooltip fijo, leyenda. Placeholder:
  "Sin gastos para analizar tendencia".
- **MonthComparison:** barras divergentes horizontales por categoría: subió (error,
  derecha) / bajó (tertiary, izquierda) vs mes anterior, con +/- %. Categorías
  nuevas marcadas "nuevo". Ordenado por magnitud. Placeholder: "Necesita dos meses
  de datos para comparar".
- **InsightsRow:** 4 `InsightCard` — Mes de mayor gasto, Gasto mensual promedio,
  Categoría más cara, Tasa de ahorro promedio. Número grande + etiqueta + ícono
  Material Symbols. Placeholder por tarjeta si falta el dato.

Transversal: íconos `!text-[Npx]`, español sentence-case, `formatCurrency`,
`Stagger`, `ResponsiveContainer`, `useMemo`. Salud con
`getMonthlySavingCapacity(.., 3, true)` (incluye mes actual, honesto y reactivo
como el Dashboard).

## Testing y verificación

- `selectors.test.js` (TDD): casos por selector — vacío/sin datos (valores
  seguros), separación income/expense + cashback, top N, mes de mayor gasto,
  categoría más cara, delta vs mes anterior (signo + categoría nueva), respeto del
  rango (6/12/24).
- Charts NO se testean unitariamente (Recharts + DOM); build + carga.
- `npm run test` (93 + nuevos), `npm run build` (limpio), `npm run lint` (0).
- Dev server: `GET /` 200; módulos de `reports/` 200.
- Demo: cambiar rango recalcula todo; 4 visualizaciones distintas al Dashboard;
  placeholders; salud incluye el mes actual.
- NOTA: sin driver de navegador no se conducen hover/tooltips; se valida en QA demo.

## Fuera de alcance (YAGNI)

- Reusar el donut/área del Dashboard (Reportes debe ser distinto).
- Exportar a CSV/PDF.
- Filtros por categoría individual o por cuenta.
- Persistir el rango entre sesiones.
- Reconstrucción de patrimonio histórico.
