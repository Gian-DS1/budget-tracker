// Tendencia del EFECTIVO DISPONIBLE acumulado en el tiempo, con estética tipo
// Robinhood: línea fluida + área de gradiente que se desvanece, sin ejes pesados
// ni rejilla, scrubbing interactivo (el cursor sigue el mouse y actualiza el
// hero). El hero es el efectivo disponible (lo gastable HOY); debajo, el
// desglose de cómo se llega (ahorro + total) y las tarjetas por pagar como
// aviso. Las barras de ingreso/gasto van pequeñas de fondo, como contexto.
import { useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import { ResponsiveContainer, ComposedChart, Bar, Area, XAxis, YAxis, Tooltip, Cell } from 'recharts';
import { formatCurrency } from '../../../utils/formatters';
import { useI18n } from '../../../contexts/I18nContext';
import { CHART } from '../../chartTokens';
import CountUp from '../../CountUp';

const fmt = (n) => formatCurrency(n);

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
  const scrubbing = hoverIdx != null && data[hoverIdx];
  const head = scrubbing || data[data.length - 1];
  // Tendencia del periodo: subió si el último valor ≥ el primero (color de la curva).
  const up = data[data.length - 1].cash >= data[0].cash;
  const lineColor = up ? CHART.secondary : CHART.error;

  // Clic en cualquier parte de una columna (mes) → fija ese mes como activo.
  const handleClick = (state) => {
    if (!onBarClick || !state || state.activeTooltipIndex == null) return;
    const d = data[state.activeTooltipIndex];
    if (d) onBarClick(d);
  };

  return (
    <div className="flex flex-col h-72 sm:h-64">
      {/* Hero Robinhood: EFECTIVO DISPONIBLE del punto enfocado, en grande y con
          count-up. El mes solo aparece al hacer scrubbing (en reposo ya lo dice
          el título de la celda). Debajo, UNA línea de desglose de cómo se llega
          al número (ahorro + dinero total) y, si hay deuda de tarjetas, un chip
          ámbar de aviso. flex-wrap: en móvil los pares bajan de línea sin chocar. */}
      <div className="mb-sm">
        <div className="flex items-baseline gap-xs font-mono-data text-mono-data text-text-muted uppercase">
          <span>{t('dashboard.liquidCash')}</span>
          {scrubbing && <span className="text-primary">· {head.label} {head.y}</span>}
        </div>
        <div className="font-headline-md text-[28px] sm:text-[30px] tracking-tight tabular-nums whitespace-nowrap mt-xs" style={{ color: lineColor }}>
          <CountUp value={head.cash} format={fmt} duration={240} />
        </div>
        <div className="flex flex-wrap items-center gap-x-md gap-y-xs mt-xs">
          <span className="inline-flex items-baseline gap-xs">
            <span className="font-mono-data text-mono-data text-text-muted uppercase">{t('dashboard.savedTotal')}</span>
            <span className="font-headline-md text-[13px] tracking-tight tabular-nums text-secondary whitespace-nowrap">
              <CountUp value={head.savings} format={fmt} duration={240} />
            </span>
          </span>
          <span className="inline-flex items-baseline gap-xs">
            <span className="font-mono-data text-mono-data text-text-muted uppercase">{t('dashboard.myMoneyTotal')}</span>
            <span className="font-headline-md text-[13px] tracking-tight tabular-nums text-on-surface whitespace-nowrap">
              <CountUp value={head.wealth} format={fmt} duration={240} />
            </span>
          </span>
          {head.cardsDue > 0 && (
            <span className="inline-flex items-baseline gap-xs rounded-full border border-accent-warning/40 bg-accent-warning/5 px-sm py-[3px]">
              <span className="font-mono-data text-mono-data text-accent-warning uppercase">{t('dashboard.creditCardsPayable')}</span>
              <span className="font-headline-md text-[13px] tracking-tight tabular-nums text-accent-warning whitespace-nowrap">
                <CountUp value={head.cardsDue} format={fmt} duration={240} />
              </span>
            </span>
          )}
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
            <YAxis yAxisId="cash" hide domain={['dataMin', 'dataMax']} />
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

            {/* La protagonista: área del efectivo disponible con gradiente que se
                desvanece (la misma serie que el hero, para que el scrubbing cuadre). */}
            <Area
              yAxisId="cash"
              type="monotone"
              dataKey="cash"
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
