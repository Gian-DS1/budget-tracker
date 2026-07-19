// Hero del Resumen: el "camino del dinero en el tiempo" como LÍNEA única
// (diseño "Pinging Dot Chart" de 21st.dev, adaptado al tema Stitch): línea
// DISCONTINUA (4 4) del color tertiary sobre grid horizontal sutil, crosshair
// punteado, tooltip píldora al hover y punto final con PING (anillo que se
// expande y se desvanece en bucle: el valor de HOY está "vivo"). Scrubbing: el
// cursor actualiza el encabezado; CLICK fija un punto (marcador en el gráfico y
// valores congelados en ese día/mes) y re-click en el mismo punto lo libera.
// Las INTERACCIONES son instantáneas (sin count-ups; scrubbing/click en el
// mismo frame). Momentos de motion, en GPU/SMIL y con prefers-reduced-motion
// respetado (principios de emil-design-eng):
//  · Entrada: barrido revelador izquierda→derecha (clip-path, una vez).
//  · Cambio de rango: la línea RECORRE su camino — el trazo se dibuja de
//    izquierda a derecha y el punto de HOY aparece cuando la línea llega.
//  · Ping de HOY: anillo infinito en el último punto (SMIL declarativo; con
//    reduced-motion se sustituye por el halo estático).
import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import { ResponsiveContainer, ComposedChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, ReferenceLine, ReferenceDot } from 'recharts';
import { formatCurrency } from '../../../utils/formatters';
import { useI18n } from '../../../contexts/I18nContext';
import { CHART } from '../../chartTokens';
import MS from '../../MS';
import { InfoTip } from '../../InfoTip';
import { getHeroMetric, pickHeadPoint, getWealthYDomain } from './selectors';

const fmt = (n) => formatCurrency(n);

// Píldora de tooltip del hero (estilo Whisper). Recharts inyecta { active,
// payload }; muestra la fecha del punto y su patrimonio con un punto primario.
function HeroTip({ active, payload, fmt }) {
  if (!active || !payload || !payload.length) return null;
  const d = payload[0].payload;
  return (
    <div className="pointer-events-none rounded-full bg-surface-card border border-border-subtle inner-glow shadow-xl px-sm py-[5px] flex items-center gap-xs whitespace-nowrap">
      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: CHART.tertiary }} />
      <span className="font-mono-data text-mono-data text-text-muted uppercase">{d.label} {d.y}</span>
      <span className="font-headline-md text-[12px] tabular-nums text-on-surface">{fmt(d.wealth)}</span>
    </div>
  );
}

// Punto final con PING (diseño 21st.dev "Pinging Dot"): marca el valor de HOY
// (último punto) con un anillo que se expande y desvanece en bucle — SMIL
// declarativo, cero re-renders. Recharts inyecta cx, cy, index por punto; solo
// pinta el último (línea limpia sin puntos). En el demo original el ping vive
// en cada punto; aquí solo en HOY: con series diarias (~90 puntos) sería ruido.
// Con reduced-motion el anillo no anima: vuelve al halo estático.
function PingDot({ cx, cy, index, lastIndex, color, reduced }) {
  if (index !== lastIndex || cx == null || cy == null) return null;
  return (
    <g>
      {reduced ? (
        <circle cx={cx} cy={cy} r={7} fill={color} fillOpacity={0.18} />
      ) : (
        <circle cx={cx} cy={cy} r={4} stroke={color} fill="none" strokeWidth={1.5} opacity={0.8}>
          <animate attributeName="r" values="4;14" dur="1.5s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.8;0" dur="1.5s" repeatCount="indefinite" />
        </circle>
      )}
      <circle cx={cx} cy={cy} r={3.5} fill={color} stroke={CHART.surface} strokeWidth={2} />
    </g>
  );
}

