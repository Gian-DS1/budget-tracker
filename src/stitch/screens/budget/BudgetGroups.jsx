// Grupos de categorías del presupuesto: varios sobres que cubren lo mismo
// (p. ej. Bravo + Grupo CCN + Supermercado = "Supermercados") vistos como un
// total combinado del mes: presupuestado, gastado real y barra de progreso.
// Visible en los 3 modos; los totales siguen al mes seleccionado.
import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import MS from '../../MS';
import Emoji from '../../Emoji';
import { Stagger } from '../../StitchMotion';
import { useI18n } from '../../../contexts/I18nContext';
import useBudgetGroupStore from '../../../stores/useBudgetGroupStore';
import { getBudgetGroupTotals } from '../../../utils/calculations';
import { formatCurrency } from '../../../utils/formatters';

const fmt = (n) => formatCurrency(n);

// Orden y etiquetas de tipos para el selector de categorías del modal (reusa
// las claves i18n del resto del módulo de presupuesto).
const TYPE_ORDER = [
  { key: 'income', labelKey: 'common.income' },
  { key: 'fixed_expense', labelKey: 'screens.categories.fixedExpensesSection' },
  { key: 'variable_expense', labelKey: 'screens.categories.variableExpensesSection' },
  { key: 'savings', labelKey: 'types.savings' },
];
const TYPE_OF = { income: 'income', fixed_expense: 'fixed_expense', variable_expense: 'variable_expense', expense: 'variable_expense', savings: 'savings' };

