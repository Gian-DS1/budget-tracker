// Anillo de salud financiera. Recibe el resultado de getFinancialHealthScore
// (calculado en el shell con getMonthlySavingCapacity). Color por rango.
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
  // Confianza del cálculo: 1 mes = estimación temprana; más meses = más sólido.
  const basis = monthsCounted <= 1 ? 'Estimación con 1 mes' : `Basado en ${monthsCounted} meses`;
  return (
    <div className="flex-grow flex flex-col items-center justify-center min-h-[180px]">
      <div className="relative w-[150px] h-[150px]">
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart innerRadius="72%" outerRadius="100%" data={data} startAngle={90} endAngle={-270}>
            <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
            <RadialBar background={{ fill: '#232426' }} dataKey="value" cornerRadius={8} />
          </RadialBarChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="font-headline-md text-[30px] tracking-tight" style={{ color }}>{health.score}</span>
          <span className="font-mono-data text-mono-data text-text-muted uppercase">/ 100</span>
        </div>
      </div>
      <span className="font-label-sm text-label-sm mt-sm" style={{ color }}>{health.label}</span>
      <span className="font-mono-data text-mono-data text-text-muted mt-xs">{basis}</span>
    </div>
  );
}
