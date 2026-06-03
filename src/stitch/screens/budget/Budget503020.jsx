// Nivel 50/30/20 — tres baldes derivados automáticamente de los tipos de
// categoría. Lenguaje simple y cotidiano (sin jerga). "Puedes gastar" arriba.
import { useMemo } from 'react';
import MS from '../../MS';
import { Stagger } from '../../StitchMotion';
import { getBuckets503020 } from '../../../utils/calculations';
import { formatCurrency } from '../../../utils/formatters';

const fmt = (n) => formatCurrency(n);

// Definición visual de cada balde (en orden 50 → 30 → 20). Las clases de color
// van completas (no interpoladas) para que Tailwind no las purgue.
const BUCKETS = [
  { key: 'necesidades', pctTarget: 50, label: 'Necesidades', hint: 'Lo que no puedes dejar de pagar: alquiler, luz, internet…', icon: 'home', bar: 'bg-primary', text: 'text-primary' },
  { key: 'gustos', pctTarget: 30, label: 'Gustos', hint: 'Lo que disfrutas: salidas, suscripciones, antojos…', icon: 'celebration', bar: 'bg-accent-warning', text: 'text-accent-warning' },
  { key: 'ahorroDeuda', pctTarget: 20, label: 'Ahorro y deudas', hint: 'Lo que apartas para ti y para saldar lo que debes.', icon: 'savings', bar: 'bg-secondary', text: 'text-secondary' },
];

function BucketCard({ def, data }) {
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
            <span className="font-label-sm text-label-sm text-on-surface">{def.label}</span>
            <span className="font-mono-data text-mono-data text-text-muted">META {def.pctTarget}% DEL INGRESO</span>
          </div>
        </div>
        <span className={`font-mono-data text-[13px] ${over ? 'text-accent-error' : 'text-text-muted'}`}>{data.pct.toFixed(0)}%</span>
      </div>

      <div className="flex items-baseline gap-xs">
        <span className="font-headline-md text-[28px] text-on-background tracking-tighter">{fmt(data.spent)}</span>
        <span className="font-mono-data text-mono-data text-text-muted">de {fmt(data.limit)}</span>
      </div>

      <div className="w-full h-1.5 bg-surface-container-highest rounded-full overflow-hidden">
        <div className={`h-full ${barColor}`} style={{ width: `${Math.min(data.pct, 100)}%` }} />
      </div>

      <div className="flex items-center justify-between">
        <span className="font-mono-data text-mono-data text-text-muted">{def.hint}</span>
        <span className={`font-label-sm text-label-sm whitespace-nowrap ml-sm ${restante < 0 ? 'text-accent-error' : 'text-on-surface-variant'}`}>
          {restante < 0 ? `${fmt(Math.abs(restante))} de más` : `${fmt(restante)} libre`}
        </span>
      </div>
    </Stagger.Item>
  );
}

export default function Budget503020({ summary }) {
  const buckets = useMemo(() => getBuckets503020(summary), [summary]);
  const noIncome = buckets.income <= 0;

  return (
    <>
      {/* Puedes gastar (transversal) */}
      <div className="bg-surface-panel border border-border-subtle rounded-lg inner-glow p-lg mb-gutter flex flex-col sm:flex-row sm:items-end justify-between gap-md">
        <div className="flex flex-col">
          <span className="font-mono-data text-mono-data text-text-muted uppercase">Te queda para gastar</span>
          <span className={`font-headline-md text-[40px] tracking-tighter ${summary.disponible < 0 ? 'text-accent-error' : 'text-tertiary'}`}>{fmt(summary.puedesGastar)}</span>
          <span className="font-body-md text-body-md text-on-surface-variant mt-xs">Este mes, sin atrasarte en tus pagos ni metas.</span>
        </div>
        <div className="flex flex-col sm:text-right">
          <span className="font-mono-data text-mono-data text-text-muted uppercase">Ingreso del mes</span>
          <span className="font-headline-md text-[24px] text-on-background tracking-tighter">{fmt(summary.ingresoRecibido)}</span>
        </div>
      </div>

      {noIncome ? (
        <div className="bg-surface-panel border border-border-subtle rounded-lg inner-glow py-[64px] flex flex-col items-center text-center gap-sm">
          <MS name="savings" className="text-[36px] text-text-muted" />
          <p className="font-body-md text-body-md text-on-surface-variant">Registra tu ingreso del mes para ver tus tres baldes.</p>
        </div>
      ) : (
        <Stagger className="grid grid-cols-1 lg:grid-cols-3 gap-gutter">
          {BUCKETS.map((def) => <BucketCard key={def.key} def={def} data={buckets[def.key]} />)}
        </Stagger>
      )}
    </>
  );
}
