// Barra de uso del presupuesto del mes (gastado vs presupuestado) con marcador
// de ritmo: un tick señala dónde "deberías ir" hoy (avance del calendario).
// En el mes en curso el color y la frase veredicto salen del RITMO proyectado
// (getBudgetPace), no del % consumido: 64% gastado el día 25 es bueno, el día
// 10 es alarma. En meses pasados (pace null) se conserva el estado clásico.
import { formatCurrency } from '../../../utils/formatters';
import { useScreenStrings } from '../../../i18n/useScreenStrings';
import { EmptyCell } from './dashboardUi';

const fmt = (n) => formatCurrency(n);

const COLOR = { good: 'bg-tertiary', warning: 'bg-accent-warning', danger: 'bg-accent-error', neutral: 'bg-primary' };
const TEXT = { good: 'text-tertiary', warning: 'text-accent-warning', danger: 'text-accent-error', neutral: 'text-on-surface' };
const PACE_STATE = { ontrack: 'good', fast: 'warning', over: 'danger' };

export default function BudgetBar({ usage, pace }) {
  const strings = useScreenStrings();
  if (!usage) return <EmptyCell icon="savings" message={strings.charts.defineBudget} />;

  // Con ritmo disponible (mes en curso) el estado visual sale del veredicto.
  const estado = pace ? PACE_STATE[pace.verdict] : (usage.overBudget ? 'danger' : usage.estado);
  const bar = COLOR[estado] || 'bg-primary';
  const txt = TEXT[estado] || 'text-on-surface';

  return (
    <div className="flex-grow flex flex-col justify-center gap-sm">
      <div className="flex justify-between items-baseline">
        <span className={`font-headline-md text-[22px] tracking-tight ${txt}`}>{usage.pct.toFixed(0)}%</span>
        <span className="font-mono-data text-mono-data text-text-muted">{fmt(usage.spent)} {strings.charts.of} {fmt(usage.budgeted)}</span>
      </div>
      <div className="relative w-full h-2 bg-surface-container-highest rounded-full">
        <div className="absolute inset-0 rounded-full overflow-hidden">
          <div className={`h-full rounded-full ${bar}`} style={{ width: `${usage.pct}%` }} />
        </div>
        {/* Tick de ritmo: avance del calendario. La meta es que la barra no lo rebase. */}
        {pace && (
          <div
            className="absolute -top-1 -bottom-1 w-0.5 rounded-full bg-on-surface-variant"
            style={{ left: `${pace.monthPct}%` }}
            title={strings.charts.paceTick.replace('{pct}', pace.monthPct.toFixed(0))}
          />
        )}
      </div>
    </div>
  );
}
