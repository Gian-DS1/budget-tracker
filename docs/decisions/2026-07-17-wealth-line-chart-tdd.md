# Evidencia TDD · Línea de patrimonio estilo Stitch con punto fijable

**Fecha:** 2026-07-17 · **Rama:** main · **Commits:** `2591901` (RED) → `68e6f2f` (GREEN) → `4ac5341` (UI)

## Fuente del plan
Sin `*.plan.md`; jornadas derivadas en esta sesión desde la instrucción del usuario:
reemplazar las barras del hero por el gráfico de líneas de la pantalla *Dashboard*
del proyecto Stitch **Varvez_Esquema** (MCP), adaptado al tema; responsive; datos
diarios/mensuales/todo el tiempo; tooltip al hover; click fija el punto y congela
todos los valores del dashboard.

## Jornadas de usuario
1. Ver el patrimonio como línea suave con degradado (Stitch adaptado al tema oscuro).
2. Serie con puntos diarios (3M/1A) y mensuales (historial largo) — datos suficientes.
3. Ver valores al pasar el mouse (tooltip píldora + scrubbing del encabezado).
4. Click fija un punto; hero + mes de los widgets quedan congelados; re-click vuelve a hoy.

## Ciclo RED → GREEN
- **RED** (`2591901`): 18 tests nuevos fallan por la razón esperada — `getWealthTimeline is not a function`, `pickHeadPoint is not a function`, `getHeroMetric` devolvía `cash` para no-bars. Comando: `npx vitest run src/stitch/screens/dashboard/selectors.test.js` → `18 failed | 53 passed`.
- **GREEN** (`68e6f2f`): mismos tests → `71 passed (71)`; suite completa `npm test` → `259 passed (259)`.
- **UI** (`4ac5341`): WealthTrendChart reescrito (línea única), wiring de selección en StitchDashboard, tokens primary, limpieza prefs/i18n. `npm test` → 259/259 y `npm run lint` sin errores tras los cambios.

## Especificación de pruebas (garantías)
| # | Garantía | Test | Tipo | Resultado |
|---|----------|------|------|-----------|
| 1 | Rango 3M → un punto por DÍA desde la 1ª transacción (claves `YYYY-MM-DD`) | `selectors.test.js › getWealthTimeline › rango 3 meses…` | unit | PASS |
| 2 | La ventana no retrocede antes del día 1 del primer mes del rango | `…ventana no retrocede…` | unit | PASS |
| 3 | Sin transacciones → un punto (hoy) con el saldo inicial | `…sin transacciones…` | unit | PASS |
| 4 | El efectivo acumula por día desde la fecha de cada movimiento | `…efectivo acumula por día…` | unit | PASS |
| 5 | Apartar a ahorro mueve efectivo→ahorro sin cambiar wealth ese día | `…apartar a ahorro…` | unit | PASS |
| 6 | Pagos de tarjeta restan desde su fecha; sin fecha → siempre | `…pagos de tarjeta…` | unit | PASS |
| 7 | income/expense diarios = flujo acumulado del mes (month-to-date), reinicia por mes | `…flujo del mes acumulado…` | unit | PASS |
| 8 | wealth descuenta cardsDue calculado para cada día | `…wealth descuenta…` | unit | PASS |
| 9 | Historial > 550 días con 'all' → puntos MENSUALES (`YYYY-MM`), valores = serie mensual | `…historial largo…` | unit | PASS |
| 10 | Rango 12 meses → sigue diario (≤ tope) | `…rango 12 meses…` | unit | PASS |
| 11 | Puntos diarios llevan y/m/d y label legible ("15 mar") | `…label legible…` | unit | PASS |
| 12 | Encabezado: hover > punto fijado > último; selección inexistente → último; vacío → null | `pickHeadPoint` (5 tests) | unit | PASS |
| 13 | El hero es siempre wealth; args heredados ignorados | `getHeroMetric` (2 tests) | unit | PASS |

## Verificación E2E manual (Chrome DevTools MCP, demo con datos sembrados)
- Línea con stroke `#bec2ff` (primary del tema), fill `url(#wealthFill)` degradado — inspección DOM.
- Hover → tooltip píldora «12 JUN 2026 · RD$ 1,286,615.00» + crosshair (`tipVisible: true`).
- Click → `ReferenceLine` + `ReferenceDot` en el punto, chip «📌 12 JUN 2026 ×» (aria-label
  "Quitar selección"), encabezado del dashboard cambia a «MI DINERO · JUN 2026» y el hero
  congela ingresos/gastos month-to-date (+85,000 / −49,725) y tarjetas por pagar del día
  (−98,958 vs −123,112 de hoy). Captura tomada.
- Chip/re-click → des-fija: vuelve «· JUL 2026» y valores de hoy.
- Rango TODO → ~199 puntos diarios (demo corto, bajo el tope 550); rama mensual cubierta por test #9.
- Responsive 375×812: la línea llena el ancho, ticks adelgazan a 6 — captura tomada.
- Consola: 0 errores; 1 warning benigno de recharts (medición inicial del ResponsiveContainer, preexistente).

## Cobertura y brechas conocidas
- `npm test` (vitest) 259/259. **No hay tooling de cobertura instalado** (`@vitest/coverage-v8`
  ausente; sin script `test:coverage`) — % no medible en este repo; brecha preexistente.
- Sin tests de componente React (repo sin @testing-library): la capa JSX se verificó
  manualmente (arriba); la lógica vive en selectores puros testeados, patrón del repo.
- El pin no sobrevive al cambio de granularidad diaria↔mensual (la clave no existe en la otra
  serie): el marcador se oculta y el encabezado cae al último punto — comportamiento aceptado.

## Evidencia de merge
Trabajo commiteado directo en `main` (flujo del repo, un solo desarrollador); checkpoints
RED/GREEN/UI preservados sin squash: `2591901`, `68e6f2f`, `4ac5341`.
