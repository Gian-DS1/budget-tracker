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
    <div className="flex flex-col h-56">
      {/* Encabezado Robinhood: valor grande del punto enfocado + su mes. */}
      <div className="flex items-baseline justify-between gap-sm mb-xs">
        <div className="flex items-baseline gap-sm min-w-0">
          <span className="font-headline-md text-[22px] tracking-tight tabular-nums" style={{ color: lineColor }}>{fmt(head.wealth)}</span>
          <span className="font-mono-data text-mono-data text-text-muted uppercase shrink-0">{head.label} {head.y}</span>
        </div>
        <div className="flex items-center gap-md font-mono-data text-mono-data shrink-0">
          <span className="text-tertiary">↑ {fmt(head.income)}</span>
          <span className="text-accent-error">↓ {fmt(head.expense)}</span>
        </div>
      </div>

      <div className="flex-grow min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={data}
            margin={{ top: 6, right: 4, bottom: 0, left: 4 }}
            barGap={1}
            barCategoryGap="12%"
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

            {/* Barras de contexto (juntas, discretas). La del mes activo, más opaca. */}
            <Bar yAxisId="flow" dataKey="income" radius={[2, 2, 0, 0]} maxBarSize={14} isAnimationActive={!reduced} animationDuration={500} animationEasing="ease-out">
              {data.map((d) => <Cell key={`i-${keyOf(d)}`} fill={CHART.tertiary} fillOpacity={keyOf(d) === activeKey ? 0.85 : 0.35} />)}
            </Bar>
            <Bar yAxisId="flow" dataKey="expense" radius={[2, 2, 0, 0]} maxBarSize={14} isAnimationActive={!reduced} animationDuration={500} animationEasing="ease-out">
              {data.map((d) => <Cell key={`e-${keyOf(d)}`} fill={CHART.error} fillOpacity={keyOf(d) === activeKey ? 0.85 : 0.35} />)}
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
