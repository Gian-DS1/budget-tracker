// Salud financiera — gauge semicircular grande (score 0-100) + desglose de los
// 3 factores como barras de progreso, ordenados por peso (Ahorro/45, Gasto/30,
// Deuda/25). Patrón estándar de dashboards de credit score: el medidor da el
// veredicto de un vistazo y las barras explican de dónde sale, sin esconder
// nada en un tooltip. Recibe el resultado de getFinancialHealthScore.
import { ResponsiveContainer, RadialBarChart, RadialBar, PolarAngleAxis } from 'recharts';
import { EmptyCell } from './dashboardUi';
import CountUp from '../../CountUp';
import { useI18n } from '../../../contexts/I18nContext';
import { useScreenStrings } from '../../../i18n/useScreenStrings';
import { CHART } from '../../chartTokens';

function ringColor(score) {
  if (score >= 80) return CHART.tertiary;
  if (score >= 60) return CHART.secondary;
  if (score >= 40) return CHART.warning;
  return CHART.error;
}

export default function HealthRing({ health, hasData, monthsCounted = 0 }) {
  const { t } = useI18n();
  const strings = useScreenStrings();
  if (!hasData) return <EmptyCell icon="favorite" message={t('dashboard.registerIncome') || 'Registra ingresos para evaluar tu salud financiera.'} />;
  const color = ringColor(health.score);
  const basis = monthsCounted <= 1 ? strings.charts.estimationWithMonth : `${strings.charts.basedOn} ${monthsCounted} ${strings.charts.months}`;

  // Los 3 factores del score, ordenados por peso máximo (mayor impacto primero).
  const factors = health.parts ? [
    { key: 'savings', label: strings.charts.healthFactorSavings, value: health.parts.savings, max: 45, color: CHART.tertiary },
    { key: 'spending', label: strings.charts.healthFactorSpending, value: health.parts.spending, max: 30, color: CHART.secondary },
    { key: 'debt', label: strings.charts.healthFactorDebt, value: health.parts.debt, max: 25, color: CHART.warning },
  ] : [];

  // Un solo CountUp anima el score; el gauge (semicírculo) lo consume por dataKey.
  return (
    <CountUp value={health.score}>
      {(animated) => {
        const data = [{ name: 'salud', value: animated, fill: color }];
        return (
          <div className="flex-grow flex flex-col">
            {/* Gauge semicircular grande: ocupa el ancho de la celda. El número
                vive en el hueco del semicírculo, centrado abajo. */}
            <div className="relative w-full h-[150px] sm:h-[170px]">
              <ResponsiveContainer width="100%" height="100%">
                <RadialBarChart
                  innerRadius="135%"
                  outerRadius="178%"
                  data={data}
                  startAngle={180}
                  endAngle={0}
                  cy="100%"
                >
                  <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
                  <RadialBar background={{ fill: CHART.border }} dataKey="value" cornerRadius={10} isAnimationActive={false} />
                </RadialBarChart>
              </ResponsiveContainer>
              <div className="absolute inset-x-0 bottom-0 flex flex-col items-center justify-end pb-xs pointer-events-none">
                <span className="font-hero-headline text-[52px] leading-none tracking-tighter" style={{ color }}>{Math.round(animated)}</span>
                <span className="font-headline-md text-[16px] tracking-tight mt-xs" style={{ color }}>{health.labelKey ? t(health.labelKey) : health.label}</span>
              </div>
              {/* Extremos de la escala bajo el arco */}
              <span className="absolute left-0 bottom-0 font-mono-data text-[9px] text-text-muted uppercase">{strings.charts.atRisk}</span>
              <span className="absolute right-0 bottom-0 font-mono-data text-[9px] text-text-muted uppercase">{strings.charts.excellent}</span>
            </div>

            {/* Desglose por factor: barra de progreso contra su máximo + puntaje */}
            <div className="flex flex-col gap-sm mt-md flex-grow justify-center">
              {factors.map((f) => (
                <div key={f.key} className="flex items-center gap-sm">
                  <span className="font-mono-data text-mono-data text-text-muted uppercase w-[52px] shrink-0">{f.label}</span>
                  <span className="relative flex-grow h-1.5 rounded-full bg-surface-container-highest overflow-hidden">
                    <span
                      className="absolute inset-y-0 left-0 rounded-full transition-all duration-500 ease-out motion-reduce:transition-none"
                      style={{ width: `${f.max > 0 ? (f.value / f.max) * 100 : 0}%`, background: f.color }}
                    />
                  </span>
                  <span className="font-mono-data text-mono-data text-on-surface-variant shrink-0 w-[42px] text-right tabular-nums">{f.value}/{f.max}</span>
                </div>
              ))}
            </div>

            <span className="font-mono-data text-mono-data text-text-muted mt-md normal-case tracking-normal">{basis}</span>
          </div>
        );
      }}
    </CountUp>
  );
}
