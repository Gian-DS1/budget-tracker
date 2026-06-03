# Diseño — Ajustes al Dashboard (iteración) · Stitch

Fecha: 2026-06-03 · Rama: `rebuild/stitch-pure` (local, no subir).

## Contexto

Ajustes sobre el Dashboard bento ya entregado (`screens/dashboard/`), a partir de
feedback del usuario tras probarlo en QA demo. Cinco cambios acotados; no cambia
la arquitectura de selectores puros.

## Cambios (acordados)

1. **Rebalanceo del bento:** el donut de gastos (`CategoryDonut`) crece y el
   patrimonio (`NetWorthBar`) encoge, para liberar espacio. Fila 4–5: donut
   `col-span-7`, patrimonio `col-span-5`. `NetWorthBar` reduce su `min-h`.

2. **Selector de mes global:** el mes deja de ser fijo (`now.getMonth()`) y pasa
   a estado (`useState`), inicializado en el mes actual. Un `StitchSelect`
   compact en el hero lista los últimos 12 meses. Al cambiar, recalculan SOLO las
   métricas mensuales: flujo del mes, serie de 6 meses (termina en el mes
   elegido), donut, barra de presupuesto, KPI "puedes gastar" y "tasa de ahorro".
   - NO cambian (son estado de hoy): patrimonio neto, tarjetas por pagar, salud
     financiera (promedio móvil), recordatorios. Cuando el mes elegido ≠ mes
     actual, se muestra un mini-banner "Viendo: <Mes Año>" y las celdas de
     estado-actual llevan una etiqueta sutil "actual" para que quede claro qué
     refleja el pasado y qué es de hoy.

3. **Info en los KPI:** nuevo `InfoTip` en `dashboardUi.jsx` — ícono `info` 13px
   en la esquina de cada KPI; hover/focus muestra un tooltip glass con la fórmula
   en lenguaje simple. Accesible (tabIndex, aria-label). Textos:
   - Puedes gastar: "Ingresos del mes − gastos fijos − compromisos (deuda, ahorro)."
   - Tarjetas por pagar: "Suma de saldos facturados pendientes de tus tarjetas."
   - Tasa de ahorro: "(Ingresos − gastos) ÷ ingresos del mes."
   - Patrimonio neto: "Ahorros totales − deudas totales."

4. **Tooltip de gráficos más fijo:** en `FlowChart` y `CategoryDonut` el `Tooltip`
   de Recharts usa `isAnimationActive={false}` (mata el "perseguir cursor"
   tardío) + transición CSS leve de opacidad en el contenido del tooltip.
   Aparece al instante, fijo, con fade suave.

## Arquitectura

- El selector de mes y la lógica "qué es del mes vs. de hoy" viven en el shell
  `StitchDashboard.jsx`. Los selectores puros (`selectors.js`) NO cambian: siguen
  recibiendo datos ya filtrados por el shell.
- `InfoTip` se añade a `dashboardUi.jsx` (tooltip CSS puro, sin dependencia;
  estilo glass del tema, group-hover + focus).
- Ajustes de `col-span`/`min-h` en el shell y en `NetWorthBar`.
- `isAnimationActive={false}` + clase de fade en `FlowChart`/`CategoryDonut`.

## Testing y verificación

- Los selectores puros no cambian → sus 11 tests siguen verdes; total 93.
- `npm run build` (limpio), `npm run lint` (0), `npm run test` (93).
- Dev server: `GET /` 200; módulos del dashboard 200.
- Demo: cambiar de mes recalcula lo mensual y deja patrimonio/tarjetas/salud en
  hoy con su etiqueta; InfoTips muestran las fórmulas; el tooltip del gráfico ya
  no salta.
- No se conducen clics/hover reales sin driver de navegador; se valida en QA demo.

## Fuera de alcance (YAGNI)

- Reconstruir saldos de patrimonio "al cierre" de meses pasados (frágil; los
  saldos no guardan histórico mensual).
- Persistir el mes seleccionado entre sesiones.
