// src/stitch/screens/StitchCategories.jsx
// Gestión de categorías: lista agrupada por tipo + crear/editar/eliminar.
// El CRUD vive en useCategoryStore; eliminar deja las transacciones sin categoría
// (la BD hace ON DELETE SET NULL).
import { useState } from 'react';
import toast from 'react-hot-toast';
import MS from '../MS';
import Emoji from '../Emoji';
import { Stagger } from '../StitchMotion';
import useCategoryStore from '../../stores/useCategoryStore';
import useTransactionStore from '../../stores/useTransactionStore';
import { isDemoActive, demoDeleteCategory, demoRestoreCategory } from '../demoMode';
import CategoryForm from './categories/CategoryForm';

const TYPE_SECTIONS = [
  { type: 'income', label: 'Ingresos' },
  { type: 'fixed_expense', label: 'Gastos fijos' },
  { type: 'variable_expense', label: 'Gastos variables' },
  { type: 'savings', label: 'Ahorro' },
];

export default function StitchCategories() {
  const categories = useCategoryStore((s) => s.categories);
  const deleteCategory = useCategoryStore((s) => s.deleteCategory);
  const restoreCategory = useCategoryStore((s) => s.restoreCategory);
  const transactions = useTransactionStore((s) => s.transactions);

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);

  const openCreate = () => { setEditing(null); setShowForm(true); };
  const openEdit = (c) => { setEditing(c); setShowForm(true); };

  const onDelete = async (cat) => {
    const used = transactions.filter((t) => t.categoryId === cat.id).length;
    if (isDemoActive()) demoDeleteCategory(cat.id);
    else await deleteCategory(cat.id);
    toast((t) => (
      <span className="flex items-center gap-sm">
        {used > 0
          ? `Categoría eliminada · ${used} transacción${used === 1 ? '' : 'es'} sin categoría`
          : 'Categoría eliminada'}
        <button
          onClick={async () => {
            if (isDemoActive()) {
              demoRestoreCategory(cat);
            } else {
              await restoreCategory(cat);
            }
            toast.dismiss(t.id);
          }}
          className="text-primary font-bold underline"
        >Deshacer</button>
      </span>
    ), { duration: 6000 });
  };

  return (
    <div className="p-md sm:p-margin-safe max-w-[1728px] mx-auto w-full">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-lg mb-xl">
        <div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface">Categorías</h1>
          <p className="font-body-md text-body-md text-text-muted mt-2">Crea, edita o elimina las categorías de tus transacciones.</p>
        </div>
        <button
          onClick={openCreate}
          className="bg-primary text-on-primary font-label-sm text-label-sm uppercase tracking-widest font-bold px-md py-sm rounded hover:bg-primary-container transition-colors inner-glow flex items-center gap-xs self-start"
        >
          <MS name="add" className="text-[16px]" /> Nueva categoría
        </button>
      </div>

      {categories.length === 0 && (
        <div className="text-center py-xl font-body-md text-text-muted">
          Aún no tienes categorías. Crea la primera con &quot;Nueva&quot;.
        </div>
      )}

      <Stagger className="flex flex-col gap-lg">
        {TYPE_SECTIONS.map((section) => {
          const items = categories.filter((c) => c.type === section.type);
          if (items.length === 0) return null;
          return (
            <div key={section.type} className="flex flex-col gap-sm">
              <h2 className="font-mono-data text-mono-data text-text-muted uppercase tracking-widest">{section.label}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-sm">
                {items.map((c) => (
                  <div key={c.id} className="flex items-center gap-sm bg-surface-panel border border-border-subtle rounded-lg inner-glow p-md">
                    <span className="w-8 h-8 rounded flex items-center justify-center shrink-0" style={{ background: `${c.color}22` }}>
                      <Emoji e={c.icon} size={18} />
                    </span>
                    <span className="font-body-md text-body-md text-on-surface truncate flex-1">{c.name}</span>
                    <button onClick={() => openEdit(c)} className="text-text-muted hover:text-on-surface p-xs" aria-label="Editar">
                      <MS name="edit" className="text-[16px]" />
                    </button>
                    <button onClick={() => onDelete(c)} className="text-text-muted hover:text-accent-error p-xs" aria-label="Eliminar">
                      <MS name="delete" className="text-[16px]" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </Stagger>

      {showForm && <CategoryForm editing={editing} onClose={() => setShowForm(false)} />}
    </div>
  );
}
