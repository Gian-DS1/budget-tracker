// src/stitch/screens/categories/CategoryForm.jsx
// Modal crear/editar categoría. Campos: nombre, tipo, emoji, color, keywords.
// Branching demo/real como el resto de forms.
import { useState } from 'react';
import toast from 'react-hot-toast';
import StitchSelect from '../../StitchSelect';
import EmojiPicker from '../../EmojiPicker';
import useCategoryStore from '../../../stores/useCategoryStore';
import { isDemoActive, demoAddCategory, demoUpdateCategory } from '../../demoMode';
import { Modal, Field, FormActions, inputCls } from './categoriesUi';

const TYPE_OPTIONS = [
  { value: 'income', label: 'Ingreso' },
  { value: 'fixed_expense', label: 'Gasto fijo' },
  { value: 'variable_expense', label: 'Gasto variable' },
  { value: 'savings', label: 'Ahorro' },
];
const COLORS = ['#bec2ff', '#50d8e9', '#bdd200', '#ffb689', '#ffb4ab', '#9aa0ff', '#e9a0d8'];
const blank = { name: '', type: 'variable_expense', icon: '🏷️', color: '#bec2ff', keywords: '' };

export default function CategoryForm({ editing, onClose }) {
  const { addCategory, updateCategory } = useCategoryStore();
  const demo = isDemoActive();

  const [form, setForm] = useState(editing
    ? {
        name: editing.name, type: editing.type, icon: editing.icon || '🏷️',
        color: editing.color || '#bec2ff',
        keywords: (editing.keywords || []).join(', '),
      }
    : blank);

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error('Escribe un nombre para la categoría'); return; }
    const keywords = form.keywords.split(',').map((k) => k.trim()).filter(Boolean);
    const payload = {
      name: form.name.trim(), type: form.type, icon: form.icon, color: form.color, keywords,
    };
    if (editing) {
      if (demo) { demoUpdateCategory(editing.id, payload); toast.success('Categoría actualizada'); }
      else { await updateCategory(editing.id, payload); toast.success('Categoría actualizada'); }
    } else {
      if (demo) { demoAddCategory(payload); toast.success('Categoría creada'); }
      else { await addCategory(payload); toast.success('Categoría creada'); }
    }
    onClose();
  };

  return (
    <Modal title={editing ? 'Editar categoría' : 'Nueva categoría'} onClose={onClose}>
      <form onSubmit={submit} className="flex flex-col gap-md">
        <div className="flex gap-md items-end">
          <Field label="Ícono"><EmojiPicker value={form.icon} onChange={(char) => set({ icon: char })} /></Field>
          <div className="flex-1">
            <Field label="Nombre"><input value={form.name} onChange={(e) => set({ name: e.target.value })} className={inputCls} placeholder="Ej. Gimnasio" autoFocus /></Field>
          </div>
        </div>
        <Field label="Tipo">
          <StitchSelect value={form.type} onChange={(v) => set({ type: v })} options={TYPE_OPTIONS} />
        </Field>
        <Field label="Color">
          <div className="flex gap-sm">{COLORS.map((c) => <button type="button" key={c} onClick={() => set({ color: c })} className={`w-7 h-7 rounded-full border-2 ${form.color === c ? 'border-on-surface' : 'border-transparent'}`} style={{ background: c }} />)}</div>
        </Field>
        <Field label="Palabras clave" hint="Separadas por coma. Auto-clasifican transacciones por su descripción.">
          <input value={form.keywords} onChange={(e) => set({ keywords: e.target.value })} className={inputCls} placeholder="Ej. gym, fitness, gimnasio" />
        </Field>
        <FormActions onCancel={onClose} label={editing ? 'Guardar' : 'Crear'} />
      </form>
    </Modal>
  );
}
