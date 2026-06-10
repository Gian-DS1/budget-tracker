// Nivel 50/30/20 — tres baldes derivados automáticamente de los tipos de
// categoría. Lenguaje simple y cotidiano (sin jerga). "Puedes gastar" arriba.
import { useMemo } from 'react';
import MS from '../../MS';
import { Stagger } from '../../StitchMotion';
import { useI18n } from '../../../contexts/I18nContext';
import { getBuckets503020 } from '../../../utils/calculations';
import { formatCurrency } from '../../../utils/formatters';

const fmt = (n) => formatCurrency(n);

// Definición visual de cada balde (en orden 50 → 30 → 20). Las clases de color
// van completas (no interpoladas) para que Tailwind no las purgue.
const BUCKETS = [
  { key: 'necesidades', pctTarget: 50, labelKey: 'screens.budget.needs', hintKey: 'screens.budget.needsHint', icon: 'home', bar: 'bg-primary', text: 'text-primary' },
  { key: 'gustos', pctTarget: 30, labelKey: 'screens.budget.wants', hintKey: 'screens.budget.wantsHint', icon: 'celebration', bar: 'bg-accent-warning', text: 'text-accent-warning' },
  { key: 'ahorroDeuda', pctTarget: 20, labelKey: 'screens.budget.savingsAndDebts', hintKey: 'screens.budget.savingsDebtHint', icon: 'savings', bar: 'bg-secondary', text: 'text-secondary' },
];

function BucketCard({ def, data }) {
  const { t } = useI18n();
  const over = data.pct > 100;
  const barColor = over ? 'bg-accent-error' : def.bar;
  const textColor = over ? 'text-accent-error' : def.text;
  const restante = data.limit - data.spent;
  return (
    <Stagger.Item className="bg-surface-card border border-border-subtle rounded-lg inner-glow p-lg flex flex-col gap-md">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-sm">
          <span className={`w-8 h-8 rounded flex items-center justify-center bg-surface-container-high ${textColor}`}>
            <MS name={def.icon} className="text-[18px]" />
          </span>
          <div className="flex flex-col">
            <span className="font-label-sm text-label-sm text-on-surface">{t(def.labelKey)}</span>
            <span className="font-mono-data text-mono-data text-text-muted">{t('screens.budget.targetPctIncome').replace('{pct}', def.pctTarget)}</span>
          </div>
        </div>
        <span className={`font-mono-data text-[13px] ${over ? 'text-accent-error' : 'text-text-muted'}`}>{data.pct.toFixed(0)}%</span>
      </div>

      <div className="flex items-baseline gap-xs">
        <span className="font-headline-md text-[28px] text-on-background tracking-tighter">{fmt(data.spent)}</span>
        <span className="font-mono-data text-mono-data text-text-muted">{t('screens.charts.of')} {fmt(data.limit)}</span>
      </div>

      <div className="w-full h-1.5 bg-surface-container-highest rounded-full overflow-hidden">
        <div className={`h-full ${barColor}`} style={{ width: `${Math.min(data.pct, 100)}%` }} />
      </div>

      <div className="flex items-center justify-between">
        <span className="font-mono-data text-mono-data text-text-muted">{t(def.hintKey)}</span>
        <span className={`font-label-sm text-label-sm whitespace-nowrap ml-sm ${restante < 0 ? 'text-accent-error' : 'text-on-surface-variant'}`}>
          {restante < 0 ? `${fmt(Math.abs(restante))} ${t('screens.budget.overAmount')}` : `${fmt(restante)} ${t('screens.budget.freeAmount')}`}
        </span>
      </div>
    </Stagger.Item>
  );
}

export default function Budget503020({ summary }) {
  const { t } = useI18n();
  const buckets = useMemo(() => getBuckets503020(summary), [summary]);
  const noIncome = buckets.income <= 0;

  return (
    <>
      {/* Puedes gastar (transversal) */}
      <div className="bg-surface-panel border border-border-subtle rounded-lg inner-glow p-lg mb-gutter flex flex-col sm:flex-row sm:items-end justify-between gap-md">
        <div className="flex flex-col">
          <span className="font-mono-data text-mono-data text-text-muted uppercase">{t('screens.budget.leftToSpend')}</span>
          <span className={`font-headline-md text-[40px] tracking-tighter ${summary.disponible < 0 ? 'text-accent-error' : 'text-tertiary'}`}>{fmt(summary.puedesGastar)}</span>
          <span className="font-body-md text-body-md text-on-surface-variant mt-xs">{t('screens.budget.withoutFallingBehind')}</span>
        </div>
        <div className="flex flex-col sm:text-right">
          <span className="font-mono-data text-mono-data text-text-muted uppercase">{t('screens.budget.incomeOfMonth')}</span>
          <span className="font-headline-md text-[24px] text-on-background tracking-tighter">{fmt(summary.ingresoRecibido)}</span>
        </div>
      </div>

      {noIncome ? (
        <div className="bg-surface-panel border border-border-subtle rounded-lg inner-glow py-[64px] flex flex-col items-center text-center gap-sm">
          <MS name="savings" className="text-[36px] text-text-muted" />
          <p className="font-body-md text-body-md text-on-surface-variant">{t('screens.budget.registerIncomeBuckets')}</p>
        </div>
      ) : (
        <Stagger className="grid grid-cols-1 lg:grid-cols-3 gap-gutter">
          {BUCKETS.map((def) => <BucketCard key={def.key} def={def} data={buckets[def.key]} />)}
        </Stagger>
      )}
    </>
  );
}
