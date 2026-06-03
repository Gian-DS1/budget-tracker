// Donut de gastos del mes por categoría (top 5 + Otros). El gráfico ocupa el alto
// de la celda (ResponsiveContainer) y la leyenda se reparte al lado. Al pasar el
// mouse por un segmento O por su fila de leyenda, ese segmento crece y proyecta
// una sombra suave de su color (resaltado moderno, glow del tema).
import { useState } from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Sector } from 'recharts';
import { formatCurrency } from '../../../utils/formatters';
import { EmptyCell } from './dashboardUi';

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

export default function CategoryDonut({ data }) {
  const [active, setActive] = useState(-1);
  if (!data || data.length === 0) return <EmptyCell icon="donut_small" message="Sin gastos registrados este mes." />;

  const total = data.reduce((s, d) => s + d.value, 0);
  const withPct = data.map((d) => ({ ...d, pct: total > 0 ? (d.value / total) * 100 : 0 }));
  const activeName = active >= 0 ? withPct[active]?.name : null;

  return (
    <div className="flex-grow flex flex-col sm:flex-row items-center gap-xl min-h-[260px]">
      {/* Dona: ancho acotado (no gigante en celdas anchas); la leyenda llena el resto */}
      <div className="relative w-full sm:w-[280px] h-[240px] shrink-0">
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
              isAnimationActive
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

      {/* Leyenda: hover sincronizado con la dona; llena el ancho restante (tope para no estirar de más) */}
      <div className="flex flex-col gap-sm w-full flex-grow max-w-[640px]">
        {withPct.map((d, i) => (
          <button
            type="button"
            key={i}
            onMouseEnter={() => setActive(i)}
            onMouseLeave={() => setActive(-1)}
            className={`flex items-center gap-sm font-mono-data text-mono-data rounded px-sm py-xs transition-colors text-left ${active === i ? 'bg-surface-container-high' : ''}`}
          >
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: d.color, boxShadow: active === i ? `0 0 6px ${d.color}aa` : 'none' }} />
            <span className="text-on-surface-variant truncate flex-grow">{d.name}</span>
            <span className="text-on-surface shrink-0">{fmt(d.value)}</span>
            <span className="text-text-muted shrink-0 w-[34px] text-right">{d.pct.toFixed(0)}%</span>
          </button>
        ))}
      </div>
    </div>
  );
}
