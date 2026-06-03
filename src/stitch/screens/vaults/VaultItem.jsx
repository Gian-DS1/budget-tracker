// Tarjeta de meta de ahorro: emoji, saldo, % + barra, proyección (análoga al
// payoff de Deudas) y acciones (Abonar/Historial/Editar/Eliminar).
import { useMemo } from 'react';
import MS from '../../MS';
import Emoji from '../../Emoji';
import { Stagger } from '../../StitchMotion';
import { formatCurrency, formatDate, toISODate } from '../../../utils/formatters';
import { getProjection } from './projection';
import { HORIZON_CHIP } from './horizons';

const fmt = (n, c) => formatCurrency(n, c);

export default function VaultItem({ goal, onContribute, onHistory, onEdit, onDelete }) {
  const proj = useMemo(() => getProjection(goal), [goal]);
  const paused = goal.status === 'paused';

  return (
    <Stagger.Item className="bg-surface-card border border-border-subtle rounded-lg p-md inner-glow flex flex-col gap-md" style={{ opacity: paused ? 0.6 : 1 }}>
      <div className="flex items-center gap-sm">
        <div className="w-8 h-8 rounded-sm bg-surface-container-high flex items-center justify-center border border-border-subtle shrink-0"><Emoji e={goal.icon || '🎯'} size={18} /></div>
        <span className="font-label-sm text-label-sm uppercase text-on-surface truncate min-w-0">{goal.title}</span>
        {goal.currency === 'USD' && <span className="font-mono-data text-[8px] text-secondary border border-secondary/40 rounded px-1 shrink-0">USD</span>}
        {HORIZON_CHIP[goal.horizon] && <span className="font-mono-data text-[8px] text-text-muted border border-border-subtle rounded px-1 shrink-0">{HORIZON_CHIP[goal.horizon]}</span>}
      </div>

      <div className={`font-headline-md text-headline-md tracking-tight ${proj.done ? 'text-tertiary' : 'text-on-surface'}`} style={proj.done ? { color: '#bdd200' } : undefined}>{fmt(goal.currentAmount, goal.currency)}</div>

      <div className="w-full bg-surface-container-highest h-1 rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${Math.min(100, Math.max(0, proj.pct))}%`, background: proj.done ? '#bdd200' : (goal.color || '#bec2ff') }} />
      </div>
      <div className="flex justify-between font-mono-data text-mono-data text-text-muted">
        <span>Meta {fmt(goal.targetAmount, goal.currency)}</span>
        <span>{proj.pct.toFixed(0)}%</span>
      </div>

      {/* Proyección de la meta */}
      {proj.done ? (
        <div className="flex items-center gap-xs bg-tertiary/10 border border-tertiary/30 rounded px-sm py-xs">
          <MS name="check_circle" className="!text-[13px] text-tertiary" />
          <span className="font-mono-data text-mono-data text-tertiary normal-case tracking-normal">Meta completada.</span>
        </div>
      ) : proj.reachable ? (
        <div className="flex flex-wrap items-center justify-between gap-xs bg-surface-container-lowest border border-border-subtle rounded px-sm py-xs inner-glow">
          <span className="font-mono-data text-mono-data text-text-muted flex items-center gap-xs">
            <MS name="event_available" className="!text-[13px] text-tertiary" /> Lista en {proj.months} {proj.months === 1 ? 'mes' : 'meses'}
          </span>
          {proj.projectedDate && <span className="font-mono-data text-mono-data text-text-muted">{formatDate(toISODate(proj.projectedDate))}</span>}
          <span className="font-mono-data text-mono-data text-text-muted w-full">Aporte mensual: {fmt(goal.monthlyContribution, goal.currency)}</span>
        </div>
      ) : (
        <div className="flex items-center gap-xs bg-surface-container-lowest border border-border-subtle rounded px-sm py-xs">
          <MS name="info" className="!text-[13px] text-text-muted" />
          <span className="font-mono-data text-mono-data text-text-muted normal-case tracking-normal">Define un aporte mensual para ver la proyección.</span>
        </div>
      )}

      <div className="flex gap-sm mt-xs">
        <button onClick={() => onContribute(goal)} className="flex-1 border border-border-subtle text-primary font-mono-data text-mono-data uppercase py-xs rounded hover:bg-primary/10 transition-colors">Abonar</button>
        <button onClick={() => onHistory(goal)} className="px-sm border border-border-subtle text-text-muted rounded hover:text-on-surface" aria-label="Historial"><MS name="history" className="!text-[14px]" /></button>
        <button onClick={() => onEdit(goal)} className="px-sm border border-border-subtle text-text-muted rounded hover:text-on-surface" aria-label="Editar"><MS name="edit" className="!text-[14px]" /></button>
        <button onClick={() => onDelete(goal)} className="px-sm border border-border-subtle text-text-muted rounded hover:text-accent-error" aria-label="Eliminar"><MS name="delete" className="!text-[14px]" /></button>
      </div>
    </Stagger.Item>
  );
}
