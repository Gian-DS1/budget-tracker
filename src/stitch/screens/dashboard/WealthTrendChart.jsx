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
import MS from '../../MS';
import { InfoTip } from '../../InfoTip';

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
  const first = data[0].cash;
  const last = data[data.length - 1].cash;
  const up = last >= first;
  const lineColor = up ? CHART.secondary : CHART.error;
  // Variación % del efectivo en el periodo, para el chip de tendencia. Separa la
  // dirección (color) del monto (que se muestra en neutro, no como alerta).
  const trendPct = first !== 0 ? ((last - first) / Math.abs(first)) * 100 : 0;
  // Sin base (first === 0) el % no tiene sentido: se oculta el chip en vez de
  // mostrar un "+0.0%" engañoso.
  const showTrend = data.length > 1 && first !== 0 && first !== last;

  // Clic en cualquier parte de una columna (mes) → fija ese mes como activo.
  const handleClick = (state) => {
    if (!onBarClick || !state || state.activeTooltipIndex == null) return;
    const d = data[state.activeTooltipIndex];
    if (d) onBarClick(d);
  };

  return (
    <div className="flex flex-col h-72 sm:h-64">
      {/* Hero: EFECTIVO DISPONIBLE del punto enfocado, en grande y NEUTRO (el color
          por tendencia migró a un chip aparte, para que el número no se lea como
          alerta). Debajo, dos bloques rotulados: FLUJO DEL MES (ingresos vs gastos,
          con los colores de las barras) y PATRIMONIO (ahorro · tarjetas por pagar ·
          mi dinero total). Cada término confuso lleva un ⓘ que explica de dónde
          sale. flex-wrap: en móvil los pares bajan de línea sin chocar. */}
      <div className="mb-sm">
        <div className="flex items-center justify-between gap-sm">
          <span className="flex items-baseline gap-xs font-mono-data text-mono-data text-text-muted uppercase min-w-0">
            <span className="inline-flex items-center gap-[3px] shrink-0">
              {t('dashboard.liquidCash')}
              <InfoTip text={t('dashboard.liquidCashInfo')} />
            </span>
            {scrubbing && <span className="text-primary whitespace-nowrap">· {head.label} {head.y}</span>}
          </span>
          {showTrend && (
            <span
              className="inline-flex items-center gap-[2px] font-mono-data text-mono-data tabular-nums whitespace-nowrap shrink-0"
              style={{ color: lineColor }}
            >
              <MS name={up ? 'trending_up' : 'trending_down'} className="!text-[13px]" />
              {up ? '+' : '−'}{Math.abs(trendPct).toFixed(1)}%
            </span>
          )}
        </div>
        <div className="font-headline-md text-[28px] sm:text-[30px] tracking-tight tabular-nums whitespace-nowrap mt-xs text-on-surface">
          <CountUp value={head.cash} format={fmt} duration={240} />
        </div>

        {/* Flujo del mes: ingresos vs gastos. Los puntos usan el color de las
            barras del gráfico (lima = ingreso, rojo = gasto) para que el usuario
            asocie de un vistazo qué barra es cuál. */}
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

        {/* Patrimonio: cómo se llega a "Mi dinero total" = efectivo + ahorro −
            tarjetas por pagar. El total va resaltado (periwinkle) como resultado. */}
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
