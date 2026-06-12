// Flujo 6 meses — dos líneas (ingresos vs gastos) en el tiempo, con la BRECHA
// entre ambas sombreada: lima cuando sobró (inc > exp), rojo cuando faltó.
// Eje Y de escala, rejilla horizontal sutil, leyenda compartida y el mes
// seleccionado RESALTADO (línea de referencia + punto grande) para conectar con
// los KPIs de arriba. Tooltip con ingresos/gastos/neto.
import { useReducedMotion } from 'framer-motion';
import { ResponsiveContainer, ComposedChart, Area, Line, XAxis, YAxis, Tooltip, ReferenceLine, CartesianGrid } from 'recharts';
import { formatCurrency, formatAmountCompact } from '../../../utils/formatters';
import { EmptyCell } from './dashboardUi';
import { useScreenStrings } from '../../../i18n/useScreenStrings';
import ChartLegend from '../../ChartLegend';
import { CHART } from '../../chartTokens';

const fmt = (n) => formatCurrency(n);
const INC = CHART.tertiary;
const EXP = CHART.error;

function FlowTip({ active, payload }) {
  const strings = useScreenStrings();
  if (!active || !payload || !payload.length) return null;
  const d = payload[0].payload;
  const net = d.inc - d.exp;
  return (
    <div className="bg-surface-card border border-border-subtle rounded p-sm inner-glow">
      <div className="font-mono-data text-mono-data text-on-surface uppercase mb-xs">{d.label} {d.y}</div>
      <div className="font-mono-data text-mono-data text-tertiary">{strings.charts.income} {fmt(d.inc)}</div>
      <div className="font-mono-data text-mono-data text-accent-error">{strings.charts.expenses} {fmt(d.exp)}</div>
      <div className={`font-mono-data text-mono-data ${net >= 0 ? 'text-on-surface' : 'text-accent-error'} mt-xs pt-xs border-t border-border-subtle`}>
        {strings.charts.balance} {net >= 0 ? '+' : '−'}{fmt(Math.abs(net))}
      </div>
    </div>
  );
}

// Punto SIEMPRE visible solo en el mes seleccionado (halo + relleno). Se usa como
// `dot` (no activeDot) para que el resalte persista sin necesidad de hover.
function makeSelDot(selY, selM, color) {
  const SelDot = (props) => {
    const { cx, cy, payload } = props;
    if (cx == null || cy == null) return null;
    const isSel = payload.y === selY && payload.m === selM;
    if (!isSel) return null;
    return (
      <g style={{ pointerEvents: 'none' }}>
        <circle cx={cx} cy={cy} r={7} fill={color} fillOpacity={0.18} />
        <circle cx={cx} cy={cy} r={3.5} fill={color} stroke={CHART.surface} strokeWidth={1.5} />
      </g>
    );
  };
  return SelDot;
}

export default function FlowChart({ series, selY, selM }) {
  const strings = useScreenStrings();
  const reduced = useReducedMotion();
  const hasData = series.some((s) => s.inc !== 0 || s.exp !== 0);
  if (!hasData) return <EmptyCell icon="show_chart" message={strings.charts.noMovements} />;

  const selPoint = series.find((s) => s.y === selY && s.m === selM);
  const selEmpty = selPoint && selPoint.inc === 0 && selPoint.exp === 0;
  const selLabel = selPoint ? `${selPoint.label} ${selPoint.y}` : '';

  // Bandas de brecha como áreas de rango [low, high]: gapPos cubre los meses con
  // sobrante (inc ≥ exp) y gapNeg los meses con déficit. Donde no aplica, la
  // banda colapsa a altura cero para que el cruce de líneas se lea continuo.
  const data = series.map((s) => ({
    ...s,
    gapPos: s.inc >= s.exp ? [s.exp, s.inc] : [s.inc, s.inc],
    gapNeg: s.exp > s.inc ? [s.inc, s.exp] : [s.exp, s.exp],
  }));

  return (
    <div className="flex-grow flex flex-col min-h-[240px]">
      <ChartLegend
        items={[
          { label: strings.charts.income, color: INC },
          { label: strings.charts.expenses, color: EXP },
        ]}
        right={strings.charts.last6Months}
      />

      <div className="flex-grow min-h-[190px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid vertical={false} stroke={CHART.border} />
            <XAxis dataKey="label" tick={{ fill: CHART.muted, fontSize: 10 }} axisLine={{ stroke: CHART.border }} tickLine={false} />
            <YAxis
              tick={{ fill: CHART.muted, fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              width={48}
              tickFormatter={formatAmountCompact}
            />
            {/* Mes seleccionado: línea vertical de referencia */}
            {selPoint && (
              <ReferenceLine x={selPoint.label} stroke={CHART.outline} strokeDasharray="3 3" />
            )}
            <Tooltip content={<FlowTip />} isAnimationActive={false} cursor={{ stroke: CHART.outline, strokeWidth: 1 }} />
            {/* Brecha entre líneas: verde-lima = sobró, rojo = faltó */}
            <Area type="monotone" dataKey="gapPos" stroke="none" fill={INC} fillOpacity={0.1} activeDot={false} isAnimationActive={false} />
            <Area type="monotone" dataKey="gapNeg" stroke="none" fill={EXP} fillOpacity={0.16} activeDot={false} isAnimationActive={false} />
            {/* Líneas: ingresos (lima) y gastos (rojo) */}
            <Line type="monotone" dataKey="inc" stroke={INC} strokeWidth={2} dot={makeSelDot(selY, selM, INC)} activeDot={{ r: 4, fill: INC, stroke: CHART.surface, strokeWidth: 1.5 }} isAnimationActive={!reduced} animationDuration={600} animationEasing="ease-out" />
            <Line type="monotone" dataKey="exp" stroke={EXP} strokeWidth={2} dot={makeSelDot(selY, selM, EXP)} activeDot={{ r: 4, fill: EXP, stroke: CHART.surface, strokeWidth: 1.5 }} isAnimationActive={!reduced} animationDuration={600} animationEasing="ease-out" />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {selEmpty && (
        <span className="font-mono-data text-mono-data text-text-muted normal-case tracking-normal mt-sm">
          {strings.charts.noMovementsIn.replace('{m}', selLabel)}
        </span>
      )}
    </div>
  );
}
