// Tarjeta de "sobre" del presupuesto base cero: categoría + estimado editable
// (StitchCurrencyInput, persiste on-blur) + gastado real + barra de progreso.
import { useState } from 'react';
import Emoji from '../../Emoji';
import StitchCurrencyInput from '../../StitchCurrencyInput';
import { Stagger } from '../../StitchMotion';
import { formatCurrency } from '../../../utils/formatters';

const fmt = (n) => formatCurrency(n);

const typeColor = (t) =>
  ({ income: 'bg-tertiary', fixed_expense: 'bg-primary', variable_expense: 'bg-accent-warning', savings: 'bg-secondary' }[t] || 'bg-primary');

export default function EnvelopeRow({ cat, estimated, actual, pct, onSave }) {
  // El input es controlado (onChange por tecla); persistimos solo al perder foco.
  const [v, setV] = useState(estimated ? String(estimated) : '');
  const over = pct > 100;

  return (
    <Stagger.Item className="bg-surface-card border border-border-subtle rounded p-md inner-glow flex flex-col gap-sm">
      <div className="flex justify-between items-center gap-sm">
        <span className="font-label-sm text-label-sm text-on-surface flex items-center gap-xs min-w-0">
          <Emoji e={cat.icon} size={16} /> <span className="truncate">{cat.name}</span>
        </span>
        <StitchCurrencyInput
          value={v}
          onChange={setV}
          onBlur={() => onSave(v)}
          placeholder="0"
          className="w-24 bg-surface-container-lowest border border-border-subtle rounded py-xs px-sm font-mono-data text-[11px] text-right text-on-surface focus:outline-none focus:border-primary inner-glow"
        />
      </div>
      <div className="flex justify-between items-baseline">
        <span className="font-mono-data text-[15px] text-on-background tracking-tight">{fmt(actual)}</span>
        <span className="font-mono-data text-mono-data text-text-muted">de {fmt(estimated)}</span>
      </div>
      <div className="w-full h-1 bg-surface-container-highest rounded-full overflow-hidden">
        <div className={`h-full ${over ? 'bg-accent-error' : typeColor(cat.type)}`} style={{ width: `${Math.min(pct, 100)}%` }} />
      </div>
    </Stagger.Item>
  );
}
