// Hero del Resumen: el "camino del dinero en el tiempo" como LÍNEA única
// (diseño Stitch · Varvez_Esquema/Dashboard, adaptado al tema): línea suave del
// color primario con degradado que se desvanece hacia abajo, crosshair punteado,
// tooltip píldora al hover y punto final con halo (valor de HOY). Scrubbing: el
// cursor actualiza el encabezado; CLICK fija un punto (marcador en el gráfico y
// valores congelados en ese día/mes) y re-click en el mismo punto lo libera.
// Las INTERACCIONES son instantáneas (sin count-ups; scrubbing/click en el
// mismo frame). Solo hay dos momentos orquestados, ambos en GPU y con
// prefers-reduced-motion respetado (principios de emil-design-eng):
//  · Entrada: barrido revelador izquierda→derecha (clip-path, 500ms, una vez).
//  · Cambio de rango: "refoco" blur 3px→0 + opacity (200ms) vía WAAPI.
import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import { ResponsiveContainer, ComposedChart, Area, XAxis, YAxis, Tooltip, ReferenceLine, ReferenceDot } from 'recharts';
import { formatCurrency } from '../../../utils/formatters';
import { useI18n } from '../../../contexts/I18nContext';
import { CHART } from '../../chartTokens';
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

  // Los dos momentos de motion del gráfico, ambos por WAAPI sobre el wrapper
  // (GPU, interrumpible, sin estado extra — recomendación de emil-design-eng):
  //  · PRIMERA serie (montaje): barrido revelador izquierda→derecha con
  //    clip-path — el "camino del dinero" se descubre del pasado a hoy.
  //  · Series SIGUIENTES (cambio de rango 3M/1A/TODO): la línea nueva entra
  //    desenfocada y "reenfoca" (blur 3px→0 + opacity) en 200ms; clicks
  //    rápidos entre rangos solo reinician el blur, nunca traban.
  // Con reduced-motion no hay movimiento: la serie aparece directa.
  const frameRef = useRef(null);
  const isFirstSeriesRef = useRef(true);
  const mountedAtRef = useRef(0);
  useLayoutEffect(() => {
    const el = frameRef.current;
    const isFirst = isFirstSeriesRef.current;
    isFirstSeriesRef.current = false;
    if (!el || reduced) return;
    if (isFirst) {
      mountedAtRef.current = performance.now();
      el.animate(
        [{ clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0 0 0)' }],
        { duration: 500, easing: 'cubic-bezier(0.23, 1, 0.32, 1)' },
      );
    } else {
      // La hidratación de los stores recomputa la serie justo tras el montaje;
      // eso pertenece a la ENTRADA (el barrido sigue corriendo), no a un cambio
      // de rango: sin refoco durante esa ventana para no ensuciar el barrido.
      if (performance.now() - mountedAtRef.current < 600) return;
      el.animate(
        [{ filter: 'blur(3px)', opacity: 0.7 }, { filter: 'blur(0px)', opacity: 1 }],
        { duration: 200, easing: 'ease' },
      );
    }
  }, [data, reduced]);

  // Punto fijado con click, si sigue existiendo en la serie (al cambiar de rango
  // o granularidad la clave puede no estar: el marcador simplemente no se pinta).
  const selPoint = selectedKey != null ? data.find((p) => p.key === selectedKey) : null;

  // Lookup clave→label del eje X: O(1) por tick en vez de recorrer la serie.
  const labelByKey = useMemo(() => new Map(data.map((p) => [p.key, p.label])), [data]);

  // Clic en cualquier punto del tiempo → lo fija (o lo libera, decide el padre).
  const handleClick = useCallback((state) => {
    if (!onSelect || !state || state.activeTooltipIndex == null) return;
    const d = data[state.activeTooltipIndex];
    if (d) onSelect(d);
  }, [data, onSelect]);
  const handleMove = useCallback((s) => setHoverIdx(s?.activeTooltipIndex ?? null), []);
  const handleLeave = useCallback(() => setHoverIdx(null), []);

  // El subárbol de recharts va memoizado y SIN animaciones: no depende del hover,
  // así el scrubbing re-renderiza solo el encabezado (texto) y no los cientos de
  // puntos del SVG — recharts mueve tooltip/crosshair/activeDot por su cuenta.
  // La línea aparece y cambia de rango en el mismo frame (nada de barridos).
  const chartEl = useMemo(() => (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart
        data={data}
        margin={{ top: 6, right: 4, bottom: 0, left: 4 }}
        onClick={handleClick}
        onMouseMove={handleMove}
        onMouseLeave={handleLeave}
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
          tickFormatter={(k) => labelByKey.get(k) ?? k}
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
          isAnimationActive={false}
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
  ), [data, selPoint, onSelect, handleClick, handleMove, handleLeave, labelByKey]);

  const hasData = data.some((d) => d.income !== 0 || d.expense !== 0 || d.wealth !== 0 || d.cash !== 0);
  if (!hasData) {
    return <p className="font-body-md text-body-md text-text-muted py-xl text-center">{t('screens.reports.noMovementsPeriod')}</p>;
  }

  const metric = getHeroMetric();
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

        {/* Número grande de la métrica (neutro) + chip de tendencia inline.
            Texto directo (sin count-up): el valor cambia en el mismo frame que
            el cursor — el scrubbing se siente pegado a la mano. */}
        <div className="flex items-baseline gap-sm mt-xs flex-wrap">
          <span className="font-headline-md text-[28px] sm:text-[30px] tracking-tight tabular-nums whitespace-nowrap text-on-surface">
            {fmt(head[metric.key])}
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
              +{fmt(head.income)}
            </span>
          </span>
          <span className="inline-flex items-baseline gap-xs">
            <span className="inline-flex items-center gap-[4px] font-mono-data text-mono-data text-text-muted uppercase">
              <span className="w-2 h-2 rounded-full bg-accent-error shrink-0" />
              {t('dashboard.expenses')}
            </span>
            <span className="font-headline-md text-[13px] tracking-tight tabular-nums text-accent-error whitespace-nowrap">
              −{fmt(head.expense)}
            </span>
          </span>
        </div>

        {/* Patrimonio: ahorro · tarjetas por pagar · mi dinero total (resultado). */}
        <div className="flex flex-wrap items-center gap-x-md gap-y-xs mt-sm pt-sm border-t border-border-subtle">
          <span className="inline-flex items-baseline gap-xs">
            <span className="font-mono-data text-mono-data text-text-muted uppercase">{t('dashboard.savedTotal')}</span>
            <span className="font-headline-md text-[13px] tracking-tight tabular-nums text-secondary whitespace-nowrap">
              {fmt(head.savings)}
            </span>
          </span>
          {head.cardsDue > 0 && (
            <span className="inline-flex items-baseline gap-xs">
              <span className="inline-flex items-center gap-[3px] font-mono-data text-mono-data text-accent-warning uppercase">
                {t('dashboard.creditCardsPayable')}
                <InfoTip text={t('dashboard.creditCardsPayableInfo')} />
              </span>
              <span className="font-headline-md text-[13px] tracking-tight tabular-nums text-accent-warning whitespace-nowrap">
                −{fmt(head.cardsDue)}
              </span>
            </span>
          )}
          <span className="inline-flex items-baseline gap-xs">
            <span className="inline-flex items-center gap-[3px] font-mono-data text-mono-data text-on-surface-variant uppercase font-medium">
              {t('dashboard.myMoneyTotal')}
              <InfoTip text={t('dashboard.myMoneyTotalInfo')} />
            </span>
            <span className="font-headline-md text-[15px] tracking-tight tabular-nums text-primary whitespace-nowrap">
              {fmt(head.wealth)}
            </span>
          </span>
        </div>
      </div>

      {/* El clic en el SVG no debe dibujar el focus ring del navegador alrededor
          del gráfico. Se suprime el outline SOLO en foco por puntero
          (:focus:not(:focus-visible)); la navegación por teclado conserva el suyo.
          El wrapper también es el lienzo de los dos momentos de motion: el
          barrido de entrada (clip-path) y el refoco al cambiar de rango (WAAPI). */}
      <div ref={frameRef} className="flex-grow min-h-0 [&_*:focus:not(:focus-visible)]:outline-none">
        {chartEl}
      </div>
    </div>
  );
}
