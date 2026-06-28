// Barra de uso del presupuesto del mes (gastado vs presupuestado) con marcador
// de ritmo: un tick señala dónde "deberías ir" hoy (avance del calendario).
// En el mes en curso el color y la frase veredicto salen del RITMO proyectado
// (getBudgetPace), no del % consumido: 64% gastado el día 25 es bueno, el día
// 10 es alarma. En meses pasados (pace null) se conserva el estado clásico.
import { formatCurrency } from '../../../utils/formatters';
import { useScreenStrings } from '../../../i18n/useScreenStrings';
import { EmptyCell } from './dashboardUi';
import { InfoTip } from '../../InfoTip';
import CountUp from '../../CountUp';

const fmt = (n) => formatCurrency(n);
const pct0 = (n) => `${Math.round(Number(n) || 0)}%`;

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
      {/* Rótulo: deja claro que esta barra mide el presupuesto del mes (no el patrimonio).
          El InfoTip aclara que compara GASTADO vs PLAN (no vs ingreso): pasar de
          100% es pasarse del plan, no del ingreso. */}
      <span className="font-mono-data text-mono-data text-text-muted uppercase inline-flex items-center gap-xs">
        {strings.charts.budgetOfMonth} <InfoTip text={strings.charts.budgetOfMonthInfo} />
      </span>
      <div className="flex justify-between items-baseline">
        {/* Número: % REAL (rawPct, sin topar) para que se vea el sobregasto del
            plan; la barra de abajo sí se topa a 100. */}
        <span className={`font-headline-md text-[22px] tracking-tight tabular-nums ${txt}`}>
          <CountUp value={usage.rawPct ?? usage.pct} format={pct0} duration={240} />
        </span>
        <span className="font-mono-data text-mono-data text-text-muted tabular-nums">
          <CountUp value={usage.spent} format={fmt} duration={240} /> {strings.charts.of} <CountUp value={usage.budgeted} format={fmt} duration={240} />
        </span>
      </div>
      <div className="relative w-full h-2 bg-surface-container-highest rounded-full">
        <div className="absolute inset-0 rounded-full overflow-hidden">
          <CountUp value={usage.pct} duration={240}>
            {(p) => <div className={`h-full rounded-full ${bar}`} style={{ width: `${p}%` }} />}
          </CountUp>
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
