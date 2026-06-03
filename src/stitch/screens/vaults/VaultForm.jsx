// Modal de crear/editar meta. Inputs Stitch + demo branching. El saldo inicial
// solo se declara al CREAR (al editar el saldo cambia vía aportes).
import { useState } from 'react';
import toast from 'react-hot-toast';
import Emoji from '../../Emoji';
import StitchCurrencyInput from '../../StitchCurrencyInput';
import StitchSelect from '../../StitchSelect';
import StitchDatePicker from '../../StitchDatePicker';
import useSavingsStore from '../../../stores/useSavingsStore';
import { isDemoActive, demoAddGoal, demoUpdateGoal } from '../../demoMode';
import { Modal, Field, FormActions, inputCls } from './vaultsUi';

const EMOJIS = ['🎯', '🏠', '✈️', '🚗', '💻', '📱', '👶', '🎓', '💍', '🆘', '🏖️', '🏦'];

const blank = { title: '', targetAmount: '', currentAmount: '', monthlyContribution: '', deadline: '', icon: '🎯', color: '#bec2ff', currency: 'DOP' };

export default function VaultForm({ editing, onClose }) {
  const { addGoal, updateGoal } = useSavingsStore();
  const demo = isDemoActive();

  const [form, setForm] = useState(editing
    ? {
        title: editing.title, targetAmount: String(editing.targetAmount),
        currentAmount: String(editing.currentAmount),
        monthlyContribution: editing.monthlyContribution ? String(editing.monthlyContribution) : '',
        deadline: editing.deadline || '', icon: editing.icon || '🎯',
        color: editing.color || '#bec2ff', currency: editing.currency || 'DOP',
      }
    : blank);

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !Number(form.targetAmount)) {
      toast.error('Completa el nombre y el monto de la meta');
      return;
    }
    // Base común. El saldo inicial solo se envía al crear.
    const data = {
      title: form.title.trim(), targetAmount: Number(form.targetAmount),
      monthlyContribution: Number(form.monthlyContribution) || 0,
      deadline: form.deadline || null, icon: form.icon, color: form.color, currency: form.currency,
    };
    if (editing) {
      if (demo) { demoUpdateGoal(editing.id, data); toast.success('Meta actualizada'); }
      else { await updateGoal(editing.id, data); toast.success('Meta actualizada'); }
    } else {
      const createData = { ...data, currentAmount: Number(form.currentAmount) || 0 };
      if (demo) { demoAddGoal(createData); toast.success('Meta creada'); }
      else { await addGoal(createData); toast.success('Meta creada'); }
    }
    onClose();
  };

  return (
    <Modal title={editing ? 'Editar meta' : 'Nueva meta'} onClose={onClose}>
      <form onSubmit={submit} className="flex flex-col gap-md">
        <Field label="Nombre"><input value={form.title} onChange={(e) => set({ title: e.target.value })} className={inputCls} placeholder="Ej. Fondo de emergencia" autoFocus /></Field>
        <div className="grid grid-cols-2 gap-md">
          <Field label="Meta"><StitchCurrencyInput value={form.targetAmount} onChange={(v) => set({ targetAmount: v })} className={inputCls} /></Field>
          {editing
            ? <Field label="Aporte mensual" hint="Para la proyección"><StitchCurrencyInput value={form.monthlyContribution} onChange={(v) => set({ monthlyContribution: v })} className={inputCls} /></Field>
            : <Field label="Saldo inicial" hint="Lo que ya tienes"><StitchCurrencyInput value={form.currentAmount} onChange={(v) => set({ currentAmount: v })} className={inputCls} /></Field>}
        </div>
        {!editing && (
          <Field label="Aporte mensual" hint="Para la proyección"><StitchCurrencyInput value={form.monthlyContribution} onChange={(v) => set({ monthlyContribution: v })} className={inputCls} /></Field>
        )}
        <div className="grid grid-cols-2 gap-md">
          <Field label="Fecha límite"><StitchDatePicker value={form.deadline} onChange={(v) => set({ deadline: v })} /></Field>
          <Field label="Moneda">
            <StitchSelect value={form.currency} onChange={(v) => set({ currency: v })} options={[{ value: 'DOP', label: 'RD$ (DOP)' }, { value: 'USD', label: 'US$ (USD)' }]} />
          </Field>
        </div>
        <Field label="Ícono">
          <div className="flex flex-wrap gap-xs">{EMOJIS.map((em) => <button type="button" key={em} aria-label={`Ícono ${em}`} aria-pressed={form.icon === em} onClick={() => set({ icon: em })} className={`w-8 h-8 rounded border flex items-center justify-center ${form.icon === em ? 'border-primary bg-primary/10' : 'border-border-subtle'}`}><Emoji e={em} size={16} /></button>)}</div>
        </Field>
        <FormActions onCancel={onClose} label={editing ? 'Guardar' : 'Crear'} />
      </form>
    </Modal>
  );
}
