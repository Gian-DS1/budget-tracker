// Editor de reglas de cashback de una tarjeta: lista de { categoryId, percentage }
// o { categoryId, tiers } (reglas escalonadas tipo CCN).
// categoryId puede ser un id de categoría del usuario o el literal 'all' (todas).
import MS from '../../MS';
import StitchCategorySelect from '../../StitchCategorySelect';
import useCategoryStore from '../../../stores/useCategoryStore';

// Resumen legible de los niveles de una regla escalonada (ej. "5/6/8% por nivel").
const tiersLabel = (tiers) =>
  `${tiers.map((t) => t.pct).join('/')}% por nivel`;

export default function CashbackEditor({ rules, onChange, onRestore, demoNote }) {
  const categories = useCategoryStore((s) => s.categories);

  const setRule = (i, patch) => onChange(rules.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  const removeRule = (i) => onChange(rules.filter((_, idx) => idx !== i));
  const addRule = () => onChange([...rules, { categoryId: 'all', percentage: 1 }]);

  const isTiered = (r) => Array.isArray(r.tiers) && r.tiers.length > 0;
  const catName = (id) => categories.find((c) => c.id === id)?.name || 'categoría';

  // El select usa '' para representar la opción "Todas las categorías"
  // (includeAllOption); en las reglas esa opción se guarda como el literal 'all'.
  // Mapeamos en ambos sentidos para que "Todas" sea una opción más del dropdown
  // (antes era un botón aparte que, al deseleccionarse, no podía volver a elegirse).
  const toSelectValue = (categoryId) => (categoryId === 'all' ? '' : categoryId);
  const fromSelectValue = (value) => (value === '' ? 'all' : value);

  return (
    <div className="flex flex-col gap-sm">
      {rules.length === 0 && (
        <p className="font-mono-data text-mono-data text-text-muted normal-case tracking-normal">Sin reglas de cashback. Agrega una para estimar el reembolso por categoría.</p>
      )}

      {rules.map((r, i) => (
        isTiered(r) ? (
          // Regla escalonada (CCN): de solo lectura. No se edita como % plano para
          // no perder los niveles; se puede quitar. El cálculo lo hace el motor
          // (getDerivedCashback) por consumo mensual acumulado.
          <div key={i} className="flex items-center gap-sm">
            <div className="flex-1 min-w-0 flex items-center gap-sm bg-surface-container-lowest border border-border-subtle rounded px-md py-sm inner-glow">
              <MS name="stairs" className="!text-[16px] text-tertiary shrink-0" />
              <span className="font-body-md text-body-md text-on-surface truncate">{catName(r.categoryId)}</span>
              <span className="font-mono-data text-mono-data text-text-muted ml-auto shrink-0">{tiersLabel(r.tiers)}</span>
            </div>
            <button type="button" onClick={() => removeRule(i)} className="text-text-muted hover:text-accent-error p-xs shrink-0" aria-label="Quitar regla"><MS name="close" className="!text-[16px]" /></button>
          </div>
        ) : (
          <div key={i} className="flex items-center gap-sm">
            <div className="flex-1 min-w-0">
              <StitchCategorySelect
                value={toSelectValue(r.categoryId)}
                onChange={(id) => setRule(i, { categoryId: fromSelectValue(id) })}
                options={categories}
                includeAllOption
                placeholder="Elige categoría…"
              />
            </div>
            <div className="relative w-[88px] shrink-0">
              <input
                inputMode="decimal"
                value={r.percentage}
                onChange={(e) => setRule(i, { percentage: e.target.value.replace(/[^0-9.]/g, '') })}
                className="w-full bg-surface-container-lowest border border-border-subtle rounded py-sm pl-md pr-[26px] font-mono-data text-[13px] text-right text-on-surface focus:outline-none focus:border-primary inner-glow"
              />
              <span className="absolute right-sm top-1/2 -translate-y-1/2 font-mono-data text-mono-data text-text-muted">%</span>
            </div>
            <button type="button" onClick={() => removeRule(i)} className="text-text-muted hover:text-accent-error p-xs shrink-0" aria-label="Quitar regla"><MS name="close" className="!text-[16px]" /></button>
          </div>
        )
      ))}

      <div className="flex flex-wrap gap-sm mt-xs">
        <button type="button" onClick={addRule} className="flex items-center gap-xs border border-border-subtle text-on-surface-variant font-mono-data text-mono-data uppercase px-sm py-xs rounded hover:bg-surface-container-high transition-colors">
          <MS name="add" className="!text-[14px]" /> Regla
        </button>
        {onRestore && (
          <button type="button" onClick={onRestore} className="flex items-center gap-xs border border-border-subtle text-on-surface-variant font-mono-data text-mono-data uppercase px-sm py-xs rounded hover:bg-surface-container-high transition-colors">
            <MS name="restart_alt" className="!text-[14px]" /> Restaurar valores del banco
          </button>
        )}
      </div>

      {demoNote && (
        <p className="font-mono-data text-mono-data text-accent-warning normal-case tracking-normal mt-xs">{demoNote}</p>
      )}
    </div>
  );
}
