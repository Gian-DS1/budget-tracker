// Hero del Resumen: el "camino del dinero en el tiempo" como LÍNEA única
// (diseño Stitch · Varvez_Esquema/Dashboard, adaptado al tema): línea suave del
// color primario con degradado que se desvanece hacia abajo, crosshair punteado,
// tooltip píldora al hover y punto final con halo (valor de HOY). Scrubbing: el
// cursor actualiza el encabezado; CLICK fija un punto (marcador en el gráfico y
// valores congelados en ese día/mes) y re-click en el mismo punto lo libera.
import { useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import { ResponsiveContainer, ComposedChart, Area, XAxis, YAxis, Tooltip, ReferenceLine, ReferenceDot } from 'recharts';
import { formatCurrency } from '../../../utils/formatters';
import { useI18n } from '../../../contexts/I18nContext';
import { CHART } from '../../chartTokens';
import CountUp from '../../CountUp';
import MS from '../../MS';
import { InfoTip } from '../../InfoTip';
import { getHeroMetric, pickHeadPoint } from './selectors';

const fmt = (n) => formatCurrency(n);

// Píldora de tooltip del hero (estilo Whisper). Recharts inyecta { active,
// payload }; muestra la fecha del punto y su patrimonio con un punto primario.
function HeroTip({ active, payload, fmt }) {
  if (!active || !payload || !payload.length) return null;
  const d = payload[0].payload;
  return (
    <div className="pointer-events-none rounded-full bg-surface-card border border-border-subtle inner-glow shadow-xl px-sm py-[5px] flex items-center gap-xs whitespace-nowrap">
      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: CHART.primary }} />
      <span className="font-mono-data text-mono-data text-text-muted uppercase">{d.label} {d.y}</span>
      <span className="font-headline-md text-[12px] tabular-nums text-on-surface">{fmt(d.wealth)}</span>
    </div>
  );
}

// Punto final con halo: marca el valor de HOY (último punto). Recharts inyecta
// cx, cy, index por punto; solo pinta el último (línea limpia sin puntos).
function EndDot({ cx, cy, index, lastIndex, color }) {
  if (index !== lastIndex || cx == null || cy == null) return null;
  return (
    <g>
      <circle cx={cx} cy={cy} r={7} fill={color} fillOpacity={0.18} />
      <circle cx={cx} cy={cy} r={3.5} fill={color} stroke={CHART.surface} strokeWidth={2} />
    </g>
  );
}

