// Flujo 6 meses — dos líneas (ingresos vs gastos) en el tiempo, con eje Y de
// escala, leyenda, y el mes seleccionado RESALTADO (línea de referencia + punto
// grande) para conectar con los KPIs de arriba. Gradiente sutil bajo cada línea.
// Mismo lenguaje visual del tema; tooltip con ingresos/gastos/neto.
import { ResponsiveContainer, ComposedChart, Area, Line, XAxis, YAxis, Tooltip, ReferenceLine } from 'recharts';
import { formatCurrency, formatCurrencyCompact } from '../../../utils/formatters';
import { EmptyCell } from './dashboardUi';
import { CHART } from '../../chartTokens';

const fmt = (n) => formatCurrency(n);
const INC = CHART.tertiary;
const EXP = CHART.error;

function FlowTip({ active, payload }) {
  if (!active || !payload || !payload.length) return null;
  const d = payload[0].payload;
  const net = d.inc - d.exp;
  return (
    <div className="bg-surface-card border border-border-subtle rounded p-sm inner-glow">
      <div className="font-mono-data text-mono-data text-on-surface uppercase mb-xs">{d.label} {d.y}</div>
      <div className="font-mono-data text-mono-data text-tertiary">Ingresos {fmt(d.inc)}</div>
      <div className="font-mono-data text-mono-data text-accent-error">Gastos {fmt(d.exp)}</div>
      <div className={`font-mono-data text-mono-data ${net >= 0 ? 'text-on-surface' : 'text-accent-error'} mt-xs pt-xs border-t border-border-subtle`}>
        Balance {net >= 0 ? '+' : '−'}{fmt(Math.abs(net))}
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
  const hasData = series.some((s) => s.inc !== 0 || s.exp !== 0);
  if (!hasData) return <EmptyCell icon="show_chart" message="Aún sin movimientos para graficar." />;

  const selPoint = series.find((s) => s.y === selY && s.m === selM);
  const selEmpty = selPoint && selPoint.inc === 0 && selPoint.exp === 0;
  const selLabel = selPoint ? `${selPoint.label} ${selPoint.y}` : '';

  return (
    <div className="flex-grow flex flex-col min-h-[240px]">
      {/* Leyenda + contexto */}
      <div className="flex items-center justify-between gap-sm mb-sm">
        <div className="flex items-center gap-md">
          <span className="flex items-center gap-xs font-mono-data text-mono-data text-text-muted uppercase">
            <span className="w-2.5 h-0.5 rounded-full" style={{ background: INC }} /> Ingresos
          </span>
          <span className="flex items-center gap-xs font-mono-data text-mono-data text-text-muted uppercase">
            <span className="w-2.5 h-0.5 rounded-full" style={{ background: EXP }} /> Gastos
          </span>
        </div>
        <span className="font-mono-data text-mono-data text-text-muted uppercase">Últimos 6 meses</span>
      </div>

      <div className="flex-grow min-h-[190px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={series} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="flowInc" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={INC} stopOpacity={0.18} />
                <stop offset="100%" stopColor={INC} stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="label" tick={{ fill: CHART.muted, fontSize: 10 }} axisLine={{ stroke: CHART.border }} tickLine={false} />
            <YAxis
              tick={{ fill: CHART.muted, fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              width={48}
              tickFormatter={(v) => formatCurrencyCompact(v).replace('RD$', '').trim()}
            />
            {/* Mes seleccionado: línea vertical de referencia */}
            {selPoint && (
              <ReferenceLine x={selPoint.label} stroke={CHART.outline} strokeDasharray="3 3" />
            )}
            <Tooltip content={<FlowTip />} isAnimationActive={false} cursor={{ stroke: CHART.outline, strokeWidth: 1 }} />
            {/* Área sutil bajo ingresos para dar cuerpo */}
            <Area type="monotone" dataKey="inc" stroke="none" fill="url(#flowInc)" isAnimationActive={false} />
            {/* Líneas: ingresos (lima) y gastos (rojo) */}
            <Line type="monotone" dataKey="inc" stroke={INC} strokeWidth={2} dot={makeSelDot(selY, selM, INC)} activeDot={{ r: 4, fill: INC, stroke: CHART.surface, strokeWidth: 1.5 }} isAnimationActive animationDuration={600} animationEasing="ease-out" />
            <Line type="monotone" dataKey="exp" stroke={EXP} strokeWidth={2} dot={makeSelDot(selY, selM, EXP)} activeDot={{ r: 4, fill: EXP, stroke: CHART.surface, strokeWidth: 1.5 }} isAnimationActive animationDuration={600} animationEasing="ease-out" />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {selEmpty && (
        <span className="font-mono-data text-mono-data text-text-muted normal-case tracking-normal mt-sm">
          Sin movimientos en {selLabel}. La curva muestra tus meses anteriores.
        </span>
      )}
    </div>
  );
}
