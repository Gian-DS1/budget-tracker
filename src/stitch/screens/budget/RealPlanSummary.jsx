// Sección compartida por los 3 modos de Presupuesto: dos tarjetas lado a lado.
// LO REAL: ingresos reales (+) menos gastos fijos/variables reales (−), más las
// salidas reales de deuda/ahorro/botes; el resultado (restanteReal) dice si
// sobró dinero o si se gastó más de lo que entró ese mes (puede ser negativo).
// LO PRESUPUESTADO: el mismo desglose pero con el plan del mes (sobres + cuota
// de deuda). Funciona igual para cualquier mes: pasado, presente o futuro.
import MS from '../../MS';
import { useI18n } from '../../../contexts/I18nContext';
import { formatCurrency } from '../../../utils/formatters';

const fmt = (n) => formatCurrency(n);

function Row({ label, amount, sign }) {
  const neg = sign === '-';
  return (
    <div className="flex items-center justify-between gap-sm">
      <span className="font-label-sm text-label-sm text-on-surface-variant">{label}</span>
      <span className={`font-mono-data text-[13px] whitespace-nowrap ${neg ? 'text-accent-error' : 'text-tertiary'}`}>
        {neg ? '−' : '+'} {fmt(Math.abs(amount))}
      </span>
    </div>
  );
}

function SummaryCard({ title, icon, rows, result, resultLabel, captionPos, captionNeg, emptyHint }) {
  const isEmpty = rows.every((r) => !r.amount) && !result;
  return (
    <div className="bg-surface-panel border border-border-subtle rounded-lg inner-glow p-lg flex flex-col">
      <div className="flex justify-between items-center mb-lg border-b border-border-subtle pb-sm">
        <h2 className="font-mono-data text-mono-data text-on-surface-variant">{title.toUpperCase()}</h2>
        <MS name={icon} className="text-text-muted text-[16px]" />
      </div>

      {isEmpty ? (
        <p className="font-body-md text-body-md text-text-muted py-md text-center">{emptyHint}</p>
      ) : (
        <>
          <div className="flex flex-col gap-sm">
            {rows.filter((r) => r.always || r.amount !== 0).map((r) => (
              <Row key={r.label} label={r.label} amount={r.amount} sign={r.sign} />
            ))}
          </div>
          <div className="border-t border-border-subtle mt-md pt-md flex items-end justify-between gap-sm">
            <div className="flex flex-col min-w-0">
              <span className="font-mono-data text-mono-data text-text-muted uppercase">{resultLabel}</span>
              <span className="font-label-sm text-label-sm text-on-surface-variant mt-1">
                {result < 0 ? captionNeg : captionPos}
              </span>
            </div>
            <span className={`font-headline-md text-[28px] tracking-tighter whitespace-nowrap ${result < 0 ? 'text-accent-error' : 'text-tertiary'}`}>
              {fmt(result)}
            </span>
          </div>
        </>
      )}
    </div>
  );
}

export default function RealPlanSummary({ summary }) {
  const { t } = useI18n();

  const realRows = [
    { label: t('screens.budget.realIncome'), amount: summary.ingresoRecibido, sign: '+', always: true },
    { label: t('screens.budget.realFixed'), amount: summary.gastosFijosReal, sign: '-', always: true },
    { label: t('screens.budget.realVariable'), amount: summary.variableGastado, sign: '-', always: true },
    { label: t('screens.budget.realDebt'), amount: summary.debtPaid, sign: '-' },
    { label: t('screens.budget.realSavings'), amount: summary.ahorroReal, sign: '-' },
    { label: t('screens.budget.realPots'), amount: summary.accumulativeSpent, sign: '-' },
  ];
  const planRows = [
    { label: t('screens.budget.planIncome'), amount: summary.ingresoEstimado, sign: '+', always: true },
    { label: t('screens.budget.planFixed'), amount: summary.gastosFijosPlan, sign: '-', always: true },
    { label: t('screens.budget.planVariable'), amount: summary.gastosVariablesPlan, sign: '-', always: true },
    { label: t('screens.budget.planDebt'), amount: summary.debtPlanned, sign: '-' },
    { label: t('screens.budget.planSavings'), amount: summary.ahorroPlan, sign: '-' },
    { label: t('screens.budget.planPots'), amount: summary.accumulativePlan, sign: '-' },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-gutter mb-gutter">
      <SummaryCard
        title={t('screens.budget.realTitle')}
        icon="receipt_long"
        rows={realRows}
        result={summary.restanteReal}
        resultLabel={t('screens.budget.remainingReal')}
        captionPos={t('screens.budget.remainingRealPos')}
        captionNeg={t('screens.budget.remainingRealNeg')}
        emptyHint={t('screens.budget.realEmpty')}
      />
      <SummaryCard
        title={t('screens.budget.planTitle')}
        icon="edit_calendar"
        rows={planRows}
        result={summary.restantePlan}
        resultLabel={t('screens.budget.remainingPlan')}
        captionPos={t('screens.budget.remainingPlanPos')}
        captionNeg={t('screens.budget.remainingPlanNeg')}
        emptyHint={t('screens.budget.planEmpty')}
      />
    </div>
  );
}
