// Donut de gastos del mes por categoría (top 5 + Otros). La dona ancla el
// "parte del todo" (total al centro); la comparación fina vive en la leyenda:
// cada fila es una mini barra horizontal (longitudes comparables a simple
// vista) con el emoji de la categoría. Hover/click/focus sincronizados entre
// leyenda y dona: el segmento activo crece y proyecta una sombra de su color.
import { useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import { ResponsiveContainer, PieChart, Pie, Cell, Sector } from 'recharts';
import { formatCurrency } from '../../../utils/formatters';
import { useScreenStrings } from '../../../i18n/useScreenStrings';
import { EmptyCell } from './dashboardUi';
import Emoji from '../../Emoji';

const fmt = (n) => formatCurrency(n);

// Forma activa: el sector crece hacia afuera + sombra (drop-shadow) de su color.
function ActiveSector(props) {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
  return (
    <g style={{ filter: `drop-shadow(0 0 6px ${fill}aa)` }}>
      <Sector
        cx={cx} cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius + 6}
        startAngle={startAngle} endAngle={endAngle}
        fill={fill}
        cornerRadius={3}
      />
    </g>
  );
}

export default function CategoryDonut({ data, compact = false }) {
  const strings = useScreenStrings();
  const reduced = useReducedMotion();
  const [active, setActive] = useState(-1);
  if (!data || data.length === 0) return <EmptyCell icon="donut_small" message={strings.charts.noExpensesThisMonth} />;

  const total = data.reduce((s, d) => s + d.value, 0);
  const withPct = data.map((d) => ({ ...d, pct: total > 0 ? (d.value / total) * 100 : 0 }));
  const activeName = active >= 0 ? withPct[active]?.name : null;
  // Las barras de la leyenda escalan contra la categoría mayor (no contra el
  // total): la más grande llena el riel y el resto se compara contra ella.
  const maxValue = Math.max(...withPct.map((d) => d.value));

  return (
    <div className={`flex-grow flex items-center min-h-[200px] ${compact ? 'flex-col gap-md' : 'flex-col sm:flex-row gap-xl min-h-[240px]'}`}>
      {/* Dona: en compact más chica y arriba; en normal al lado de la leyenda. */}
      <div className={`relative shrink-0 ${compact ? 'w-[150px] h-[150px]' : 'w-full sm:w-[280px] h-[240px]'}`}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={withPct}
              dataKey="value"
              nameKey="name"
              innerRadius="58%"
              outerRadius="86%"
              paddingAngle={2}
              stroke="none"
              activeIndex={active >= 0 ? active : undefined}
              activeShape={ActiveSector}
              onMouseEnter={(_, i) => setActive(i)}
              onMouseLeave={() => setActive(-1)}
              onClick={(_, i) => setActive((prev) => (prev === i ? -1 : i))}
              isAnimationActive={!reduced}
              animationDuration={600}
              animationEasing="ease-out"
            >
              {withPct.map((d, i) => (
                <Cell
                  key={i}
                  fill={d.color}
                  opacity={active === -1 || active === i ? 1 : 0.35}
                  style={{ transition: 'opacity 150ms ease-out' }}
                />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          {/* El bloque se limita al diámetro del agujero (innerRadius 58%) para
              que un nombre largo se trunque dentro y nunca choque con el anillo. */}
          <div className="flex flex-col items-center text-center leading-tight max-w-[56%]">
            <span className="font-mono-data text-[9px] text-text-muted uppercase truncate max-w-full w-full">{activeName || 'Total'}</span>
            <span className="font-headline-md text-[15px] text-on-surface tracking-tight truncate max-w-full w-full">{fmt(active >= 0 ? withPct[active].value : total)}</span>
            {active >= 0 && <span className="font-mono-data text-[10px] text-text-muted">{withPct[active].pct.toFixed(1)}%</span>}
          </div>
        </div>
      </div>

      {/* Leyenda-barra: emoji + nombre + riel proporcional + monto + %. Hover,
          click (touch) y focus (teclado) sincronizados con la dona. */}
      <div className={`flex flex-col gap-xs w-full flex-grow ${compact ? '' : 'max-w-[640px]'}`}>
        {withPct.map((d, i) => (
          <button
            type="button"
            key={i}
            onMouseEnter={() => setActive(i)}
            onMouseLeave={() => setActive(-1)}
            onFocus={() => setActive(i)}
            onBlur={() => setActive(-1)}
            onClick={() => setActive((prev) => (prev === i ? -1 : i))}
            aria-pressed={active === i}
            className={`flex items-center gap-sm font-mono-data text-mono-data rounded px-sm py-xs transition-colors text-left ${active === i ? 'bg-surface-container-high' : ''}`}
          >
            {d.icon && <span className="shrink-0 flex items-center"><Emoji e={d.icon} size={16} /></span>}
            <span className={`text-on-surface-variant truncate shrink-0 ${compact ? 'w-[80px]' : 'w-[110px] sm:w-[150px]'}`}>{d.name}</span>
            <span className="relative flex-grow h-1.5 rounded-full bg-surface-container-highest overflow-hidden">
              <span
                className="absolute inset-y-0 left-0 rounded-full transition-all duration-300 ease-out motion-reduce:transition-none"
                style={{
                  width: `${maxValue > 0 ? (d.value / maxValue) * 100 : 0}%`,
                  background: d.color,
                  boxShadow: active === i ? `0 0 6px ${d.color}aa` : 'none',
                }}
              />
            </span>
            <span className="text-on-surface shrink-0 text-right tabular-nums">{fmt(d.value)}</span>
            <span className="text-text-muted shrink-0 w-[34px] text-right tabular-nums">{d.pct.toFixed(0)}%</span>
          </button>
        ))}
      </div>
    </div>
  );
}