function GroupModal({ group, categories, onClose }) {
  const { t } = useI18n();
  const { addGroup, updateGroup } = useBudgetGroupStore();
  const [name, setName] = useState(group?.name || '');
  const [selected, setSelected] = useState(() => new Set(group?.categoryIds || []));

  const byType = useMemo(() => {
    const active = categories.filter((c) => c.isActive);
    const collated = active.reduce((acc, c) => {
      const key = TYPE_OF[c.type] || 'variable_expense';
      (acc[key] = acc[key] || []).push(c);
      return acc;
    }, {});
    return TYPE_ORDER
      .map((ty) => ({
        ...ty,
        items: (collated[ty.key] || []).sort((a, b) =>
          (a.name || '').localeCompare(b.name || '', 'es', { sensitivity: 'base' })),
      }))
      .filter((ty) => ty.items.length > 0);
  }, [categories]);

  const toggle = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const submit = async (e) => {
    e.preventDefault();
    const payload = { name: name.trim(), categoryIds: [...selected] };
    if (!payload.name || payload.categoryIds.length === 0) return;
    const ok = group
      ? await updateGroup(group.id, payload)
      : await addGroup(payload);
    if (ok) {
      toast.success(group ? t('screens.budget.groupUpdated') : t('screens.budget.groupCreated'));
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-md" style={{ background: 'rgba(0,0,0,0.66)' }} onClick={onClose}>
      <div className="stitch-scroll bg-surface-card border border-border-subtle rounded-lg inner-glow w-full max-h-[85vh] overflow-y-auto p-lg" style={{ maxWidth: '520px' }} onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-lg">
          <h3 className="font-headline-md text-[20px] font-bold text-on-surface tracking-tight">{group ? t('screens.budget.editGroup') : t('screens.budget.newGroup')}</h3>
          <button onClick={onClose} className="text-text-muted hover:text-on-surface p-xs"><MS name="close" className="text-[20px]" /></button>
        </div>

        <form onSubmit={submit} className="flex flex-col gap-md">
          <div className="flex flex-col gap-xs">
            <label className="font-mono-data text-mono-data text-text-muted uppercase">{t('screens.budget.groupName')}</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('screens.budget.groupNamePlaceholder')}
              autoFocus
              className="w-full bg-surface-container-lowest border border-border-subtle rounded py-sm px-md font-body-md text-body-md text-on-surface focus:outline-none focus:border-primary inner-glow"
            />
          </div>

          <div className="flex flex-col gap-xs">
            <label className="font-mono-data text-mono-data text-text-muted uppercase">{t('screens.budget.groupCategories')} · {selected.size}</label>
            <div className="stitch-scroll border border-border-subtle rounded bg-surface-container-lowest inner-glow max-h-[300px] overflow-y-auto p-sm flex flex-col gap-md">
              {byType.map((ty) => (
                <div key={ty.key}>
                  <span className="font-mono-data text-mono-data text-text-muted uppercase tracking-widest">{t(ty.labelKey)}</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-xs mt-xs">
                    {ty.items.map((c) => (
                      <label key={c.id} className="flex items-center gap-sm px-sm py-xs rounded cursor-pointer hover:bg-surface-container-high">
                        <input
                          type="checkbox"
                          checked={selected.has(c.id)}
                          onChange={() => toggle(c.id)}
                          className="accent-primary"
                        />
                        <span className="font-label-sm text-label-sm text-on-surface flex items-center gap-xs min-w-0">
                          <Emoji e={c.icon} size={14} /> <span className="truncate">{c.name}</span>
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <span className="font-mono-data text-mono-data text-text-muted normal-case tracking-normal">
              {t('screens.budget.groupHint')}
            </span>
          </div>

          <div className="flex gap-sm justify-end mt-sm">
            <button type="button" onClick={onClose} className="px-md py-sm border border-border-subtle text-on-surface-variant font-label-sm text-label-sm rounded hover:bg-surface-container-high">{t('common.cancel')}</button>
            <button type="submit" disabled={!name.trim() || selected.size === 0} className="px-md py-sm bg-primary text-on-primary font-label-sm text-label-sm uppercase tracking-widest font-bold rounded hover:bg-primary-container inner-glow disabled:opacity-40">
              {group ? t('screens.budget.saveGroup') : t('screens.budget.createGroup')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function GroupCard({ group, categories, monthBudgets, monthTx, onEdit, onDelete }) {
  const { t } = useI18n();
  const totals = useMemo(
    () => getBudgetGroupTotals({ categoryIds: group.categoryIds, monthBudgets, monthTransactions: monthTx }),
    [group.categoryIds, monthBudgets, monthTx],
  );
  const members = group.categoryIds
    .map((id) => categories.find((c) => c.id === id))
    .filter(Boolean);
  const over = totals.pct > 100;

  return (
    <Stagger.Item className="bg-surface-card border border-border-subtle rounded p-md inner-glow flex flex-col gap-sm">
      <div className="flex justify-between items-center gap-sm">
        <span className="font-label-sm text-label-sm text-on-surface flex items-center gap-xs min-w-0">
          <MS name="folder_open" className="text-[16px] text-secondary" />
          <span className="truncate">{group.name}</span>
          <span className="font-mono-data text-mono-data text-text-muted">· {members.length}</span>
        </span>
        <div className="flex items-center gap-xs shrink-0">
          <button onClick={onEdit} title={t('screens.budget.editGroup')} className="p-xs rounded text-text-muted hover:text-on-surface hover:bg-surface-container-high"><MS name="edit" className="text-[14px]" /></button>
          <button onClick={onDelete} title={t('common.delete')} className="p-xs rounded text-text-muted hover:text-accent-error hover:bg-surface-container-high"><MS name="delete" className="text-[14px]" /></button>
        </div>
      </div>

      <div className="flex flex-wrap gap-xs">
        {members.map((c) => (
          <span key={c.id} className="inline-flex items-center gap-[3px] font-mono-data text-mono-data text-on-surface-variant border border-border-subtle rounded-full px-[6px] py-[2px] leading-none">
            <Emoji e={c.icon} size={11} /> {c.name}
          </span>
        ))}
      </div>

      <div className="flex justify-between items-baseline">
        <span className="font-mono-data text-[15px] text-on-background tracking-tight">{fmt(totals.actual)}</span>
        <span className="font-mono-data text-mono-data text-text-muted">{t('screens.charts.of')} {fmt(totals.estimated)} {t('screens.budget.groupBudgeted')}</span>
      </div>
      <div className="w-full h-1 bg-surface-container-highest rounded-full overflow-hidden">
        <div className={`h-full ${over ? 'bg-accent-error' : 'bg-secondary'}`} style={{ width: `${Math.min(totals.pct, 100)}%` }} />
      </div>
      <div className="flex justify-between">
        <span className={`font-mono-data text-mono-data ${over ? 'text-accent-error' : 'text-text-muted'}`}>{totals.estimated > 0 ? `${totals.pct.toFixed(0)}%` : t('screens.budget.groupNoBudget')}</span>
        <span className={`font-mono-data text-mono-data ${over ? 'text-accent-error' : 'text-text-muted'}`}>
          {over ? `${fmt(totals.actual - totals.estimated)} ${t('screens.budget.overAmount')}` : totals.estimated > 0 ? `${fmt(totals.estimated - totals.actual)} ${t('screens.budget.freeAmount')}` : ''}
        </span>
      </div>
    </Stagger.Item>
  );
}

export default function BudgetGroups({ monthBudgets, monthTx, categories }) {
  const { t } = useI18n();
  const groups = useBudgetGroupStore((s) => s.groups);
  const deleteGroup = useBudgetGroupStore((s) => s.deleteGroup);
  const [modal, setModal] = useState(null); // null | 'new' | grupo a editar

  const handleDelete = async (g) => {
    const ok = await deleteGroup(g.id);
    if (ok) toast.success(t('screens.budget.groupDeleted').replace('{name}', g.name));
  };

  return (
    <div className="bg-surface-panel border border-border-subtle rounded-lg inner-glow p-lg mt-gutter">
      <div className="flex flex-wrap justify-between items-center gap-md mb-lg border-b border-border-subtle pb-sm">
        <h2 className="font-mono-data text-mono-data text-on-surface-variant">{t('screens.budget.groupsTitle').toUpperCase()}</h2>
        <button onClick={() => setModal('new')} className="flex items-center gap-xs bg-transparent border border-border-subtle text-on-surface font-mono-data text-mono-data uppercase px-md py-xs rounded hover:bg-surface-container-high transition-colors">
          <MS name="create_new_folder" className="text-[14px]" /> {t('screens.budget.newGroup')}
        </button>
      </div>

      {groups.length === 0 ? (
        <div className="py-lg flex flex-col items-center text-center gap-sm">
          <MS name="folder_open" className="text-[28px] text-text-muted" />
          <p className="font-body-md text-body-md text-on-surface-variant max-w-[440px]">
            {t('screens.budget.groupsEmpty')}
          </p>
        </div>
      ) : (
        <Stagger className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-md">
          {groups.map((g) => (
            <GroupCard
              key={g.id}
              group={g}
              categories={categories}
              monthBudgets={monthBudgets}
              monthTx={monthTx}
              onEdit={() => setModal(g)}
              onDelete={() => handleDelete(g)}
            />
          ))}
        </Stagger>
      )}

      {modal && (
        <GroupModal
          group={modal === 'new' ? null : modal}
          categories={categories}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}
