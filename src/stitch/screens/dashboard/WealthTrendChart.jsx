// Tendencia de patrimonio líquido (efectivo + ahorros) ACUMULADO en el tiempo,
// con estética tipo Robinhood: línea fluida + área de gradiente que se desvanece,
// sin ejes pesados ni rejilla, scrubbing interactivo (el cursor sigue el mouse y
// muestra el valor + el mes en un encabezado flotante). Las barras de ingreso/
// gasto van pequeñas y juntas de fondo, como contexto secundario.
import { useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import { ResponsiveContainer, ComposedChart, Bar, Area, XAxis, YAxis, Tooltip, Cell } from 'recharts';
import { formatCurrency } from '../../../utils/formatters';
import { useI18n } from '../../../contexts/I18nContext';
import { CHART } from '../../chartTokens';
import CountUp from '../../CountUp';

const fmt = (n) => formatCurrency(n);
// Count-up corto para el scrubbing: los números transicionan entre meses en vez
// de saltar. Duración baja (240ms) para que se sienta reactivo al deslizar.
const pct = (n) => `${(Number(n) || 0).toFixed(1)}%`;

export default function WealthTrendChart({ data, activeKey, onBarClick }) {
  const { t } = useI18n();
  const reduced = useReducedMotion();
  // Índice del punto bajo el cursor (scrubbing). null = en reposo.
  const [hoverIdx, setHoverIdx] = useState(null);
  const hasData = data.some((d) => d.income !== 0 || d.expense !== 0 || d.wealth !== 0);
  if (!hasData) {
    return <p className="font-body-md text-body-md text-text-muted py-xl text-center">{t('screens.reports.noMovementsPeriod')}</p>;
  }

  const keyOf = (d) => `${d.y}-${d.m}`;
  // Encabezado: el punto bajo el cursor (scrubbing) o, en reposo, el último mes.
  const head = (hoverIdx != null && data[hoverIdx]) || data[data.length - 1];
  // Tendencia del periodo: subió si el último valor ≥ el primero (color de la curva).
  const up = data[data.length - 1].wealth >= data[0].wealth;
  const lineColor = up ? CHART.secondary : CHART.error;

  // Clic en cualquier parte de una columna (mes) → fija ese mes como activo.
  const handleClick = (state) => {
    if (!onBarClick || !state || state.activeTooltipIndex == null) return;
    const d = data[state.activeTooltipIndex];
    if (d) onBarClick(d);
  };

  return (
    <div className="flex flex-col h-64">
      {/* Encabezado Robinhood: patrimonio del punto enfocado (cyan, count-up) + su
          mes, con ingresos/gastos del mes en pequeño (verde/rojo) debajo; a la
          derecha, tasa de ahorro y tarjetas por pagar. Todo anima con el scrubbing. */}
      <div className="flex items-start justify-between gap-md mb-sm">
        <div className="min-w-0">
          <div className="flex items-baseline gap-sm">
            <span className="font-headline-md text-[24px] tracking-tight tabular-nums" style={{ color: lineColor }}>
              <CountUp value={head.wealth} format={fmt} duration={240} />
            </span>
            <span className="font-mono-data text-mono-data text-text-muted uppercase shrink-0">{head.label} {head.y}</span>
          </div>
          {/* Ingresos / gastos del mes, pequeños (como antes). */}
          <div className="flex items-center gap-md font-mono-data text-mono-data mt-xs">
            <span className="text-tertiary">↑ <CountUp value={head.income} format={fmt} duration={240} /></span>
            <span className="text-accent-error">↓ <CountUp value={head.expense} format={fmt} duration={240} /></span>
          </div>
        </div>
        <div className="flex items-center gap-lg shrink-0">
          <div className="flex flex-col items-end">
            <span className="font-mono-data text-mono-data text-text-muted uppercase">{t('dashboard.savingsRate')}</span>
            <span className="font-headline-md text-[15px] tracking-tight tabular-nums text-tertiary">
              <CountUp value={head.savingsRate} format={pct} duration={240} />
            </span>
          </div>
          <div className="flex flex-col items-end">
            <span className="font-mono-data text-mono-data text-text-muted uppercase">{t('dashboard.creditCardsPayable')}</span>
            <span className={`font-headline-md text-[15px] tracking-tight tabular-nums ${head.cardsDue > 0 ? 'text-accent-warning' : 'text-tertiary'}`}>
              <CountUp value={head.cardsDue} format={fmt} duration={240} />
            </span>
          </div>
        </div>
      </div>

      {/* El clic en una barra/SVG no debe dibujar el focus ring del navegador
          alrededor del gráfico. Se suprime el outline SOLO en foco por puntero
          (:focus:not(:focus-visible)); la navegación por teclado conserva el suyo. */}
      <div className="flex-grow min-h-0 [&_*:focus:not(:focus-visible)]:outline-none">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={data}
            margin={{ top: 6, right: 4, bottom: 0, left: 4 }}
            barGap={0}
            barCategoryGap="55%"
            onClick={handleClick}
            onMouseMove={(s) => setHoverIdx(s?.activeTooltipIndex ?? null)}
            onMouseLeave={() => setHoverIdx(null)}
            style={{ cursor: onBarClick ? 'pointer' : 'default' }}
          >
            <defs>
              <linearGradient id="wealthFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={lineColor} stopOpacity={0.28} />
                <stop offset="100%" stopColor={lineColor} stopOpacity={0} />
              </linearGradient>
            </defs>

            <XAxis dataKey="label" tick={{ fill: CHART.muted, fontSize: 10 }} axisLine={false} tickLine={false} interval="preserveStartEnd" minTickGap={24} />
            {/* Ejes Y ocultos: la línea ocupa el alto completo; las barras viven en un
                eje derecho comprimido para que queden bajas y no compitan con la curva. */}
            <YAxis yAxisId="wealth" hide domain={['dataMin', 'dataMax']} />
            <YAxis yAxisId="flow" orientation="right" hide domain={[0, (max) => max * 4]} />

            {/* Scrubbing: cursor de línea vertical tenue + activeDot. El valor se
                muestra en el encabezado (no en una caja flotante), estilo Robinhood. */}
            <Tooltip
              isAnimationActive={false}
              cursor={{ stroke: CHART.outline, strokeWidth: 1, strokeDasharray: '3 3' }}
              content={() => null}
            />

            {/* Barras de contexto: ingreso (verde) y gasto (rojo) del mes, pegadas
                una al lado de otra (barGap 0, sin maxBarSize → llenan su sub-banda).
                barCategoryGap controla el grosor y separa los meses. La pareja del
                mes activo va más opaca. */}
            <Bar yAxisId="flow" dataKey="income" radius={[2, 2, 0, 0]} isAnimationActive={!reduced} animationDuration={500} animationEasing="ease-out">
              {data.map((d) => <Cell key={`i-${keyOf(d)}`} fill={CHART.tertiary} fillOpacity={keyOf(d) === activeKey ? 0.9 : 0.4} />)}
            </Bar>
            <Bar yAxisId="flow" dataKey="expense" radius={[2, 2, 0, 0]} isAnimationActive={!reduced} animationDuration={500} animationEasing="ease-out">
              {data.map((d) => <Cell key={`e-${keyOf(d)}`} fill={CHART.error} fillOpacity={keyOf(d) === activeKey ? 0.9 : 0.4} />)}
            </Bar>

            {/* La protagonista: área de patrimonio líquido con gradiente que se desvanece. */}
            <Area
              yAxisId="wealth"
              type="monotone"
              dataKey="wealth"
              stroke={lineColor}
              strokeWidth={2.5}
              fill="url(#wealthFill)"
              dot={false}
              activeDot={{ r: 4, fill: lineColor, stroke: CHART.surface, strokeWidth: 2 }}
              isAnimationActive={!reduced}
              animationDuration={800}
              animationEasing="ease-out"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
