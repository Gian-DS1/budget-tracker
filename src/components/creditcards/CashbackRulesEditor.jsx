import { useState } from 'react';
import { Plus, X } from 'lucide-react';

// Editor de reglas de cashback [{categoryId, percentage}]. `categoryId` puede ser
// 'all' (resto de consumos) o el id de una categoría existente del usuario.
export default function CashbackRulesEditor({ rules, categories, onChange }) {
  const [cat, setCat] = useState('all');
  const [pct, setPct] = useState('');

  const expenseCats = categories.filter(
    (c) => c.type !== 'income' && c.type !== 'savings' && c.isActive
  );

  const addRule = () => {
    if (!pct || isNaN(Number(pct))) return;
    const next = [...(rules || [])];
    const idx = next.findIndex((r) => r.categoryId === cat);
    if (idx >= 0) next[idx] = { ...next[idx], percentage: Number(pct) };
    else next.push({ categoryId: cat, percentage: Number(pct) });
    onChange(next);
    setCat('all');
    setPct('');
  };

  const removeRule = (i) => {
    const next = [...(rules || [])];
    next.splice(i, 1);
    onChange(next);
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <select
          className="flex-1"
          value={cat}
          onChange={(e) => setCat(e.target.value)}
          style={{ padding: '8px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-primary)', background: 'var(--bg-input)' }}
        >
          <option value="all">Todas las categorías de gasto</option>
          <optgroup label="Gastos">
            {expenseCats.map((c) => (
              <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
            ))}
          </optgroup>
        </select>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min="0" max="100" step="0.1"
            value={pct}
            onChange={(e) => setPct(e.target.value)}
            placeholder="5"
            className="no-spinners text-center"
            style={{ width: '60px', padding: '8px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-primary)', background: 'var(--bg-input)' }}
          />
          <span className="text-muted font-medium">%</span>
        </div>
        <button type="button" className="btn btn-secondary" onClick={addRule}>
          <Plus size={16} />
        </button>
      </div>

      {rules && rules.length > 0 ? (
        <div className="flex flex-col gap-2">
          {rules.map((rule, idx) => {
            const c = categories.find((x) => x.id === rule.categoryId);
            const label = rule.categoryId === 'all'
              ? 'Todas las categorías'
              : (c ? `${c.icon} ${c.name}` : 'Categoría desconocida');
            return (
              <div key={idx} className="flex items-center justify-between p-2 rounded-md" style={{ background: 'var(--bg-card-hover)', border: '1px solid var(--border-primary)' }}>
                <span className="text-sm">{label}</span>
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-sm" style={{ color: 'var(--color-income)' }}>{rule.percentage}%</span>
                  <button type="button" className="text-danger" onClick={() => removeRule(idx)}><X size={14} /></button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-xs text-muted">Añade beneficios de cashback para que el sistema los calcule automáticamente en tus gastos.</div>
      )}
    </div>
  );
}
