# Diseño — Reportes: análisis inteligente + pulido (iteración) · Stitch

Fecha: 2026-06-03 · Rama: `rebuild/stitch-pure` (local, no subir).

## Contexto

Iteración sobre Reportes (centro de análisis ya entregado, `screens/reports/`),
a partir de feedback del usuario. Cuatro mejoras; la principal es un motor de
"análisis inteligente" que diga al usuario qué hacer.

## Cambios (acordados)

1. **Motor de análisis (reglas heurísticas locales):** selector puro que analiza
   los datos ya calculados y genera recomendaciones priorizadas en lenguaje llano.
   Determinista, sin backend, testeable. 4 reglas:
   - **Tasa de ahorro:** ≥20% → `good` ("Ahorras X%, vas muy bien"); 0–20% →
     `info`/`warn`; negativa → `alert` ("Gastas más de lo que ingresas este mes").
   - **Categoría que más subió:** mayor `deltaPct` positivo de `getMonthComparison`
     → `warn` ("Tu gasto en {cat} subió {N}% — RD$ X más que el mes pasado").
   - **Concentración de gasto:** si la categoría top del mes ≥ 50% del gasto →
     `info` ("El {N}% de tu gasto se va en {cat}").
   - **Tendencia + deuda:** tendencia del gasto (sube/baja/estable comparando
     primera mitad vs segunda mitad del rango) y carga de deuda (DTI = cuota
     mensual / ingreso promedio): si DTI ≥ 0.36 → `warn` carga alta de deuda.
   Cada regla genera 0 o 1 insight; si ninguna aplica o faltan datos, un insight
   `info` neutro. Insights ordenados por severidad: alert → warn → good → info.

2. **Panel de presentación:** `AnalysisPanel.jsx` — apartado "Análisis
   inteligente" bajo los KPIs (primero tras ellos en el Stagger), con tarjetas de
   recomendación por severidad (rojo/ámbar/verde/periwinkle): ícono + título +
   frase de qué hacer.

3. **InfoTips en KPIs:** mover `InfoTip` de `dashboard/dashboardUi.jsx` a
   `src/stitch/InfoTip.jsx` (compartido) e importarlo desde ambos (dashboardUi
   re-exporta o importa). Añadir InfoTip a los KPIs de Reportes que lo ameritan:
   Salud financiera, Tasa de ahorro, Gasto del mes (Movimientos no necesita).

4. **KPIs sin cortes + animaciones:**
   - Los montos no deben truncarse ni saltar de línea. Bajar el tamaño del valor
     de los KPIs de Reportes (de `text-headline-md` a un tamaño que siempre quepa,
     p. ej. `text-[20px]`) y mantener `whitespace-nowrap`. El header del KPI con
     InfoTip usa `justify-between` para que el ícono no empuje el texto.
   - Animaciones: `Stagger` ya existe; los insights entran con el stagger; hover
     sutil en las tarjetas de insight (transición de borde/fondo). Tooltips de
     charts ya son fijos.

## Arquitectura

- `src/stitch/InfoTip.jsx` — componente compartido (movido desde dashboardUi).
  `dashboard/dashboardUi.jsx` lo re-exporta para no romper sus imports actuales.
- `src/stitch/screens/reports/analysis.js` — `getAnalysis(input)` puro: recibe
  `{ health, comparison, breakdownTop, trendDirection, dti }` ya calculados (o los
  datos crudos mínimos) y devuelve `[{ severity, icon, title, body }]`.
- `src/stitch/screens/reports/analysis.test.js` — tests TDD de las 4 reglas + orden.
- `src/stitch/screens/reports/AnalysisPanel.jsx` — render del panel.
- `reportsUi.jsx` — `Kpi` acepta `info` (texto del InfoTip) y ajusta el tamaño del
  valor para no truncar.
- `StitchReports.jsx` — calcula los insumos del análisis (con `useMemo`), pasa
  `info` a los KPIs, e inserta `AnalysisPanel` tras los KPIs.

`getAnalysis` recibe datos ya calculados (no recalcula ni toca stores); el shell
arma su input a partir de los selectores existentes + utils.

## Forma de `getAnalysis`

Entrada (objeto): `{ savingsRate, topRising:{name,deltaPct,deltaAbs}|null,
concentration:{name,pct}|null, trendDirection:'up'|'down'|'flat', dti:number,
hasData:boolean }`.
Salida: `[{ severity:'alert'|'warn'|'good'|'info', icon, title, body }]` ordenada.

## Testing y verificación

- `analysis.test.js` (TDD): ahorro alto→good, ahorro negativo→alert, categoría que
  sube→warn con monto, concentración≥50%→info, DTI alto→warn, sin datos→info
  neutro, orden por severidad.
- Los selectores existentes no cambian (sus tests siguen verdes). Total ≥ 104 +
  nuevos de analysis.
- `npm run build` (limpio), `npm run lint` (0), `npm run test`.
- Dev server: `GET /` 200; módulos de reports 200.
- Demo: el panel muestra recomendaciones acorde a los datos; KPIs con InfoTip y
  montos completos sin cortes; animación de entrada.
- NOTA: sin driver de navegador no se conducen hover/tooltips; se valida en QA demo.

## Fuera de alcance (YAGNI)

- IA real / Claude API (se eligió reglas locales; interfaz queda limpia por si se
  cambia la fuente luego).
- Más de 4 reglas; consejos personalizados por perfil de usuario configurable.
- Persistir o descartar insights.
