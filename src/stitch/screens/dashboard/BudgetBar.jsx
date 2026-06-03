// Barra de uso del presupuesto del mes (gastado vs presupuestado).
import { formatCurrency } from '../../../utils/formatters';
import { EmptyCell } from './dashboardUi';

const fmt = (n) => formatCurrency(n);

const COLOR = { good: 'bg-tertiary', warning: 'bg-accent-warning', danger: 'bg-accent-error', neutral: 'bg-primary' };
const TEXT = { good: 'text-tertiary', warning: 'text-accent-warning', danger: 'text-accent-error', neutral: 'text-on-surface' };

export default function BudgetBar({ usage }) {
  if (!usage) return <EmptyCell icon="savings" message="Define un presupuesto para ver tu avance." />;
  const bar = usage.overBudget ? 'bg-accent-error' : (COLOR[usage.estado] || 'bg-primary');
  const txt = usage.overBudget ? 'text-accent-error' : (TEXT[usage.estado] || 'text-on-surface');
  return (
    <div className="flex-grow flex flex-col justify-center gap-sm min-h-[120px]">
      <div className="flex justify-between items-baseline">
        <span className={`font-headline-md text-[22px] tracking-tight ${txt}`}>{usage.pct.toFixed(0)}%</span>
        <span className="font-mono-data text-mono-data text-text-muted">{fmt(usage.spent)} de {fmt(usage.budgeted)}</span>
      </div>
      <div className="w-full h-2 bg-surface-container-highest rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${bar}`} style={{ width: `${usage.pct}%` }} />
      </div>
      {usage.overBudget && (
        <span className="font-mono-data text-mono-data text-accent-error normal-case tracking-normal">Superaste lo presupuestado este mes.</span>
      )}
    </div>
  );
}