export default function WealthTrendChart({ data, selectedKey, onSelect }) {
  const { t } = useI18n();
  const reduced = useReducedMotion();
  // Índice del punto bajo el cursor (scrubbing). null = en reposo.
  const [hoverIdx, setHoverIdx] = useState(null);

  // El gráfico se "dibuja recorriendo su camino": un frente de revelado avanza de
  // izquierda a derecha (clip-path inset sobre el wrapper) y la línea punteada
  // va apareciendo a su paso, del pasado hacia hoy. Es el mismo efecto
  // que la animación nativa de recharts pero sobre NUESTRO div: recharts sustituye
  // su <path> tras cada commit (queda huérfano si lo animamos directo), mientras
  // el wrapper es estable → GPU, interrumpible y sin re-renders (emil-design-eng).
  //  · Montaje: dibujado de entrada.
  //  · Cambio de rango (3M/1A/TODO): se vuelve a dibujar la nueva serie.
  // Con reduced-motion no hay movimiento: la serie aparece directa.
  const frameRef = useRef(null);
  const isFirstSeriesRef = useRef(true);
  const mountedAtRef = useRef(0);
  const drawRef = useRef(null);
  useLayoutEffect(() => {
    const el = frameRef.current;
    const isFirst = isFirstSeriesRef.current;
    isFirstSeriesRef.current = false;
    if (!el || reduced) return;

    // La hidratación de los stores recomputa la serie justo tras el montaje: eso
    // sigue siendo la ENTRADA (el dibujado ya está corriendo), no un cambio de
    // rango, así que no se relanza durante esa ventana para no reiniciar el trazo.
    if (isFirst) mountedAtRef.current = performance.now();
    else if (performance.now() - mountedAtRef.current < 600) return;

    // Clicks rápidos entre rangos: reinician el dibujado desde el borde izquierdo
    // (interrumpible), nunca se acumulan ni traban.
    if (drawRef.current) drawRef.current.cancel();
    drawRef.current = el.animate(
      [{ clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0 0 0)' }],
      { duration: isFirst ? 1000 : 1200, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' },
    );
  }, [data, reduced]);

  // Punto fijado con click, si sigue existiendo en la serie (al cambiar de rango
  // o granularidad la clave puede no estar: el marcador simplemente no se pinta).
  const selPoint = selectedKey != null ? data.find((p) => p.key === selectedKey) : null;

  // Lookup clave→label del eje X: O(1) por tick en vez de recorrer la serie.
  const labelByKey = useMemo(() => new Map(data.map((p) => [p.key, p.label])), [data]);

  // Dominio vertical con aire arriba/abajo: el pico no toca el borde ni se corta
  // aunque la línea suba mucho. Se recalcula al cambiar la serie (rango/datos).
  const wealthDomain = useMemo(() => getWealthYDomain(data), [data]);

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
        // right 16: el anillo del ping (r máx 14 + trazo) vive en el ÚLTIMO
        // punto, pegado al borde derecho; el SVG recorta (overflow hidden) y
        // sin esta reserva el anillo saldría cortado. Arriba/abajo el aire lo
        // da el dominio (WEALTH_Y_PAD_*: 12% simétrico — HOY puede ser pico o valle).
        margin={{ top: 6, right: 16, bottom: 0, left: 4 }}
        onClick={handleClick}
        onMouseMove={handleMove}
        onMouseLeave={handleLeave}
        style={{ cursor: onSelect ? 'pointer' : 'default' }}
      >
        {/* Grid horizontal sutil (diseño 21st.dev): referencias de altura
            recesivas, sin líneas verticales que compitan con la línea. El eje Y
            oculto con dominio custom solo emite 2 ticks (los bordes), así que
            las coordenadas se generan a mano: 4 líneas interiores equiespaciadas. */}
        <CartesianGrid
          vertical={false}
          stroke={CHART.outline}
          strokeOpacity={0.22}
          horizontalCoordinatesGenerator={({ offset }) =>
            Array.from({ length: 4 }, (_, i) => offset.top + (offset.height * (i + 1)) / 5)}
        />

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
        <YAxis yAxisId="w" hide domain={wealthDomain} />
        <Tooltip
          isAnimationActive={false}
          cursor={{ stroke: CHART.outline, strokeWidth: 1, strokeDasharray: '4 4' }}
          content={<HeroTip fmt={fmt} />}
        />
        {/* Línea DISCONTINUA (4 4) tipo linear — la firma del diseño 21st.dev:
            sin relleno, el camino punteado lleva la mirada al punto que hace
            ping en HOY. */}
        <Line
          yAxisId="w"
          type="linear"
          dataKey="wealth"
          stroke={CHART.tertiary}
          strokeWidth={2}
          strokeDasharray="4 4"
          strokeLinecap="round"
          strokeLinejoin="round"
          dot={<PingDot lastIndex={data.length - 1} color={CHART.tertiary} reduced={reduced} />}
          activeDot={{ r: 5, fill: CHART.tertiary, stroke: CHART.surface, strokeWidth: 2 }}
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
  ), [data, selPoint, onSelect, handleClick, handleMove, handleLeave, labelByKey, wealthDomain, reduced]);

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
