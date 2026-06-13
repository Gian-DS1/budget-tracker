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

      {/* El número grande es lo ACCIONABLE: cuánto queda (o cuánto te pasaste).
          Lo gastado vs el límite queda como contexto en la línea de abajo. */}
      <div className="flex flex-col">
        <span className={`font-headline-md text-[28px] tracking-tighter ${restante < 0 ? 'text-accent-error' : 'text-on-background'}`}>
          {restante < 0 ? fmt(Math.abs(restante)) : fmt(restante)}
          <span className="font-mono-data text-mono-data text-text-muted ml-xs tracking-normal">{restante < 0 ? t('screens.budget.overAmount') : t('screens.budget.freeAmount')}</span>
        </span>
        <span className="font-mono-data text-mono-data text-text-muted mt-xs">{fmt(data.spent)} {t('screens.charts.of')} {fmt(data.limit)}</span>
      </div>

      <div className="w-full h-1.5 bg-surface-container-highest rounded-full overflow-hidden">
        <div className={`h-full ${barColor}`} style={{ width: `${Math.min(data.pct, 100)}%` }} />
      </div>

      <span className="font-mono-data text-mono-data text-text-muted normal-case tracking-normal">{t(def.hintKey)}</span>
    </Stagger.Item>
  );
}

// Barra de distribución: cómo se reparte el ingreso entre los 3 baldes, con
// los cortes de la regla (50% y 80%) marcados. Hace VISIBLE la regla 50/30/20
// sin pedirle al usuario que la calcule: cada segmento es gasto real.
function DistributionStrip({ buckets }) {
  const { t } = useI18n();
  const income = buckets.income;
  const totalSpent = BUCKETS.reduce((s, def) => s + buckets[def.key].spent, 0);
  // Si se gastó más del ingreso, la barra escala contra el total gastado para
  // que los segmentos sigan sumando 100% (el "libre" desaparece).
  const base = Math.max(income, totalSpent);
  if (base <= 0) return null;
  const segs = BUCKETS.map((def) => ({ def, w: (buckets[def.key].spent / base) * 100 }));
  const freeW = Math.max(0, ((income - totalSpent) / base) * 100);
  const tick50 = (income / base) * 50;
  const tick80 = (income / base) * 80;

  return (
    <div className="flex flex-col gap-xs">
      <span className="font-mono-data text-mono-data text-text-muted uppercase">{t('screens.budget.distribution')}</span>
      <div className="relative w-full h-3 rounded-full bg-surface-container-highest overflow-hidden flex">
        {segs.map(({ def, w }) => (
          <div key={def.key} className={`h-full ${def.bar}`} style={{ width: `${w}%` }} title={t(def.labelKey)} />
        ))}
        {freeW > 0 && <div className="h-full" style={{ width: `${freeW}%` }} />}
        {/* Cortes de la regla: 50% (necesidades) y 80% (necesidades+gustos) */}
        <div className="absolute top-0 bottom-0 w-px bg-on-surface/40" style={{ left: `${tick50}%` }} title={t('screens.budget.goalTick').replace('{pct}', 50)} />
        <div className="absolute top-0 bottom-0 w-px bg-on-surface/40" style={{ left: `${tick80}%` }} title={t('screens.budget.goalTick').replace('{pct}', 80)} />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-sm">
        <div className="flex flex-wrap items-center gap-md">
          {BUCKETS.map((def) => (
            <span key={def.key} className="flex items-center gap-xs font-mono-data text-mono-data text-text-muted">
              <span className={`w-2 h-2 rounded-full ${def.bar}`} /> {t(def.labelKey)}
            </span>
          ))}
        </div>
        <span className="font-mono-data text-mono-data text-text-muted">{t('screens.budget.tag503020')}</span>
      </div>
    </div>
  );
}

export default function Budget503020({ summary }) {
  const { t } = useI18n();
  const buckets = useMemo(() => getBuckets503020(summary), [summary]);
  const noIncome = buckets.income <= 0;

  return (
    <>
      {/* Puedes gastar (transversal) + distribución del ingreso */}
      <div className="bg-surface-panel border border-border-subtle rounded-lg inner-glow p-lg mb-gutter flex flex-col gap-lg">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-md">
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
        {!noIncome && <DistributionStrip buckets={buckets} />}
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
