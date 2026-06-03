// Salud financiera (compacta): un solo indicador, así que ocupa poco. Anillo
// mediano con el score + label + barra de progreso con su umbral. Recibe el
// resultado de getFinancialHealthScore (calculado en el shell). Color por rango.
import { ResponsiveContainer, RadialBarChart, RadialBar, PolarAngleAxis } from 'recharts';
import { EmptyCell } from './dashboardUi';

function ringColor(score) {
  if (score >= 80) return '#bdd200';
  if (score >= 60) return '#50d8e9';
  if (score >= 40) return '#ffb689';
  return '#ffb4ab';
}

export default function HealthRing({ health, hasData, monthsCounted = 0 }) {
  if (!hasData) return <EmptyCell icon="favorite" message="Registra ingresos para evaluar tu salud financiera." />;
  const color = ringColor(health.score);
  const data = [{ name: 'salud', value: health.score, fill: color }];
  const basis = monthsCounted <= 1 ? 'Estimación con 1 mes' : `Basado en ${monthsCounted} meses`;

  return (
    <div className="flex-grow flex flex-col justify-center gap-md min-h-[140px]">
      {/* Anillo compacto + score/label al lado */}
      <div className="flex items-center gap-md">
        <div className="relative w-[104px] h-[104px] shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <RadialBarChart innerRadius="74%" outerRadius="100%" data={data} startAngle={90} endAngle={-270}>
              <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
              <RadialBar background={{ fill: '#232426' }} dataKey="value" cornerRadius={8} isAnimationActive={false} />
            </RadialBarChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="font-headline-md text-[26px] tracking-tight leading-none" style={{ color }}>{health.score}</span>
            <span className="font-mono-data text-[9px] text-text-muted uppercase">/ 100</span>
          </div>
        </div>
        <div className="flex flex-col gap-xs min-w-0">
          <span className="font-headline-md text-[18px] tracking-tight" style={{ color }}>{health.label}</span>
          <span className="font-mono-data text-mono-data text-text-muted">{basis}</span>
        </div>
      </div>

      {/* Barra de posición del score (0–100) con el valor marcado */}
      <div className="flex flex-col gap-xs">
        <div className="w-full h-1.5 rounded-full bg-surface-container-highest overflow-hidden">
          <div className="h-full rounded-full" style={{ width: `${Math.max(2, Math.min(100, health.score))}%`, background: color }} />
        </div>
        <div className="flex justify-between font-mono-data text-[9px] text-text-muted uppercase">
          <span>En riesgo</span>
          <span>Excelente</span>
        </div>
      </div>
    </div>
  );
}