export default function WealthTrendChart({ data, selectedKey, onSelect }) {
  const { t } = useI18n();
  const reduced = useReducedMotion();
  // Índice del punto bajo el cursor (scrubbing). null = en reposo.
  const [hoverIdx, setHoverIdx] = useState(null);
  const hasData = data.some((d) => d.income !== 0 || d.expense !== 0 || d.wealth !== 0 || d.cash !== 0);
  if (!hasData) {
    return <p className="font-body-md text-body-md text-text-muted py-xl text-center">{t('screens.reports.noMovementsPeriod')}</p>;
  }

  const metric = getHeroMetric();
  // Punto fijado con click, si sigue existiendo en la serie (al cambiar de rango
  // o granularidad la clave puede no estar: el marcador simplemente no se pinta).
  const selPoint = selectedKey != null ? data.find((p) => p.key === selectedKey) : null;
  // Encabezado: hover (scrubbing) > punto fijado > último punto (hoy).
  const scrubbing = hoverIdx != null && data[hoverIdx];
  const head = pickHeadPoint(data, hoverIdx, selectedKey);

  // Tendencia del periodo: subió si el último valor ≥ el primero. Separa la
  // dirección (color del chip) del monto (neutro, no alerta).
  const first = data[0][metric.key];
  const last = data[data.length - 1][metric.key];
  const up = last >= first;
  const trendColor = up ? CHART.secondary : CHART.error;
  const trendPct = first !== 0 ? ((last - first) / Math.abs(first)) * 100 : 0;
  const showTrend = data.length > 1 && first !== 0 && first !== last;

  // Clic en cualquier punto del tiempo → lo fija (o lo libera, decide el padre).
  const handleClick = (state) => {
    if (!onSelect || !state || state.activeTooltipIndex == null) return;
    const d = data[state.activeTooltipIndex];
    if (d) onSelect(d);
  };

  return (
    // Hero a todo el ancho: alto amplio para que la línea sea la protagonista.
    // El encabezado ocupa lo justo; el resto es gráfico (flex-grow + Responsive).
    <div className="flex flex-col h-[26rem] sm:h-[30rem]">
      <div className="mb-sm">
        {/* Rótulo de la métrica (izq) + chip del punto fijado (der). */}
        <div className="flex items-center justify-between gap-sm">
          <span className="flex items-baseline gap-xs font-mono-data text-mono-data text-text-muted uppercase min-w-0">
            <span className="inline-flex items-center gap-[3px] shrink-0">
              {t(metric.labelKey)}
              <InfoTip text={t(metric.infoKey)} />
            </span>
            {(scrubbing || selPoint) && <span className="text-primary whitespace-nowrap">· {head.label} {head.y}</span>}
          </span>
          {selPoint && (
            <button
              type="button"
              onClick={() => onSelect(selPoint)}
              aria-label={t('dashboard.clearSelection')}
              className="inline-flex items-center gap-[3px] px-sm py-[3px] rounded-full border border-primary/40 bg-primary/10 font-mono-data text-mono-data text-primary uppercase tracking-widest transition-colors hover:bg-primary/20 shrink-0"
            >
              <MS name="push_pin" className="!text-[12px]" />
              {selPoint.label} {selPoint.y}
              <MS name="close" className="!text-[12px]" />
            </button>
          )}
        </div>

        {/* Número grande de la métrica (neutro) + chip de tendencia inline. */}
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

        {/* Flujo del mes hasta el punto activo: ingresos vs gastos (month-to-date
            en granularidad diaria; total del mes en mensual). */}
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

      {/* El clic en el SVG no debe dibujar el focus ring del navegador alrededor
          del gráfico. Se suprime el outline SOLO en foco por puntero
          (:focus:not(:focus-visible)); la navegación por teclado conserva el suyo. */}
      <div className="flex-grow min-h-0 [&_*:focus:not(:focus-visible)]:outline-none">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={data}
            margin={{ top: 6, right: 4, bottom: 0, left: 4 }}
            onClick={handleClick}
            onMouseMove={(s) => setHoverIdx(s?.activeTooltipIndex ?? null)}
            onMouseLeave={() => setHoverIdx(null)}
            style={{ cursor: onSelect ? 'pointer' : 'default' }}
          >
            <defs>
              {/* Degradado del área (estilo Stitch): primario que se desvanece
                  hacia abajo — brillo arriba, transparente al llegar al piso. */}
              <linearGradient id="wealthFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={CHART.primaryDeep} stopOpacity={0.32} />
                <stop offset="55%" stopColor={CHART.primaryDeep} stopOpacity={0.08} />
                <stop offset="100%" stopColor={CHART.primaryDeep} stopOpacity={0} />
              </linearGradient>
            </defs>

            {/* Eje por `key` (única por punto: 'YYYY-MM-DD' o 'YYYY-MM') para que
                el marcador de selección caiga en el punto exacto aunque el label
                visible ("15 mar") se repita entre años. */}
            <XAxis
              dataKey="key"
              tick={{ fill: CHART.muted, fontSize: 10 }}
              tickFormatter={(k) => {
                const p = data.find((pt) => pt.key === k);
                return p ? p.label : k;
              }}
              axisLine={false}
              tickLine={false}
              interval="preserveStartEnd"
              minTickGap={48}
            />
            <YAxis yAxisId="w" hide domain={['dataMin', 'dataMax']} />
            <Tooltip
              isAnimationActive={false}
              cursor={{ stroke: CHART.outline, strokeWidth: 1, strokeDasharray: '4 4' }}
              content={<HeroTip fmt={fmt} />}
            />
            <Area
              yAxisId="w"
              type="monotone"
              dataKey="wealth"
              stroke={CHART.primary}
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="url(#wealthFill)"
              dot={<EndDot lastIndex={data.length - 1} color={CHART.primary} />}
              activeDot={{ r: 5, fill: CHART.primary, stroke: CHART.surface, strokeWidth: 2 }}
              isAnimationActive={!reduced}
              animationDuration={800}
              animationEasing="ease-out"
            />
            {/* Marcador del punto FIJADO: guía vertical + punto sólido. */}
            {selPoint && (
              <ReferenceLine yAxisId="w" x={selPoint.key} stroke={CHART.primary} strokeDasharray="3 3" strokeOpacity={0.55} />
            )}
            {selPoint && (
              <ReferenceDot yAxisId="w" x={selPoint.key} y={selPoint.wealth} r={5} fill={CHART.primary} stroke={CHART.surface} strokeWidth={2} />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
