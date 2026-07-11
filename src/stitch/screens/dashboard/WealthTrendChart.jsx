// El "camino del dinero en el tiempo": dos vistas del hero del Resumen.
//  · 'bars'  → barras mensuales del PATRIMONIO NETO líquido, con el mes activo
//              resaltado y el resto tenues (estética tipo Whisper Money).
//  · 'line'  → área/línea del EFECTIVO DISPONIBLE, estética Robinhood.
// En ambos: encabezado con el número grande de la métrica, chip de tendencia,
// flujo del mes (ingresos/gastos) y desglose de patrimonio. Scrubbing: el cursor
// sigue el mouse y actualiza el encabezado; clic en un mes lo fija como activo.
import { useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import { ResponsiveContainer, ComposedChart, Bar, Area, XAxis, YAxis, Tooltip, Cell } from 'recharts';
import { formatCurrency } from '../../../utils/formatters';
import { useI18n } from '../../../contexts/I18nContext';
import { CHART } from '../../chartTokens';
import CountUp from '../../CountUp';
import MS from '../../MS';
import { InfoTip } from '../../InfoTip';
import { getHeroMetric } from './selectors';

const fmt = (n) => formatCurrency(n);

const CHART_TYPES = [
  { v: 'bars', icon: 'bar_chart', labelKey: 'dashboard.chartTypeBars' },
  { v: 'line', icon: 'show_chart', labelKey: 'dashboard.chartTypeLine' },
];

// Píldora de tooltip del hero (estilo Whisper), común a barras y línea. Recharts
// le inyecta { active, payload }; el resto son props propias: `fmt` formatea el
// monto, `valueKey` es el dato a mostrar (wealth/cash) y `accent` fija el color
// del punto (si no se pasa, verde/rojo según el signo del valor).
function HeroTip({ active, payload, fmt, valueKey = 'wealth', accent }) {
  if (!active || !payload || !payload.length) return null;
  const d = payload[0].payload;
  const v = d[valueKey];
  const color = accent || (v < 0 ? CHART.error : CHART.tertiary);
  return (
    <div className="pointer-events-none rounded-full bg-surface-card border border-border-subtle inner-glow shadow-xl px-sm py-[5px] flex items-center gap-xs whitespace-nowrap">
      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
      <span className="font-mono-data text-mono-data text-text-muted uppercase">{d.label} {d.y}</span>
      <span className="font-headline-md text-[12px] tabular-nums text-on-surface">{fmt(v)}</span>
    </div>
  );
}

// Punto final con halo para el modo línea: marca el valor de HOY (el último
// punto de la serie). Recharts inyecta cx, cy, index por cada punto; solo se
// dibuja en el último, el resto no pinta nada (línea limpia sin puntos).
function EndDot({ cx, cy, index, lastIndex, color }) {
  if (index !== lastIndex || cx == null || cy == null) return null;
  return (
    <g>
      <circle cx={cx} cy={cy} r={7} fill={color} fillOpacity={0.18} />
      <circle cx={cx} cy={cy} r={3.5} fill={color} stroke={CHART.surface} strokeWidth={2} />
    </g>
  );
}

export default function WealthTrendChart({ data, activeKey, onBarClick, chartType = 'bars', onChartType }) {
  const { t } = useI18n();
  const reduced = useReducedMotion();
  // Índice del punto bajo el cursor (scrubbing). null = en reposo.
  const [hoverIdx, setHoverIdx] = useState(null);
  const hasData = data.some((d) => d.income !== 0 || d.expense !== 0 || d.wealth !== 0 || d.cash !== 0);
  if (!hasData) {
    return <p className="font-body-md text-body-md text-text-muted py-xl text-center">{t('screens.reports.noMovementsPeriod')}</p>;
  }

  const bars = chartType === 'bars';
  // Métrica protagonista según el modo: patrimonio neto (barras) o efectivo (línea).
  const metric = getHeroMetric(chartType);

  const keyOf = (d) => `${d.y}-${d.m}`;
  // Encabezado: el punto bajo el cursor (scrubbing) o, en reposo, el último mes.
  const scrubbing = hoverIdx != null && data[hoverIdx];
  const head = scrubbing || data[data.length - 1];

  // Tendencia del periodo SOBRE LA MÉTRICA ACTIVA: subió si el último valor ≥ el
  // primero. Separa la dirección (color del chip) del monto (neutro, no alerta).
  const first = data[0][metric.key];
  const last = data[data.length - 1][metric.key];
  const up = last >= first;
  const trendColor = up ? CHART.secondary : CHART.error;
  const trendPct = first !== 0 ? ((last - first) / Math.abs(first)) * 100 : 0;
  const showTrend = data.length > 1 && first !== 0 && first !== last;

  // Clic en cualquier parte de una columna (mes) → fija ese mes como activo.
  const handleClick = (state) => {
    if (!onBarClick || !state || state.activeTooltipIndex == null) return;
    const d = data[state.activeTooltipIndex];
    if (d) onBarClick(d);
  };

  return (
    // Hero a todo el ancho: alto amplio para que el gráfico (sobre todo las
    // barras del patrimonio) sea el protagonista y abarque la página, como el
    // hero de Whisper. El encabezado ocupa lo justo; el resto es gráfico (flex-grow).
    <div className="flex flex-col h-[26rem] sm:h-[30rem]">
      <div className="mb-sm">
        {/* Rótulo de la métrica (izq) + toggle tipo de gráfico (der), como Whisper. */}
        <div className="flex items-center justify-between gap-sm">
          <span className="flex items-baseline gap-xs font-mono-data text-mono-data text-text-muted uppercase min-w-0">
            <span className="inline-flex items-center gap-[3px] shrink-0">
              {t(metric.labelKey)}
              <InfoTip text={t(metric.infoKey)} />
            </span>
            {scrubbing && <span className="text-primary whitespace-nowrap">· {head.label} {head.y}</span>}
          </span>
          {onChartType && (
            <div className="inline-flex rounded-md border border-border-subtle overflow-hidden shrink-0" role="group" aria-label={t('dashboard.chartTypeLabel')}>
              {CHART_TYPES.map((o) => (
                <button
                  key={o.v}
                  type="button"
                  onClick={() => onChartType(o.v)}
                  aria-label={t(o.labelKey)}
                  aria-pressed={chartType === o.v}
                  className={`flex items-center justify-center px-sm py-[5px] transition-colors ${
                    chartType === o.v ? 'bg-surface-container-high text-on-surface' : 'text-text-muted hover:text-on-surface-variant'
                  }`}
                >
                  <MS name={o.icon} className="!text-[16px]" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Número grande de la métrica activa (neutro) + chip de tendencia inline. */}
        <div className="flex items-baseline gap-sm mt-xs flex-wrap">
          <span className="font-headline-md text-[28px] sm:text-[30px] tracking-tight tabular-nums whitespace-nowrap text-on-surface">
            <CountUp value={head[metric.key]} format={fmt} duration={240} />
          </span>
          {showTrend && (
            <span className="inline-flex items-center gap-[2px] font-mono-data text-mono-data tabular-nums whitespace-nowrap" style={{ color: trendColor }}>
              <MS name={up ? 'trending_up' : 'trending_down'} className="!text-[13px]" />
              {up ? '+' : '−'}{Math.abs(trendPct).toFixed(1)}%
            </span>
          )}
        </div>

        {/* Flujo del mes: ingresos vs gastos (igual en ambos modos). Los puntos
            usan el color de las barras del modo línea (lima = ingreso, rojo = gasto). */}
        <div className="flex flex-wrap items-center gap-x-md gap-y-xs mt-sm">
          <span className="inline-flex items-baseline gap-xs">
            <span className="inline-flex items-center gap-[4px] font-mono-data text-mono-data text-text-muted uppercase">
              <span className="w-2 h-2 rounded-full bg-tertiary shrink-0" />
              {t('dashboard.income')}
            </span>
            <span className="font-headline-md text-[13px] tracking-tight tabular-nums text-tertiary whitespace-nowrap">
              +<CountUp value={head.income} format={fmt} duration={240} />
            </span>
          </span>
          <span className="inline-flex items-baseline gap-xs">
            <span className="inline-flex items-center gap-[4px] font-mono-data text-mono-data text-text-muted uppercase">
              <span className="w-2 h-2 rounded-full bg-accent-error shrink-0" />
              {t('dashboard.expenses')}
            </span>
            <span className="font-headline-md text-[13px] tracking-tight tabular-nums text-accent-error whitespace-nowrap">
              −<CountUp value={head.expense} format={fmt} duration={240} />
            </span>
          </span>
        </div>

        {/* Patrimonio: ahorro · tarjetas por pagar · mi dinero total (resultado). */}
        <div className="flex flex-wrap items-center gap-x-md gap-y-xs mt-sm pt-sm border-t border-border-subtle">
          <span className="inline-flex items-baseline gap-xs">
            <span className="font-mono-data text-mono-data text-text-muted uppercase">{t('dashboard.savedTotal')}</span>
            <span className="font-headline-md text-[13px] tracking-tight tabular-nums text-secondary whitespace-nowrap">
              <CountUp value={head.savings} format={fmt} duration={240} />
            </span>
          </span>
          {head.cardsDue > 0 && (
            <span className="inline-flex items-baseline gap-xs">
              <span className="inline-flex items-center gap-[3px] font-mono-data text-mono-data text-accent-warning uppercase">
                {t('dashboard.creditCardsPayable')}
                <InfoTip text={t('dashboard.creditCardsPayableInfo')} />
              </span>
              <span className="font-headline-md text-[13px] tracking-tight tabular-nums text-accent-warning whitespace-nowrap">
                −<CountUp value={head.cardsDue} format={fmt} duration={240} />
              </span>
            </span>
          )}
          <span className="inline-flex items-baseline gap-xs">
            <span className="inline-flex items-center gap-[3px] font-mono-data text-mono-data text-on-surface-variant uppercase font-medium">
              {t('dashboard.myMoneyTotal')}
              <InfoTip text={t('dashboard.myMoneyTotalInfo')} />
            </span>
            <span className="font-headline-md text-[15px] tracking-tight tabular-nums text-primary whitespace-nowrap">
              <CountUp value={head.wealth} format={fmt} duration={240} />
            </span>
          </span>
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
            barCategoryGap={bars ? '28%' : '55%'}
            onClick={handleClick}
            onMouseMove={(s) => setHoverIdx(s?.activeTooltipIndex ?? null)}
            onMouseLeave={() => setHoverIdx(null)}
            style={{ cursor: onBarClick ? 'pointer' : 'default' }}
          >
            <defs>
              <linearGradient id="wealthFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={trendColor} stopOpacity={0.34} />
                <stop offset="55%" stopColor={trendColor} stopOpacity={0.08} />
                <stop offset="100%" stopColor={trendColor} stopOpacity={0} />
              </linearGradient>
              {/* Degradado sutil de la barra activa: un poco de brillo arriba que
                  se atenúa abajo, para dar profundidad sin ensuciar el dato. */}
              <linearGradient id="barActive" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={CHART.tertiary} stopOpacity={1} />
                <stop offset="100%" stopColor={CHART.tertiary} stopOpacity={0.7} />
              </linearGradient>
            </defs>

            <XAxis dataKey="label" tick={{ fill: CHART.muted, fontSize: 10 }} axisLine={false} tickLine={false} interval="preserveStartEnd" minTickGap={24} />

            {/* Recharts localiza sus componentes recorriendo los hijos DIRECTOS del
                chart; por eso cada elemento va como hijo condicional suelto (nada de
                fragmentos ni arreglos anidados, que no siempre detecta). */}

            {/* ── Modo barras: patrimonio neto por mes ────────────────────────────
                Eje con el 0 como base (el patrimonio puede ser negativo → la barra
                crece hacia abajo). El mes activo va sólido (verde si positivo, rojo
                si negativo); el resto, tenues, como el hero de Whisper. */}
            {bars && <YAxis yAxisId="w" hide domain={[(min) => Math.min(0, min), (max) => Math.max(0, max)]} />}
            {/* Tooltip tipo píldora (estilo Whisper): al pasar sobre una barra
                muestra el mes y su patrimonio, con un punto del color de la barra. */}
            {bars && <Tooltip isAnimationActive={false} cursor={{ fill: CHART.outline, fillOpacity: 0.08 }} content={<HeroTip fmt={fmt} valueKey="wealth" />} />}
            {bars && (
              <Bar yAxisId="w" dataKey="wealth" radius={[4, 4, 0, 0]} isAnimationActive={!reduced} animationDuration={600} animationEasing="ease-out">
                {data.map((d) => {
                  const active = keyOf(d) === activeKey;
                  // Activa: degradado (positivo) o rojo (negativo). Inactiva: tenue.
                  const fill = active ? (d.wealth < 0 ? CHART.error : 'url(#barActive)') : CHART.muted;
                  return <Cell key={keyOf(d)} fill={fill} fillOpacity={active ? 1 : 0.14} />;
                })}
              </Bar>
            )}

            {/* ── Modo línea: EFECTIVO disponible, estética de app financiera ─────
                Área limpia (sin barras de flujo — esa info ya está en el
                encabezado): línea suave y gruesa con degradado que se desvanece,
                crosshair punteado y un punto final con halo que marca el valor de
                HOY. El tooltip píldora muestra el efectivo del mes enfocado. */}
            {!bars && <YAxis yAxisId="cash" hide domain={['dataMin', 'dataMax']} />}
            {!bars && <Tooltip isAnimationActive={false} cursor={{ stroke: CHART.outline, strokeWidth: 1, strokeDasharray: '4 4' }} content={<HeroTip fmt={fmt} valueKey="cash" accent={trendColor} />} />}
            {!bars && (
              <Area
                yAxisId="cash"
                type="monotone"
                dataKey="cash"
                stroke={trendColor}
                strokeWidth={2.75}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="url(#wealthFill)"
                dot={<EndDot lastIndex={data.length - 1} color={trendColor} />}
                activeDot={{ r: 5, fill: trendColor, stroke: CHART.surface, strokeWidth: 2 }}
                isAnimationActive={!reduced}
                animationDuration={800}
                animationEasing="ease-out"
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
