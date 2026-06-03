# Diseño — Animaciones: count-up + entrada de charts · Stitch

Fecha: 2026-06-03 · Rama: `rebuild/stitch-pure` (local, no subir).

## Contexto

El usuario pide animar: (a) la entrada de los gráficos de barras/tendencia, y
(b) los números de los KPI con un count-up (incremento progresivo rápido hasta el
valor), aplicado a todas las páginas que lo ameriten — no solo Reportes.

## Decisiones (acordadas)

1. **Count-up acotado a KPIs hero + totales destacados.** Componente reutilizable
   `<CountUp/>`. NO se anima en filas de tablas, tarjetas de lista ni modales
   (sería ruidoso).
2. **Entrada animada en las series de los charts** (Bar/Line/Area/Pie crecen al
   entrar) manteniendo `isAnimationActive={false}` SOLO en el `<Tooltip>` (para no
   reintroducir el "salto" del tooltip ya corregido).

## Componente `src/stitch/CountUp.jsx`

- Props: `value` (number), `format` (fn, default identidad → string), `duration`
  (default 700ms).
- Anima de 0 (o del valor previo) a `value` con `requestAnimationFrame` y easing
  ease-out (cubic), rápido al inicio y desacelera. Renderiza `format(actual)`.
- Respeta `prefers-reduced-motion`: muestra el valor final sin animar.
- Re-anima cuando `value` cambia (cleanup del rAF en cada cambio/desmontaje).
- La función de easing/interpolación es pura y exportada para test
  (`countUpValue(from, to, progress)` o equivalente).

## Dónde se usa el count-up

- **Dashboard:** 3 KPI (puedes gastar, tarjetas, tasa ahorro), cifras del hero
  (ingresos/gastos/balance), patrimonio neto, score de salud.
- **Reportes:** 4 KPI (salud, tasa ahorro, gasto del mes, movimientos).
- **Headers con total destacado:** Ahorros (ahorro total), Deudas (deuda total).
  (Tarjetas/Presupuesto: revisar; aplicar solo si hay un total hero claro.)
- NO en filas, tarjetas de lista, modales.

Implementación: el número hero se envuelve en `<CountUp value={n} format={fmt} />`
en vez de `{fmt(n)}`. Para porcentajes/score, `format` adapta (ej.
`(v)=>`${v.toFixed(0)}%`` o `Math.round`).

## Entrada animada de charts

En `FlowChart`, `CategoryDonut`, `IncomeExpenseBars`, `CategoryTrendLines`:
- Series (`Area`/`Pie`/`Bar`/`Line`): `isAnimationActive={true}`,
  `animationDuration={600}`, `animationEasing="ease-out"`.
- `<Tooltip>`: `isAnimationActive={false}` (se mantiene, evita el salto).
- `MonthComparison` (barras CSS): el ancho de la barra anima con `transition`
  CSS (~500ms ease-out). Respeta reduced-motion vía media query de Tailwind si
  aplica (o se deja, es sutil).

## Testing y verificación

- `CountUp.test.js` (o similar): la función pura de interpolación — progress 0 →
  `from`, progress 1 → `to`, easing monótono creciente.
- `npm run build` (limpio), `npm run lint` (0), `npm run test` (112 + nuevos).
- Dev server: `GET /` 200; módulos afectados 200.
- Demo: al entrar a Dashboard/Reportes los KPI cuentan hacia su valor y los charts
  dibujan su entrada; el tooltip sigue fijo (no salta); cambiar mes/rango re-anima.
- NOTA: sin driver de navegador no se observa el movimiento real; se valida en QA.

## Fuera de alcance (YAGNI)

- Count-up en filas/tablas/modales.
- Animaciones de salida o reordenamiento de listas.
- Librería externa de count-up (se hace con rAF propio, sin dependencia).
